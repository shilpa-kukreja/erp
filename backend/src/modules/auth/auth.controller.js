import asyncHandler from '../../utils/asyncHandler.js';
import { writeAudit } from '../../middleware/audit.js';
import * as svc from './auth.service.js';
import env from '../../config/env.js';

const accessCookie = {
  httpOnly: true, secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  domain: env.COOKIE_DOMAIN, maxAge: 15 * 60 * 1000, path: '/',
};
const refreshCookie = {
  httpOnly: true, secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  domain: env.COOKIE_DOMAIN, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/',
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const user = await svc.registerFirstOwner({ name, email, phone, password });
  const tokens = await svc.issueTokens(user, req);

  req.user = { _id: user._id.toString() };
  await writeAudit(req, {
    action: 'auth.register', entity: 'User', entityId: user._id,
    after: { email: user.email, role: user.role },
  });

  res.cookie('access_token', tokens.accessToken, accessCookie);
  res.cookie('refresh_token', tokens.refreshToken, refreshCookie);
  res.status(201).json({ success: true, data: { user: svc.userPublic(user) } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  try {
    const { user, tokens } = await svc.login({ email, password }, req);
    req.user = { _id: user._id.toString() };
    await writeAudit(req, { action: 'auth.login.success', entity: 'User', entityId: user._id, meta: { email } });

    res.cookie('access_token', tokens.accessToken, accessCookie);
    res.cookie('refresh_token', tokens.refreshToken, refreshCookie);
    res.json({ success: true, data: { user: svc.userPublic(user) } });
  } catch (err) {
    await writeAudit(req, { action: 'auth.login.failure', entity: 'User', meta: { email, reason: err.message } });
    throw err;
  }
});

export const refresh = asyncHandler(async (req, res) => {
  const rt = req.cookies?.refresh_token;
  if (!rt) return res.status(401).json({ success: false, message: 'No refresh token' });

  const { user, accessToken, refreshToken } = await svc.rotateRefresh(rt, req);
  res.cookie('access_token', accessToken, accessCookie);
  res.cookie('refresh_token', refreshToken, refreshCookie);
  res.json({ success: true, data: { user: svc.userPublic(user) } });
});

export const logout = asyncHandler(async (req, res) => {
  await svc.logout(req.cookies?.refresh_token);

  await writeAudit(req, {
    action: 'auth.logout',
    entity: 'User',
    entityId: req.user?._id || null,
  });

  // ⚠️ Must match the SAME options used when setting the cookie
  const clearOpts = {
    path: '/',
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN,
  };

  res.clearCookie('access_token', clearOpts);
  res.clearCookie('refresh_token', clearOpts);

  res.json({ success: true, message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await svc.getMe(req.user._id);
  res.json({ success: true, data: { user } });
});

export const status = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { hasAnyUser: await svc.hasAnyUser() } });
});