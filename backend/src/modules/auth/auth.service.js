import User from '../../models/User.js';
import RefreshToken from '../../models/RefreshToken.js';
import { ROLES } from '../../constants/roles.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken, hashToken,
} from '../../utils/jwt.js';
import env from '../../config/env.js';

const userPublic = (u) => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  isActive: u.isActive,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
});

function parseExpiryToMs(expiresIn) {
  const m = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(m[1], 10) * mult[m[2]];
}

export async function hasAnyUser() {
  return (await User.estimatedDocumentCount()) > 0;
}

export async function registerFirstOwner({ name, email, phone, password }) {
  if (await hasAnyUser()) {
    const err = new Error('Registration is closed. Please contact the owner.');
    err.status = 403;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  return User.create({
    name, email, phone: phone || null, passwordHash,
    role: ROLES.OWNER, isActive: true,
  });
}

async function issueTokens(user, req) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), typ: 'refresh' });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN));

  await RefreshToken.create({
    userId: user._id, tokenHash, expiresAt,
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
  });

  return { accessToken, refreshToken };
}

export async function login({ email, password }, req) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) { const e = new Error('Invalid email or password'); e.status = 401; throw e; }
  if (!user.isActive) { const e = new Error('Account is disabled. Contact the owner.'); e.status = 403; throw e; }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const e = new Error('Invalid email or password'); e.status = 401; throw e;
  }
  user.lastLoginAt = new Date();
  await user.save();
  return { user, tokens: await issueTokens(user, req) };
}

export async function rotateRefresh(refreshTokenRaw, req) {
  let payload;
  try { payload = verifyRefreshToken(refreshTokenRaw); }
  catch { const e = new Error('Invalid refresh token'); e.status = 401; throw e; }

  if (payload.typ !== 'refresh') { const e = new Error('Invalid token type'); e.status = 401; throw e; }

  const tokenHash = hashToken(refreshTokenRaw);
  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing || existing.revokedAt) { const e = new Error('Refresh token revoked'); e.status = 401; throw e; }
  if (existing.expiresAt.getTime() < Date.now()) { const e = new Error('Refresh token expired'); e.status = 401; throw e; }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) { const e = new Error('User not active'); e.status = 401; throw e; }

  const newAccessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const newRefreshToken = signRefreshToken({ sub: user._id.toString(), typ: 'refresh' });
  const newHash = hashToken(newRefreshToken);

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = newHash;
  await existing.save();

  await RefreshToken.create({
    userId: user._id, tokenHash: newHash,
    expiresAt: new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN)),
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
  });

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshTokenRaw) {
  if (!refreshTokenRaw) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(refreshTokenRaw), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function getMe(userId) {
  const u = await User.findById(userId).lean();
  if (!u) { const e = new Error('User not found'); e.status = 404; throw e; }
  return userPublic(u);
}

export { userPublic, issueTokens };