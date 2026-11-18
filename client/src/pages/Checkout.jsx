import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatINR, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { ErrorBox, EmptyState } from '../components/Status.jsx';

const EMPTY = { customerName: '', phone: '', email: '', addressLine: '', city: '', state: '', pincode: '', paymentMethod: 'cod' };

export default function Checkout() {
  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const [form, setForm] = useState({ ...EMPTY, customerName: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const deliveryFee = cart.subtotal >= 999 ? 0 : 49;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});
    setSubmitting(true);
    try {
      const res = await api('/orders', { method: 'POST', body: form });
      await refresh();
      navigate(`/orders/${res.orderId}?placed=1`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setError(err.message);
      if (err.message.includes('out of stock') || err.message.includes('empty')) refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.items.length) {
    return <div className="container page-pad"><EmptyState title="Nothing to check out" action={<button className="btn btn-primary" onClick={() => navigate('/shop')}>Go to shop</button>}>Your cart is empty.</EmptyState></div>;
  }

  const field = (key, label, props = {}) => (
    <label className="field">
      {label}
      <input value={form[key]} onChange={set(key)} aria-invalid={Boolean(errors[key])} {...props} />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="container page-pad">
      <h1>Checkout</h1>
      <ErrorBox message={error} />
      <div className="checkout-layout">
        <form className="card form-grid" onSubmit={submit} noValidate>
          <h3 className="span-2">Delivery details</h3>
          {field('customerName', 'Full name', { autoComplete: 'name' })}
          {field('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', placeholder: '+91 98765 43210' })}
          {field('email', 'Email address', { type: 'email', autoComplete: 'email' })}
          {field('pincode', 'Pincode', { inputMode: 'numeric', maxLength: 6 })}
          <label className="field span-2">
            Delivery address
            <textarea rows={2} value={form.addressLine} onChange={set('addressLine')} aria-invalid={Boolean(errors.addressLine)} />
            {errors.addressLine && <span className="field-error">{errors.addressLine}</span>}
          </label>
          {field('city', 'City')}
          {field('state', 'State')}

          <h3 className="span-2">Payment method</h3>
          <label className="radio span-2">
            <input type="radio" name="pm" value="cod" checked={form.paymentMethod === 'cod'} onChange={set('paymentMethod')} />
            <span><strong>Cash on Delivery</strong><br /><span className="muted small">Pay in cash when your order arrives.</span></span>
          </label>
          <label className="radio span-2">
            <input type="radio" name="pm" value="simulated_online" checked={form.paymentMethod === 'simulated_online'} onChange={set('paymentMethod')} />
            <span><strong>Simulated online payment (demo)</strong><br /><span className="muted small">No real money is charged. This only marks the order as paid in the demo database.</span></span>
          </label>
          {errors.paymentMethod && <span className="field-error span-2">{errors.paymentMethod}</span>}

          <button className="btn btn-primary span-2" type="submit" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place Order · ${formatINR(cart.subtotal + deliveryFee)}`}
          </button>
        </form>

        <aside className="summary-card">
          <h3>Order summary</h3>
          <ul className="mini-list">
            {cart.items.map((i) => (
              <li key={i.productId}><span>{i.name} × {i.quantity}</span><span>{formatINR(i.lineTotal)}</span></li>
            ))}
          </ul>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(cart.subtotal)}</span></div>
          <div className="summary-row"><span>Delivery</span><span>{deliveryFee === 0 ? 'Free' : formatINR(deliveryFee)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatINR(cart.subtotal + deliveryFee)}</span></div>
          <p className="muted small">Final amounts are recalculated on the server when you place the order.</p>
        </aside>
      </div>
    </div>
  );
}
