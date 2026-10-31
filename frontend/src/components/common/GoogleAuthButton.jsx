import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

// Global singletons to prevent multiple initialization warnings in React StrictMode & HMR
let globalGisInitializedClientId = null;
let globalGisResponseCallback = null;

/**
 * Professional Google Identity Services Authentication Button.
 * Follows Google's official branding guidelines, auto-detects dark/light themes,
 * mounts Google Identity Services securely, and handles authentic OAuth credential tokens.
 */
export default function GoogleAuthButton({ mode = 'signin', className = '' }) {
  const { loginWithGoogle } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );

  const googleBtnRef = useRef(null);

  // 1. Fetch Google Client ID from backend if not defined in frontend env
  useEffect(() => {
    if (!googleClientId) {
      api.get('/auth/google-config')
        .then((res) => {
          if (res.data?.data?.clientId) {
            setGoogleClientId(res.data.data.clientId);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch Google OAuth configuration:', err);
        });
    }
  }, [googleClientId]);

  // 2. Handle verified credential response from Google Identity Services
  const handleCredentialResponse = async (response) => {
    if (!response?.credential) {
      toast.error('No credential received from Google.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginWithGoogle(response.credential);

      if (data?.profile_completed === false) {
        toast.success('Signed in with Google! Please complete your profile to continue.');
        navigate('/complete-profile');
      } else {
        toast.success(`Welcome back, ${data?.user?.full_name || 'Member'}!`);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      const code = err.response?.data?.code;
      const details = err.response?.data?.details;
      const msg = err.response?.data?.message || 'Google authentication failed. Please try again.';

      if (code === 'ACCOUNT_PENDING_VERIFICATION' || msg.toLowerCase().includes('awaiting admin verification')) {
        const email = details?.email || '';
        if (email) sessionStorage.setItem('foodrescue_pending_email', email);
        toast.error('Your account is awaiting admin verification.');
        navigate('/verification-pending', {
          state: {
            email,
            status: 'PENDING',
            verification_status: 'PENDING',
            full_name: details?.full_name || '',
            role: details?.role || '',
          },
        });
        return;
      }

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize latest callback with global pointer
  useEffect(() => {
    globalGisResponseCallback = handleCredentialResponse;
  });

  // 3. Load Google Identity Services SDK script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const scriptId = 'google-gsi-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setGisLoaded(true);
      script.onerror = () => {
        console.warn('Google Identity Services script failed to load.');
      };
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', () => setGisLoaded(true));
    }
  }, []);

  // 4. Initialize Google Identity Services (Globally ONCE per client ID)
  useEffect(() => {
    if (!gisLoaded || !window.google?.accounts?.id || !googleClientId) return;

    // Prevent duplicate calls across React StrictMode remounts and page navigation
    if (globalGisInitializedClientId === googleClientId) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp) => {
          if (globalGisResponseCallback) {
            globalGisResponseCallback(resp);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
      });
      globalGisInitializedClientId = googleClientId;
    } catch (e) {
      console.warn('Failed to initialize Google Accounts:', e);
    }
  }, [gisLoaded, googleClientId]);

  // 5. Render official GSI button into container
  useEffect(() => {
    if (!gisLoaded || !window.google?.accounts?.id || !googleClientId || !googleBtnRef.current) return;

    try {
      googleBtnRef.current.innerHTML = '';
      const containerWidth = googleBtnRef.current.offsetWidth || 340;
      const clampedWidth = Math.min(Math.max(containerWidth, 240), 400);

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        type: 'standard',
        text: mode === 'signup' ? 'signup_with' : 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        width: clampedWidth,
      });
    } catch (e) {
      console.warn('Failed to render Google button:', e);
    }
  }, [gisLoaded, googleClientId, isDark, mode]);

  const handleWrapperClick = () => {
    if (loading) return;
    if (!gisLoaded) {
      toast('Connecting to Google Identity Services...', { icon: '⏳' });
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* 1. Custom Google Button Design (Always visible, responsive, matching design system) */}
      <div
        className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-neutral-300 dark:border-[#2a2a30] bg-white dark:bg-[#141417] text-neutral-800 dark:text-neutral-100 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-[#1c1c22] hover:border-neutral-400 dark:hover:border-[#3a3a44] transition-all duration-150 shadow-xs select-none"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-neutral-400 border-t-neutral-800 dark:border-t-white rounded-full animate-spin" />
        ) : (
          <>
            {/* Official Google 4-Color 'G' Vector Icon */}
            <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
          </>
        )}
      </div>

      {/* 2. Official Google GSI Button mounted invisibly on top to capture clicks */}
      <div
        ref={googleBtnRef}
        onClick={handleWrapperClick}
        className="absolute inset-0 w-full h-full opacity-[0.001] cursor-pointer z-10 overflow-hidden flex items-center justify-center [&_iframe]:!w-full [&_iframe]:!h-full [&>div]:!w-full [&>div]:!h-full [&>div]:!scale-110"
        title={mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
      />
    </div>
  );
}
