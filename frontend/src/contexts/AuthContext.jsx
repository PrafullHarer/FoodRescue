import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const setCookie = (name, value, days = 7) => {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

export const deleteCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

export const persistSession = (accessToken, refreshToken, userData) => {
  const expiryTime = Date.now() + SEVEN_DAYS_MS;

  // 1. LocalStorage
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('foodrescue_auth_expiry', String(expiryTime));

  // 2. 7-Day Browser & WebView Cookies
  if (accessToken) setCookie('foodrescue_token', accessToken, 7);
  if (refreshToken) setCookie('foodrescue_refresh', refreshToken, 7);
  setCookie('foodrescue_session', 'active', 7);
  setCookie('foodrescue_expires_at', String(expiryTime), 7);
};

export const clearSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('foodrescue_auth_expiry');
  deleteCookie('foodrescue_token');
  deleteCookie('foodrescue_refresh');
  deleteCookie('foodrescue_session');
  deleteCookie('foodrescue_expires_at');
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if 7 days have passed since login
    const storedExpiry = localStorage.getItem('foodrescue_auth_expiry') || getCookie('foodrescue_expires_at');
    if (storedExpiry && Date.now() > Number(storedExpiry)) {
      console.log('[Auth] 7-day session expired. Clearing session.');
      clearSession();
      setUser(null);
      setLoading(false);
      return;
    }

    // Retrieve token from either localStorage or 7-day cookie
    let token = localStorage.getItem('accessToken');
    if (!token) {
      token = getCookie('foodrescue_token');
      if (token) {
        localStorage.setItem('accessToken', token);
      }
    }

    let refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      refreshToken = getCookie('foodrescue_refresh');
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }

    if (token) {
      fetchUser();
      // Notify native mobile app wrapper to register push token and persist 7-day session
      if (typeof window !== 'undefined' && window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'USER_AUTHENTICATED',
            token,
            refreshToken,
            expiresAt: storedExpiry || String(Date.now() + SEVEN_DAYS_MS),
          })
        );
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const notifyNativeAuth = (token, refreshToken, userData) => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView?.postMessage && token) {
      try {
        const expiresAt = Date.now() + SEVEN_DAYS_MS;
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'USER_AUTHENTICATED',
            token,
            refreshToken,
            userId: userData?.id,
            expiresAt,
          })
        );
      } catch (err) {
        console.warn('[Bridge] Failed to post auth message to native wrapper:', err);
      }
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persistSession(data.data.accessToken, data.data.refreshToken, data.data.user);
    setUser(data.data.user);
    notifyNativeAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
    return data.data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    if (data.data?.accessToken) {
      persistSession(data.data.accessToken, data.data.refreshToken, data.data.user);
      setUser(data.data.user);
      notifyNativeAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
    }
    return data.data;
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    if (data.data?.accessToken) {
      persistSession(data.data.accessToken, data.data.refreshToken, data.data.user);
      setUser(data.data.user);
      notifyNativeAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
    }
    return data.data;
  };

  const completeProfile = async (formData) => {
    const { data } = await api.post('/auth/complete-profile', formData);
    if (data.data?.accessToken) {
      persistSession(data.data.accessToken, data.data.refreshToken, data.data.user);
      setUser(data.data.user);
    } else {
      // Account is pending verification; revoke temporary setup session
      clearSession();
      setUser(null);
    }
    return data.data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || getCookie('foodrescue_refresh');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // ignore
    }
    clearSession();
    setUser(null);
    if (typeof window !== 'undefined' && window.ReactNativeWebView?.postMessage) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_LOGGED_OUT' }));
      } catch (err) {
        // ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        completeProfile,
        logout,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
