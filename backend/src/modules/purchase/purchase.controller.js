import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './purchase.service.js';

export const create = asyncHandler(async (req, res) => {
  const bill = await svc.createPurchase(req.body, req.user._id);
  await writeAudit(req, {
    action: 'purchase.create', entity: 'PurchaseBill', entityId: bill.id,
    after: { purchaseNo: bill.purchaseNo, grandTotalPaise: bill.grandTotalPaise, supplierId: bill.supplierId },
  });
  res.status(201).json({ success: true, data: { bill } });
});

export const list = asyncHandler(async (req, res) => {
  const result = await svc.listPurchases(req.query);
  res.json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req, res) => {
  const bill = await svc.getPurchase(req.params.id);
  res.json({ success: true, data: { bill } });
});

export const confirm = asyncHandler(async (req, res) => {
  const bill = await svc.confirmPurchase(req.params.id, req.user._id);
  await writeAudit(req, {
    action: 'purchase.confirm', entity: 'PurchaseBill', entityId: bill.id,
    after: { purchaseNo: bill.purchaseNo, status: 'confirmed' },
  });
  res.json({ success: true, data: { bill } });
});