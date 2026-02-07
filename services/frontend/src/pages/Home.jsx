import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { isLoggedIn, getAuthHeaders, getRole } from '../utils/auth';

const CATEGORIES = [
  { name: 'Wood', icon: 'https://unpkg.com/lucide-static/icons/tree-pine.svg' },
  { name: 'Glass', icon: 'https://unpkg.com/lucide-static/icons/panel-bottom-close.svg' },
  { name: 'Metals', icon: 'https://unpkg.com/lucide-static/icons/hammer.svg' },
  { name: 'Cement', icon: 'https://unpkg.com/lucide-static/icons/brick-wall.svg' },
  { name: 'Plastic', icon: 'https://unpkg.com/lucide-static/icons/cup-soda.svg' },
];

function ProductCard({ product }) {
  const loggedIn = isLoggedIn();
  return (
    <div className="card">
      <div
        className="product-image-container"
        style={{
          width: '100%',
          height: '200px',
          overflow: 'hidden',
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          borderRadius: '8px',
        }}
      >
        <img
          src={product.image || '/images/placeholder.png'}
          alt={product.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <h4>{product.title}</h4>
      <p>{product.description || ''}</p>
      <strong>₹{product.price || 0}</strong>
      {loggedIn ? (
        <>
          {product.address && (
            <p className="address">
              <strong>Address:</strong> {product.address}
            </p>
          )}
          {product.phone_number && (
            <p className="phone">
              <strong>Contact:</strong> {product.phone_number}
            </p>
          )}
        </>
      ) : (
        <p className="login-notice" style={{ marginTop: '10px', color: '#666', fontSize: '0.9em' }}>
          <a href="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>
            Login
          </a>{' '}
          to view contact details
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  // Redirect logged-in sellers/admins
  useEffect(() => {
    if (isLoggedIn()) {
      const role = getRole();
      if (role === 'admin') {
        navigate('/admin');
        return;
      }
      if (role === 'seller') {
        navigate('/seller');
        return;
      }
    }
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      const r = await fetch('/api/products');
      const j = await r.json();
      if (r.ok) setProducts(j.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }

  async function performSearch(searchQuery) {
    const q = searchQuery !== undefined ? searchQuery : query.trim();
    if (!q) return alert('Enter a query');

    try {
      const resp = await fetch('/api/products/search', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query: q }),
      });
      const j = await resp.json();
      if (!resp.ok) return alert(j.message || JSON.stringify(j));
      setProducts(j.products || []);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search failed. Please try again.');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  }

  function handleCategoryClick(category) {
    setQuery(category);
    performSearch(category);
  }

  return (
    <>
      <Header />
      <main className="container">
        <section className="search-box">
          <input
            id="query"
            placeholder="Search for materials (e.g. plywood, cement)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button id="searchBtn" onClick={() => performSearch()}>
            Search
          </button>
        </section>

        <section className="feature-categories">
          <div className="category-row">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="category-item"
                data-category={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
              >
                <img src={cat.icon} alt={cat.name} />
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="products" className="products-grid">
          {products.length === 0 ? (
            <p>No results</p>
          ) : (
            products.map((p) => <ProductCard key={p._id} product={p} />)
          )}
        </section>
      </main>
    </>
  );
}
