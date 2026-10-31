import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState(null);

  // Restore session from AsyncStorage on app launch
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@foodrescue_token');
        const storedUser = await AsyncStorage.getItem('@foodrescue_user');
        const storedPending = await AsyncStorage.getItem('@foodrescue_pending_email');

        if (storedPending) {
          setPendingEmail(storedPending);
        }

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // Verify token against backend in background
          client
            .get('/auth/me')
            .then((res) => {
              if (res.data?.success && res.data?.data) {
                const refreshed = res.data.data.user || res.data.data;
                setUser(refreshed);
                AsyncStorage.setItem('@foodrescue_user', JSON.stringify(refreshed));
              }
            })
            .catch(() => {
              // Token likely invalid or expired
            });
        }
      } catch (err) {
        console.warn('Error restoring auth token:', err);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await client.post('/auth/login', { email, password });
      if (res.data?.success) {
        const { user: userData, accessToken, refreshToken } = res.data.data;

        // Ensure non-admin user is APPROVED
        const statusUpper = (userData.verification_status || '').toUpperCase();
        if (userData.role !== 'admin' && statusUpper && statusUpper !== 'APPROVED') {
          setPendingEmail(email);
          await AsyncStorage.setItem('@foodrescue_pending_email', email);
          const pendingErr = new Error('Your account is awaiting administrator approval.');
          pendingErr.code = 'ACCOUNT_PENDING_APPROVAL';
          pendingErr.verification_status = userData.verification_status;
          throw pendingErr;
        }

        await AsyncStorage.multiSet([
          ['@foodrescue_token', accessToken],
          ['@foodrescue_refresh_token', refreshToken || ''],
          ['@foodrescue_user', JSON.stringify(userData)],
        ]);
        await AsyncStorage.removeItem('@foodrescue_pending_email');

        setToken(accessToken);
        setUser(userData);
        setPendingEmail(null);
        return { success: true, user: userData };
      }
    } catch (err) {
      if (
        err.code === 'ACCOUNT_PENDING_APPROVAL' ||
        err.code === 'ACCOUNT_PENDING_VERIFICATION' ||
        err.message?.toLowerCase().includes('awaiting admin verification')
      ) {
        setPendingEmail(email);
        await AsyncStorage.setItem('@foodrescue_pending_email', email);
      }
      throw err;
    }
  };

  const register = async (formData) => {
    const res = await client.post('/auth/register', formData);
    if (res.data?.success) {
      setPendingEmail(formData.email);
      await AsyncStorage.setItem('@foodrescue_pending_email', formData.email);
      return res.data;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const checkVerificationStatus = async (emailToCheck) => {
    const targetEmail = emailToCheck || pendingEmail;
    if (!targetEmail) {
      throw new Error('No email provided to check status');
    }

    const res = await client.get(`/auth/verification-status?email=${encodeURIComponent(targetEmail)}`);
    if (res.data?.success && res.data?.data) {
      const statusData = res.data.data;
      const statusUpper = (statusData.verification_status || statusData.status || '').toUpperCase();
      if (statusUpper === 'APPROVED') {
        // Clear pending flag
        setPendingEmail(null);
        await AsyncStorage.removeItem('@foodrescue_pending_email');
      }
      return statusData;
    }
    throw new Error(res.data?.message || 'Failed to check verification status');
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@foodrescue_token',
        '@foodrescue_refresh_token',
        '@foodrescue_user',
      ]);
    } catch (err) {
      console.warn('Error during logout:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await client.get('/auth/me');
      if (res.data?.success && res.data?.data) {
        const updated = res.data.data.user || res.data.data;
        setUser(updated);
        await AsyncStorage.setItem('@foodrescue_user', JSON.stringify(updated));
        return updated;
      }
    } catch (err) {
      console.warn('Error refreshing user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        pendingEmail,
        setPendingEmail,
        login,
        register,
        checkVerificationStatus,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
