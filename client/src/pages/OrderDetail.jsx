import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, formatINR } from '../api/client.js';
import { Loader, ErrorBox } from '../components/Status.jsx';

const STEPS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

export function StatusBadge({ status }) {
  const cls = status === 'Cancelled' ? 'badge-out' : status === 'Delivered' ? 'badge-ok' : 'badge-info';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container page-pad"><ErrorBox message={error} /><Link to="/orders">← Back to orders</Link></div>;
  if (!order) return <div className="container page-pad"><Loader /></div>;

  const stepIndex = STEPS.indexOf(order.status);

  return (
    <div className="container page-pad">
      <Link to="/orders" className="small">← All orders</Link>
      {params.get('placed') && <div className="alert alert-success">Thank you! Your order has been placed.</div>}
      <h1>Order {order.order_number}</h1>
      <p className="muted small">Placed {new Date(order.created_at).toLocaleString('en-IN')} · <StatusBadge status={order.status} /></p>

      {order.status !== 'Cancelled' && (
        <ol className="tracker" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? 'done' : ''}>{s}</li>
          ))}
        </ol>
      )}

      <div className="detail-grid order-detail">
        <div className="card">
          <h3>Items</h3>
          <ul className="mini-list">
            {order.items.map((i) => (
              <li key={i.id}><span>{i.product_name} × {i.quantity}</span><span>{formatINR(i.line_total)}</span></li>
            ))}
          </ul>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          <div className="summary-row"><span>Delivery</span><span>{Number(order.delivery_fee) === 0 ? 'Free' : formatINR(order.delivery_fee)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatINR(order.total)}</span></div>
        </div>
        <div className="card">
          <h3>Delivery to</h3>
          <p>{order.customer_name}<br />{order.address_line}<br />{order.city}, {order.state} – {order.pincode}</p>
          <p className="muted small">{order.phone} · {order.email}</p>
          <h3>Payment</h3>
          <p>{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Simulated online payment (demo)'} · <span className="muted">{order.payment_status === 'paid' ? 'Marked paid (demo)' : 'Pay on delivery'}</span></p>
        </div>
      </div>
    </div>
  );
}
