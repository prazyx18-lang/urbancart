# UrbanCart – Demo E-commerce Website

A fictional premium shopping brand built with **React + Vite** (frontend), **Node.js + Express** (REST API), and **MySQL / MariaDB** (database).

Everything in this project is demonstration material: brand, products, ratings, reviews, testimonials, sales figures and customers are sample data. Payments are simulated and no real transactions occur.

## Folder structure

```
urbancart/
├── database/schema.sql        Tables, constraints and sample catalogue (6 categories, 20 products)
├── server/                    Express REST API
│   ├── src/config             Env loading, DB pool
│   ├── src/middleware         JWT auth, admin guard, upload, error handling
│   ├── src/routes             auth, catalogue, cart, orders, admin
│   ├── src/scripts/seedUsers  Creates demo admin + customer accounts
│   └── uploads/               Uploaded product images (created automatically)
└── client/                    React + Vite storefront and admin dashboard
    └── src/pages              Home, Shop, ProductDetail, Cart, Checkout, Login, Register, Orders, OrderDetail, Admin
```

## Prerequisites

- Node.js 18 or newer
- MySQL 8 or MariaDB 10.6 or newer

## 1. Create the database

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p -e "CREATE USER IF NOT EXISTS 'urbancart_user'@'localhost' IDENTIFIED BY 'change-me'; GRANT ALL ON urbancart.* TO 'urbancart_user'@'localhost'; FLUSH PRIVILEGES;"
```

Use a stronger password than `change-me` for anything beyond local testing.

## 2. Configure and start the API

```bash
cd server
cp .env.example .env        # then edit JWT_SECRET and DB_PASSWORD
npm install
npm run seed:users          # creates the demo admin and customer accounts
npm run dev                 # API on http://localhost:5000
```

## 3. Start the storefront

```bash
cd client
npm install
npm run dev                 # site on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/uploads` to the API.

## Demo logins

| Role     | Email                       | Password       |
|----------|-----------------------------|----------------|
| Admin    | admin@urbancart.demo        | Admin@123      |
| Customer | customer@urbancart.demo     | Customer@123   |

Change these passwords before showing the project anywhere public.

## Features

- **Storefront:** hero banner, category tiles, featured / trending / best-seller rows, offers, labelled demo testimonials, newsletter form (demo only, nothing stored).
- **Shop:** search, category filter, price range, collection filters, sort (popularity, price, rating, newest), pagination.
- **Product page:** image gallery (placeholder when no photo), quantity selector, stock status, related products.
- **Cart:** quantity controls, remove, live subtotal, delivery fee (₹49, free above ₹999), stock checks.
- **Checkout:** validated delivery form, Cash on Delivery, and a clearly labelled simulated online payment. Totals and stock are re-checked on the server inside a database transaction.
- **Accounts:** register, login, logout, JWT sessions, bcrypt password hashing, order history and order details with a status tracker.
- **Admin:** dashboard totals and order counts by status; add, edit, hide or delete products; upload and remove product images; manage categories; view orders, filter by status, and update status. Cancelling a pre-shipment order restocks its items.

## API overview

| Method | Path | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Public |
| GET | /api/auth/me | Logged in |
| GET | /api/categories | Public |
| GET | /api/products (search, category, minPrice, maxPrice, sort, page, limit, featured, trending, bestseller) | Public |
| GET | /api/products/:slug | Public |
| GET / POST / PATCH / DELETE | /api/cart | Logged in |
| POST / GET | /api/orders, /api/orders/:id | Logged in |
| GET | /api/admin/stats, /api/admin/products, /api/admin/orders, /api/admin/categories | Admin |
| POST / PUT / DELETE | /api/admin/products, /api/admin/products/:id, /api/admin/categories | Admin |
| POST / DELETE | /api/admin/products/:id/images, /api/admin/images/:id | Admin |
| PATCH | /api/admin/orders/:id/status | Admin |

## Adding real product photos

Use the admin dashboard → Products → Edit → Product images. Images are stored in `server/uploads/`. Only use photos you have rights to use.

## Known limitations of this basic package

- Sizes and colour variants are not modelled (the schema can be extended with a `product_variants` table).
- Real payment gateways, SMS, courier integrations, hosting and domain setup are out of scope.
- Customer profile editing and saved addresses are not implemented as UI yet (the `addresses` table exists for this).
- Demo product images are not bundled; the placeholder tile is shown until photos are uploaded.
- Use HTTPS, a strong `JWT_SECRET`, and a restricted database user before any public deployment.
