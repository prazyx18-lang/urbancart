const express = require('express');
const { query } = require('../config/db');
const { toPositiveInt } = require('../utils/validate');
const { HttpError } = require('../utils/errors');

const router = express.Router();

const SORTS = {
  popularity: 'p.sold_count DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  rating: 'p.rating DESC, p.review_count DESC',
  newest: 'p.created_at DESC',
};

// Cover image = first image by sort_order, or null (frontend shows a placeholder).
const PRODUCT_SELECT = `
  SELECT p.id, p.name, p.slug, p.price, p.compare_price, p.stock, p.rating, p.review_count,
         p.sold_count, p.is_featured, p.is_trending, p.is_bestseller, p.description,
         c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
         (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
            ORDER BY pi.sort_order, pi.id LIMIT 1) AS image_url
  FROM products p JOIN categories c ON c.id = p.category_id`;

router.get('/categories', async (_req, res) => {
  const rows = await query(
    `SELECT c.id, c.name, c.slug, c.description,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
     FROM categories c ORDER BY c.name`
  );
  res.json({ categories: rows });
});

router.get('/products', async (req, res) => {
  const where = ['p.is_active = 1'];
  const params = [];
  const q = String(req.query.search || '').trim();
  if (q) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (req.query.category) {
    where.push('c.slug = ?');
    params.push(String(req.query.category));
  }
  const min = Number(req.query.minPrice);
  const max = Number(req.query.maxPrice);
  if (Number.isFinite(min) && req.query.minPrice !== undefined && req.query.minPrice !== '') {
    where.push('p.price >= ?');
    params.push(min);
  }
  if (Number.isFinite(max) && req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
    where.push('p.price <= ?');
    params.push(max);
  }
  for (const flag of ['featured', 'trending', 'bestseller']) {
    if (req.query[flag] === '1') where.push(`p.is_${flag} = 1`);
  }

  const sort = SORTS[req.query.sort] || SORTS.popularity;
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 12), 48);
  const offset = (page - 1) * limit;
  const whereSql = where.join(' AND ');

  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id = p.category_id WHERE ${whereSql}`,
    params
  );
  const items = await query(
    `${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  res.json({ products: items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/products/:slug', async (req, res) => {
  const [product] = await query(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.is_active = 1`, [req.params.slug]);
  if (!product) throw new HttpError(404, 'Product not found');

  const images = await query(
    'SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id',
    [product.id]
  );
  const related = await query(
    `${PRODUCT_SELECT} WHERE p.category_id = ? AND p.id <> ? AND p.is_active = 1 ORDER BY p.sold_count DESC LIMIT 4`,
    [product.category_id, product.id]
  );
  res.json({ product: { ...product, images }, related });
});

module.exports = router;
