import mongoose from 'mongoose';
import BOM from '../../models/BOM.js';
import ProductionBatch from '../../models/ProductionBatch.js';
import Product from '../../models/Product.js';
import Godown from '../../models/Godown.js';
import Unit from '../../models/Unit.js';
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
const PRODUCIBLE = ['finished', 'semi'];
const MATERIALS = ['raw', 'packing', 'semi'];

// ===== BOM =====
const bomPub = (b) => ({
  id: b._id.toString(),
  productId: b.productId?._id?.toString() || b.productId?.toString(),
  productName: b.productId?.name || null,
  productSku: b.productId?.sku || null,
  outputQty: b.outputQty,
  items: (b.items || []).map((i) => ({
    productId: i.productId?._id?.toString() || i.productId?.toString(),
    productName: i.productId?.name || null,
    productSku: i.productId?.sku || null,
    unitSymbol: i.productId?.unit?.symbol || null,
    qty: i.qty,
  })),
  notes: b.notes,
  isActive: b.isActive,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

async function validateBomInput(productId, items) {
  const product = await Product.findById(productId).lean();
  if (!product) throw httpError(404, 'Product not found');
  if (!PRODUCIBLE.includes(product.type)) {
    throw httpError(400, 'BOM can only be for finished or semi-finished products');
  }
  for (const it of items) {
    if (it.productId === productId) throw httpError(400, 'Product cannot be a material in its own BOM');
    const mat = await Product.findById(it.productId).lean();
    if (!mat) throw httpError(404, `Material ${it.productId} not found`);
    if (!MATERIALS.includes(mat.type)) {
      throw httpError(400, `Material must be raw, packing, or semi-finished (${mat.name} is ${mat.type})`);
    }
  }
}

export async function createBom(body, userId) {
  await validateBomInput(body.productId, body.items);

  const existing = await BOM.findOne({ productId: body.productId, isActive: true }).lean();
  if (existing) throw httpError(409, 'An active BOM already exists for this product. Deactivate it first.');

  const bom = await BOM.create({
    productId: body.productId,
    outputQty: body.outputQty || 1,
    items: body.items,
    notes: body.notes || '',
    isActive: true,
    createdBy: userId,
  });

  return getBom(bom._id.toString());
}

export async function listBoms(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.productId) filter.productId = q.productId;
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    // We'll filter via populated product after fetch — for simplicity just apply to productId via subquery
    const products = await Product.find({ $or: [{ name: rx }, { sku: rx }] }).select('_id').lean();
    filter.productId = { $in: products.map((p) => p._id) };
  }

  const [items, total] = await Promise.all([
    BOM.find(filter)
      .populate({ path: 'productId', select: 'name sku unit', populate: { path: 'unit', select: 'symbol' } })
      .populate({ path: 'items.productId', select: 'name sku unit', populate: { path: 'unit', select: 'symbol' } })
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    BOM.countDocuments(filter),
  ]);
  return { items: items.map(bomPub), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getBom(id) {
  const b = await BOM.findById(id)
    .populate({ path: 'productId', select: 'name sku unit', populate: { path: 'unit', select: 'symbol' } })
    .populate({ path: 'items.productId', select: 'name sku unit', populate: { path: 'unit', select: 'symbol' } })
    .lean();
  if (!b) throw httpError(404, 'BOM not found');
  return bomPub(b);
}

export async function updateBom(id, body) {
  const bom = await BOM.findById(id);
  if (!bom) throw httpError(404, 'BOM not found');
  if (body.items) {
    await validateBomInput(bom.productId.toString(), body.items);
    bom.items = body.items;
  }
  if (body.outputQty !== undefined) bom.outputQty = body.outputQty;
  if (body.notes !== undefined) bom.notes = body.notes;
  if (body.isActive !== undefined) bom.isActive = body.isActive;
  await bom.save();
  return getBom(id);
}

// ===== PRODUCTION BATCH =====
const batchPub = (b) => ({
  id: b._id.toString(),
  batchNo: b.batchNo,
  productId: b.productId?._id?.toString() || b.productId?.toString(),
  productName: b.productId?.name || null,
  productSku: b.productId?.sku || null,
  productUnitSymbol: b.productId?.unit?.symbol || null,
  bomId: b.bomId?._id?.toString() || b.bomId?.toString(),
  godownId: b.godownId?._id?.toString() || b.godownId?.toString(),
  godownName: b.godownId?.name || null,
  plannedQty: b.plannedQty,
  materialsUsed: (b.materialsUsed || []).map((m) => ({
    productId: m.productId?._id?.toString() || m.productId?.toString(),
    productName: m.productId?.name || null,
    productSku: m.productId?.sku || null,
    unitSymbol: m.productId?.unit?.symbol || null,
    qtyRequired: m.qtyRequired,
    qtyUsed: m.qtyUsed,
  })),
  producedQty: b.producedQty,
  wastageQty: b.wastageQty,
  mfgDate: b.mfgDate,
  expDate: b.expDate,
  status: b.status,
  completedAt: b.completedAt,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

export async function createBatch(body, userId) {
  const product = await Product.findById(body.productId).lean();
  if (!product) throw httpError(404, 'Product not found');
  if (!PRODUCIBLE.includes(product.type)) {
    throw httpError(400, 'Only finished or semi-finished products can be produced');
  }

  const godown = await Godown.findById(body.godownId).lean();
  if (!godown) throw httpError(404, 'Godown not found');

  const bom = await BOM.findOne({ productId: body.productId, isActive: true }).lean();
  if (!bom) throw httpError(400, 'No active BOM found for this product. Create a BOM first.');

  // Compute materials from BOM (scaled to plannedQty)
  const bomSnapshot = bom.items.map((i) => ({
    productId: i.productId,
    qtyPerUnit: i.qty / bom.outputQty,
  }));

  const materialsUsed = bomSnapshot.map((s) => {
    const req = Math.round(s.qtyPerUnit * body.plannedQty * 1e6) / 1e6; // 6dp precision
    return { productId: s.productId, qtyRequired: req, qtyUsed: req };
  });

  const year = new Date().getFullYear();
  const seq = await getNextSequence(`production_batch_${year}`);
  const batchNo = `BATCH-${year}-${String(seq).padStart(4, '0')}`;

  const batch = await ProductionBatch.create({
    batchNo,
    productId: body.productId,
    bomId: bom._id,
    bomSnapshot,
    godownId: body.godownId,
    plannedQty: body.plannedQty,
    materialsUsed,
    producedQty: 0,
    wastageQty: 0,
    mfgDate: new Date(body.mfgDate),
    expDate: body.expDate ? new Date(body.expDate) : null,
    status: 'draft',
    createdBy: userId,
  });

  return getBatch(batch._id.toString());
}

export async function listBatches(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.productId) filter.productId = q.productId;
  if (q.status) filter.status = q.status;
  if (q.from || q.to) {
    filter.mfgDate = {};
    if (q.from) filter.mfgDate.$gte = new Date(q.from);
    if (q.to) filter.mfgDate.$lte = new Date(q.to);
  }
  if (q.search) {
    filter.batchNo = new RegExp(escapeRegex(q.search), 'i');
  }

  const [items, total] = await Promise.all([
    ProductionBatch.find(filter)
      .populate({ path: 'productId', select: 'name sku unit', populate: { path: 'unit', select: 'symbol' } })
      .populate('godownId', 'name')
      .populate('materialsUsed.productId', 'name sku')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductionBatch.countDocuments(filter),
  ]);
  return { items: items.map(batchPub), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getBatch(id) {
  const b = await ProductionBatch.findById(id)
    .populate({ path: 'productId', select: 'name sku unit', populate: { path: 'unit', select: 'symbol' } })
    .populate('godownId', 'name')
    .populate('materialsUsed.productId', 'name sku unit')
    .lean();
  if (!b) throw httpError(404, 'Batch not found');
  return batchPub(b);
}

export async function completeBatch(id, body, userId) {
  const session = await mongoose.startSession();
  try {
    let batchId = id;
    await session.withTransaction(async () => {
      const batch = await ProductionBatch.findById(id).session(session);
      if (!batch) throw httpError(404, 'Batch not found');
      if (batch.status !== 'draft') throw httpError(409, `Batch is already ${batch.status}`);

      // Apply material overrides
      const overrides = new Map((body.materialsOverride || []).map((o) => [o.productId, o.qtyUsed]));
      const finalMaterials = batch.materialsUsed.map((m) => ({
        productId: m.productId,
        qtyRequired: m.qtyRequired,
        qtyUsed: overrides.has(m.productId.toString()) ? overrides.get(m.productId.toString()) : m.qtyUsed,
      }));

      // Validate output qty reasonable
      const producedQty = Number(body.producedQty) || 0;
      const wastageQty = Number(body.wastageQty) || 0;
      if (producedQty <= 0) throw httpError(400, 'producedQty must be > 0');

      // 1) Deduct raw materials — ATOMIC per item
      for (const mat of finalMaterials) {
        if (mat.qtyUsed <= 0) continue;
        const updated = await StockBalance.findOneAndUpdate(
          { productId: mat.productId, godownId: batch.godownId },
          { $inc: { physicalQty: -mat.qtyUsed } },
          { new: true, session }
        );
        if (!updated || updated.physicalQty < 0) {
          throw httpError(400, `Insufficient stock for material ${mat.productId}. Need ${mat.qtyUsed}, have ${updated?.physicalQty || 0}.`);
        }
        if (updated.physicalQty < updated.reservedQty) {
          throw httpError(400, `Material ${mat.productId} would drop below reserved qty. Adjust reservations first.`);
        }

        await StockLedger.create([{
          productId: mat.productId,
          godownId: batch.godownId,
          qtyChange: -mat.qtyUsed,
          qtyBefore: updated.physicalQty + mat.qtyUsed,
          qtyAfter: updated.physicalQty,
          reason: 'production-out',
          refType: 'production',
          refId: batch._id,
          note: `Batch ${batch.batchNo}`,
          userId,
        }], { session });
      }

      // 2) Add finished goods — ATOMIC
      const outUpdated = await StockBalance.findOneAndUpdate(
        { productId: batch.productId, godownId: batch.godownId },
        { $inc: { physicalQty: producedQty }, $setOnInsert: { reservedQty: 0 } },
        { upsert: true, new: true, session }
      );
      await StockLedger.create([{
        productId: batch.productId,
        godownId: batch.godownId,
        qtyChange: producedQty,
        qtyBefore: outUpdated.physicalQty - producedQty,
        qtyAfter: outUpdated.physicalQty,
        reason: 'production-in',
        refType: 'production',
        refId: batch._id,
        note: `Batch ${batch.batchNo}${wastageQty > 0 ? ` (wastage ${wastageQty})` : ''}`,
        userId,
      }], { session });

      // 3) Update batch
      batch.materialsUsed = finalMaterials;
      batch.producedQty = producedQty;
      batch.wastageQty = wastageQty;
      batch.status = 'completed';
      batch.completedAt = new Date();
      await batch.save({ session });
    });
    return getBatch(batchId);
  } finally {
    await session.endSession();
  }
}

export async function cancelBatch(id) {
  const batch = await ProductionBatch.findById(id);
  if (!batch) throw httpError(404, 'Batch not found');
  if (batch.status !== 'draft') throw httpError(409, `Only draft batches can be cancelled. This batch is ${batch.status}.`);
  batch.status = 'cancelled';
  await batch.save();
  return getBatch(id);
}