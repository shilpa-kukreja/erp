const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    next(err);
  }
};

export default validate;