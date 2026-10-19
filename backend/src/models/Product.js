import mongoose from 'mongoose';

export const PRODUCT_TYPES = ['raw', 'packing', 'semi', 'finished', 'traded'];
export const TAX_RATES = [0, 5, 12, 18, 28];

const productSchema = new mongoose.Schema(
  {
    type: { type: String, enum: PRODUCT_TYPES, required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    hsnCode: { type: String, default: '', trim: true, maxlength: 12 },
    taxRate: { type: Number, enum: TAX_RATES, required: true, default: 18 },
    basePricePaise: {
      type: Number, required: true, min: 0,
      validate: { validator: Number.isInteger, message: 'basePricePaise must be integer paise' },
    },
    costPerUnitPaise: {
      type: Number, default: 0, min: 0,
      validate: { validator: Number.isInteger, message: 'costPerUnitPaise must be integer paise' },
    },
    reorderPoint: { type: Number, default: 0, min: 0 },
    reorderQty: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true, versionKey: false }
);

productSchema.index({ type: 1, isActive: 1 });
productSchema.index({ name: 'text', sku: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;