require('dotenv').config();

const required = ['JWT_SECRET', 'DB_USER', 'DB_NAME'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`[config] Missing env vars: ${missing.join(', ')}. Check server/.env`);
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  deliveryFee: Number(process.env.DELIVERY_FEE || 49),
  freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD || 999),
};
