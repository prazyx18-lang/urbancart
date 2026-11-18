import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, formatINR } from '../api/client.js';
import ProductCard, { ProductImage } from '../components/ProductCard.jsx';
import { Loader, ErrorBox } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function ProductDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setData(null);
    setError('');
    setActiveImg(0);
    setQty(1);
    api(`/products/${slug}`).then(setData).catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <div className="container page-pad"><ErrorBox message={error} /><Link to="/shop">← Back to shop</Link></div>;
  if (!data) return <div className="container page-pad"><Loader label="Loading product…" /></div>;

  const { product, related } = data;
  const inStock = product.stock > 0;
  const maxQty = Math.min(product.stock, 20);
  const discount = product.compare_price > product.price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;

  const add = async () => {
    if (!user) return navigate('/login', { state: { from: `/product/${slug}` } });
    setBusy(true);
    setMessage('');
    try {
      await addItem(product.id, qty);
      setMessage(`Added ${qty} × ${product.name} to your cart.`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const images = product.images;

  return (
    <div className="container page-pad">
      <nav className="crumbs muted small">
        <Link to="/">Home</Link> / <Link to={`/shop?category=${product.category_slug}`}>{product.category_name}</Link> / {product.name}
      </nav>

      <div className="detail-grid">
        <div className="gallery">
          <ProductImage src={images[activeImg]?.image_url || product.image_url} name={product.name} className="gallery-main" />
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((img, i) => (
                <button key={img.id} className={i === activeImg ? 'thumb active' : 'thumb'} onClick={() => setActiveImg(i)} aria-label={`View image ${i + 1}`}>
                  <img src={img.image_url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <p className="muted small">{product.category_name}</p>
          <h1>{product.name}</h1>
          <p className="rating">★ {Number(product.rating).toFixed(1)} <span className="muted small">({product.review_count} demo reviews)</span></p>
          <div className="price-row big">
            <strong>{formatINR(product.price)}</strong>
            {discount > 0 && (<><s className="muted">{formatINR(product.compare_price)}</s><span className="badge badge-sale">{discount}% off</span></>)}
          </div>
          <p className="stock">
            {inStock ? <span className="in-stock">In stock ({product.stock} left)</span> : <span className="out-stock">Currently unavailable</span>}
          </p>
          <p className="description">{product.description}</p>

          {inStock && (
            <div className="buy-row">
              <label>
                Quantity
                <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <button className="btn btn-primary" onClick={add} disabled={busy}>{busy ? 'Adding…' : 'Add to Cart'}</button>
            </div>
          )}
          {message && <div className="alert alert-info">{message} {message.includes('cart') && <Link to="/cart">View cart →</Link>}</div>}
          <p className="muted small">Sizes and colour variants are not part of this basic demo catalogue.</p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <h2>You may also like</h2>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} onAdd={() => navigate(`/product/${p.slug}`)} adding={false} />)}
          </div>
        </section>
      )}
    </div>
  );
}
