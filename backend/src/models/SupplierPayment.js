import mongoose from 'mongoose';

const allocationSchema = new mongoose.Schema({
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseBill', required: true },
  amountPaise: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Must be integer' } }
}, { _id: false });

const supplierPaymentSchema = new mongoose.Schema({
  paymentNo: { type: String, required: true, unique: true, trim: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  amountPaise: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Must be integer' } },
  mode: { type: String, enum: ['cash', 'bank', 'upi', 'cheque'], required: true },
  referenceNo: { type: String, trim: true, default: '' },
  paidAt: { type: Date, required: true },
  allocations: { type: [allocationSchema], default: [] },
  notes: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, strict: true, versionKey: false });

supplierPaymentSchema.index({ supplierId: 1, paidAt: -1 });

export default mongoose.model('SupplierPayment', supplierPaymentSchema);