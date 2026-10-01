import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-title">EmotionAI Vision</span>
        </div>

        <nav className="navbar-links">
          <Link
            to="/"
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            Live Detector
          </Link>
          <Link
            to="/history"
            className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`}
          >
            History & Analytics
          </Link>
        </nav>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button onClick={logout} className="btn-logout" title="Sign out">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
