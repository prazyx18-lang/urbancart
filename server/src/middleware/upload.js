
const multer = require('multer');

const ALLOWED = {
  'image/jpeg': true,
  'image/png': true,
  'image/webp': true,
};

const productImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new Error('Only JPG, PNG or WEBP images are allowed'));
    }

    cb(null, true);
  },
}).single('image');

module.exports = { productImage };
