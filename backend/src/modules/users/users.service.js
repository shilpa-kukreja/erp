import User from '../../models/User.js';
import RefreshToken from '../../models/RefreshToken.js';
import { ROLES } from '../../constants/roles.js';
import { hashPassword } from '../../utils/password.js';

const userPublic = (u) => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  isActive: u.isActive,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function countActiveOwners(excludeId = null) {
  const q = { role: ROLES.OWNER, isActive: true };
  if (excludeId) q._id = { $ne: excludeId };
  return User.countDocuments(q);
}

export async function createUser({ name, email, phone, password, role }, actor) {
  if (actor.role !== ROLES.OWNER) throw httpError(403, 'Only owner can create users');
  if (role === ROLES.OWNER && actor.role !== ROLES.OWNER) {
    throw httpError(403, 'Only owner can create another owner');
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) throw httpError(409, 'Email already in use');

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    phone: phone || null,
    passwordHash,
    role,
    isActive: true,
    createdBy: actor._id,
  });
  return userPublic(user);
}

export async function listUsers({ page, limit, search, role, isActive }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const q = {};

  if (search && search.trim()) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (role) q.role = role;
  if (isActive !== undefined) q.isActive = isActive === 'true';

  const [items, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    User.countDocuments(q),
  ]);

  return {
    items: items.map(userPublic),
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) || 1 },
  };
}

export async function getUser(id) {
  const u = await User.findById(id).lean();
  if (!u) throw httpError(404, 'User not found');
  return userPublic(u);
}

export async function updateUser(id, updates, actor) {
  const user = await User.findById(id);
  if (!user) throw httpError(404, 'User not found');

  // Role change checks
  if (updates.role !== undefined && updates.role !== user.role) {
    if (updates.role === ROLES.OWNER && actor.role !== ROLES.OWNER) {
      throw httpError(403, 'Only owner can promote to owner');
    }
    if (user.role === ROLES.OWNER && updates.role !== ROLES.OWNER) {
      const remaining = await countActiveOwners(user._id);
      if (remaining < 1) throw httpError(400, 'Cannot demote the last active owner');
    }
  }

  // Deactivation checks
  if (updates.isActive === false && user.isActive) {
    if (user._id.toString() === actor._id.toString()) {
      throw httpError(400, 'You cannot deactivate your own account');
    }
    if (user.role === ROLES.OWNER) {
      const remaining = await countActiveOwners(user._id);
      if (remaining < 1) throw httpError(400, 'Cannot deactivate the last active owner');
    }
  }

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.phone !== undefined) user.phone = updates.phone || null;
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.isActive !== undefined) user.isActive = updates.isActive;

  await user.save();

  // Deactivation → revoke all active sessions for that user
  if (updates.isActive === false) {
    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  return userPublic(user);
}

export async function resetPassword(id, newPassword) {
  const user = await User.findById(id).select('+passwordHash');
  if (!user) throw httpError(404, 'User not found');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  // Invalidate all sessions
  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { success: true };
}