import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './masterdata.service.js';

// ===== UNITS =====
export const createUnit = asyncHandler(async (req, res) => {
  const unit = await svc.createUnit(req.body);
  await writeAudit(req, { action: 'unit.create', entity: 'Unit', entityId: unit.id, after: unit });
  res.status(201).json({ success: true, data: { unit } });
});
export const listUnits = asyncHandler(async (req, res) => {
  const result = await svc.listUnits(req.query);
  res.json({ success: true, data: result });
});
export const updateUnit = asyncHandler(async (req, res) => {
  const unit = await svc.updateUnit(req.params.id, req.body);
  await writeAudit(req, { action: 'unit.update', entity: 'Unit', entityId: unit.id, after: unit });
  res.json({ success: true, data: { unit } });
});

// ===== GODOWNS =====
export const createGodown = asyncHandler(async (req, res) => {
  const godown = await svc.createGodown(req.body);
  await writeAudit(req, { action: 'godown.create', entity: 'Godown', entityId: godown.id, after: godown });
  res.status(201).json({ success: true, data: { godown } });
});
export const listGodowns = asyncHandler(async (req, res) => {
  const result = await svc.listGodowns(req.query);
  res.json({ success: true, data: result });
});
export const updateGodown = asyncHandler(async (req, res) => {
  const godown = await svc.updateGodown(req.params.id, req.body);
  await writeAudit(req, { action: 'godown.update', entity: 'Godown', entityId: godown.id, after: godown });
  res.json({ success: true, data: { godown } });
});

// ===== PRODUCTS =====
export const createProduct = asyncHandler(async (req, res) => {
  const product = await svc.createProduct(req.body);
  await writeAudit(req, { action: 'product.create', entity: 'Product', entityId: product.id, after: product });
  res.status(201).json({ success: true, data: { product } });
});
export const listProducts = asyncHandler(async (req, res) => {
  const result = await svc.listProducts(req.query);
  res.json({ success: true, data: result });
});
export const getProduct = asyncHandler(async (req, res) => {
  const product = await svc.getProduct(req.params.id);
  res.json({ success: true, data: { product } });
});
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await svc.updateProduct(req.params.id, req.body);
  await writeAudit(req, { action: 'product.update', entity: 'Product', entityId: product.id, after: product });
  res.json({ success: true, data: { product } });
});

// ===== PARTIES =====
export const createParty = asyncHandler(async (req, res) => {
  const party = await svc.createParty(req.body);
  await writeAudit(req, { action: 'party.create', entity: 'Party', entityId: party.id, after: party });
  res.status(201).json({ success: true, data: { party } });
});
export const listParties = asyncHandler(async (req, res) => {
  const result = await svc.listParties(req.query);
  res.json({ success: true, data: result });
});
export const getParty = asyncHandler(async (req, res) => {
  const party = await svc.getParty(req.params.id);
  res.json({ success: true, data: { party } });
});
export const updateParty = asyncHandler(async (req, res) => {
  const party = await svc.updateParty(req.params.id, req.body);
  await writeAudit(req, { action: 'party.update', entity: 'Party', entityId: party.id, after: party });
  res.json({ success: true, data: { party } });
});
export const effectivePrice = asyncHandler(async (req, res) => {
  const result = await svc.getEffectivePrice(req.params.partyId, req.params.productId);
  res.json({ success: true, data: result });
});

// ===== SEED =====
export const seedDefaults = asyncHandler(async (req, res) => {
  const result = await svc.seedDefaults();
  await writeAudit(req, { action: 'masterdata.seed_defaults', entity: 'System', after: result });
  res.json({ success: true, data: result });
});





export const deleteUnit = asyncHandler(async (req, res) => {
  const result = await svc.deleteUnit(req.params.id);
  await writeAudit(req, { action: 'unit.delete', entity: 'Unit', entityId: req.params.id });
  res.json({ success: true, data: result });
});

export const deleteGodown = asyncHandler(async (req, res) => {
  const result = await svc.deleteGodown(req.params.id);
  await writeAudit(req, { action: 'godown.delete', entity: 'Godown', entityId: req.params.id });
  res.json({ success: true, data: result });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await svc.deleteProduct(req.params.id);
  await writeAudit(req, { action: 'product.delete', entity: 'Product', entityId: req.params.id });
  res.json({ success: true, data: result });
});

export const deleteParty = asyncHandler(async (req, res) => {
  const result = await svc.deleteParty(req.params.id);
  await writeAudit(req, { action: 'party.delete', entity: 'Party', entityId: req.params.id });
  res.json({ success: true, data: result });
});