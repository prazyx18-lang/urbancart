import { useEffect, useState, useCallback, Fragment } from 'react';
import { api, formatINR } from '../api/client.js';
import { Loader, ErrorBox, EmptyState } from '../components/Status.jsx';
import { ProductImage } from '../components/ProductCard.jsx';
import { StatusBadge } from './OrderDetail.jsx';

const TABS = [['dashboard', 'Dashboard'], ['products', 'Products'], ['categories', 'Categories'], ['orders', 'Orders']];
const BLANK_PRODUCT = { name: '', categoryId: '', price: '', comparePrice: '', stock: 0, description: '', isFeatured: false, isTrending: false, isBestseller: false, isActive: true };

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  return (
    <div className="container page-pad">
      <h1>Admin Dashboard</h1>
      <p className="muted small">Demo back office. All figures come from the demo database.</p>
      <nav className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'products' && <Products />}
      {tab === 'categories' && <Categories />}
      {tab === 'orders' && <Orders />}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/admin/stats').then(setStats).catch((e) => setError(e.message)); }, []);
  if (error) return <ErrorBox message={error} />;
  if (!stats) return <Loader />;
  const cards = [
    ['Total orders', stats.totals.orders],
    ['Active products', stats.totals.products],
    ['Customers', stats.totals.customers],
    ['Sales (excl. cancelled)', formatINR(stats.totals.sales)],
  ];
  return (
    <>
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <div className="card stat" key={label}><span className="muted small">{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <h3>Orders by status</h3>
      <ul className="mini-list">
        {stats.ordersByStatus.length ? stats.ordersByStatus.map((s) => (
          <li key={s.status}><span>{s.status}</span><span>{s.count}</span></li>
        )) : <li><span className="muted">No orders yet</span></li>}
      </ul>
    </>
  );
}

function Products() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | product object
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api('/admin/products').then(setData).catch((e) => setError(e.message));
    api('/admin/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? Products with past orders are hidden instead of deleted.`)) return;
    try {
      const r = await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      setNotice(r.message || 'Product deleted');
      load();
    } catch (e) { setError(e.message); }
  };

  if (editing) {
    return (
      <ProductForm
        product={editing === 'new' ? null : editing}
        categories={categories}
        onDone={(msg) => { setEditing(null); if (msg) setNotice(msg); load(); }}
      />
    );
  }

  return (
    <>
      <div className="toolbar-row">
        <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Add product</button>
      </div>
      <ErrorBox message={error} />
      {notice && <div className="alert alert-info">{notice}</div>}
      {!data && !error && <Loader />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id}>
                  <td><ProductImage src={p.image_url} name={p.name} className="table-thumb" /></td>
                  <td>{p.name}</td>
                  <td>{p.category_name}</td>
                  <td>{formatINR(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.is_active ? <span className="badge badge-ok">Active</span> : <span className="badge">Hidden</span>}</td>
                  <td className="actions">
                    <button className="link-btn" onClick={() => setEditing(p)}>Edit</button>
                    <button className="link-btn danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.products.length && <EmptyState title="No products yet">Add your first product to get started.</EmptyState>}
        </div>
      )}
    </>
  );
}

function ProductForm({ product, categories, onDone }) {
  const isNew = !product;
  const [form, setForm] = useState(() => (isNew ? BLANK_PRODUCT : {
    name: product.name, categoryId: product.category_id, price: product.price,
    comparePrice: product.compare_price ?? '', stock: product.stock, description: product.description || '',
    isFeatured: !!product.is_featured, isTrending: !!product.is_trending,
    isBestseller: !!product.is_bestseller, isActive: !!product.is_active,
  }));
  const [savedId, setSavedId] = useState(product?.id ?? null);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadImages = useCallback(async (id) => {
    const d = await api(`/admin/products/${id}`);
    setImages(d.product.images);
  }, []);

  useEffect(() => {
    if (savedId) loadImages(savedId).catch((e) => setError(e.message));
  }, [savedId, loadImages]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setErrors({});
    setNotice('');
    try {
      if (isNew && !savedId) {
        const r = await api('/admin/products', { method: 'POST', body: form });
        setSavedId(r.id);
        setNotice('Product created. You can now add images below.');
      } else {
        await api(`/admin/products/${savedId}`, { method: 'PUT', body: form });
        onDone('Product saved');
      }
    } catch (err) {
      setErrors(err.details || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !savedId) return;
    const fd = new FormData();
    fd.append('image', file);
    setError('');
    try {
      await api(`/admin/products/${savedId}/images`, { method: 'POST', form: fd });
      await loadImages(savedId);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeImage = async (id) => {
    try {
      await api(`/admin/images/${id}`, { method: 'DELETE' });
      setImages((imgs) => imgs.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const field = (k, label, props = {}) => (
    <label className="field">{label}
      <input value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} {...props} />
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="admin-form-wrap">
      <button className="link-btn" onClick={() => onDone()}>← Back to products</button>
      <h2>{savedId ? 'Edit product' : 'Add product'}</h2>
      <ErrorBox message={error} />
      {notice && <div className="alert alert-info">{notice}</div>}
      <form className="card form-grid" onSubmit={save} noValidate>
        {field('name', 'Product name')}
        <label className="field">Category
          <select value={form.categoryId} onChange={set('categoryId')} aria-invalid={Boolean(errors.categoryId)}>
            <option value="">Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.categoryId && <span className="field-error">{errors.categoryId}</span>}
        </label>
        {field('price', 'Price (₹)', { type: 'number', min: 0, step: '0.01' })}
        {field('comparePrice', 'Original price (₹, optional)', { type: 'number', min: 0, step: '0.01' })}
        {field('stock', 'Stock', { type: 'number', min: 0, step: 1 })}
        <label className="field span-2">Description
          <textarea rows={3} value={form.description} onChange={set('description')} />
        </label>
        <fieldset className="span-2 checks">
          <legend>Shop placement</legend>
          <label className="check"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured</label>
          <label className="check"><input type="checkbox" checked={form.isTrending} onChange={set('isTrending')} /> Trending</label>
          <label className="check"><input type="checkbox" checked={form.isBestseller} onChange={set('isBestseller')} /> Best seller</label>
          <label className="check"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Visible in shop</label>
        </fieldset>
        <button className="btn btn-primary span-2" disabled={busy}>
          {busy ? 'Saving…' : savedId ? 'Save changes' : 'Create product'}
        </button>
      </form>

      {savedId ? (
        <section className="card">
          <h3>Product images</h3>
          <p className="muted small">JPG, PNG or WEBP, up to 3 MB. Without images, a styled placeholder is shown.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
          <div className="image-grid">
            {images.map((img) => (
              <div key={img.id} className="image-item">
                <img src={img.image_url} alt="" />
                <button className="link-btn danger" onClick={() => removeImage(img.id)}>Remove</button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="muted small">Save the product first, then you can upload images.</p>
      )}
    </div>
  );
}

function Categories() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const load = () => api('/admin/categories').then((d) => setItems(d.categories)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try { await api('/admin/categories', { method: 'POST', body: { name } }); setName(''); load(); }
    catch (err) { setError(err.message); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try { await api(`/admin/categories/${c.id}`, { method: 'DELETE' }); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <ErrorBox message={error} />
      <form className="inline-form" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" aria-label="Category name" />
        <button className="btn btn-primary" disabled={name.trim().length < 2}>Add category</button>
      </form>
      {!items ? <Loader /> : (
        <ul className="mini-list">
          {items.map((c) => (
            <li key={c.id}><span>{c.name} <span className="muted small">/{c.slug}</span></span><button className="link-btn danger" onClick={() => remove(c)}>Delete</button></li>
          ))}
        </ul>
      )}
    </>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});

  const load = useCallback(() => {
    setOrders(null);
    api(`/admin/orders${filter ? `?status=${filter}` : ''}`)
      .then((d) => { setOrders(d.orders); setStatuses(d.statuses); })
      .catch((e) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  const toggle = async (id) => {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    if (!details[id]) {
      const d = await api(`/admin/orders/${id}`);
      setDetails((prev) => ({ ...prev, [id]: d.order }));
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <>
      <div className="toolbar-row">
        <label>Filter by status{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <ErrorBox message={error} />
      {!orders ? <Loader /> : !orders.length ? <EmptyState title="No orders found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr key={o.id} className="clickable" onClick={() => toggle(o.id)}>
                    <td>{o.order_number}</td>
                    <td>{o.customer_name}<br /><span className="muted small">{o.phone}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td>{formatINR(o.total)}</td>
                    <td>{o.payment_method === 'cod' ? 'COD' : 'Demo online'} · {o.payment_status}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} aria-label={`Status for ${o.order_number}`}
                        disabled={o.status === 'Delivered' || o.status === 'Cancelled'}>
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                  {expanded === o.id && details[o.id] && (
                    <tr>
                      <td colSpan={6} className="order-expand">
                        <p><StatusBadge status={o.status} /> · {details[o.id].address_line}, {details[o.id].city}, {details[o.id].state} {details[o.id].pincode}</p>
                        <ul className="mini-list">
                          {details[o.id].items.map((i) => <li key={i.id}><span>{i.product_name} × {i.quantity}</span><span>{formatINR(i.line_total)}</span></li>)}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
