import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!role) {
      alert('Please select your role (Buyer or Seller)');
      return;
    }

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
        alert(j.message || JSON.stringify(j));
      }
    } catch (err) {
      alert('Signup failed. Please try again.');
    }
  }

  return (
    <main className="container auth">
      <h2>Sign Up</h2>
      <form id="signupForm" onSubmit={handleSubmit}>
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
        <label>
          I want to:
          <select value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Select your role</option>
            <option value="buyer">Buy Materials</option>
            <option value="seller">Sell Materials</option>
          </select>
        </label>
        <button type="submit">Sign Up</button>
      </form>
      <div className="auth-help">
        <p>
          <strong>Choose your role:</strong>
        </p>
        <ul>
          <li>
            <strong>Buyer:</strong> Search and view available materials
          </li>
          <li>
            <strong>Seller:</strong> List and manage your materials
          </li>
        </ul>
        <p className="auth-note">Note: Admin access is granted by existing administrators only.</p>
        <p>
          Have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
