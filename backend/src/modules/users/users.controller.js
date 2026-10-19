import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './users.service.js';

export const create = asyncHandler(async (req, res) => {
  const user = await svc.createUser(req.body, req.user);
  await writeAudit(req, {
    action: 'user.create',
    entity: 'User',
    entityId: user.id,
    after: { email: user.email, role: user.role, name: user.name },
  });
  res.status(201).json({ success: true, data: { user } });
});

export const list = asyncHandler(async (req, res) => {
  const result = await svc.listUsers(req.query);
  res.json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req, res) => {
  const user = await svc.getUser(req.params.id);
  res.json({ success: true, data: { user } });
});

export const update = asyncHandler(async (req, res) => {
  const before = await svc.getUser(req.params.id);
  const user = await svc.updateUser(req.params.id, req.body, req.user);
  await writeAudit(req, {
    action: 'user.update',
    entity: 'User',
    entityId: user.id,
    before: { name: before.name, phone: before.phone, role: before.role, isActive: before.isActive },
    after: { name: user.name, phone: user.phone, role: user.role, isActive: user.isActive },
  });
  res.json({ success: true, data: { user } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await svc.resetPassword(req.params.id, req.body.newPassword);
  await writeAudit(req, {
    action: 'user.reset_password',
    entity: 'User',
    entityId: req.params.id,
  });
  res.json({ success: true, message: 'Password reset. All sessions of this user revoked.' });
});