import { Link } from 'react-router-dom';
import { formatINR } from '../api/client.js';

// Shows the product image, or a styled placeholder when none has been uploaded yet.
export function ProductImage({ src, name, className = '' }) {
  if (src) return <img className={`product-img ${className}`} src={src} alt={name} loading="lazy" />;
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className={`product-img placeholder ${className}`} aria-label={`${name} (no photo yet)`}>
      <span>{initials}</span>
    </div>
  );
}

export default function ProductCard({ product, onAdd, adding }) {
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;
  const outOfStock = product.stock <= 0;

  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-card-media">
        <ProductImage src={product.image_url} name={product.name} />
        {discount > 0 && <span className="badge badge-sale">{discount}% off</span>}
        {outOfStock && <span className="badge badge-out">Out of stock</span>}
      </Link>
      <div className="product-card-body">
        <p className="muted small">{product.category_name}</p>
        <Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link>
        <p className="rating" title="Demo rating data">
          ★ {Number(product.rating).toFixed(1)} <span className="muted small">({product.review_count} demo reviews)</span>
        </p>
        <div className="price-row">
          <strong>{formatINR(product.price)}</strong>
          {discount > 0 && <s className="muted small">{formatINR(product.compare_price)}</s>}
        </div>
        <button className="btn btn-primary btn-block" disabled={outOfStock || adding} onClick={() => onAdd(product)}>
          {outOfStock ? 'Unavailable' : adding ? 'Adding…' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
