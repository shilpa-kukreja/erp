import mongoose from 'mongoose';

export const PARTY_TYPES = ['customer', 'dealer', 'distributor', 'supplier'];

const pricingRuleSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    pricePaise: {
      type: Number, required: true, min: 0,
      validate: { validator: Number.isInteger, message: 'pricePaise must be integer' },
    },
  },
  { _id: false }
);

const partySchema = new mongoose.Schema(
  {
    type: { type: String, enum: PARTY_TYPES, required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    gstin: { type: String, default: '', trim: true, uppercase: true, maxlength: 15 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 120 },
    address: {
      line1: { type: String, default: '', trim: true, maxlength: 200 },
      city: { type: String, default: '', trim: true, maxlength: 60 },
      state: { type: String, default: '', trim: true, maxlength: 60 },
      pincode: { type: String, default: '', trim: true, maxlength: 10 },
    },
    pricingRules: { type: [pricingRuleSchema], default: [] },
    creditLimitPaise: {
      type: Number, default: 0, min: 0,
      validate: { validator: Number.isInteger, message: 'creditLimitPaise must be integer' },
    },
    creditDays: { type: Number, default: 0, min: 0, max: 365 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true, versionKey: false }
);

partySchema.index({ type: 1, isActive: 1 });
partySchema.index({ name: 'text', phone: 'text', gstin: 'text' });

const Party = mongoose.model('Party', partySchema);
export default Party;