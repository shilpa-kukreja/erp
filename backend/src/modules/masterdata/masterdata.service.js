import Unit from '../../models/Unit.js';
import Godown from '../../models/Godown.js';
import Product from '../../models/Product.js';
import Party from '../../models/Party.js';
// ===== DELETE GUARDS =====
import StockLedger from '../../models/StockLedger.js';
import StockBalance from '../../models/StockBalance.js';
// import PurchaseBill from '../../models/PurchaseBill.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function paginate(pageStr, limitStr) {
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ===== UNITS =====
const unitPub = (u) => ({
  id: u._id.toString(), name: u.name, symbol: u.symbol, type: u.type,
  decimalPlaces: u.decimalPlaces, isActive: u.isActive,
  createdAt: u.createdAt, updatedAt: u.updatedAt,
});

export async function createUnit(body) {
  const existing = await Unit.findOne({ name: body.name }).lean();
  if (existing) throw httpError(409, 'Unit with this name already exists');
  const u = await Unit.create(body);
  return unitPub(u);
}

export async function listUnits(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.search) filter.$or = [{ name: new RegExp(escapeRegex(q.search), 'i') }, { symbol: new RegExp(escapeRegex(q.search), 'i') }];
  if (q.type) filter.type = q.type;
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';

  const [items, total] = await Promise.all([
    Unit.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Unit.countDocuments(filter),
  ]);
  return { items: items.map(unitPub), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function updateUnit(id, body) {
  if (body.name) {
    const dup = await Unit.findOne({ name: body.name, _id: { $ne: id } }).lean();
    if (dup) throw httpError(409, 'Unit with this name already exists');
  }
  const u = await Unit.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!u) throw httpError(404, 'Unit not found');
  return unitPub(u);
}

// ===== GODOWNS =====
const godownPub = (g) => ({
  id: g._id.toString(), name: g.name, address: g.address,
  isDefault: g.isDefault, isActive: g.isActive,
  createdAt: g.createdAt, updatedAt: g.updatedAt,
});

export async function createGodown(body) {
  const existing = await Godown.findOne({ name: body.name }).lean();
  if (existing) throw httpError(409, 'Godown with this name already exists');

  if (body.isDefault) {
    await Godown.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }
  const g = await Godown.create(body);
  return godownPub(g);
}

export async function listGodowns(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.search) filter.name = new RegExp(escapeRegex(q.search), 'i');
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';

  const [items, total] = await Promise.all([
    Godown.find(filter).sort({ isDefault: -1, name: 1 }).skip(skip).limit(limit).lean(),
    Godown.countDocuments(filter),
  ]);
  return { items: items.map(godownPub), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function updateGodown(id, body) {
  if (body.name) {
    const dup = await Godown.findOne({ name: body.name, _id: { $ne: id } }).lean();
    if (dup) throw httpError(409, 'Godown with this name already exists');
  }
  if (body.isDefault === true) {
    await Godown.updateMany({ _id: { $ne: id }, isDefault: true }, { $set: { isDefault: false } });
  }
  const g = await Godown.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!g) throw httpError(404, 'Godown not found');
  return godownPub(g);
}

// ===== PRODUCTS =====
const productPub = (p) => {
  const u = p.unit && typeof p.unit === 'object' ? p.unit : null;
  return {
    id: p._id.toString(),
    type: p.type, name: p.name, sku: p.sku,
    unit: u ? { id: u._id.toString(), name: u.name, symbol: u.symbol, decimalPlaces: u.decimalPlaces } : { id: p.unit?.toString?.() || p.unit },
    hsnCode: p.hsnCode, taxRate: p.taxRate,
    basePricePaise: p.basePricePaise, costPerUnitPaise: p.costPerUnitPaise,
    reorderPoint: p.reorderPoint, reorderQty: p.reorderQty,
    description: p.description, isActive: p.isActive,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
};

export async function createProduct(body) {
  const unit = await Unit.findById(body.unit).lean();
  if (!unit) throw httpError(400, 'Unit not found');
  const dup = await Product.findOne({ sku: body.sku }).lean();
  if (dup) throw httpError(409, 'Product SKU already exists');
  const p = await Product.create(body);
  const populated = await Product.findById(p._id).populate('unit', 'name symbol decimalPlaces').lean();
  return productPub(populated);
}

export async function listProducts(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { hsnCode: rx }];
  }
  if (q.type) filter.type = q.type;
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';

  const [items, total] = await Promise.all([
    Product.find(filter).populate('unit', 'name symbol decimalPlaces').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  return { items: items.map(productPub), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getProduct(id) {
  const p = await Product.findById(id).populate('unit', 'name symbol decimalPlaces').lean();
  if (!p) throw httpError(404, 'Product not found');
  return productPub(p);
}

export async function updateProduct(id, body) {
  if (body.sku) {
    const dup = await Product.findOne({ sku: body.sku, _id: { $ne: id } }).lean();
    if (dup) throw httpError(409, 'Product SKU already exists');
  }
  if (body.unit) {
    const u = await Unit.findById(body.unit).lean();
    if (!u) throw httpError(400, 'Unit not found');
  }
  const p = await Product.findByIdAndUpdate(id, body, { new: true, runValidators: true })
    .populate('unit', 'name symbol decimalPlaces').lean();
  if (!p) throw httpError(404, 'Product not found');
  return productPub(p);
}

// ===== PARTIES =====
const partyPub = (p) => ({
  id: p._id.toString(), type: p.type, name: p.name,
  gstin: p.gstin, phone: p.phone, email: p.email,
  address: p.address,
  pricingRules: (p.pricingRules || []).map((r) => ({
    productId: (r.productId && typeof r.productId === 'object') ? r.productId._id.toString() : r.productId.toString(),
    productName: (r.productId && typeof r.productId === 'object') ? r.productId.name : null,
    productSku: (r.productId && typeof r.productId === 'object') ? r.productId.sku : null,
    pricePaise: r.pricePaise,
  })),
  creditLimitPaise: p.creditLimitPaise, creditDays: p.creditDays,
  isActive: p.isActive, createdAt: p.createdAt, updatedAt: p.updatedAt,
});

export async function createParty(body) {
  if (body.pricingRules?.length) {
    const ids = body.pricingRules.map((r) => r.productId);
    const found = await Product.find({ _id: { $in: ids } }).select('_id').lean();
    if (found.length !== new Set(ids).size) throw httpError(400, 'One or more productId in pricingRules not found');
    // de-dupe
    const seen = new Set();
    body.pricingRules = body.pricingRules.filter((r) => {
      if (seen.has(r.productId)) return false;
      seen.add(r.productId);
      return true;
    });
  }
  const p = await Party.create(body);
  const populated = await Party.findById(p._id).populate('pricingRules.productId', 'name sku').lean();
  return partyPub(populated);
}

export async function listParties(q) {
  const { page, limit, skip } = paginate(q.page, q.limit);
  const filter = {};
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { gstin: rx }, { email: rx }];
  }
  if (q.type) filter.type = q.type;
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';

  const [items, total] = await Promise.all([
    Party.find(filter).populate('pricingRules.productId', 'name sku').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Party.countDocuments(filter),
  ]);
  return { items: items.map(partyPub), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getParty(id) {
  const p = await Party.findById(id).populate('pricingRules.productId', 'name sku').lean();
  if (!p) throw httpError(404, 'Party not found');
  return partyPub(p);
}

export async function updateParty(id, body) {
  if (body.pricingRules) {
    const ids = body.pricingRules.map((r) => r.productId);
    if (ids.length) {
      const found = await Product.find({ _id: { $in: ids } }).select('_id').lean();
      if (found.length !== new Set(ids).size) throw httpError(400, 'One or more productId in pricingRules not found');
    }
    const seen = new Set();
    body.pricingRules = body.pricingRules.filter((r) => {
      if (seen.has(r.productId)) return false;
      seen.add(r.productId);
      return true;
    });
  }
  const p = await Party.findByIdAndUpdate(id, body, { new: true, runValidators: true })
    .populate('pricingRules.productId', 'name sku').lean();
  if (!p) throw httpError(404, 'Party not found');
  return partyPub(p);
}

// ===== EFFECTIVE PRICE (for colleague's orders module) =====
export async function getEffectivePrice(partyId, productId) {
  const party = await Party.findById(partyId).lean();
  if (!party) throw httpError(404, 'Party not found');

  const rule = (party.pricingRules || []).find((r) => r.productId.toString() === productId);
  if (rule) return { unitPricePaise: rule.pricePaise, source: 'override' };

  const product = await Product.findById(productId).lean();
  if (!product) throw httpError(404, 'Product not found');
  return { unitPricePaise: product.basePricePaise, source: 'base' };
}

// ===== SEED DEFAULTS =====
export async function seedDefaults() {
  const summary = { unitsCreated: 0, godownsCreated: 0 };

  if ((await Unit.estimatedDocumentCount()) === 0) {
    await Unit.insertMany([
      { name: 'Kilogram', symbol: 'kg', type: 'weight', decimalPlaces: 3 },
      { name: 'Gram', symbol: 'g', type: 'weight', decimalPlaces: 0 },
      { name: 'Litre', symbol: 'L', type: 'volume', decimalPlaces: 3 },
      { name: 'Millilitre', symbol: 'ml', type: 'volume', decimalPlaces: 0 },
      { name: 'Piece', symbol: 'pc', type: 'count', decimalPlaces: 0 },
      { name: 'Carton', symbol: 'ctn', type: 'count', decimalPlaces: 0 },
    ]);
    summary.unitsCreated = 6;
  }

  if ((await Godown.estimatedDocumentCount()) === 0) {
    await Godown.create({ name: 'Main Godown', isDefault: true });
    summary.godownsCreated = 1;
  }

  return summary;
}






export async function deleteUnit(id) {
  const inUse = await Product.countDocuments({ unit: id });
  if (inUse > 0) {
    throw httpError(409, `Cannot delete: ${inUse} product(s) use this unit. Deactivate instead.`);
  }
  const deleted = await Unit.findByIdAndDelete(id);
  if (!deleted) throw httpError(404, 'Unit not found');
  return { deleted: true };
}

export async function deleteGodown(id) {
  const [stockRows, purchases] = await Promise.all([
    StockBalance.countDocuments({ godownId: id }),
    PurchaseBill.countDocuments({ godownId: id }),
  ]);
  if (stockRows > 0 || purchases > 0) {
    throw httpError(409, `Cannot delete: godown has ${stockRows} stock row(s) and ${purchases} purchase bill(s). Deactivate instead.`);
  }
  const deleted = await Godown.findByIdAndDelete(id);
  if (!deleted) throw httpError(404, 'Godown not found');
  return { deleted: true };
}

export async function deleteProduct(id) {
  const [ledger, balance, purchases] = await Promise.all([
    StockLedger.countDocuments({ productId: id }),
    StockBalance.countDocuments({ productId: id }),
    PurchaseBill.countDocuments({ 'items.productId': id }),
  ]);
  if (ledger > 0 || balance > 0 || purchases > 0) {
    throw httpError(409, `Cannot delete: product has ${ledger} stock entr(y/ies), ${balance} balance row(s), ${purchases} purchase bill(s). Deactivate instead.`);
  }
  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) throw httpError(404, 'Product not found');
  return { deleted: true };
}

export async function deleteParty(id) {
  const purchases = await PurchaseBill.countDocuments({ supplierId: id });
  if (purchases > 0) {
    throw httpError(409, `Cannot delete: party has ${purchases} purchase bill(s). Deactivate instead.`);
  }
  const deleted = await Party.findByIdAndDelete(id);
  if (!deleted) throw httpError(404, 'Party not found');
  return { deleted: true };
}