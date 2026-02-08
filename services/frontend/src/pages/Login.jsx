import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/earth-scroll.css';

const GOOGLE_CLIENT_ID = '315899476122-jebvtaiu62io7bhej450n8tqcofjmrbi.apps.googleusercontent.com';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        text: 'signin_with',
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
        body: JSON.stringify({ credential: response.credential }),
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
        setError(j.message || 'Google sign-in failed.');
      }
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
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
    setLoading(true);

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await resp.json();
      if (resp.ok) {
        localStorage.setItem('token', j.token);
        localStorage.setItem('role', j.role);
        localStorage.setItem('email', email);
        if (j.role === 'seller') navigate('/seller');
        else if (j.role === 'admin') navigate('/admin');
        else navigate('/');
      } else {
        setError(j.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form id="loginForm" onSubmit={handleSubmit} className="auth-form">
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
                placeholder="Enter your password"
                className="form-input"
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider"></div>

          <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}></div>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup" className="link">Create one</Link></p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
