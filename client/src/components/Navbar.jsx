import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/shop?search=${encodeURIComponent(q.trim())}`);
    setMenuOpen(false);
  };
  const close = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo" onClick={close}>Urban<span>Cart</span></Link>

        <form className="search" onSubmit={submitSearch} role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products" />
          <button type="submit" aria-label="Search">Search</button>
        </form>

        <button className="menu-toggle" aria-expanded={menuOpen} aria-label="Toggle menu" onClick={() => setMenuOpen((o) => !o)}>☰</button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/shop" onClick={close}>Shop</NavLink>
          {user ? (
            <>
              <NavLink to="/orders" onClick={close}>My Orders</NavLink>
              {isAdmin && <NavLink to="/admin" onClick={close}>Admin</NavLink>}
              <button className="link-btn" onClick={() => { logout(); close(); navigate('/'); }}>Logout</button>
              <span className="muted small greeting">Hi, {user.name.split(' ')[0]}</span>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Login</NavLink>
              <NavLink to="/register" onClick={close}>Register</NavLink>
            </>
          )}
          <NavLink to="/cart" className="cart-link" onClick={close} aria-label={`Cart, ${count} items`}>
            🛒 <span className="cart-count">{count}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
