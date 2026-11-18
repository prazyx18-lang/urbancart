const express = require('express');
const crypto = require('crypto');
const { query, transaction } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { validateCheckout } = require('../utils/validate');
const { HttpError } = require('../utils/errors');
const { deliveryFee, freeDeliveryThreshold } = require('../config/env');
const { loadCart } = require('./cart');

const router = express.Router();
router.use(requireAuth);

const newOrderNumber = () =>
  `UC${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

// Place an order from the current cart. Prices and stock are re-checked
// inside a transaction, so the client cannot set its own prices.
router.post('/', async (req, res) => {
  const details = validateCheckout(req.body || {});

  const orderId = await transaction(async (conn) => {
    const [lines] = await conn.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.is_active
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ? FOR UPDATE`,
      [req.user.id]
    );
    if (!lines.length) throw new HttpError(409, 'Your cart is empty');

    const problems = lines.filter((l) => !l.is_active || l.stock < l.quantity);
    if (problems.length) {
      throw new HttpError(409, `Some items are out of stock: ${problems.map((p) => p.name).join(', ')}`);
    }

    const subtotal = lines.reduce((s, l) => s + Number(l.price) * l.quantity, 0);
    const fee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
    const total = subtotal + fee;

    const [result] = await conn.query(
      `INSERT INTO orders (user_id, order_number, customer_name, phone, email, address_line, city, state, pincode,
         subtotal, delivery_fee, total, payment_method, payment_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        req.user.id, newOrderNumber(), details.customerName, details.phone, details.email,
        details.addressLine, details.city, details.state, details.pincode,
        subtotal.toFixed(2), fee.toFixed(2), total.toFixed(2), details.paymentMethod,
        details.paymentMethod === 'simulated_online' ? 'paid' : 'unpaid',
      ]
    );

    for (const l of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [result.insertId, l.product_id, l.name, l.price, l.quantity, (Number(l.price) * l.quantity).toFixed(2)]
      );
      await conn.query(
        'UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?',
        [l.quantity, l.quantity, l.product_id]
      );
    }
    await conn.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    return result.insertId;
  });

  res.status(201).json({ orderId, message: 'Order placed successfully' });
});

async function withItems(orders) {
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const items = await query('SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id', [ids]);
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) }));
}

router.get('/', async (req, res) => {
  const orders = await query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ orders: await withItems(orders) });
});

router.get('/:id', async (req, res) => {
  const [order] = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!order) throw new HttpError(404, 'Order not found');
  const [withLines] = await withItems([order]);
  res.json({ order: withLines });
});

module.exports = router;
