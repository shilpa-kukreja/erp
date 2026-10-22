import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  { _id: { type: String, required: true }, value: { type: Number, default: 0 } },
  { versionKey: false }
);

const Counter = mongoose.model('Counter', counterSchema);

export async function getNextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc.value;
}

export default Counter;