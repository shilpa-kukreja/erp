import mongoose from 'mongoose';

const stockReservationSchema = new mongoose.Schema(
  {
    orderId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    godownId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Godown',  required: true },
    qty:       { type: Number, required: true, min: 0 },
    status:    { type: String, enum: ['active', 'consumed', 'released'], default: 'active' },
    consumedAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: true, versionKey: false }
);

stockReservationSchema.index({ orderId: 1, status: 1 });
stockReservationSchema.index({ productId: 1, godownId: 1, status: 1 });

const StockReservation = mongoose.model('StockReservation', stockReservationSchema);
export default StockReservation;