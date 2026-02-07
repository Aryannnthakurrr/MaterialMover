import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { isLoggedIn, getAuthHeaders } from '../utils/auth';
import '../styles/earth-scroll.css';

function ProductCard({ product }) {
  const loggedIn = isLoggedIn();
  return (
    <div className="listing-card">
      <div className="listing-image-container">
        <img
          src={product.image || '/images/placeholder.png'}
          alt={product.title}
          className="listing-image"
        />
      </div>
      <div className="listing-info">
        <h4 className="listing-title">{product.title}</h4>
        <p className="listing-description">{product.description || ''}</p>
        <strong className="listing-price">₹{product.price || 0}</strong>
        {loggedIn ? (
          <>
            {product.address && (
              <p className="listing-address">
                <strong>Address:</strong> {product.address}
              </p>
            )}
            {product.phone_number && (
              <p className="listing-phone">
                <strong>Contact:</strong> {product.phone_number}
              </p>
            )}
          </>
        ) : (
          <p className="login-notice">
            <a href="/login">Login</a> to view contact details
          </p>
        )}
      </div>
    </div>
  );
}

export default function Listings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const category = searchParams.get('category') || '';
  const query = searchParams.get('q') || '';

  useEffect(() => {
    document.body.classList.add('earth-scroll-page');
    return () => document.body.classList.remove('earth-scroll-page');
  }, []);

  useEffect(() => {
    setSearchQuery(category || query);
    loadProducts(category || query);
  }, [category, query]);

  async function loadProducts(searchTerm) {
    setLoading(true);
    try {
      if (searchTerm) {
        // Search for specific category/query
        const resp = await fetch('/api/products/search', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ query: searchTerm }),
        });
        const j = await resp.json();
        if (resp.ok) setProducts(j.products || []);
      } else {
        // Load all products
        const r = await fetch('/api/products');
        const j = await r.json();
        if (r.ok) setProducts(j.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  }

  return (
    <div className="listings-page">
      <Header />

      <div className="listings-container">
        {/* Search Bar */}
        <section className="listings-search">
          <input
            type="text"
            placeholder="Search for materials (e.g. plywood, cement)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="listings-search-input"
          />
          <button onClick={handleSearch} className="listings-search-btn">
            Search
          </button>
        </section>

        {/* Category Title */}
        <h2 className="listings-title">
          {category ? `${category} Listings` : query ? `Results for "${query}"` : 'All Listings'}
        </h2>

        {/* Products Grid */}
        {loading ? (
          <div className="listings-loading">Loading...</div>
        ) : products.length > 0 ? (
          <div className="listings-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="listings-empty">
            No products found. Try a different search.
          </div>
        )}

        {/* Back Button */}
        <button onClick={() => navigate('/')} className="listings-back-btn">
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
