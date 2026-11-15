import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Helper to extract cookie value
const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

// Attach access token to every request (checks localStorage and 7-day login cookie)
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('accessToken');
  if (!token) {
    token = getCookieValue('foodrescue_token');
    if (token) {
      localStorage.setItem('accessToken', token);
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401 & Handle unverified 403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle unapproved or revoked accounts trying to access protected endpoints
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'ACCOUNT_PENDING_VERIFICATION'
    ) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/verification-pending') {
        localStorage.clear();
        window.location.href = '/verification-pending';
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        let refreshToken = localStorage.getItem('refreshToken') || getCookieValue('foodrescue_refresh');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        }, { withCredentials: true });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
        if (typeof document !== 'undefined') {
          document.cookie = `foodrescue_token=${encodeURIComponent(data.data.accessToken)}; path=/; max-age=${SEVEN_DAYS_SEC}; SameSite=Lax`;
          document.cookie = `foodrescue_refresh=${encodeURIComponent(data.data.refreshToken)}; path=/; max-age=${SEVEN_DAYS_SEC}; SameSite=Lax`;
          document.cookie = `foodrescue_session=active; path=/; max-age=${SEVEN_DAYS_SEC}; SameSite=Lax`;
          document.cookie = `foodrescue_expires_at=${Date.now() + SEVEN_DAYS_SEC * 1000}; path=/; max-age=${SEVEN_DAYS_SEC}; SameSite=Lax`;
        }

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('foodrescue_auth_expiry');
        if (typeof document !== 'undefined') {
          document.cookie = 'foodrescue_token=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'foodrescue_refresh=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'foodrescue_session=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'foodrescue_expires_at=; path=/; max-age=0; SameSite=Lax';
        }
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
