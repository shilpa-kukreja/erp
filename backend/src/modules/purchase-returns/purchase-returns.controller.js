import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './purchase-returns.service.js';

export const create = asyncHandler(async (req, res) => {
  const purchaseReturn = await svc.createReturn(req.body, req.user._id);
  await writeAudit(req, {
    action: 'purchase_return.create', entity: 'PurchaseReturn', entityId: purchaseReturn._id.toString(),
    after: { returnNo: purchaseReturn.returnNo, grandTotalPaise: purchaseReturn.grandTotalPaise }
  });
  res.status(201).json({ success: true, data: { purchaseReturn } });
});

export const list = asyncHandler(async (req, res) => {
  const returns = await svc.listReturns(req.query);
  res.json({ success: true, data: { returns } });
});