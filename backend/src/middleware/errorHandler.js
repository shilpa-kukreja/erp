import env from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  if (status >= 500) console.error('❌', err);

  const body = { success: false, message };
  if (err.errors) body.errors = err.errors;
  if (!env.isProd && err.stack) body.stack = err.stack;
  res.status(status).json(body);
}