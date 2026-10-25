const { ZodError } = require('zod');

/**
 * Request validation middleware factory.
 * Validates req.body, req.query, and/or req.params against Zod schemas.
 *
 * Usage:
 *   validate({ body: myBodySchema })
 *   validate({ body: myBodySchema, params: myParamsSchema })
 *
 * @param {{ body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }} schemas
 * @returns {Function} Express middleware
 */
const validate = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed.',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
