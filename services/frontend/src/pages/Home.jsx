import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Chatbot from '../components/Chatbot';
import Earth3D from '../components/Earth3D';
import WasteScene from '../components/WasteScene';
import ReactiveStars from '../components/ReactiveStars';

import { isLoggedIn, getAuthHeaders, getRole } from '../utils/auth';
import Footer from '../components/Footer';

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

// Auth Modal Component
function AuthModal({ isOpen, onClose, mode, navigate }) {
  if (!isOpen) return null;

  const handleSignIn = () => {
    onClose();
    navigate('/login');
  };

  const handleSignUp = () => {
    onClose();
    navigate('/signup');
  };

  const handleGuest = () => {
    onClose();
    navigate('/listings');
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>
        <h2>{mode === 'buy' ? 'Browse Materials' : 'Sell Materials'}</h2>
        <p>{mode === 'buy'
          ? 'Choose how you want to continue'
          : 'Sign in or create an account to start selling'}
        </p>
        <div className="auth-modal-buttons">
          <button className="auth-modal-btn auth-modal-btn-primary" onClick={handleSignIn}>
            Sign In
          </button>
          <button className="auth-modal-btn auth-modal-btn-secondary" onClick={handleSignUp}>
            Sign Up
          </button>
          {mode === 'buy' && (
            <button className="auth-modal-btn auth-modal-btn-guest" onClick={handleGuest}>
              Continue as Guest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('buy'); // 'buy' or 'sell'
  const marketplaceRef = useRef(null);
  const navigate = useNavigate();

  const handleBuyClick = () => {
    if (isLoggedIn()) {
      // Already logged in, go directly to listings
      navigate('/listings');
    } else {
      setAuthModalMode('buy');
      setAuthModalOpen(true);
    }
  };

  const handleSellClick = () => {
    if (isLoggedIn()) {
      const role = getRole();
      if (role === 'seller' || role === 'admin') {
        // Already logged in as seller/admin, go to seller dashboard
        navigate('/seller');
      } else {
        // Logged in as buyer, redirect to listings with a message
        navigate('/listings');
      }
    } else {
      setAuthModalMode('sell');
      setAuthModalOpen(true);
    }
  };

  // Set dark background for landing hero
  useEffect(() => {
    document.body.classList.add('earth-scroll-page');
    return () => document.body.classList.remove('earth-scroll-page');
  }, []);

  // Redirect logged-in admins (sellers can still view home page)
  useEffect(() => {
    if (isLoggedIn()) {
      const role = getRole();
      if (role === 'admin') {
        navigate('/admin');
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

  // Get 3 preview products for a category
  function getPreviewProducts(category) {
    if (!category || products.length === 0) return [];

    // Try to filter by category
    const filtered = products.filter(p =>
      p.title?.toLowerCase().includes(category.toLowerCase()) ||
      p.description?.toLowerCase().includes(category.toLowerCase()) ||
      p.category?.toLowerCase() === category.toLowerCase()
    );

    // If we have matches, return them; otherwise return first 3 products as preview
    if (filtered.length > 0) {
      return filtered.slice(0, 3);
    }
    return products.slice(0, 3);
  }

  function performSearch() {
    const q = query.trim();
    // Allow empty search - will show all/featured products
    navigate(`/listings?q=${encodeURIComponent(q)}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  }

  function handleCategoryClick(category) {
    navigate(`/listings?category=${encodeURIComponent(category)}`);
  }

  const scrollToMarketplace = () => {
    marketplaceRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Header />

      {/* ===== Landing Hero ===== */}
      <Earth3D />
      <WasteScene />

      <main className="scroll-container">
        <section className="scroll-section" id="section-1">
          <div className="content center-align">
            <div className="hero-search-box">
              <input
                type="text"
                placeholder="Search materials..."
                className="hero-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="hero-search-btn" onClick={() => performSearch()}>Search</button>
            </div>
            <div className="hero-buttons">
              {/* <button className="hero-btn hero-btn-buy">Buy</button>
              <button className="hero-btn hero-btn-sell">Sell</button> */}
              <button className="hero-btn hero-btn-buy" onClick={handleBuyClick}>Buy</button>
              <button className="hero-btn hero-btn-sell" onClick={handleSellClick}>Sell</button>
            </div>
            <h1>Material Mover</h1>
            <p>Sustainable construction materials marketplace</p>
          </div>
        </section>

        <section className="scroll-section" id="section-2">
          <div className="content center-align">
            <h2>Reduce. Reuse. Rebuild.</h2>
            <p>Giving construction materials a second life.</p>
          </div>
        </section>

        <section className="scroll-section scroll-section-long" id="section-3">
          <div className="content center-align" style={{ zIndex: 20, position: 'relative' }}>
            <button onClick={scrollToMarketplace} className="enter-button">
              Enter Marketplace →
            </button>
          </div>
        </section>
      </main>


      {/* ===== Marketplace ===== */}
      <div ref={marketplaceRef} className="marketplace-section">
        <div className="container">
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

          <section
            className="feature-categories"
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <div className="category-column">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.name}
                  className={`category-item ${hoveredCategory === cat.name ? 'active' : ''}`}
                  data-category={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  onMouseEnter={() => setHoveredCategory(cat.name)}
                >
                  <img src={cat.icon} alt={cat.name} />
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Fixed preview section below icons */}
            <div className="preview-section">
              {hoveredCategory && (
                <div className="preview-products">
                  {getPreviewProducts(hoveredCategory).length > 0 ? (
                    getPreviewProducts(hoveredCategory).map((product, idx) => (
                      <div key={product.id || idx} className="preview-card">
                        <img
                          src={product.image || '/images/placeholder.png'}
                          alt={product.title}
                          className="preview-image"
                        />
                        <span className="preview-title">{product.title}</span>
                        <span className="preview-price">₹{product.price || 0}</span>
                      </div>
                    ))
                  ) : (
                    <div className="preview-empty">No items yet</div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <Chatbot />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authModalMode}
        navigate={navigate}
      />

      {/* Footer */}
      <Footer />
    </>
  );
}
