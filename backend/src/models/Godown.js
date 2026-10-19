import mongoose from 'mongoose';

const godownSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 80 },
    address: { type: String, default: '', trim: true, maxlength: 300 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true, versionKey: false }
);

godownSchema.index({ isActive: 1 });

const Godown = mongoose.model('Godown', godownSchema);
export default Godown;