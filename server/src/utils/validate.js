const { HttpError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{10,15}$/;
const PINCODE_RE = /^[0-9]{6}$/;

function fail(errors) {
  throw new HttpError(422, 'Validation failed', errors);
}

function validateCheckout(body) {
  const errors = {};
  const out = {};
  const text = (key, label, min, max) => {
    const v = String(body[key] ?? '').trim();
    if (v.length < min) errors[key] = `${label} is required`;
    else if (v.length > max) errors[key] = `${label} is too long`;
    out[key] = v;
  };
  text('customerName', 'Name', 2, 100);
  text('addressLine', 'Address', 5, 255);
  text('city', 'City', 2, 100);
  text('state', 'State', 2, 100);

  out.phone = String(body.phone ?? '').trim();
  if (!PHONE_RE.test(out.phone)) errors.phone = 'Enter a valid phone number';

  out.email = String(body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(out.email)) errors.email = 'Enter a valid email address';

  out.pincode = String(body.pincode ?? '').trim();
  if (!PINCODE_RE.test(out.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';

  if (!['cod', 'simulated_online'].includes(body.paymentMethod)) {
    errors.paymentMethod = 'Choose a payment method';
  }
  out.paymentMethod = body.paymentMethod;

  if (Object.keys(errors).length) fail(errors);
  return out;
}

function validateRegister(body) {
  const errors = {};
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (Object.keys(errors).length) fail(errors);
  return { name, email, password, phone: String(body.phone ?? '').trim() || null };
}

function validateProduct(body, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) {
    out.name = String(body.name ?? '').trim();
    if (out.name.length < 2) errors.name = 'Product name is required';
  }
  if (!partial || has('categoryId')) {
    out.category_id = Number(body.categoryId);
    if (!Number.isInteger(out.category_id) || out.category_id < 1) errors.categoryId = 'Choose a category';
  }
  if (!partial || has('price')) {
    out.price = Number(body.price);
    if (!(out.price > 0)) errors.price = 'Price must be greater than 0';
  }
  if (has('comparePrice')) {
    if (body.comparePrice === '' || body.comparePrice === null) {
      out.compare_price = null;
    } else {
      out.compare_price = Number(body.comparePrice);
      if (!(out.compare_price >= 0)) errors.comparePrice = 'Invalid original price';
    }
  }
  if (!partial || has('stock')) {
    out.stock = Number(body.stock ?? 0);
    if (!Number.isInteger(out.stock) || out.stock < 0) errors.stock = 'Stock must be a whole number, 0 or more';
  }
  if (has('description')) out.description = String(body.description ?? '').trim();
  const flags = { isFeatured: 'is_featured', isTrending: 'is_trending', isBestseller: 'is_bestseller', isActive: 'is_active' };
  for (const [camel, col] of Object.entries(flags)) {
    if (has(camel)) out[col] = body[camel] ? 1 : 0;
  }
  if (Object.keys(errors).length) fail(errors);
  return out;
}

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

module.exports = { validateCheckout, validateRegister, validateProduct, toPositiveInt, EMAIL_RE };
