import mongoose from 'mongoose';
import StockLedger from '../../models/StockLedger.js';
import StockBalance from '../../models/StockBalance.js';
import StockReservation from '../../models/StockReservation.js';
import Product from '../../models/Product.js';
import Godown from '../../models/Godown.js';
import Unit from '../../models/Unit.js';

function httpError(status, message) {
  const e = new Error(message); e.status = status; return e;
}
function paginate(pageStr, limitStr) {
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function getDefaultGodown(session = null) {
  const q = Godown.findOne({ isDefault: true, isActive: true });
  if (session) q.session(session);
  const g = await q.lean();
  if (!g) throw httpError(400, 'No default godown configured');
  return g;
}

async function loadUnitForProduct(productId, session) {
  const p = await Product.findById(productId).session(session || null).lean();
  if (!p) throw httpError(404, 'Product not found');
  const u = await Unit.findById(p.unit).session(session || null).lean();
  if (!u) throw httpError(404, 'Unit missing for product');
  return { product: p, unit: u };
}

function validateQtyPrecision(qty, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  const rounded = Math.round(qty * factor) / factor;
  if (Math.abs(rounded - qty) > 1e-9) {
    throw httpError(400, `Qty has too many decimals (max ${decimalPlaces})`);
  }
  return rounded;
}

// ===== ADJUST (opening / adjustment) =====
export async function adjustStock({ productId, godownId, qtyChange, reason, note }, userId) {
  const session = await mongoose.startSession();
  try {
    let entry;
    await session.withTransaction(async () => {
      const { unit } = await loadUnitForProduct(productId, session);
      const godown = await Godown.findById(godownId).session(session).lean();
      if (!godown) throw httpError(404, 'Godown not found');

      const qty = validateQtyPrecision(qtyChange, unit.decimalPlaces);

      const updated = await StockBalance.findOneAndUpdate(
        { productId, godownId },
        { $inc: { physicalQty: qty }, $setOnInsert: { reservedQty: 0 } },
        { upsert: true, new: true, session }
      );

      if (updated.physicalQty < 0) throw httpError(400, 'Adjustment would make stock negative');
      if (updated.physicalQty < updated.reservedQty) throw httpError(400, 'Adjustment would drop below reserved qty');

      const qtyAfter = updated.physicalQty;
      const qtyBefore = qtyAfter - qty;

      const created = await StockLedger.create([{
        productId, godownId, qtyChange: qty, qtyBefore, qtyAfter,
        reason, refType: reason === 'opening' ? 'opening' : 'manual',
        note: note || '', userId,
      }], { session });
      entry = created[0];
    });
    return entry;
  } finally {
    await session.endSession();
  }
}

// ===== TRANSFER =====
export async function transferStock({ productId, fromGodownId, toGodownId, qty, note }, userId) {
  const session = await mongoose.startSession();
  try {
    let entries;
    await session.withTransaction(async () => {
      const { unit } = await loadUnitForProduct(productId, session);
      const qtyN = validateQtyPrecision(qty, unit.decimalPlaces);
      if (qtyN <= 0) throw httpError(400, 'Qty must be positive');

      const [from, to] = await Promise.all([
        Godown.findById(fromGodownId).session(session).lean(),
        Godown.findById(toGodownId).session(session).lean(),
      ]);
      if (!from || !to) throw httpError(404, 'Godown not found');

      const fromUpdated = await StockBalance.findOneAndUpdate(
        { productId, godownId: fromGodownId },
        { $inc: { physicalQty: -qtyN } },
        { new: true, session }
      );
      if (!fromUpdated || fromUpdated.physicalQty < 0 || fromUpdated.physicalQty < fromUpdated.reservedQty) {
        throw httpError(400, 'Insufficient stock in source godown');
      }

      const toUpdated = await StockBalance.findOneAndUpdate(
        { productId, godownId: toGodownId },
        { $inc: { physicalQty: qtyN }, $setOnInsert: { reservedQty: 0 } },
        { upsert: true, new: true, session }
      );

      entries = await StockLedger.insertMany([
        {
          productId, godownId: fromGodownId, qtyChange: -qtyN,
          qtyBefore: fromUpdated.physicalQty + qtyN, qtyAfter: fromUpdated.physicalQty,
          reason: 'transfer-out', refType: 'transfer', note: note || '', userId,
        },
        {
          productId, godownId: toGodownId, qtyChange: qtyN,
          qtyBefore: toUpdated.physicalQty - qtyN, qtyAfter: toUpdated.physicalQty,
          reason: 'transfer-in', refType: 'transfer', note: note || '', userId,
        },
      ], { session });
    });
    return entries;
  } finally {
    await session.endSession();
  }
}

// ===== RESERVE (for colleague's orders module) =====
export async function reserveStock({ orderId, items }, userId) {
  const session = await mongoose.startSession();
  try {
    const reservations = [];
    await session.withTransaction(async () => {
      const existing = await StockReservation.countDocuments({ orderId, status: 'active' }).session(session);
      if (existing > 0) throw httpError(409, 'Order already has active reservations. Release them first.');

      const needDefault = items.some((it) => !it.godownId);
      const defaultGodown = needDefault ? await getDefaultGodown(session) : null;

      for (const item of items) {
        const godownId = item.godownId || defaultGodown._id;
        const { unit } = await loadUnitForProduct(item.productId, session);
        const qty = validateQtyPrecision(item.qty, unit.decimalPlaces);
        if (qty <= 0) throw httpError(400, 'Qty must be positive');

        const balance = await StockBalance.findOne({ productId: item.productId, godownId }).session(session).lean();
        const physical = balance?.physicalQty || 0;
        const reserved = balance?.reservedQty || 0;
        const available = physical - reserved;
        if (available < qty) {
          throw httpError(400, `Insufficient available stock: need ${qty}, available ${available}`);
        }

        await StockBalance.updateOne(
          { productId: item.productId, godownId },
          { $inc: { reservedQty: qty } },
          { session }
        );

        const created = await StockReservation.create([{
          orderId, productId: item.productId, godownId, qty, status: 'active',
        }], { session });
        reservations.push(created[0]);
      }
    });
    return reservations;
  } finally {
    await session.endSession();
  }
}

// ===== RELEASE =====
export async function releaseStock({ orderId }) {
  const session = await mongoose.startSession();
  try {
    let count = 0;
    await session.withTransaction(async () => {
      const reservations = await StockReservation.find({ orderId, status: 'active' }).session(session);
      for (const res of reservations) {
        await StockBalance.updateOne(
          { productId: res.productId, godownId: res.godownId },
          { $inc: { reservedQty: -res.qty } },
          { session }
        );
        res.status = 'released';
        res.releasedAt = new Date();
        await res.save({ session });
        count++;
      }
    });
    return { released: count };
  } finally {
    await session.endSession();
  }
}

// ===== CONSUME (on dispatch) =====
export async function consumeStock({ orderId }, userId) {
  const session = await mongoose.startSession();
  try {
    let consumed = 0;
    await session.withTransaction(async () => {
      const reservations = await StockReservation.find({ orderId, status: 'active' }).session(session);
      for (const res of reservations) {
        const updated = await StockBalance.findOneAndUpdate(
          { productId: res.productId, godownId: res.godownId },
          { $inc: { physicalQty: -res.qty, reservedQty: -res.qty } },
          { new: true, session }
        );
        if (!updated || updated.physicalQty < 0 || updated.reservedQty < 0) {
          throw httpError(400, 'Insufficient physical or reserved stock on consume');
        }

        await StockLedger.create([{
          productId: res.productId, godownId: res.godownId, qtyChange: -res.qty,
          qtyBefore: updated.physicalQty + res.qty, qtyAfter: updated.physicalQty,
          reason: 'sale', refType: 'sales-order', refId: orderId, userId,
        }], { session });

        res.status = 'consumed';
        res.consumedAt = new Date();
        await res.save({ session });
        consumed++;
      }
    });
    return { consumed };
  } finally {
    await session.endSession();
  }
}

// ===== LIST BALANCES =====
function buildRow(p, godown, b) {
  const physical = b?.physicalQty || 0;
  const reserved = b?.reservedQty || 0;
  return {
    productId: p._id.toString(), sku: p.sku, name: p.name, type: p.type,
    unit: p.unit,
    godownId: godown._id.toString(), godownName: godown.name,
    physicalQty: physical, reservedQty: reserved,
    availableQty: physical - reserved,
    reorderPoint: p.reorderPoint,
    isLowStock: physical < p.reorderPoint,
    updatedAt: b?.updatedAt || null,
  };
}

export async function listBalances(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);

  const pFilter = { isActive: true };
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    pFilter.$or = [{ name: rx }, { sku: rx }];
  }
  if (q.type) pFilter.type = q.type;

  const products = await Product.find(pFilter).populate('unit', 'symbol decimalPlaces').sort({ name: 1 }).lean();
  if (!products.length) return { items: [], pagination: { page, limit, total: 0, totalPages: 1 } };

  const productIds = products.map((p) => p._id);
  const bFilter = { productId: { $in: productIds } };
  if (q.godownId) bFilter.godownId = q.godownId;

  const balances = await StockBalance.find(bFilter).lean();
  const godowns = await Godown.find({ isActive: true }).sort({ isDefault: -1, name: 1 }).lean();
  const godownMap = Object.fromEntries(godowns.map((g) => [g._id.toString(), g]));

  let items = [];
  if (q.godownId) {
    const target = godownMap[q.godownId];
    if (!target) throw httpError(404, 'Godown not found');
    const bMap = Object.fromEntries(balances.map((b) => [`${b.productId}_${b.godownId}`, b]));
    items = products.map((p) => buildRow(p, target, bMap[`${p._id}_${q.godownId}`]));
  } else {
    const agg = {};
    for (const b of balances) {
      const k = b.productId.toString();
      if (!agg[k]) agg[k] = { physicalQty: 0, reservedQty: 0, breakdown: [] };
      agg[k].physicalQty += b.physicalQty;
      agg[k].reservedQty += b.reservedQty;
      agg[k].breakdown.push({
        godownId: b.godownId.toString(),
        godownName: godownMap[b.godownId]?.name || '—',
        physicalQty: b.physicalQty, reservedQty: b.reservedQty,
      });
    }
    items = products.map((p) => {
      const a = agg[p._id.toString()] || { physicalQty: 0, reservedQty: 0, breakdown: [] };
      return {
        productId: p._id.toString(), sku: p.sku, name: p.name, type: p.type, unit: p.unit,
        physicalQty: a.physicalQty, reservedQty: a.reservedQty,
        availableQty: a.physicalQty - a.reservedQty,
        reorderPoint: p.reorderPoint,
        isLowStock: a.physicalQty < p.reorderPoint,
        breakdown: a.breakdown,
        updatedAt: null,
      };
    });
  }

  if (q.onlyLowStock === 'true') items = items.filter((i) => i.isLowStock);
  if (q.onlyWithStock === 'true') items = items.filter((i) => i.physicalQty > 0);

  const total = items.length;
  const paged = items.slice(skip, skip + limit);
  return { items: paged, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

// ===== LIST LEDGER =====
export async function listLedger(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.productId) filter.productId = q.productId;
  if (q.godownId) filter.godownId = q.godownId;
  if (q.reason) filter.reason = q.reason;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(q.to);
  }

  const [items, total] = await Promise.all([
    StockLedger.find(filter)
      .populate('productId', 'name sku type')
      .populate('godownId', 'name')
      .populate('userId', 'name role')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    StockLedger.countDocuments(filter),
  ]);

  return {
    items: items.map((l) => ({
      id: l._id.toString(),
      productId: l.productId?._id?.toString() || null,
      productName: l.productId?.name, productSku: l.productId?.sku, productType: l.productId?.type,
      godownId: l.godownId?._id?.toString() || null,
      godownName: l.godownId?.name,
      qtyChange: l.qtyChange, qtyBefore: l.qtyBefore, qtyAfter: l.qtyAfter,
      reason: l.reason, refType: l.refType, refId: l.refId?.toString() || null,
      note: l.note,
      userName: l.userId?.name, userRole: l.userId?.role,
      createdAt: l.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

// ===== LIST RESERVATIONS =====
export async function listReservations(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.orderId) filter.orderId = q.orderId;
  if (q.status) filter.status = q.status;

  const [items, total] = await Promise.all([
    StockReservation.find(filter)
      .populate('productId', 'name sku')
      .populate('godownId', 'name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    StockReservation.countDocuments(filter),
  ]);

  return {
    items: items.map((r) => ({
      id: r._id.toString(), orderId: r.orderId.toString(),
      productId: r.productId?._id?.toString() || null,
      productName: r.productId?.name, productSku: r.productId?.sku,
      godownId: r.godownId?._id?.toString() || null,
      godownName: r.godownId?.name,
      qty: r.qty, status: r.status,
      createdAt: r.createdAt, consumedAt: r.consumedAt, releasedAt: r.releasedAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}