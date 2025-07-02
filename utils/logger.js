// utils/logger.js
const colors = {
  reset: "\x1b[0m",
  info: "\x1b[36m",    // Cyan
  success: "\x1b[32m", // Green
  warn: "\x1b[33m",   // Yellow
  error: "\x1b[31m",   // Red
};

const log = (color, type, message) => {
    console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${message}`);
};

module.exports = {
  info: (message) => log(colors.info, 'info', message),
  success: (message) => log(colors.success, 'success', message),
  warn: (message) => log(colors.warn, 'warn', message),
  error: (message, errorObj = null) => {
      log(colors.error, 'error', message);
      if (errorObj) {
          console.error(errorObj);
      }
  },
};