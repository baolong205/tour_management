import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getSession, saveSession } from '../services/api.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const sync = async () => {
      if (!getSession()?.accessToken) { if (active) { setUser(null); setLoading(false); } return; }
      try { const data = await api('/auth/me'); if (active) setUser(data); }
      catch { if (active) setUser(null); }
      finally { if (active) setLoading(false); }
    };
    sync(); window.addEventListener('auth-change', sync);
    return () => { active = false; window.removeEventListener('auth-change', sync); };
  }, []);
  async function login(email, password) {
    const result = await api('/auth/login', { method: 'POST', body: { email, password } });
    saveSession(result); setUser(result.user);
  }
  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } finally { saveSession(null); setUser(null); }
  }
  return <AuthContext.Provider value={{ user, loading, login, logout, can: permission => user?.permissions?.includes(permission) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
