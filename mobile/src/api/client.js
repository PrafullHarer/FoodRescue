import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL } from './config';

const client = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure dynamic API base URL if stored by user
AsyncStorage.getItem('@foodrescue_custom_api_url').then((savedUrl) => {
  if (savedUrl) {
    client.defaults.baseURL = savedUrl;
  }
});

// Request Interceptor: Inject JWT Token
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@foodrescue_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore storage read error
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If backend returns account pending verification (HTTP 403)
    if (
      error.response?.data?.code === 'ACCOUNT_PENDING_APPROVAL' ||
      error.response?.data?.code === 'ACCOUNT_PENDING_VERIFICATION' ||
      error.response?.status === 403
    ) {
      const msg = error.response?.data?.message || 'Account pending admin verification';
      const pendingErr = new Error(msg);
      pendingErr.response = error.response;
      pendingErr.code = error.response?.data?.code || 'ACCOUNT_PENDING_VERIFICATION';
      return Promise.reject(pendingErr);
    }

    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.multiRemove([
        '@foodrescue_token',
        '@foodrescue_refresh_token',
        '@foodrescue_user',
      ]);
    }

    let customMessage =
      error.response?.data?.message ||
      error.response?.data?.error;

    if (!customMessage) {
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        customMessage = `Cannot connect to server at ${client.defaults.baseURL}. Ensure device is on the same Wi-Fi and backend is running.`;
      } else {
        customMessage = error.message || 'An unexpected network error occurred';
      }
    }

    const formattedErr = new Error(customMessage);
    formattedErr.response = error.response;
    formattedErr.code = error.response?.data?.code || error.code;
    return Promise.reject(formattedErr);
  }
);

export default client;
