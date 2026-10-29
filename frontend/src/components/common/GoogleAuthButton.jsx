import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

/**
 * Professional Google Identity Services Authentication Button.
 * Follows Google's official branding guidelines, auto-detects dark/light themes,
 * fetches client configuration dynamically, and handles OAuth credentials securely.
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
  const [hasRenderedIframe, setHasRenderedIframe] = useState(false);
  const [originMismatch, setOriginMismatch] = useState(false);
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
      toast.error(err.response?.data?.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        console.warn('Google Identity Services script failed to load (blocked by browser or network).');
      };
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', () => setGisLoaded(true));
    }
  }, []);

  // 4. Initialize and render official GSI button
  useEffect(() => {
    if (!gisLoaded || !window.google?.accounts?.id || !googleClientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        error_callback: (err) => {
          console.warn('Google Identity Services notification:', err);
          if (err?.type === 'origin_mismatch' || (typeof err === 'string' && err.includes('origin'))) {
            setOriginMismatch(true);
          }
        },
      });

      if (googleBtnRef.current) {
        // Clear previous render before mounting
        googleBtnRef.current.innerHTML = '';

        const containerWidth = googleBtnRef.current.offsetWidth || 340;
        const clampedWidth = Math.min(Math.max(containerWidth, 240), 400);

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: clampedWidth,
        });

        // Check if iframe was injected
        const checkTimer = setTimeout(() => {
          if (googleBtnRef.current?.querySelector('iframe')) {
            setHasRenderedIframe(true);
          }
        }, 300);

        return () => clearTimeout(checkTimer);
      }
    } catch (e) {
      console.error('Failed to initialize Google Accounts:', e);
    }
  }, [gisLoaded, googleClientId, isDark, mode]);

  // 5. Fallback click handler when custom button is used or clicked
  const handleCustomClick = () => {
    if (loading) return;

    if (originMismatch) {
      toast.error(
        'Google Cloud Origin Error: Please add "http://localhost:5173" to Authorized JavaScript origins in Google Cloud Console.',
        { duration: 8000 }
      );
      return;
    }

    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          error_callback: (err) => {
            console.warn('Google Identity Services status:', err);
            toast.error(
              'Google Origin Error: Ensure "http://localhost:5173" is added to Authorized JavaScript origins in Google Cloud Console.',
              { duration: 8000 }
            );
          },
        });

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.warn('Google One Tap not displayed:', reason);
            if (reason === 'opt_out_or_no_session') {
              toast('No active Google session found. Please sign into Google in your browser.', { icon: 'ℹ️' });
            } else if (reason === 'suppressed_by_user') {
              toast('Google prompt was closed recently. Please wait a moment or sign in with email.', { icon: 'ℹ️' });
            } else {
              toast('Google prompt unavailable. Check Authorized origins in Google Cloud Console.', { icon: '⚠️' });
            }
          }
        });
        return;
      } catch (err) {
        console.warn('Google prompt invocation error:', err);
      }
    }

    // When client ID is not yet configured or for development simulation
    toast(
      (t) => (
        <div className="space-y-2 text-xs">
          <p className="font-bold text-sm">Google Sign-In Notice</p>
          <p>
            {googleClientId
              ? 'To authenticate with Google, ensure your origin is authorized in Google Cloud Console.'
              : 'Google Client ID is missing. Set VITE_GOOGLE_CLIENT_ID in frontend/.env.'}
          </p>
          <div className="pt-1 flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                simulateDevGoogleSignIn();
              }}
              className="btn btn-primary py-1 px-2.5 text-[11px] font-bold"
            >
              Simulate Google Sign-In
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  // Helper for development simulation when needed
  const simulateDevGoogleSignIn = async () => {
    setLoading(true);
    try {
      const mockPayload = {
        sub: `google-user-${Date.now()}`,
        email: `google.user.${Math.floor(Math.random() * 1000)}@gmail.com`,
        name: 'Sarah Connor (Google)',
        picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        email_verified: true,
      };

      const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '');
      const fakeToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(mockPayload)}.mockSignature`;

      await handleCredentialResponse({ credential: fakeToken });
    } catch (e) {
      toast.error('Simulation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* 1. Visually Stunning Custom Google Button (Always visible, responsive, zero white-box, never clipped) */}
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

      {/* 2. Official Google GSI Button mounted invisibly on top to capture clicks & open Account Chooser popup */}
      <div
        ref={googleBtnRef}
        onClick={handleCustomClick}
        className="absolute inset-0 w-full h-full opacity-[0.001] cursor-pointer z-10 overflow-hidden flex items-center justify-center [&_iframe]:!w-full [&_iframe]:!h-full [&>div]:!w-full [&>div]:!h-full [&>div]:!scale-110"
        title={mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
      />
    </div>
  );
}
