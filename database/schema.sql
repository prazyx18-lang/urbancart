-- UrbanCart demo database schema + sample catalogue data
-- All customers, reviews, ratings and sales figures in this file are DEMO data.
CREATE DATABASE IF NOT EXISTS urbancart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE urbancart;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_items, orders, cart_items, product_images, products, categories, addresses, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2) NULL,
  stock INT NOT NULL DEFAULT 0,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  sold_count INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_trending TINYINT(1) NOT NULL DEFAULT 0,
  is_bestseller TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cart (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NOT NULL,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cod','simulated_online') NOT NULL,
  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  status ENUM('Pending','Confirmed','Processing','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Sample categories
INSERT INTO categories (name, slug, description) VALUES
('Men''s Clothing', 'mens-clothing', 'Shirts, jackets, denim and everyday essentials for men'),
('Women''s Clothing', 'womens-clothing', 'Dresses, tops, outerwear and occasion wear for women'),
('Electronics', 'electronics', 'Audio, wearables and everyday gadgets'),
('Footwear', 'footwear', 'Sneakers, boots and casual shoes'),
('Bags & Accessories', 'bags-accessories', 'Backpacks, wallets and carry essentials'),
('Lifestyle', 'lifestyle', 'Home, fitness and everyday lifestyle products');

-- Sample products (DEMO catalogue, prices in INR, ratings are demo data)
INSERT INTO products (category_id, name, slug, description, price, compare_price, stock, rating, review_count, sold_count, is_featured, is_trending, is_bestseller) VALUES
(1, 'Classic Oxford Shirt', 'classic-oxford-shirt', 'Breathable cotton oxford shirt with a tailored fit for work and weekends.', 1499.00, 1999.00, 40, 4.5, 128, 540, 1, 0, 1),
(1, 'Slim Fit Denim Jacket', 'slim-fit-denim-jacket', 'Washed indigo denim jacket with a slim silhouette and brass buttons.', 2799.00, 3499.00, 25, 4.4, 86, 210, 1, 1, 0),
(1, 'Everyday Crew Tee Pack (3)', 'everyday-crew-tee-pack', 'Three soft-touch crew neck tees in essential colours.', 999.00, 1299.00, 80, 4.3, 214, 880, 0, 0, 1),
(1, 'Performance Chino Trousers', 'performance-chino-trousers', 'Stretch chinos with moisture-wicking finish for all-day comfort.', 1899.00, NULL, 30, 4.2, 57, 130, 0, 1, 0),
(2, 'Floral Midi Dress', 'floral-midi-dress', 'Flowing midi dress with a printed pattern and adjustable waist tie.', 2499.00, 2999.00, 22, 4.6, 173, 395, 1, 1, 1),
(2, 'Linen Blend Blazer', 'linen-blend-blazer', 'Lightweight linen-blend blazer, unlined, perfect for warm evenings.', 3299.00, NULL, 15, 4.4, 61, 98, 1, 0, 0),
(2, 'Ribbed Knit Top', 'ribbed-knit-top', 'Fitted ribbed knit top that layers well under jackets.', 899.00, 1199.00, 60, 4.1, 92, 310, 0, 0, 1),
(2, 'Pleated Wide-Leg Trousers', 'pleated-wide-leg-trousers', 'High-waisted pleated trousers with a relaxed, flowing leg.', 2199.00, 2599.00, 18, 4.3, 45, 77, 0, 1, 0),
(3, 'Wireless Noise-Cancelling Headphones', 'wireless-noise-cancelling-headphones', 'Over-ear Bluetooth headphones with adaptive noise cancellation and 30-hour battery.', 6999.00, 8999.00, 12, 4.6, 402, 620, 1, 1, 1),
(3, 'Smart Fitness Band', 'smart-fitness-band', 'Activity tracker with heart-rate sensor, sleep tracking and 7-day battery.', 2499.00, 3199.00, 35, 4.2, 188, 455, 0, 1, 0),
(3, 'Portable Bluetooth Speaker', 'portable-bluetooth-speaker', 'Water-resistant speaker with 12-hour playback and deep bass.', 3499.00, NULL, 20, 4.5, 233, 290, 1, 0, 1),
(3, 'USB-C Fast Charger 65W', 'usb-c-fast-charger-65w', 'Compact GaN charger with two USB-C ports and fast charging support.', 1799.00, 2199.00, 50, 4.4, 141, 512, 0, 0, 1),
(4, 'Urban Canvas Sneakers', 'urban-canvas-sneakers', 'Low-top canvas sneakers with cushioned insole and rubber sole.', 1999.00, 2499.00, 45, 4.3, 176, 420, 1, 0, 1),
(4, 'Leather Chelsea Boots', 'leather-chelsea-boots', 'Genuine leather chelsea boots with elastic side panels.', 4299.00, NULL, 14, 4.5, 74, 111, 0, 1, 0),
(4, 'Running Trainers Pro', 'running-trainers-pro', 'Lightweight running shoes with responsive foam and breathable mesh upper.', 3199.00, 3899.00, 28, 4.4, 119, 236, 0, 1, 0),
(5, 'Urban Commuter Backpack', 'urban-commuter-backpack', '24L water-resistant backpack with padded laptop sleeve up to 15.6 inch.', 2299.00, 2799.00, 33, 4.6, 259, 480, 1, 0, 1),
(5, 'Minimal Leather Wallet', 'minimal-leather-wallet', 'Slim bifold wallet with RFID-blocking lining and six card slots.', 899.00, NULL, 70, 4.2, 98, 365, 0, 0, 0),
(5, 'Canvas Tote Bag', 'canvas-tote-bag', 'Sturdy everyday tote with inside zip pocket and reinforced handles.', 1099.00, 1399.00, 40, 4.1, 64, 150, 0, 0, 0),
(6, 'Stainless Steel Water Bottle', 'stainless-steel-water-bottle', 'Double-wall insulated bottle keeps drinks cold for 24 hours.', 749.00, 999.00, 90, 4.5, 311, 720, 0, 1, 1),
(6, 'Ceramic Pour-Over Coffee Set', 'ceramic-pour-over-coffee-set', 'Dripper and carafe set with reusable filter for slow mornings.', 1699.00, NULL, 25, 4.6, 88, 102, 0, 0, 0),
(6, 'Yoga Mat Premium', 'yoga-mat-premium', 'Non-slip 6mm mat with alignment lines and carrying strap.', 1299.00, 1599.00, 38, 4.4, 146, 205, 0, 0, 0);

-- Sample product images (none are bundled; add real photos via the admin dashboard)
-- Example: INSERT INTO product_images (product_id, image_url, sort_order) VALUES (1, '/uploads/oxford-shirt.jpg', 0);
