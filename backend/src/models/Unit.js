import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 1, maxlength: 40 },
    symbol: { type: String, required: true, trim: true, minlength: 1, maxlength: 10 },
    type: { type: String, enum: ['weight', 'volume', 'count'], required: true },
    decimalPlaces: { type: Number, min: 0, max: 4, default: 2 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true, versionKey: false }
);

unitSchema.index({ isActive: 1 });

const Unit = mongoose.model('Unit', unitSchema);
export default Unit;