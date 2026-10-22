import mongoose from 'mongoose';

export const PURCHASE_STATUSES = ['draft', 'confirmed'];

const itemSchema = new mongoose.Schema(
  {
    productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty:          { type: Number, required: true, min: 0 },
    ratePaise:    { type: Number, required: true, min: 0,
                    validate: { validator: Number.isInteger, message: 'ratePaise must be integer paise' } },
    taxRate:      { type: Number, required: true, min: 0, max: 28 },
    lineSubtotalPaise: { type: Number, required: true, min: 0,
                    validate: { validator: Number.isInteger, message: 'lineSubtotalPaise must be integer' } },
    lineTaxPaise: { type: Number, required: true, min: 0,
                    validate: { validator: Number.isInteger, message: 'lineTaxPaise must be integer' } },
    lineTotalPaise: { type: Number, required: true, min: 0,
                    validate: { validator: Number.isInteger, message: 'lineTotalPaise must be integer' } },
  },
  { _id: false }
);

const purchaseBillSchema = new mongoose.Schema(
  {
    purchaseNo: { type: String, required: true, unique: true, trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
    godownId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Godown', required: true },
    billNo:     { type: String, required: true, trim: true, maxlength: 40 },
    billDate:   { type: Date, required: true },
    dueDate:    { type: Date, default: null },
    items:      { type: [itemSchema], required: true, validate: [(v) => v.length > 0, 'At least one item required'] },
    subTotalPaise: { type: Number, required: true, min: 0,
                     validate: { validator: Number.isInteger, message: 'subTotalPaise must be integer' } },
    taxPaise:   { type: Number, required: true, min: 0,
                  validate: { validator: Number.isInteger, message: 'taxPaise must be integer' } },
    grandTotalPaise: { type: Number, required: true, min: 0,
                       validate: { validator: Number.isInteger, message: 'grandTotalPaise must be integer' } },
    paidPaise:  { type: Number, default: 0, min: 0,
                  validate: { validator: Number.isInteger, message: 'paidPaise must be integer' } },
    status:     { type: String, enum: PURCHASE_STATUSES, default: 'draft', required: true },
    notes:      { type: String, default: '', trim: true, maxlength: 500 },
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, strict: true, versionKey: false }
);

purchaseBillSchema.index({ supplierId: 1, status: 1 });
purchaseBillSchema.index({ godownId: 1, status: 1 });
purchaseBillSchema.index({ status: 1, createdAt: -1 });
purchaseBillSchema.index({ purchaseNo: 1 }, { unique: true });

const PurchaseBill = mongoose.model('PurchaseBill', purchaseBillSchema);
export default PurchaseBill;