/**
 * Centralized error handler middleware
 */
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error(`${status} – ${message} – ${req.method} ${req.originalUrl}`, {
    stack: err.stack,
    body:  req.body,
  });

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File size too large (max 5 MB).' });
  }

  // MySQL error handling
  if (err.code === 'ER_DUP_ENTRY') {
    const field = (err.message.match(/for key '([^']+)'/) || [])[1] || 'field';
    return res.status(409).json({ success: false, message: `Duplicate entry: ${field} already exists.` });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
  }

  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
