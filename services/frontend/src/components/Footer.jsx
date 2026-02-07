import React from 'react';
import '../styles/footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>MaterialMover</h3>
          <p>Your trusted platform for buying and selling construction materials online.</p>
          <div className="social-links">
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="Twitter">𝕏</a>
            <a href="#" aria-label="LinkedIn">💼</a>
            <a href="#" aria-label="Instagram">📷</a>
          </div>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/seller">Become a Seller</a></li>
            <li><a href="/signup">Sign Up</a></li>
            <li><a href="/login">Login</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Categories</h4>
          <ul>
            <li><a href="/">Wood</a></li>
            <li><a href="/">Glass</a></li>
            <li><a href="/">Metals</a></li>
            <li><a href="/">Cement</a></li>
            <li><a href="/">Plastic</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Contact Us</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact Info</h4>
          <p><strong>Email:</strong> <a href="mailto:info@materialmover.com">info@materialmover.com</a></p>
          <p><strong>Phone:</strong> <a href="tel:+91-000-000-0000">+91-000-000-0000</a></p>
          <p><strong>Hours:</strong> Mon-Fri, 9AM-6PM IST</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} MaterialMover. All rights reserved.</p>
      </div>
    </footer>
  );
}
