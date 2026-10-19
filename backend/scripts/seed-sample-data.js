// backend/scripts/seed-sample-data.js
// Usage:
//   npm run seed              → add sample data (skips existing)
//   npm run seed -- --clear   → wipe master data first, then reseed
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Unit from '../src/models/Unit.js';
import Godown from '../src/models/Godown.js';
import Product from '../src/models/Product.js';
import Party from '../src/models/Party.js';

const CLEAR = process.argv.includes('--clear');

const UNITS_SEED = [
  { name: 'Kilogram', symbol: 'kg', type: 'weight', decimalPlaces: 3 },
  { name: 'Gram', symbol: 'g', type: 'weight', decimalPlaces: 0 },
  { name: 'Litre', symbol: 'L', type: 'volume', decimalPlaces: 3 },
  { name: 'Millilitre', symbol: 'ml', type: 'volume', decimalPlaces: 0 },
  { name: 'Piece', symbol: 'pc', type: 'count', decimalPlaces: 0 },
  { name: 'Carton', symbol: 'ctn', type: 'count', decimalPlaces: 0 },
];

const GODOWNS_SEED = [
  { name: 'Main Godown', address: 'Plot 12, MIDC, Mumbai', isDefault: true },
  { name: 'Factory Warehouse', address: 'Unit 4, Industrial Area, Pune', isDefault: false },
  { name: 'Retail Store Backroom', address: 'Shop 5, Main Road, Mumbai', isDefault: false },
];

// Prices in paise. 18000 = ₹180.00
const PRODUCTS_SEED = [
  // ===== RAW MATERIALS =====
  { type: 'raw', name: 'Turmeric Powder', sku: 'RAW-001', unit: 'kg', hsnCode: '0910', taxRate: 5, basePricePaise: 18000, costPerUnitPaise: 14000, reorderPoint: 50, reorderQty: 200 },
  { type: 'raw', name: 'Red Chilli Powder', sku: 'RAW-002', unit: 'kg', hsnCode: '0904', taxRate: 5, basePricePaise: 32000, costPerUnitPaise: 26000, reorderPoint: 50, reorderQty: 200 },
  { type: 'raw', name: 'Coriander Powder', sku: 'RAW-003', unit: 'kg', hsnCode: '0909', taxRate: 5, basePricePaise: 15000, costPerUnitPaise: 11000, reorderPoint: 40, reorderQty: 150 },
  { type: 'raw', name: 'Refined Salt', sku: 'RAW-004', unit: 'kg', hsnCode: '2501', taxRate: 5, basePricePaise: 1500, costPerUnitPaise: 800, reorderPoint: 100, reorderQty: 500 },
  { type: 'raw', name: 'Sunflower Oil', sku: 'RAW-005', unit: 'L', hsnCode: '1512', taxRate: 5, basePricePaise: 14000, costPerUnitPaise: 12000, reorderPoint: 60, reorderQty: 250 },

  // ===== PACKING MATERIALS =====
  { type: 'packing', name: 'Pouch 100g', sku: 'PKG-001', unit: 'pc', hsnCode: '3923', taxRate: 18, basePricePaise: 150, costPerUnitPaise: 100, reorderPoint: 5000, reorderQty: 20000 },
  { type: 'packing', name: 'Pouch 500g', sku: 'PKG-002', unit: 'pc', hsnCode: '3923', taxRate: 18, basePricePaise: 350, costPerUnitPaise: 250, reorderPoint: 3000, reorderQty: 15000 },
  { type: 'packing', name: 'Outer Carton (12 units)', sku: 'PKG-003', unit: 'pc', hsnCode: '4819', taxRate: 18, basePricePaise: 1200, costPerUnitPaise: 900, reorderPoint: 500, reorderQty: 2000 },
  { type: 'packing', name: 'Label Sticker', sku: 'PKG-004', unit: 'pc', hsnCode: '4821', taxRate: 18, basePricePaise: 50, costPerUnitPaise: 30, reorderPoint: 10000, reorderQty: 50000 },

  // ===== SEMI-FINISHED =====
  { type: 'semi', name: 'Garam Masala Base Mix', sku: 'SEMI-001', unit: 'kg', hsnCode: '0910', taxRate: 5, basePricePaise: 45000, costPerUnitPaise: 38000, reorderPoint: 30, reorderQty: 100 },
  { type: 'semi', name: 'Chicken Masala Base Mix', sku: 'SEMI-002', unit: 'kg', hsnCode: '0910', taxRate: 5, basePricePaise: 42000, costPerUnitPaise: 35000, reorderPoint: 30, reorderQty: 100 },

  // ===== FINISHED GOODS =====
  { type: 'finished', name: 'Garam Masala 100g Pouch', sku: 'FIN-001', unit: 'pc', hsnCode: '0910', taxRate: 5, basePricePaise: 5500, costPerUnitPaise: 3800, reorderPoint: 200, reorderQty: 1000 },
  { type: 'finished', name: 'Garam Masala 500g Pouch', sku: 'FIN-002', unit: 'pc', hsnCode: '0910', taxRate: 5, basePricePaise: 24000, costPerUnitPaise: 17500, reorderPoint: 100, reorderQty: 500 },
  { type: 'finished', name: 'Chicken Masala 100g Pouch', sku: 'FIN-003', unit: 'pc', hsnCode: '0910', taxRate: 5, basePricePaise: 5000, costPerUnitPaise: 3500, reorderPoint: 200, reorderQty: 1000 },

  // ===== TRADED =====
  { type: 'traded', name: 'Hing (Asafoetida) 50g', sku: 'TRD-001', unit: 'pc', hsnCode: '1302', taxRate: 12, basePricePaise: 9500, costPerUnitPaise: 7500, reorderPoint: 100, reorderQty: 500 },
];

const PARTIES_SEED = [
  // ===== SUPPLIERS =====
  {
    type: 'supplier', name: 'Sharma Spice Wholesaler',
    gstin: '27AAAAA1234A1Z5', phone: '9876543210', email: 'sharma@spicewholesale.in',
    address: { line1: 'Plot 5, APMC Market', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    creditDays: 30,
  },
  {
    type: 'supplier', name: 'Packaging Solutions Pvt Ltd',
    gstin: '27BBBBB5678B1Z6', phone: '9876543211', email: 'sales@packagingsol.in',
    address: { line1: 'Unit 10, MIDC', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    creditDays: 45,
  },
  {
    type: 'supplier', name: 'Fresh Oils India',
    gstin: '27CCCCC9012C1Z7', phone: '9876543212', email: 'orders@freshoils.in',
    address: { line1: 'Godown 3, Vashi', city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400703' },
    creditDays: 15,
  },

  // ===== DEALERS (with pricing overrides) =====
  {
    type: 'dealer', name: 'Patel Traders',
    gstin: '07DDDDD3456D1Z8', phone: '9876543213', email: 'patel@pateltraders.in',
    address: { line1: 'Shop 22, Chandni Chowk', city: 'Delhi', state: 'Delhi', pincode: '110006' },
    creditLimitPaise: 20000000,  // ₹2,00,000
    creditDays: 30,
    pricingRules: [
      { sku: 'FIN-001', pricePaise: 5000 },   // ₹50  (base ₹55)
      { sku: 'FIN-002', pricePaise: 22000 },  // ₹220 (base ₹240)
      { sku: 'FIN-003', pricePaise: 4500 },   // ₹45  (base ₹50)
    ],
  },
  {
    type: 'dealer', name: 'Kumar Distributors',
    gstin: '29EEEEE7890E1Z9', phone: '9876543214', email: 'kumar@kumardist.in',
    address: { line1: '4th Cross, Jayanagar', city: 'Bangalore', state: 'Karnataka', pincode: '560041' },
    creditLimitPaise: 15000000,  // ₹1,50,000
    creditDays: 30,
  },

  // ===== DISTRIBUTORS (with pricing overrides) =====
  {
    type: 'distributor', name: 'South India Spice Co',
    gstin: '33FFFFF2345F1Z0', phone: '9876543215', email: 'info@southindiaspice.in',
    address: { line1: 'Block C, Ambattur', city: 'Chennai', state: 'Tamil Nadu', pincode: '600058' },
    creditLimitPaise: 50000000,  // ₹5,00,000
    creditDays: 45,
    pricingRules: [
      { sku: 'FIN-001', pricePaise: 4800 },   // ₹48
      { sku: 'FIN-002', pricePaise: 21000 },  // ₹210
      { sku: 'FIN-003', pricePaise: 4300 },   // ₹43
    ],
  },
  {
    type: 'distributor', name: 'Mega Foods Distribution',
    gstin: '36GGGGG6789G1Z1', phone: '9876543216', email: 'sales@megafoods.in',
    address: { line1: 'Plot 8, Kukatpally', city: 'Hyderabad', state: 'Telangana', pincode: '500072' },
    creditLimitPaise: 40000000,  // ₹4,00,000
    creditDays: 45,
  },

  // ===== CUSTOMERS =====
  {
    type: 'customer', name: 'Ramesh Kumar',
    phone: '9876543217',
    address: { line1: 'Flat 12B, Green Society', city: 'Mumbai', state: 'Maharashtra', pincode: '400067' },
  },
  {
    type: 'customer', name: 'Sita Enterprises',
    gstin: '27HHHHH1234H1Z2', phone: '9876543218', email: 'sita@sitaent.in',
    address: { line1: 'Shop 3, Dadar', city: 'Mumbai', state: 'Maharashtra', pincode: '400014' },
    creditLimitPaise: 500000,  // ₹5,000
    creditDays: 15,
  },
];

async function main() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected\n');

  if (CLEAR) {
    console.log('🧹 Clearing master data...');
    await Party.deleteMany({});
    await Product.deleteMany({});
    await Godown.deleteMany({});
    await Unit.deleteMany({});
    console.log('✅ Cleared\n');
  }

  // 1) UNITS
  const unitMap = {};
  let unitsCreated = 0;
  for (const u of UNITS_SEED) {
    let doc = await Unit.findOne({ name: u.name });
    if (!doc) {
      doc = await Unit.create(u);
      unitsCreated++;
    }
    unitMap[u.symbol] = doc._id;
  }
  console.log(`✅ Units:    ${unitsCreated} created, ${UNITS_SEED.length - unitsCreated} existed`);

  // 2) GODOWNS
  let godownsCreated = 0;
  for (const g of GODOWNS_SEED) {
    const exists = await Godown.findOne({ name: g.name });
    if (!exists) {
      await Godown.create(g);
      godownsCreated++;
    }
  }
  console.log(`✅ Godowns:  ${godownsCreated} created`);

  // 3) PRODUCTS
  const productBySku = {};
  let productsCreated = 0;
  for (const p of PRODUCTS_SEED) {
    let doc = await Product.findOne({ sku: p.sku });
    if (!doc) {
      doc = await Product.create({
        type: p.type,
        name: p.name,
        sku: p.sku,
        unit: unitMap[p.unit],
        hsnCode: p.hsnCode,
        taxRate: p.taxRate,
        basePricePaise: p.basePricePaise,
        costPerUnitPaise: p.costPerUnitPaise,
        reorderPoint: p.reorderPoint,
        reorderQty: p.reorderQty,
        description: '',
        isActive: true,
      });
      productsCreated++;
    }
    productBySku[p.sku] = doc._id;
  }
  console.log(`✅ Products: ${productsCreated} created`);

  // 4) PARTIES (pricing rules resolve via SKU → _id)
  let partiesCreated = 0;
  for (const def of PARTIES_SEED) {
    const exists = await Party.findOne({ name: def.name, type: def.type });
    if (exists) continue;

    const pricingRules = (def.pricingRules || []).map((r) => ({
      productId: productBySku[r.sku],
      pricePaise: r.pricePaise,
    }));

    await Party.create({
      type: def.type,
      name: def.name,
      gstin: def.gstin || '',
      phone: def.phone || '',
      email: def.email || '',
      address: def.address || {},
      pricingRules,
      creditLimitPaise: def.creditLimitPaise || 0,
      creditDays: def.creditDays || 0,
      isActive: true,
    });
    partiesCreated++;
  }
  console.log(`✅ Parties:  ${partiesCreated} created\n`);

  // Summary
  const [units, godowns, products, parties] = await Promise.all([
    Unit.countDocuments(),
    Godown.countDocuments(),
    Product.countDocuments(),
    Party.countDocuments(),
  ]);

  console.log('📊 TOTALS IN DB:');
  console.log(`   Units:    ${units}`);
  console.log(`   Godowns:  ${godowns}`);
  console.log(`   Products: ${products}`);
  console.log(`   Parties:  ${parties}`);

  await mongoose.disconnect();
  console.log('\n✅ Done.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});