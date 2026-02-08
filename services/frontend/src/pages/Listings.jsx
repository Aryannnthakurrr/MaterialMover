import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MapView from '../components/MapView';
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
            {product.phone_no && (
              <p className="listing-phone">
                <strong>Contact:</strong> {product.phone_no}
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
  const [searchMode, setSearchMode] = useState('text'); // 'text' or 'location'
  const [nearbyProducts, setNearbyProducts] = useState([]);
  const [radius, setRadius] = useState(50);

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
        const resp = await fetch('/api/products/search', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ query: searchTerm }),
        });
        const j = await resp.json();
        if (resp.ok) setProducts(j.products || []);
      } else {
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

  async function handleLocationSearch(lat, lng, searchRadius) {
    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const url = `/api/products/nearby?lat=${lat}&lng=${lng}&radius=${searchRadius}`;
      const resp = await fetch(url, { headers });
      const data = await resp.json();

      if (resp.ok) {
        setNearbyProducts(data.products || []);
      }
    } catch (err) {
      console.error('Location search error:', err);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchMode('text');
      navigate(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  }

  const displayProducts = searchMode === 'location' ? nearbyProducts : products;

  return (
    <div className="listings-page">
      <Header />

      <div className="listings-container">
        {/* Search Mode Toggle */}
        <div className="search-mode-toggle">
          <button
            className={`mode-btn ${searchMode === 'text' ? 'active' : ''}`}
            onClick={() => setSearchMode('text')}
          >
            🔍 Text Search
          </button>
          <button
            className={`mode-btn ${searchMode === 'location' ? 'active' : ''}`}
            onClick={() => setSearchMode('location')}
          >
            📍 Nearby Search
          </button>
        </div>

        {/* Text Search Bar */}
        {searchMode === 'text' && (
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
        )}

        {/* Map View for location search */}
        {searchMode === 'location' && (
          <MapView
            products={nearbyProducts}
            onLocationSearch={handleLocationSearch}
            radius={radius}
            onRadiusChange={setRadius}
          />
        )}

        {/* Category Title */}
        <h2 className="listings-title">
          {searchMode === 'location'
            ? `Nearby Products (${nearbyProducts.length})`
            : category
              ? `${category} Products`
              : query
                ? `Results for "${query}"`
                : 'All Products'}
        </h2>

        {/* Products Grid */}
        {loading && searchMode === 'text' ? (
          <div className="listings-loading">Loading...</div>
        ) : displayProducts.length > 0 ? (
          <div className="listings-grid">
            {displayProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="listings-empty">
            {searchMode === 'location'
              ? 'Click on the map or enable location to find nearby products.'
              : 'No products found. Try a different search.'}
          </div>
        )}

        {/* Back Button */}
        <button onClick={() => navigate('/')} className="listings-back-btn">
          ← Back to Home
        </button>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
