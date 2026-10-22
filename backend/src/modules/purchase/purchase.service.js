import mongoose from 'mongoose';
import PurchaseBill from '../../models/PurchaseBill.js';
import Party from '../../models/Party.js';
import Godown from '../../models/Godown.js';
import Product from '../../models/Product.js';
import StockBalance from '../../models/StockBalance.js';
import StockLedger from '../../models/StockLedger.js';
import { getNextSequence } from '../../models/Counter.js';

function httpError(status, message) {
  const e = new Error(message); e.status = status; return e;
}
function paginate(pageStr, limitStr) {
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const computeLine = (qty, ratePaise, taxRate) => {
  const lineSub = Math.round(qty * ratePaise);
  const lineTax = Math.round((lineSub * taxRate) / 100);
  return { lineSubtotalPaise: lineSub, lineTaxPaise: lineTax, lineTotalPaise: lineSub + lineTax };
};

const pub = (b) => ({
  id: b._id.toString(),
  purchaseNo: b.purchaseNo,
  supplierId: b.supplierId?._id?.toString() || b.supplierId?.toString(),
  supplierName: b.supplierId?.name || null,
  supplierGstin: b.supplierId?.gstin || null,
  godownId: b.godownId?._id?.toString() || b.godownId?.toString(),
  godownName: b.godownId?.name || null,
  billNo: b.billNo,
  billDate: b.billDate,
  dueDate: b.dueDate,
  items: (b.items || []).map((i) => ({
    productId: i.productId?._id?.toString() || i.productId?.toString(),
    productName: i.productId?.name || null,
    productSku: i.productId?.sku || null,
    qty: i.qty, ratePaise: i.ratePaise, taxRate: i.taxRate,
    lineSubtotalPaise: i.lineSubtotalPaise, lineTaxPaise: i.lineTaxPaise, lineTotalPaise: i.lineTotalPaise,
  })),
  subTotalPaise: b.subTotalPaise,
  taxPaise: b.taxPaise,
  grandTotalPaise: b.grandTotalPaise,
  paidPaise: b.paidPaise,
  balancePaise: b.grandTotalPaise - b.paidPaise,
  status: b.status,
  notes: b.notes,
  confirmedAt: b.confirmedAt,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

export async function createPurchase(body, userId) {
  const supplier = await Party.findById(body.supplierId).lean();
  if (!supplier) throw httpError(404, 'Supplier not found');
  if (supplier.type !== 'supplier') throw httpError(400, 'Party must be a supplier');

  const godown = await Godown.findById(body.godownId).lean();
  if (!godown) throw httpError(404, 'Godown not found');

  // Validate products & compute lines
  const productIds = body.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));
  for (const it of body.items) {
    if (!productMap[it.productId]) throw httpError(400, `Product ${it.productId} not found`);
  }

  const items = body.items.map((it) => {
    const calc = computeLine(it.qty, it.ratePaise, it.taxRate);
    return { ...it, ...calc };
  });
  const subTotalPaise = items.reduce((s, i) => s + i.lineSubtotalPaise, 0);
  const taxPaise = items.reduce((s, i) => s + i.lineTaxPaise, 0);
  const grandTotalPaise = subTotalPaise + taxPaise;

  // Generate purchase number (year-based, race-safe)
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`purchase_${year}`);
  const purchaseNo = `PB-${year}-${String(seq).padStart(4, '0')}`;

  const doc = await PurchaseBill.create({
    purchaseNo,
    supplierId: body.supplierId,
    godownId: body.godownId,
    billNo: body.billNo,
    billDate: new Date(body.billDate),
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    items, subTotalPaise, taxPaise, grandTotalPaise,
    status: 'draft',
    notes: body.notes || '',
    createdBy: userId,
  });

  return getPurchase(doc._id.toString());
}

export async function listPurchases(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ purchaseNo: rx }, { billNo: rx }];
  }
  if (q.supplierId) filter.supplierId = q.supplierId;
  if (q.godownId) filter.godownId = q.godownId;
  if (q.status) filter.status = q.status;
  if (q.from || q.to) {
    filter.billDate = {};
    if (q.from) filter.billDate.$gte = new Date(q.from);
    if (q.to) filter.billDate.$lte = new Date(q.to);
  }

  const [items, total] = await Promise.all([
    PurchaseBill.find(filter)
      .populate('supplierId', 'name gstin')
      .populate('godownId', 'name')
      .populate('items.productId', 'name sku')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PurchaseBill.countDocuments(filter),
  ]);

  return { items: items.map(pub), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getPurchase(id) {
  const b = await PurchaseBill.findById(id)
    .populate('supplierId', 'name gstin phone')
    .populate('godownId', 'name')
    .populate('items.productId', 'name sku unit')
    .lean();
  if (!b) throw httpError(404, 'Purchase bill not found');
  return pub(b);
}

export async function confirmPurchase(id, userId) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const bill = await PurchaseBill.findById(id).session(session);
      if (!bill) throw httpError(404, 'Purchase bill not found');
      if (bill.status === 'confirmed') throw httpError(409, 'Bill already confirmed');

      // Stock IN for every item
      for (const item of bill.items) {
        const updated = await StockBalance.findOneAndUpdate(
          { productId: item.productId, godownId: bill.godownId },
          { $inc: { physicalQty: item.qty }, $setOnInsert: { reservedQty: 0 } },
          { upsert: true, new: true, session }
        );
        const qtyAfter = updated.physicalQty;
        const qtyBefore = qtyAfter - item.qty;

        await StockLedger.create([{
          productId: item.productId,
          godownId: bill.godownId,
          qtyChange: item.qty,
          qtyBefore,
          qtyAfter,
          reason: 'purchase',
          refType: 'purchase',
          refId: bill._id,
          note: `Purchase ${bill.purchaseNo}`,
          userId,
        }], { session });
      }

      bill.status = 'confirmed';
      bill.confirmedAt = new Date();
      bill.confirmedBy = userId;
      await bill.save({ session });
    });
    return getPurchase(id);
  } finally {
    await session.endSession();
  }
}