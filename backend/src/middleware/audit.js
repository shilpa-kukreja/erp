import AuditLog from '../models/AuditLog.js';

function getClientMeta(req) {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

export async function writeAudit(req, { action, entity = 'User', entityId = null, before = null, after = null, meta = null }) {
  try {
    const { ip, userAgent } = getClientMeta(req);
    await AuditLog.create({
      userId: req.user?._id || null,
      action, entity, entityId, before, after, ip, userAgent, meta,
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}