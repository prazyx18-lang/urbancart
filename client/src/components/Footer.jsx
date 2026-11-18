import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h4>UrbanCart</h4>
          <p className="muted small">A demonstration storefront. Not a real retailer; all products, reviews and orders are sample data.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop?category=mens-clothing">Men's Clothing</Link>
          <Link to="/shop?category=womens-clothing">Women's Clothing</Link>
          <Link to="/shop?category=electronics">Electronics</Link>
          <Link to="/shop?category=footwear">Footwear</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/orders">My Orders</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>
      <p className="center muted small footer-note">© UrbanCart Demo · Payments are simulated; no real transactions occur.</p>
    </footer>
  );
}
