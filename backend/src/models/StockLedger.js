import mongoose from 'mongoose';

export const STOCK_REASONS = [
  'opening', 'purchase', 'production-in', 'production-out', 'sale',
  'sale-return', 'adjustment', 'transfer-in', 'transfer-out',
];

export const STOCK_REF_TYPES = ['manual', 'purchase', 'production', 'sales-order', 'transfer', 'audit', 'opening'];

const stockLedgerSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    godownId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Godown',  required: true },
    qtyChange: { type: Number, required: true },
    qtyBefore: { type: Number, required: true },
    qtyAfter:  { type: Number, required: true },
    reason:    { type: String, enum: STOCK_REASONS, required: true },
    refType:   { type: String, enum: STOCK_REF_TYPES, default: 'manual' },
    refId:     { type: mongoose.Schema.Types.ObjectId, default: null },
    note:      { type: String, default: '', trim: true, maxlength: 300 },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: true, versionKey: false }
);

stockLedgerSchema.index({ productId: 1, godownId: 1, createdAt: -1 });
stockLedgerSchema.index({ refType: 1, refId: 1 });
stockLedgerSchema.index({ reason: 1, createdAt: -1 });
stockLedgerSchema.index({ createdAt: -1 });

const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);
export default StockLedger;