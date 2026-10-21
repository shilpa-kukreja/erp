import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './stock.service.js';

export const adjust = asyncHandler(async (req, res) => {
  const entry = await svc.adjustStock(req.body, req.user._id);
  await writeAudit(req, {
    action: `stock.${req.body.reason}`, entity: 'StockLedger', entityId: entry._id,
    after: { productId: req.body.productId, godownId: req.body.godownId, qtyChange: req.body.qtyChange },
  });
  res.status(201).json({ success: true, data: { entry } });
});

export const transfer = asyncHandler(async (req, res) => {
  const entries = await svc.transferStock(req.body, req.user._id);
  await writeAudit(req, {
    action: 'stock.transfer', entity: 'StockLedger',
    after: { productId: req.body.productId, from: req.body.fromGodownId, to: req.body.toGodownId, qty: req.body.qty },
  });
  res.status(201).json({ success: true, data: { entries } });
});

export const reserve = asyncHandler(async (req, res) => {
  const reservations = await svc.reserveStock(req.body, req.user._id);
  await writeAudit(req, {
    action: 'stock.reserve', entity: 'StockReservation',
    after: { orderId: req.body.orderId, count: reservations.length },
  });
  res.status(201).json({ success: true, data: { reservations: reservations.map((r) => r._id.toString()) } });
});

export const release = asyncHandler(async (req, res) => {
  const result = await svc.releaseStock(req.body);
  await writeAudit(req, { action: 'stock.release', entity: 'StockReservation', after: { orderId: req.body.orderId, ...result } });
  res.json({ success: true, data: result });
});

export const consume = asyncHandler(async (req, res) => {
  const result = await svc.consumeStock(req.body, req.user._id);
  await writeAudit(req, { action: 'stock.consume', entity: 'StockReservation', after: { orderId: req.body.orderId, ...result } });
  res.json({ success: true, data: result });
});

export const listBalances = asyncHandler(async (req, res) => {
  const result = await svc.listBalances(req.query);
  res.json({ success: true, data: result });
});

export const listLedger = asyncHandler(async (req, res) => {
  const result = await svc.listLedger(req.query);
  res.json({ success: true, data: result });
});

export const listReservations = asyncHandler(async (req, res) => {
  const result = await svc.listReservations(req.query);
  res.json({ success: true, data: result });
});