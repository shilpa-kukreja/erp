import mongoose from 'mongoose';
import SupplierPayment from '../../models/SupplierPayment.js';
import PurchaseBill from '../../models/PurchaseBill.js';
import Party from '../../models/Party.js';
import { getNextSequence } from '../../models/Counter.js';

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

// 1. Record Payment (With FIFO Auto-allocation & Transactions)
export async function createPayment(body, userId) {
  const session = await mongoose.startSession();
  try {
    let resultPayment;
    await session.withTransaction(async () => {
      const supplier = await Party.findById(body.supplierId).session(session);
      if (!supplier) throw httpError(404, 'Supplier not found');

      // Get all unpaid bills for this supplier, oldest first (FIFO)
      const unpaidBills = await PurchaseBill.find({
        supplierId: body.supplierId,
        status: 'confirmed',
        $expr: { $lt: ['$paidPaise', '$grandTotalPaise'] } // paid < total
      }).sort({ billDate: 1 }).session(session);

      let remainingAmount = body.amountPaise;
      const allocations = [];

      // If manual allocations provided, validate them
      if (body.allocations && body.allocations.length > 0) {
        const allocSum = body.allocations.reduce((sum, a) => sum + a.amountPaise, 0);
        if (allocSum > body.amountPaise) throw httpError(400, 'Allocations exceed total payment amount');
        
        for (const alloc of body.allocations) {
          const bill = unpaidBills.find(b => b._id.toString() === alloc.billId);
          if (!bill) throw httpError(400, 'Bill not found or already paid');
          const due = bill.grandTotalPaise - bill.paidPaise;
          if (alloc.amountPaise > due) throw httpError(400, 'Allocation exceeds bill due');
          
          allocations.push(alloc);
          remainingAmount -= alloc.amountPaise;
          
          // Update bill
          bill.paidPaise += alloc.amountPaise;
          await bill.save({ session });
        }
      }

      // FIFO Auto-allocate remaining amount
      if (remainingAmount > 0) {
        for (const bill of unpaidBills) {
          if (remainingAmount <= 0) break;
          const due = bill.grandTotalPaise - bill.paidPaise;
          
          // If this bill was already manually allocated to, skip the manual part
          const existingAlloc = allocations.find(a => a.billId === bill._id.toString());
          const manualPaid = existingAlloc ? existingAlloc.amountPaise : 0;
          const actualDue = due - manualPaid;

          if (actualDue > 0) {
            const payAmount = Math.min(actualDue, remainingAmount);
            allocations.push({ billId: bill._id, amountPaise: payAmount });
            remainingAmount -= payAmount;

            bill.paidPaise += payAmount;
            await bill.save({ session });
          }
        }
      }

      // If there's still money left after paying all bills, throw error (or keep as advance, but prompt says auto-allocate)
      if (remainingAmount > 0) {
        // Optional: You can allow advance payments by ignoring this error. But senior said "auto-allocate to oldest unpaid bills"
        // For now, we throw to prevent overpayment.
        throw httpError(400, 'Payment amount exceeds total outstanding dues'); 
      }

      // Generate payment number
      const year = new Date().getFullYear();
      const seq = await getNextSequence(`supplier_payment_${year}`);
      const paymentNo = `SP-${year}-${String(seq).padStart(4, '0')}`;

      // Save the payment
      const [payment] = await SupplierPayment.create([{
        paymentNo,
        supplierId: body.supplierId,
        amountPaise: body.amountPaise,
        mode: body.mode,
        referenceNo: body.referenceNo || '',
        paidAt: new Date(body.paidAt),
        allocations,
        notes: body.notes || '',
        createdBy: userId,
      }], { session });

      resultPayment = payment;
    });
    return resultPayment;
  } finally {
    await session.endSession();
  }
}

// 2. Aging Report
export async function getAgingReport() {
  const now = new Date();
  
  // Get all unpaid bills
  const bills = await PurchaseBill.find({
    status: 'confirmed',
    $expr: { $lt: ['$paidPaise', '$grandTotalPaise'] }
  }).populate('supplierId', 'name').lean();

  const supplierMap = {};

  for (const bill of bills) {
    const supplierId = bill.supplierId._id.toString();
    if (!supplierMap[supplierId]) {
      supplierMap[supplierId] = {
        supplierId,
        supplierName: bill.supplierId.name,
        current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0
      };
    }

    const due = bill.grandTotalPaise - bill.paidPaise;
    const ageInDays = Math.floor((now - new Date(bill.billDate)) / (1000 * 60 * 60 * 24));

    if (ageInDays <= 30) supplierMap[supplierId].d30 += due; // Including current
    else if (ageInDays <= 60) supplierMap[supplierId].d60 += due;
    else if (ageInDays <= 90) supplierMap[supplierId].d90 += due;
    else supplierMap[supplierId].over90 += due;

    supplierMap[supplierId].total += due;
  }

  // TODO: Subtract PurchaseReturns from these totals based on your senior's prompt instructions. 
  // We will add that logic once we create the Return model.

  return Object.values(supplierMap).sort((a, b) => b.total - a.total);
}