import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 0.01 },
  ratePaise: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, required: true, min: 0, max: 28 },
  lineSubtotalPaise: { type: Number, required: true, min: 0 },
  lineTaxPaise: { type: Number, required: true, min: 0 },
  lineTotalPaise: { type: Number, required: true, min: 0 },
}, { _id: false });

const purchaseReturnSchema = new mongoose.Schema({
  returnNo: { type: String, required: true, unique: true, trim: true },
  purchaseBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseBill', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown', required: true },
  items: { type: [returnItemSchema], required: true, validate: [(v) => v.length > 0, 'At least one item required'] },
  subTotalPaise: { type: Number, required: true, min: 0 },
  taxPaise: { type: Number, required: true, min: 0 },
  grandTotalPaise: { type: Number, required: true, min: 0 },
  reason: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['confirmed'], default: 'confirmed' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, strict: true, versionKey: false });

export default mongoose.model('PurchaseReturn', purchaseReturnSchema);