const multer = require('multer');
const { HttpError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3 MB or smaller' : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err && /Only JPG, PNG|WEBP/i.test(err.message || '')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[server error]', err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}

function notFound(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

module.exports = { errorHandler, notFound };
