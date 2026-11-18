const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../utils/errors');

const router = express.Router();
router.use(requireAuth);

// Returns cart lines with live prices; subtotal is computed server-side.
async function loadCart(userId) {
  const items = await query(
    `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.is_active,
            (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
               ORDER BY pi.sort_order, pi.id LIMIT 1) AS image_url,
            c.name AS category_name
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE ci.user_id = ? ORDER BY ci.id`,
    [userId]
  );
  const lines = items.map((i) => ({
    productId: i.product_id,
    name: i.name,
    price: Number(i.price),
    quantity: i.quantity,
    stock: i.stock,
    imageUrl: i.image_url,
    categoryName: i.category_name,
    lineTotal: Number(i.price) * i.quantity,
    available: Boolean(i.is_active) && i.stock >= i.quantity,
  }));
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return { items: lines, subtotal };
}

router.get('/', async (req, res) => {
  res.json(await loadCart(req.user.id));
});

router.post('/', async (req, res) => {
  const productId = Number(req.body?.productId);
  const quantity = Math.max(1, Math.min(Number(req.body?.quantity) || 1, 20));
  if (!Number.isInteger(productId)) throw new HttpError(422, 'Invalid product');

  const [product] = await query('SELECT id, stock, is_active FROM products WHERE id = ?', [productId]);
  if (!product || !product.is_active) throw new HttpError(404, 'This product is no longer available');

  const [existing] = await query('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
  const newQty = (existing?.quantity || 0) + quantity;
  if (newQty > product.stock) {
    throw new HttpError(409, `Only ${product.stock} unit(s) available`);
  }
  await query(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
    [req.user.id, productId, newQty]
  );
  res.status(201).json(await loadCart(req.user.id));
});

router.patch('/:productId', async (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new HttpError(422, 'Quantity must be between 1 and 20');
  }
  const [product] = await query('SELECT stock FROM products WHERE id = ?', [productId]);
  if (!product) throw new HttpError(404, 'Product not found');
  if (quantity > product.stock) throw new HttpError(409, `Only ${product.stock} unit(s) available`);

  await query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, req.user.id, productId]);
  res.json(await loadCart(req.user.id));
});

router.delete('/:productId', async (req, res) => {
  await query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [req.user.id, Number(req.params.productId)]);
  res.json(await loadCart(req.user.id));
});

module.exports = router;
module.exports.loadCart = loadCart;
