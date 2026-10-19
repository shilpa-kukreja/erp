import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User no longer active' });
    }

    req.user = { _id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}