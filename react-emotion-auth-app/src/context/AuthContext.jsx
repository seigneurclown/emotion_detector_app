import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Helper to make authenticated requests with auto-refresh
  const authFetch = useCallback(async (url, options = {}) => {
    let token = accessToken;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // If token expired, try silent refresh
    if (response.status === 401) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          token = refreshData.accessToken;
          setAccessToken(token);
          localStorage.setItem('token', token);
          if (refreshData.user) {
            setUser(refreshData.user);
          }

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${token}`;
          response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        } else {
          // Refresh failed, log out
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('Silent refresh failed:', err);
      }
    }

    return response;
  }, [accessToken]);

  // Initial user check on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try refreshing token or fetching /api/auth/me
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          localStorage.setItem('token', data.accessToken);
          setUser(data.user);
        } else if (accessToken) {
          // Fallback to existing token
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (meRes.ok) {
            const data = await meRes.json();
            setUser(data.user);
          } else {
            localStorage.removeItem('token');
            setAccessToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    setAccessToken(data.accessToken);
    localStorage.setItem('token', data.accessToken);
    setUser(data.user);
    return data;
  };

  const register = async (email, password, name) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    setAccessToken(data.accessToken);
    localStorage.setItem('token', data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout request failed:', e);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        register,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
