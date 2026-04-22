import { useState, useEffect, useCallback } from 'react';

async function apiJson(path, opts, fallback = null) {
  try {
    const res = await fetch(path, { ...opts, headers: { Accept: 'application/json', ...opts?.headers } });
    const text = await res.text();
    let data;
    try {
      data = text && text.trim() ? JSON.parse(text) : null;
    } catch {
      console.error('API not JSON:', path, res.status, text?.slice(0, 200));
      return fallback;
    }
    if (!res.ok) {
      console.error('API error:', path, res.status, data);
      return fallback;
    }
    return data;
  } catch (e) {
    console.error('API fetch failed:', path, e);
    return fallback;
  }
}

async function apiFetch(path, opts) {
  const res = await fetch(path, { ...opts, headers: { Accept: 'application/json', ...opts?.headers } });
  const text = await res.text();
  let data = null;
  if (text && text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${path}: invalid JSON, ${res.status}`);
    }
  }
  if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const EMPTY_PRODUCT  = { name: '', description: '', price: '', category_id: '', image: '', stock: '' };
const EMPTY_CATEGORY = { name: '', description: '' };

export default function App() {
  const [tab, setTab]           = useState('products');
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders]       = useState([]);
  const [product, setProduct]     = useState(EMPTY_PRODUCT);
  const [category, setCategory]   = useState(EMPTY_CATEGORY);
  const [editId, setEditId]       = useState(null);

  const loadProducts  = useCallback(() => apiJson('/products', undefined, []).then((d) => setProducts(Array.isArray(d) ? d : [])), []);
  const loadCategories = useCallback(() => apiJson('/categories', undefined, []).then((d) => setCategories(Array.isArray(d) ? d : [])), []);
  const loadOrders    = useCallback(() => apiJson('/makeline/orders', undefined, []).then((d) => setOrders(Array.isArray(d) ? d : [])), []);

  useEffect(() => { loadProducts(); loadCategories(); }, []);

  // ── Products ──────────────────────────────────────────────────────────────

  async function saveProduct(e) {
    e.preventDefault();
    const body = { ...product, price: Number(product.price), stock: Number(product.stock) };
    if (editId) {
      await apiFetch(`/products/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setEditId(null);
    } else {
      await apiFetch('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setProduct(EMPTY_PRODUCT);
    loadProducts();
  }

  function startEdit(p) {
    setEditId(p.id);
    setProduct({ name: p.name, description: p.description, price: p.price, category_id: p.category_id, image: p.image || '', stock: p.stock });
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
    loadProducts();
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async function saveCategory(e) {
    e.preventDefault();
    await apiFetch('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(category) });
    setCategory(EMPTY_CATEGORY);
    loadCategories();
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    await apiFetch(`/categories/${id}`, { method: 'DELETE' });
    loadCategories();
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async function updateStatus(id, status) {
    await apiFetch(`/makeline/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    loadOrders();
  }

  return (
    <>
      <header>
        <h1>⚙️ Best Deal Admin</h1>
        <nav>
          <button className={tab === 'products'   ? 'active' : ''} onClick={() => setTab('products')}>Products</button>
          <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categories</button>
          <button className={tab === 'orders'     ? 'active' : ''} onClick={() => { setTab('orders'); loadOrders(); }}>Orders</button>
        </nav>
      </header>

      <main>
        {/* ── Products tab ── */}
        {tab === 'products' && (
          <>
            <div className="form-card">
              <h3>{editId ? 'Edit Product' : 'Add Product'}</h3>
              <form onSubmit={saveProduct}>
                <div className="form-row">
                  <input required placeholder="Name" value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} />
                  <input required type="number" min="0" step="0.01" placeholder="Price" value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })} />
                  <input required type="number" min="0" placeholder="Stock" value={product.stock} onChange={e => setProduct({ ...product, stock: e.target.value })} />
                </div>
                <div className="form-row">
                  <select required value={product.category_id} onChange={e => setProduct({ ...product, category_id: e.target.value })}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input placeholder="Image URL (optional)" value={product.image} onChange={e => setProduct({ ...product, image: e.target.value })} />
                </div>
                <div className="form-row">
                  <textarea placeholder="Description" value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })} />
                </div>
                <button type="submit" className="primary">{editId ? 'Update' : 'Add'} Product</button>
                {editId && <button type="button" style={{ marginLeft: '.5rem' }} className="danger" onClick={() => { setEditId(null); setProduct(EMPTY_PRODUCT); }}>Cancel</button>}
              </form>
            </div>

            <h2>Products ({products.length})</h2>
            {products.length === 0 ? <p className="empty">No products yet.</p> : (
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{categories.find(c => c.id === p.category_id)?.name || '—'}</td>
                      <td>${Number(p.price).toFixed(2)}</td>
                      <td>{p.stock}</td>
                      <td style={{ display: 'flex', gap: '.4rem' }}>
                        <button className="primary" onClick={() => startEdit(p)}>Edit</button>
                        <button className="danger" onClick={() => deleteProduct(p.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── Categories tab ── */}
        {tab === 'categories' && (
          <>
            <div className="form-card">
              <h3>Add Category</h3>
              <form onSubmit={saveCategory}>
                <div className="form-row">
                  <input required placeholder="Name" value={category.name} onChange={e => setCategory({ ...category, name: e.target.value })} />
                  <input placeholder="Description" value={category.description} onChange={e => setCategory({ ...category, description: e.target.value })} />
                </div>
                <button type="submit" className="primary">Add Category</button>
              </form>
            </div>

            <h2>Categories ({categories.length})</h2>
            {categories.length === 0 ? <p className="empty">No categories yet.</p> : (
              <table>
                <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.description || '—'}</td>
                      <td><button className="danger" onClick={() => deleteCategory(c.id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── Orders tab ── */}
        {tab === 'orders' && (
          <>
            <h2>Orders ({orders.length})</h2>
            {orders.length === 0 ? <p className="empty">No orders yet.</p> : (
              <table>
                <thead><tr><th>Customer</th><th>Email</th><th>Total</th><th>Items</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id || o.id}>
                      <td>{o.customer_name}</td>
                      <td>{o.customer_email}</td>
                      <td>${Number(o.total).toFixed(2)}</td>
                      <td>{o.items?.map(i => `${i.name}×${i.qty}`).join(', ')}</td>
                      <td>
                        <select
                          className="status-select"
                          value={o.status}
                          onChange={e => updateStatus(o._id || o.id, e.target.value)}
                        >
                          <option value="pending">pending</option>
                          <option value="processing">processing</option>
                          <option value="completed">completed</option>
                        </select>
                      </td>
                      <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </>
  );
}
