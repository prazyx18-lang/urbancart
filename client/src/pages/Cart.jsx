import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatINR } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { ErrorBox, EmptyState, Loader } from '../components/Status.jsx';
import { ProductImage } from '../components/ProductCard.jsx';

export default function Cart() {
  const { cart, loading, updateQty, removeItem } = useCart();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const freeAbove = 999;
  const deliveryFee = cart.subtotal >= freeAbove || cart.subtotal === 0 ? 0 : 49;
  const total = cart.subtotal + deliveryFee;
  const hasProblems = cart.items.some((i) => !i.available);

  const change = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
  };

  if (loading && !cart.items.length) return <div className="container page-pad"><Loader label="Loading your cart…" /></div>;

  if (!cart.items.length) {
    return (
      <div className="container page-pad">
        <EmptyState title="Your cart is empty" action={<Link className="btn btn-primary" to="/shop">Continue shopping</Link>}>
          Browse the shop and add something you like.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container page-pad">
      <h1>Shopping Cart</h1>
      <ErrorBox message={error} />
      <div className="cart-layout">
        <ul className="cart-list">
          {cart.items.map((item) => (
            <li key={item.productId} className={`cart-item ${item.available ? '' : 'cart-item-unavailable'}`}>
              <ProductImage src={item.imageUrl} name={item.name} className="cart-thumb" />
              <div className="cart-item-info">
                <span className="product-name">{item.name}</span>
                <p className="muted small">{formatINR(item.price)} each</p>
                {!item.available && <p className="alert alert-error small">Only {item.stock} left or no longer available. Please reduce the quantity.</p>}
              </div>
              <div className="qty-control">
                <button aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => change(() => updateQty(item.productId, item.quantity - 1))}>−</button>
                <span aria-label="Quantity">{item.quantity}</span>
                <button aria-label="Increase quantity" disabled={item.quantity >= Math.min(item.stock, 20)} onClick={() => change(() => updateQty(item.productId, item.quantity + 1))}>+</button>
              </div>
              <strong className="line-total">{formatINR(item.lineTotal)}</strong>
              <button className="link-btn danger" onClick={() => change(() => removeItem(item.productId))}>Remove</button>
            </li>
          ))}
        </ul>

        <aside className="summary-card">
          <h3>Order summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(cart.subtotal)}</span></div>
          <div className="summary-row"><span>Delivery</span><span>{deliveryFee === 0 ? 'Free' : formatINR(deliveryFee)}</span></div>
          {deliveryFee > 0 && <p className="muted small">Add {formatINR(freeAbove - cart.subtotal)} more for free delivery.</p>}
          <div className="summary-row total"><span>Total</span><span>{formatINR(total)}</span></div>
          <button className="btn btn-primary btn-block" disabled={hasProblems} onClick={() => navigate('/checkout')}>
            {hasProblems ? 'Fix unavailable items to continue' : 'Proceed to Checkout'}
          </button>
          <Link to="/shop" className="continue">← Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
