import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './supplier-payments.service.js';

export const create = asyncHandler(async (req, res) => {
  const payment = await svc.createPayment(req.body, req.user._id);
  await writeAudit(req, {
    action: 'supplier_payment.create', entity: 'SupplierPayment', entityId: payment._id.toString(),
    after: { paymentNo: payment.paymentNo, amountPaise: payment.amountPaise }
  });
  res.status(201).json({ success: true, data: { payment } });
});

export const aging = asyncHandler(async (req, res) => {
  const report = await svc.getAgingReport();
  res.json({ success: true, data: { report } });
});