/**
 * Input sanitization middleware for XSS protection and input hygiene.
 * Recursively cleans strings in req.body, req.query, and req.params by
 * stripping executable script tags, event handlers, and dangerous protocols.
 */

// Strip HTML tags and dangerous javascript/vbscript protocols
function sanitizeString(val) {
  if (typeof val !== 'string') return val;

  let cleaned = val
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline event handlers (e.g., onload=, onclick=, onerror=)
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript: and data: URLs (except safe data:image)
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '');

  return cleaned.trim();
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'string') return sanitizeString(item);
      if (typeof item === 'object' && item !== null) return sanitizeObject(item);
      return item;
    });
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

module.exports = sanitizeInput;
