const config = require('../config');

/**
 * Global error handler middleware.
 * Catches all errors thrown/passed via next(err) and returns a uniform JSON response.
 * Sanitizes errors in production to prevent fingerprinting or information leakage.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (config.nodeEnv !== 'production') {
    console.error('[ERROR]', err);
  } else {
    // In production, log without sensitive details
    console.error(`[ERROR] ${req.method} ${req.originalUrl}: ${err.message || 'Internal Server Error'}`);
  }

  // Zod validation errors (safe to return formatted field errors)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists.',
      ...(config.nodeEnv !== 'production' && { detail: err.detail }),
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced resource does not exist.',
      ...(config.nodeEnv !== 'production' && { detail: err.detail }),
    });
  }

  // Custom application errors (with specific status codes)
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Default: Internal Server Error (500)
  const statusCode = err.statusCode || 500;
  const message =
    config.nodeEnv === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
