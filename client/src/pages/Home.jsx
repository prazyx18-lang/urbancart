import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import { Loader, ErrorBox } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const TESTIMONIALS = [
  { name: 'Demo Customer A', text: 'Sample testimonial: fast delivery and the fit was exactly as described.' },
  { name: 'Demo Customer B', text: 'Sample testimonial: checkout was simple and the order tracking was clear.' },
  { name: 'Demo Customer C', text: 'Sample testimonial: good quality electronics at fair prices.' },
];

function Section({ title, link, children }) {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          {link && <Link to={link}>View all →</Link>}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  const [data, setData] = useState({ featured: [], trending: [], bestsellers: [], categories: [] });
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(null);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api('/products?featured=1&limit=4'),
      api('/products?trending=1&limit=4'),
      api('/products?bestseller=1&limit=4'),
      api('/categories'),
    ])
      .then(([f, t, b, c]) => setData({ featured: f.products, trending: t.products, bestsellers: b.products, categories: c.categories }))
      .catch((e) => setError(e.message));
  }, []);

  const handleAdd = async (product) => {
    if (!user) return navigate('/login', { state: { from: '/' } });
    setAdding(product.id);
    setNotice('');
    try {
      await addItem(product.id, 1);
      setNotice(`${product.name} added to your cart.`);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdding(null);
    }
  };

  const subscribe = (e) => {
    e.preventDefault();
    setNotice(`Thanks for your interest, ${email}. Newsletter sign-up is a demo: nothing was stored.`);
    setEmail('');
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">New season · Demo storefront</p>
          <h1>Dress well. Live well. Shop smarter.</h1>
          <p className="hero-sub">Men's and women's fashion, electronics, footwear, bags and lifestyle essentials, all in one place.</p>
          <div className="hero-actions">
            <Link to="/shop" className="btn btn-gold">Shop Now</Link>
            <Link to="/shop?bestseller=1" className="btn btn-outline-light">Best Sellers</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="center">Shop by Category</h2>
          <div className="category-grid">
            {data.categories.map((c) => (
              <Link key={c.id} to={`/shop?category=${c.slug}`} className="category-tile">
                <span className="category-name">{c.name}</span>
                <span className="muted small">{c.product_count} items</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {notice && <div className="container"><div className="alert alert-info">{notice}</div></div>}
      <div className="container"><ErrorBox message={error} /></div>

      {!data.featured.length && !error ? <Loader label="Loading the latest picks…" /> : (
        <>
          <Section title="Featured Products" link="/shop?featured=1">
            <div className="product-grid">
              {data.featured.map((p) => <ProductCard key={p.id} product={p} onAdd={handleAdd} adding={adding === p.id} />)}
            </div>
          </Section>
          <Section title="Trending Now" link="/shop?trending=1">
            <div className="product-grid">
              {data.trending.map((p) => <ProductCard key={p.id} product={p} onAdd={handleAdd} adding={adding === p.id} />)}
            </div>
          </Section>
          <Section title="Best Sellers" link="/shop?bestseller=1">
            <div className="product-grid">
              {data.bestsellers.map((p) => <ProductCard key={p.id} product={p} onAdd={handleAdd} adding={adding === p.id} />)}
            </div>
          </Section>
        </>
      )}

      <section className="offer-banner">
        <div className="container offer-inner">
          <div>
            <h2>Free delivery on orders above ₹999</h2>
            <p>Standard delivery is ₹49 on smaller orders. Offers shown are demo promotions.</p>
          </div>
          <Link to="/shop" className="btn btn-gold">Grab the Deals</Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="center">What Customers Say</h2>
          <p className="center muted small">Sample testimonials for demonstration purposes.</p>
          <div className="testimonial-grid">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="testimonial">
                <p>“{t.text}”</p>
                <footer>— {t.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter">
        <div className="container center">
          <h2>Join the UrbanCart list</h2>
          <form className="newsletter-form" onSubmit={subscribe}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email address" />
            <button className="btn btn-gold" type="submit">Subscribe</button>
          </form>
        </div>
      </section>
    </>
  );
}
