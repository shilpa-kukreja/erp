const log = (level, ...args) =>
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}]`, ...args);

const logger = {
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a),
};

export default logger;