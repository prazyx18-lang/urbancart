import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api/client.js';
import { Loader, ErrorBox, EmptyState } from '../components/Status.jsx';
import { StatusBadge } from './OrderDetail.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container page-pad">
      <h1>My Orders</h1>
      <p className="muted small">Signed in as {user.name} · {user.email}</p>
      <ErrorBox message={error} />
      {!orders && !error && <Loader />}
      {orders && !orders.length && (
        <EmptyState title="No orders yet" action={<Link className="btn btn-primary" to="/shop">Start shopping</Link>}>
          Your placed orders will appear here.
        </EmptyState>
      )}
      {orders?.length > 0 && (
        <div className="order-list">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card order-row">
              <div>
                <strong>{o.order_number}</strong>
                <p className="muted small">{new Date(o.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {o.items.length} item(s)</p>
              </div>
              <StatusBadge status={o.status} />
              <strong>{formatINR(o.total)}</strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
