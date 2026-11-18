import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import { Loader, ErrorBox, EmptyState } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const SORTS = [
  ['popularity', 'Most popular'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['rating', 'Top rated'],
  ['newest', 'Newest'],
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(null);
  const [notice, setNotice] = useState('');
  const [searchText, setSearchText] = useState(params.get('search') || '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const sort = params.get('sort') || 'popularity';
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const qs = new URLSearchParams(params);
    api(`/products?${qs.toString()}`)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params]);

  // Helper: update one or more URL params and reset to page 1 when filters change.
  const update = (changes, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, v)));
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const applySearch = (e) => { e.preventDefault(); update({ search: searchText.trim() }); };
  const applyPrice = (e) => {
    e.preventDefault();
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      return setError('Minimum price cannot be higher than maximum price');
    }
    update({ minPrice, maxPrice });
  };
  const clearAll = () => { setSearchText(''); setMinPrice(''); setMaxPrice(''); setParams({}); };

  const handleAdd = async (product) => {
    if (!user) return navigate('/login', { state: { from: '/shop' } });
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

  const activeCategory = params.get('category');

  return (
    <div className="container shop-layout">
      <aside className="filters" aria-label="Filters">
        <h3>Categories</h3>
        <ul className="filter-list">
          <li><button className={!activeCategory ? 'active' : ''} onClick={() => update({ category: '' })}>All products</button></li>
          {categories.map((c) => (
            <li key={c.id}>
              <button className={activeCategory === c.slug ? 'active' : ''} onClick={() => update({ category: c.slug })}>
                {c.name} <span className="muted small">({c.product_count})</span>
              </button>
            </li>
          ))}
        </ul>

        <h3>Price (₹)</h3>
        <form onSubmit={applyPrice} className="price-filter">
          <input type="number" min="0" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} aria-label="Minimum price" />
          <input type="number" min="0" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label="Maximum price" />
          <button className="btn btn-outline" type="submit">Apply</button>
        </form>

        <h3>Collections</h3>
        <label className="check"><input type="checkbox" checked={params.get('featured') === '1'} onChange={(e) => update({ featured: e.target.checked ? '1' : '' })} /> Featured</label>
        <label className="check"><input type="checkbox" checked={params.get('trending') === '1'} onChange={(e) => update({ trending: e.target.checked ? '1' : '' })} /> Trending</label>
        <label className="check"><input type="checkbox" checked={params.get('bestseller') === '1'} onChange={(e) => update({ bestseller: e.target.checked ? '1' : '' })} /> Best sellers</label>

        <button className="link-btn" onClick={clearAll}>Clear all filters</button>
      </aside>

      <section className="shop-main">
        <div className="shop-toolbar">
          <form className="shop-search" onSubmit={applySearch}>
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name or description" aria-label="Search products" />
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
          <label className="sort">
            <span className="muted small">Sort by</span>
            <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        {result && <p className="muted small">{result.total} product{result.total === 1 ? '' : 's'} found</p>}
        <ErrorBox message={error} />
        {notice && <div className="alert alert-info">{notice}</div>}

        {loading ? <Loader label="Finding products…" /> : result?.products.length ? (
          <>
            <div className="product-grid">
              {result.products.map((p) => <ProductCard key={p.id} product={p} onAdd={handleAdd} adding={adding === p.id} />)}
            </div>
            {result.totalPages > 1 && (
              <nav className="pagination" aria-label="Pagination">
                <button className="btn btn-outline" disabled={page <= 1} onClick={() => update({ page: page - 1 }, false)}>← Previous</button>
                <span>Page {page} of {result.totalPages}</span>
                <button className="btn btn-outline" disabled={page >= result.totalPages} onClick={() => update({ page: page + 1 }, false)}>Next →</button>
              </nav>
            )}
          </>
        ) : !loading && !error && (
          <EmptyState title="No products match your filters" action={<button className="btn btn-primary" onClick={clearAll}>Clear filters</button>}>
            Try a different search term or widen your price range.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
