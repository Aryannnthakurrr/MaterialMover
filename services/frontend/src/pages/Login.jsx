import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
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
        alert(j.message || JSON.stringify(j));
      }
    } catch (err) {
      alert('Login failed. Please try again.');
    }
  }

  return (
    <main className="container auth">
      <h2>Login</h2>
      <form id="loginForm" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </label>
        <button type="submit">Login</button>
      </form>
      <div className="auth-help">
        <p>Role will be determined by your email:</p>
        <ul>
          <li>Buyer: any email</li>
          <li>Seller: must contain "seller@"</li>
          <li>Admin: must contain "admin@"</li>
        </ul>
        <p>
          New? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
