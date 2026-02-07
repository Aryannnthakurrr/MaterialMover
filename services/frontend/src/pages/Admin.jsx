import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { getToken, getRole, checkTokenExpiry } from '../utils/auth';

export default function Admin() {
  const toast = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [healthOutput, setHealthOutput] = useState('');

  // Create user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('buyer');

  // Product search & edit
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState(null);
  const [editProduct, setEditProduct] = useState(null);

  const token = getToken();
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token || getRole() !== 'admin') {
      alert('Please login as admin');
      navigate('/login');
      return;
    }
    if (!checkTokenExpiry()) {
      toast.error('Session expired. Please login again.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const r = await fetch('/api/auth/users', { headers });
      if (!r.ok) throw new Error('Failed to load users');
      const data = await r.json();
      setUsers(data);
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!checkTokenExpiry()) return;
    try {
      const r = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: newEmail.trim(), password: newPassword.trim(), role: newRole }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Failed to create user');
      toast.success('✅ User created successfully');
      loadUsers();
      setNewEmail('');
      setNewPassword('');
      setNewRole('buyer');
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  }

  async function handleUpdateRole(userId, role) {
    try {
      const r = await fetch('/api/auth/update-role', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, role }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Failed to update role');
      toast.success('✅ Role updated successfully');
      loadUsers();
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  }

  async function handleDeleteUser(id) {
    const confirmed = await toast.showConfirm('⚠️ Delete this user and all their products?');
    if (!confirmed) {
      toast.info('Deletion cancelled');
      return;
    }
    try {
      const r = await fetch('/api/auth/users/' + id, { method: 'DELETE', headers });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Delete failed');
      toast.success('✅ User deleted successfully');
      loadUsers();
    } catch (err) {
      toast.error('❌ Error deleting user: ' + err.message);
    }
  }

  async function handleHealthCheck() {
    try {
      const r = await fetch('/api/health');
      const j = await r.json();
      toast.info('🩺 API Health: ' + (r.ok ? 'OK' : 'Down'));
      setHealthOutput(JSON.stringify(j, null, 2));
    } catch (err) {
      toast.error('❌ Health check failed: ' + err.message);
    }
  }

  async function handleProductSearch() {
    const q = productQuery.trim();
    if (!q) {
      toast.info('🔍 Please enter a search query');
      return;
    }
    try {
      const r = await fetch('/api/products/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Search failed');
      setProductResults(j.products || []);
      toast.success('✅ Products loaded');
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  }

  async function handleDeleteProduct(id) {
    const confirmed = await toast.showConfirm('🗑️ Delete this product permanently?');
    if (!confirmed) {
      toast.info('Deletion cancelled');
      return;
    }
    try {
      const r = await fetch('/api/products/' + id, { method: 'DELETE', headers });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Delete failed');
      toast.success('✅ Product deleted');
      if (productQuery.trim()) handleProductSearch();
    } catch (err) {
      toast.error('❌ Error deleting product: ' + err.message);
    }
  }

  async function loadProductForEdit(id) {
    try {
      const r = await fetch('/api/products/' + id, { headers });
      const p = await r.json();
      if (!r.ok) throw new Error(p.message || 'Failed to load product');
      setEditProduct({
        _id: p._id,
        title: p.title || '',
        description: p.description || '',
        price: p.price ?? 0,
        quantity: p.quantity ?? 0,
        category: p.category || '',
        address: p.address || '',
        phone_number: p.phone_number || '',
        image: p.image || '',
      });
      toast.info('✏️ Editing product details');
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  }

  async function handleSaveProduct() {
    if (!editProduct?._id) {
      toast.info('⚠️ No product selected');
      return;
    }
    try {
      const r = await fetch('/api/products/' + editProduct._id, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editProduct.title,
          description: editProduct.description,
          price: parseFloat(editProduct.price) || 0,
          quantity: parseInt(editProduct.quantity) || 0,
          category: editProduct.category,
          address: editProduct.address,
          phone_number: editProduct.phone_number,
          image: editProduct.image,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Save failed');
      toast.success('💾 Product updated successfully');
      setEditProduct(null);
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  }

  function handleLogout(e) {
    e.preventDefault();
    localStorage.clear();
    toast.info('🔒 Logged out');
    setTimeout(() => navigate('/'), 1000);
  }

  function updateEditField(field, value) {
    setEditProduct((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <>
      <header className="site-header">
        <h1>Admin Dashboard</h1>
        <nav>
          <Link to="/">Home</Link>
          <a id="logout" href="#" onClick={handleLogout}>
            Logout
          </a>
        </nav>
      </header>

      <main className="container">
        <div className="admin-grid">
          {/* Create New User */}
          <section className="admin-card">
            <h3>Create New User</h3>
            <form className="auth-form" onSubmit={handleCreateUser}>
              <input
                type="email"
                placeholder="Email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit">Create User</button>
            </form>
          </section>

          {/* Users */}
          <section className="admin-card">
            <h3>Users</h3>
            <div className="user-list">
              {users.length === 0 ? (
                'No users found'
              ) : (
                users.map((u) => (
                  <div className="user-item" key={u._id}>
                    <div>
                      {u.email} <span className={`role-badge ${u.role}`}>{u.role}</span>
                    </div>
                    <div>
                      {u.role !== 'admin' && (
                        <button className="small" onClick={() => handleUpdateRole(u._id, 'admin')}>
                          Make Admin
                        </button>
                      )}
                      {u.email !== (localStorage.getItem('email') || '') && (
                        <button
                          className="small"
                          style={{ marginLeft: '8px', background: '#fca5a5' }}
                          onClick={() => handleDeleteUser(u._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* System Health */}
          <section className="admin-card">
            <h3>System Health</h3>
            <button onClick={handleHealthCheck}>Check API</button>
            <pre>{healthOutput}</pre>
          </section>

          {/* Search & Edit Product */}
          <section className="admin-card">
            <h3>Search & Edit Product</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                placeholder="Search by title or id"
                style={{ flex: 1 }}
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
              />
              <button onClick={handleProductSearch}>Search</button>
            </div>
            <div>
              {productResults === null ? (
                'Enter a query and press Search'
              ) : productResults.length === 0 ? (
                <p>No products found</p>
              ) : (
                productResults.map((p) => (
                  <div
                    key={p._id}
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img
                        src={p.image || '/images/placeholder.png'}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                        alt={p.title}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>ID: {p._id}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Address: {p.address || ''}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Phone: {p.phone_number || ''}</div>
                      </div>
                    </div>
                    <div>
                      <button className="small" onClick={() => loadProductForEdit(p._id)}>
                        Edit
                      </button>
                      <button
                        className="small"
                        style={{ marginLeft: '8px', background: '#fca5a5' }}
                        onClick={() => handleDeleteProduct(p._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {editProduct && (
              <form style={{ marginTop: '12px' }} onSubmit={(e) => e.preventDefault()}>
                <label>Title</label>
                <input
                  type="text"
                  value={editProduct.title}
                  onChange={(e) => updateEditField('title', e.target.value)}
                  required
                />
                <label>Description</label>
                <textarea
                  rows="3"
                  value={editProduct.description}
                  onChange={(e) => updateEditField('description', e.target.value)}
                  required
                />
                <label>Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editProduct.price}
                  onChange={(e) => updateEditField('price', e.target.value)}
                  required
                />
                <label>Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editProduct.quantity}
                  onChange={(e) => updateEditField('quantity', e.target.value)}
                  required
                />
                <label>Category</label>
                <input
                  type="text"
                  value={editProduct.category}
                  onChange={(e) => updateEditField('category', e.target.value)}
                  required
                />
                <label>Address *</label>
                <input
                  type="text"
                  value={editProduct.address}
                  onChange={(e) => updateEditField('address', e.target.value)}
                  required
                />
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={editProduct.phone_number}
                  onChange={(e) => updateEditField('phone_number', e.target.value)}
                  required
                />
                <label>Image URL</label>
                <input
                  type="text"
                  value={editProduct.image}
                  onChange={(e) => updateEditField('image', e.target.value)}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={handleSaveProduct}>
                    Save
                  </button>
                  <button type="button" onClick={() => { setEditProduct(null); toast.info('❎ Edit cancelled'); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>

      <style>{`
        .admin-grid {
          display: grid;
          gap: 20px;
          margin: 20px 0;
        }
        .admin-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }
        .admin-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
        }
        .user-list {
          margin: 20px 0;
        }
        .user-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        .role-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          background: #e5e7eb;
        }
        .role-badge.admin { background: #fde68a; }
        .role-badge.seller { background: #bfdbfe; }
      `}</style>
    </>
  );
}
