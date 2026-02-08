import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/footer.css';

export default function Footer() {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const handleSearch = () => {
        navigate(`/listings?q=${encodeURIComponent(searchQuery)}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="site-footer">
            <div className="footer-main">
                {/* Left - Logo & Tagline */}
                <div className="footer-brand">
                    <h2 className="footer-logo">Material Mover</h2>
                    <p className="footer-tagline">Sustainable construction materials marketplace</p>
                </div>

                {/* Center - Navigation */}
                <nav className="footer-nav">
                    <button className="footer-nav-link" onClick={scrollToTop}>Home</button>
                    <button className="footer-nav-link" onClick={() => navigate('/listings')}>Buy</button>
                    <button className="footer-nav-link" onClick={() => navigate('/seller')}>Sell</button>
                    <button className="footer-nav-link" onClick={() => navigate('/listings')}>Products</button>
                </nav>

                {/* Right - Search */}
                {/*
                <div className="footer-search">
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="footer-search-input"
                    />
                    <button className="footer-search-btn" onClick={handleSearch}>
                        Search
                    </button>
                </div>*/}
            </div>

            {/* Bottom - Copyright */}
            <div className="footer-bottom">
                <p>© {currentYear} MaterialMover. All rights reserved.</p>
            </div>
        </footer>
    );
}
