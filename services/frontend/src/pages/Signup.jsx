import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/earth-scroll.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Apply dark theme
  useEffect(() => {
    document.body.classList.add('earth-scroll-page');
    return () => document.body.classList.remove('earth-scroll-page');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!role) {
      setError('Please select your role (Buyer or Seller)');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const j = await resp.json();
      if (resp.ok) {
        alert(`Account created as ${j.role}, please login`);
        navigate('/login');
      } else {
        setError(j.message || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="auth-container">
        <div className="auth-card signup-card">
          <div className="auth-header">
            <h2>Create Account</h2>
            <p>Start trading construction materials today</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form id="signupForm" onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create a strong password"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">I want to</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="form-input"
              >
                <option value="">Select your role</option>
                <option value="buyer">🛒 Buy Materials</option>
                <option value="seller">📦 Sell Materials</option>
              </select>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider">or</div>

          <div className="auth-info">
            <p className="info-title">🎯 Choose Your Role</p>
            <div className="role-cards">
              <div className="role-card">
                <div className="role-icon">🛒</div>
                <h4>Buyer</h4>
                <p>Search and purchase quality construction materials from verified sellers</p>
              </div>
              <div className="role-card">
                <div className="role-icon">📦</div>
                <h4>Seller</h4>
                <p>List your materials and reach potential buyers across the market</p>
              </div>
            </div>
            <p className="auth-note">💡 Admin access is granted by administrators only</p>
          </div>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="link">Sign in</Link></p>
          </div>
        </div>
      </main>
    </>
  );
}
