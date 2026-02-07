import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header({ title = 'Material Mover', showHome = false }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.clear();
    navigate('/');
  };

  return (
    <header className="site-header">
      <Link to="/" className="header-logo">
        <h1>{title}</h1>
      </Link>
      <nav>
        {showHome && <Link to="/">Home</Link>}
        {!token ? (
          <Link to="/login" id="loginLink">Login</Link>
        ) : (
          <span id="userInfo">
            <a href="#" id="logoutBtn" onClick={handleLogout}>Logout</a>
          </span>
        )}
      </nav>
    </header>
  );
}
