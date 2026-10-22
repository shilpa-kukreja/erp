import mongoose from 'mongoose';

const bomItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 0,
         validate: { validator: (v) => v > 0, message: 'qty must be > 0' } },
}, { _id: false });

const bomSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  outputQty: { type: Number, required: true, min: 0, default: 1,
               validate: { validator: (v) => v > 0, message: 'outputQty must be > 0' } },
  items: { type: [bomItemSchema], required: true,
           validate: { validator: (v) => v.length > 0, message: 'At least one item required' } },
  notes: { type: String, default: '', trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, strict: true, versionKey: false });

// Only ONE active BOM per product
bomSchema.index({ productId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
bomSchema.index({ isActive: 1 });

const BOM = mongoose.model('BOM', bomSchema);
export default BOM;