import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/earth-scroll.css';

const GOOGLE_CLIENT_ID = '315899476122-jebvtaiu62io7bhej450n8tqcofjmrbi.apps.googleusercontent.com';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signup_with',
      });
    }
  }, []);

  async function handleGoogleResponse(response) {
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, role: role || 'buyer' }),
      });
      const j = await resp.json();
      if (resp.ok) {
        localStorage.setItem('token', j.token);
        localStorage.setItem('role', j.role);
        localStorage.setItem('email', j.email);
        if (j.role === 'seller') navigate('/seller');
        else if (j.role === 'admin') navigate('/admin');
        else navigate('/');
      } else {
        setError(j.message || 'Google sign-up failed.');
      }
    } catch (err) {
      setError('Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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

          <div className="auth-divider"></div>

          <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}></div>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginBottom: '12px' }}>
            Select a role above before signing up with Google (defaults to Buyer)
          </p>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="link">Sign in</Link></p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
