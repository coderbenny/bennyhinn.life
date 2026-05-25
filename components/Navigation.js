// app/components/Navigation.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navigation({ currentSlide, onNavigate }) {
  const navItems = ['About', 'Stack', 'Work', 'Experience', 'Contact'];
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleNavClick = (idx) => {
    onNavigate(idx);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="nav-bar">
        <div className="nav-inner">
          <div className="nav-logo">BH</div>

          {/* Desktop links */}
          <div className="nav-links-desktop">
            {navItems.map((item, idx) => (
              <button
                key={item}
                onClick={() => handleNavClick(idx)}
                className={`nav-link ${currentSlide === idx ? 'active' : ''}`}
              >
                {item}
              </button>
            ))}
            <Link href="/blog" className="nav-link">
              Blog
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {navItems.map((item, idx) => (
            <button
              key={item}
              onClick={() => handleNavClick(idx)}
              className={`mobile-menu-link ${currentSlide === idx ? 'active' : ''}`}
              style={{ animationDelay: menuOpen ? `${idx * 0.08}s` : '0s' }}
            >
              <span className="mobile-menu-number">0{idx + 1}</span>
              <span className="mobile-menu-text">{item}</span>
            </button>
          ))}
          <Link
            href="/blog"
            className="mobile-menu-link"
            style={{ animationDelay: menuOpen ? `${navItems.length * 0.08}s` : '0s' }}
          >
            <span className="mobile-menu-number">0{navItems.length + 1}</span>
            <span className="mobile-menu-text">Blog</span>
          </Link>
        </div>
      </div>
    </>
  );
}