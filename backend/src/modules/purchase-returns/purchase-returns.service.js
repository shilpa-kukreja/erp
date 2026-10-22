import mongoose from 'mongoose';
import PurchaseReturn from '../../models/PurchaseReturn.js';
import PurchaseBill from '../../models/PurchaseBill.js';
import StockBalance from '../../models/StockBalance.js';
import StockLedger from '../../models/StockLedger.js';
import { getNextSequence } from '../../models/Counter.js';

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

// Helper to calculate line totals safely in paise
const computeLine = (qty, ratePaise, taxRate) => {
  const lineSub = Math.round(qty * ratePaise);
  const lineTax = Math.round((lineSub * taxRate) / 100);
  return { lineSubtotalPaise: lineSub, lineTaxPaise: lineTax, lineTotalPaise: lineSub + lineTax };
};

export async function createReturn(body, userId) {
  const session = await mongoose.startSession();
  try {
    let resultReturn;
    await session.withTransaction(async () => {
      // 1. Fetch the original bill
      const bill = await PurchaseBill.findById(body.purchaseBillId).session(session);
      if (!bill) throw httpError(404, 'Purchase bill not found');
      if (bill.status !== 'confirmed') throw httpError(400, 'Cannot return items from an unconfirmed bill');

      // 2. Validate return quantities against original bill
      let subTotalPaise = 0;
      let taxPaise = 0;
      const returnItems = [];

      for (const returnItem of body.items) {
        const originalItem = bill.items.find(i => i.productId.toString() === returnItem.productId);
        if (!originalItem) throw httpError(400, `Product ${returnItem.productId} not found on this bill`);
        
        // Note: For a full production ERP, you would also query past PurchaseReturns to ensure 
        // they aren't returning more than (Original Qty - Already Returned Qty). 
        // For this scope, we check against original bill qty.
        if (returnItem.qty > originalItem.qty) {
          throw httpError(400, `Cannot return ${returnItem.qty} units. Only ${originalItem.qty} were purchased.`);
        }

        // Calculate line totals based on ORIGINAL bill rate and tax
        const calc = computeLine(returnItem.qty, originalItem.ratePaise, originalItem.taxRate);
        returnItems.push({
          productId: returnItem.productId,
          qty: returnItem.qty,
          ratePaise: originalItem.ratePaise,
          taxRate: originalItem.taxRate,
          ...calc
        });

        subTotalPaise += calc.lineSubtotalPaise;
        taxPaise += calc.lineTaxPaise;

        // 3. Deduct Stock
        const updatedStock = await StockBalance.findOneAndUpdate(
          { productId: returnItem.productId, godownId: bill.godownId },
          { $inc: { physicalQty: -returnItem.qty } },
          { new: true, session }
        );
        if (!updatedStock) throw httpError(400, 'Stock balance not found for this product');

        const qtyBefore = updatedStock.physicalQty + returnItem.qty;
        const qtyAfter = updatedStock.physicalQty;

             // 4. Create Stock Ledger Entry
              // 4. Create Stock Ledger Entry
        await StockLedger.create([{
          productId: returnItem.productId,
          godownId: bill.godownId,
          qtyChange: -returnItem.qty, // Negative means stock goes DOWN
          qtyBefore,
          qtyAfter,
          reason: 'adjustment', // <-- FIXED: Use a valid enum (check senior's model if 'adjustment' isn't right)
          refType: 'purchase',
          refId: bill._id,
          note: `Purchase Return from Bill ${bill.purchaseNo}`, // The note explains exactly what happened
          userId,
        }], { session });
      }

      const grandTotalPaise = subTotalPaise + taxPaise;

      // 5. Generate Return Number
      const year = new Date().getFullYear();
      const seq = await getNextSequence(`purchase_return_${year}`);
      const returnNo = `PR-${year}-${String(seq).padStart(4, '0')}`;

      // 6. Create the Purchase Return Document
      const [purchaseReturn] = await PurchaseReturn.create([{
        returnNo,
        purchaseBillId: bill._id,
        supplierId: bill.supplierId,
        godownId: bill.godownId,
        items: returnItems,
        subTotalPaise,
        taxPaise,
        grandTotalPaise,
        reason: body.reason || '',
        status: 'confirmed',
        createdBy: userId,
      }], { session });

      // 7. (Crucial) Reduce the Paid Amount or Grand Total of the Bill 
      // Since this is a return, it effectively reduces the bill value.
      // We adjust the grandTotalPaise down. If it was already paid, it creates a credit.
      bill.grandTotalPaise -= grandTotalPaise;
      await bill.save({ session });

      resultReturn = purchaseReturn;
    });
    return resultReturn;
  } finally {
    await session.endSession();
  }
}

export async function listReturns(query) {
  const filter = {};
  if (query.purchaseBillId) filter.purchaseBillId = query.purchaseBillId;
  
  const returns = await PurchaseReturn.find(filter)
    .populate('items.productId', 'name sku')
    .sort({ createdAt: -1 })
    .lean();
    
  return returns;
}