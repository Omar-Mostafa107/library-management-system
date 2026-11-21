'use strict';

function errorHandler(err, req, res, _next) {
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err && err.code) {
    switch (err.code) {
      case 'SQLITE_CONSTRAINT_UNIQUE':
        return res.status(409).json({
          error: 'Conflict',
          message: 'A record with this unique value (e.g. email) already exists.'
        });
      case 'SQLITE_CONSTRAINT_FOREIGNKEY':
        return res.status(409).json({
          error: 'Referential Integrity Conflict',
          message: 'Cannot complete operation because dependent records exist or referenced ID is invalid.'
        });
      case 'SQLITE_CONSTRAINT_CHECK':
      case 'SQLITE_CONSTRAINT_TRIGGER':
        return res.status(400).json({
          error: 'Database Constraint Violation',
          message: err.message || 'Operation violated a database integrity rule.'
        });
      default:
        break;
    }
  }

  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  return res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : 'Request Error',
    message: status >= 500 && isProd ? 'An unexpected error occurred.' : err.message || 'Unexpected error'
  });
}

module.exports = errorHandler;
