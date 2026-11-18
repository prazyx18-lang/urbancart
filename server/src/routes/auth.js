const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { validateRegister } = require('../utils/validate');
const { HttpError } = require('../utils/errors');

const router = express.Router();

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });
const signToken = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, jwtSecret, { expiresIn: jwtExpiresIn });

router.post('/register', async (req, res) => {
  const { name, email, password, phone } = validateRegister(req.body || {});
  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, "customer")',
    [name, email, phone, hash]
  ).catch((err) => {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'An account with this email already exists');
    throw err;
  });
  const [user] = await query('SELECT id, name, email, phone, role FROM users WHERE id = ?', [result.insertId]);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) throw new HttpError(422, 'Email and password are required');

  const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
  // Same message for unknown email and wrong password to avoid account enumeration.
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Incorrect email or password');

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const [user] = await query('SELECT id, name, email, phone, role FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: publicUser(user) });
});

module.exports = router;
