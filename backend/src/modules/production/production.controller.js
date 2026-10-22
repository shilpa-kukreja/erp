import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './production.service.js';

export const createBom = asyncHandler(async (req, res) => {
  const bom = await svc.createBom(req.body, req.user._id);
  await writeAudit(req, { action: 'bom.create', entity: 'BOM', entityId: bom.id,
    after: { productId: bom.productId, outputQty: bom.outputQty, itemsCount: bom.items.length } });
  res.status(201).json({ success: true, data: { bom } });
});

export const listBoms = asyncHandler(async (req, res) => {
  const result = await svc.listBoms(req.query);
  res.json({ success: true, data: result });
});

export const getBom = asyncHandler(async (req, res) => {
  const bom = await svc.getBom(req.params.id);
  res.json({ success: true, data: { bom } });
});

export const updateBom = asyncHandler(async (req, res) => {
  const bom = await svc.updateBom(req.params.id, req.body);
  await writeAudit(req, { action: 'bom.update', entity: 'BOM', entityId: bom.id,
    after: { productId: bom.productId, outputQty: bom.outputQty, isActive: bom.isActive } });
  res.json({ success: true, data: { bom } });
});

export const createBatch = asyncHandler(async (req, res) => {
  const batch = await svc.createBatch(req.body, req.user._id);
  await writeAudit(req, { action: 'production.create', entity: 'ProductionBatch', entityId: batch.id,
    after: { batchNo: batch.batchNo, productId: batch.productId, plannedQty: batch.plannedQty } });
  res.status(201).json({ success: true, data: { batch } });
});

export const listBatches = asyncHandler(async (req, res) => {
  const result = await svc.listBatches(req.query);
  res.json({ success: true, data: result });
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await svc.getBatch(req.params.id);
  res.json({ success: true, data: { batch } });
});

export const completeBatch = asyncHandler(async (req, res) => {
  const batch = await svc.completeBatch(req.params.id, req.body, req.user._id);
  await writeAudit(req, { action: 'production.complete', entity: 'ProductionBatch', entityId: batch.id,
    after: { batchNo: batch.batchNo, producedQty: batch.producedQty, wastageQty: batch.wastageQty } });
  res.json({ success: true, data: { batch } });
});

export const cancelBatch = asyncHandler(async (req, res) => {
  const batch = await svc.cancelBatch(req.params.id);
  await writeAudit(req, { action: 'production.cancel', entity: 'ProductionBatch', entityId: batch.id,
    after: { batchNo: batch.batchNo } });
  res.json({ success: true, data: { batch } });
});