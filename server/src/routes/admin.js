const express = require('express');
const { query, transaction } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { productImage, UPLOAD_DIR } = require('../middleware/upload');
const { validateProduct, toPositiveInt } = require('../utils/validate');
const { slugify } = require('../utils/slug');
const { HttpError } = require('../utils/errors');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(requireAdmin);

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// ---------- Dashboard ----------
router.get('/stats', async (_req, res) => {
  const [counts] = await query(`
    SELECT
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (SELECT COUNT(*) FROM products WHERE is_active = 1) AS total_products,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status <> 'Cancelled') AS total_sales`);
  const byStatus = await query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');
  res.json({
    totals: {
      orders: counts.total_orders,
      products: counts.total_products,
      customers: counts.total_customers,
      sales: Number(counts.total_sales),
    },
    ordersByStatus: byStatus,
  });
});

// ---------- Categories ----------
router.get('/categories', async (_req, res) => {
  res.json({ categories: await query('SELECT id, name, slug, description FROM categories ORDER BY name') });
});

router.post('/categories', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (name.length < 2) throw new HttpError(422, 'Category name is required');
  const result = await query('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
    [name, slugify(name), String(req.body?.description || '').trim() || null]);
  res.status(201).json({ id: result.insertId });
});

router.delete('/categories/:id', async (req, res) => {
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM products WHERE category_id = ?', [Number(req.params.id)]);
  if (n > 0) throw new HttpError(409, 'Move or delete the products in this category first');
  await query('DELETE FROM categories WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// ---------- Products ----------
router.get('/products', async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = 20;
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM products');
  const rows = await query(
    `SELECT p.*, c.name AS category_name,
       (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image_url
     FROM products p JOIN categories c ON c.id = p.category_id
     ORDER BY p.id DESC LIMIT 100`
  );
  res.json({ products: rows, total, page, limit });
});

router.get('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [product] = await query('SELECT * FROM products WHERE id = ?', [id]);
  if (!product) throw new HttpError(404, 'Product not found');
  const images = await query('SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [id]);
  res.json({ product: { ...product, images } });
});

router.post('/products', async (req, res) => {
  const data = validateProduct(req.body || {});
  const slug = slugify(data.name) + '-' + Date.now().toString(36);
  const result = await query(
    `INSERT INTO products (category_id, name, slug, description, price, compare_price, stock,
       is_featured, is_trending, is_bestseller, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.category_id, data.name, slug, data.description || '', data.price, data.compare_price ?? null,
      data.stock, data.is_featured ?? 0, data.is_trending ?? 0, data.is_bestseller ?? 0, data.is_active ?? 1]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const data = validateProduct(req.body || {}, { partial: true });
  const fields = Object.keys(data);
  if (!fields.length) throw new HttpError(422, 'Nothing to update');
  const [exists] = await query('SELECT id FROM products WHERE id = ?', [id]);
  if (!exists) throw new HttpError(404, 'Product not found');
  await query(`UPDATE products SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
    [...fields.map((f) => data[f]), id]);
  res.json({ ok: true });
});

router.delete('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?', [id]);
  if (n > 0) {
    // Products that appear in past orders are hidden, not deleted, to keep order history intact.
    await query('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ ok: true, archived: true, message: 'Product has past orders, so it was hidden from the shop' });
  }
  const images = await query('SELECT image_url FROM product_images WHERE product_id = ?', [id]);
  await query('DELETE FROM products WHERE id = ?', [id]);
  for (const img of images) removeUpload(img.image_url);
  res.json({ ok: true, archived: false });
});

router.post('/products/:id/images', (req, res, next) => {
  productImage(req, res, async (err) => {
    try {
      if (err) return next(err);
      if (!req.file) throw new HttpError(422, 'Choose an image to upload');
      const id = Number(req.params.id);
      const [exists] = await query('SELECT id FROM products WHERE id = ?', [id]);
      if (!exists) {
        removeUpload('/uploads/' + req.file.filename);
        throw new HttpError(404, 'Product not found');
      }
      const [{ next_order }] = await query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM product_images WHERE product_id = ?', [id]);
      const url = `/uploads/${req.file.filename}`;
      const result = await query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
        [id, url, next_order]);
      res.status(201).json({ id: result.insertId, imageUrl: url });
    } catch (e) {
      next(e);
    }
  });
});

router.delete('/images/:imageId', async (req, res) => {
  const [img] = await query('SELECT image_url FROM product_images WHERE id = ?', [Number(req.params.imageId)]);
  if (!img) throw new HttpError(404, 'Image not found');
  await query('DELETE FROM product_images WHERE id = ?', [Number(req.params.imageId)]);
  removeUpload(img.image_url);
  res.json({ ok: true });
});

function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.unlink(file, () => {});
}

// ---------- Orders & customers ----------
router.get('/orders', async (req, res) => {
  const where = [];
  const params = [];
  if (ORDER_STATUSES.includes(req.query.status)) {
    where.push('o.status = ?');
    params.push(req.query.status);
  }
  const rows = await query(
    `SELECT o.*, u.email AS account_email FROM orders o JOIN users u ON u.id = o.user_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json({ orders: rows, statuses: ORDER_STATUSES });
});

router.get('/orders/:id', async (req, res) => {
  const [order] = await query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
  if (!order) throw new HttpError(404, 'Order not found');
  const items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  res.json({ order: { ...order, items } });
});

router.patch('/orders/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(422, 'Invalid order status');
  const id = Number(req.params.id);

  await transaction(async (conn) => {
    const [[order]] = await conn.query('SELECT status FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.status === 'Cancelled' || order.status === 'Delivered') {
      throw new HttpError(409, `A ${order.status.toLowerCase()} order cannot be changed`);
    }
    // Restock when an order is cancelled before it ships.
    if (status === 'Cancelled' && ['Pending', 'Confirmed', 'Processing'].includes(order.status)) {
      const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const it of items) {
        await conn.query('UPDATE products SET stock = stock + ?, sold_count = GREATEST(sold_count - ?, 0) WHERE id = ?',
          [it.quantity, it.quantity, it.product_id]);
      }
    }
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  });
  res.json({ ok: true });
});

router.get('/customers/count', async (_req, res) => {
  const [{ n }] = await query("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'");
  res.json({ customers: n });
});

module.exports = router;
