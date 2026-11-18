// Creates DEMO admin and customer accounts. Run once after schema.sql:
//   npm run seed:users
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const DEMO_USERS = [
  { name: 'UrbanCart Admin', email: 'admin@urbancart.demo', password: 'Admin@123', role: 'admin' },
  { name: 'Demo Customer', email: 'customer@urbancart.demo', password: 'Customer@123', role: 'customer' },
];

(async () => {
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
      [u.name, u.email, hash, u.role]
    );
    console.log(`Demo ${u.role} ready: ${u.email} / ${u.password}`);
  }
  process.exit(0);
})().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
