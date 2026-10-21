import mongoose from 'mongoose';

const stockBalanceSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    godownId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Godown',  required: true },
    physicalQty: { type: Number, default: 0 },
    reservedQty: { type: Number, default: 0 },
  },
  { timestamps: true, strict: true, versionKey: false }
);

stockBalanceSchema.index({ productId: 1, godownId: 1 }, { unique: true });
stockBalanceSchema.index({ godownId: 1 });
stockBalanceSchema.index({ productId: 1 });

const StockBalance = mongoose.model('StockBalance', stockBalanceSchema);
export default StockBalance;