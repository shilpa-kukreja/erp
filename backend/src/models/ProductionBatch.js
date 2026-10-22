import mongoose from 'mongoose';

const bomSnapshotSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qtyPerUnit: { type: Number, required: true, min: 0 },  // qty per 1 unit of output
}, { _id: false });

const materialUsedSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qtyRequired: { type: Number, required: true, min: 0 },  // BOM-derived
  qtyUsed: { type: Number, required: true, min: 0 },      // actual (editable at complete)
}, { _id: false });

const productionBatchSchema = new mongoose.Schema({
  batchNo: { type: String, required: true, unique: true, trim: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  bomId: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM', required: true },
  bomSnapshot: { type: [bomSnapshotSchema], required: true },
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown', required: true },
  plannedQty: { type: Number, required: true, min: 0 },
  materialsUsed: { type: [materialUsedSchema], default: [] },
  producedQty: { type: Number, default: 0, min: 0 },
  wastageQty: { type: Number, default: 0, min: 0 },
  mfgDate: { type: Date, required: true },
  expDate: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'completed', 'cancelled'], default: 'draft' },
  completedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, strict: true, versionKey: false });

productionBatchSchema.index({ productId: 1, status: 1 });
productionBatchSchema.index({ status: 1, createdAt: -1 });
productionBatchSchema.index({ batchNo: 1 }, { unique: true });
productionBatchSchema.index({ mfgDate: -1 });

const ProductionBatch = mongoose.model('ProductionBatch', productionBatchSchema);
export default ProductionBatch;