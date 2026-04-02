import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  loginWithGoogleRequest,
  sendMagicLinkRequest,
  verifyMagicLinkRequest
} from '../api/authApi.js';
import { enterGuestMode, exitGuestMode, selectAuth } from '../store/authSlice.js';

function GoogleButton({ onError, onSuccess }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const googleIdentityScriptUrl =
      import.meta.env.VITE_GOOGLE_IDENTITY_SCRIPT_URL || 'https://accounts.google.com/gsi/client';

    if (!clientId) {
      return undefined;
    }

    let isCancelled = false;

    function initialize() {
      if (isCancelled || !window.google || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (!credential) {
            onError('Google did not return a credential.');
            return;
          }

          onSuccess(credential);
        }
      });

      buttonRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 280
      });
    }

    const existingScript = document.querySelector('script[data-google-identity-script="true"]');

    if (existingScript) {
      initialize();
      return () => {
        isCancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = googleIdentityScriptUrl;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityScript = 'true';
    script.onload = initialize;
    script.onerror = () => {
      onError('Google Identity script could not be loaded.');
    };

    document.body.appendChild(script);

    return () => {
      isCancelled = true;
    };
  }, [onError, onSuccess]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400">
        Add `VITE_GOOGLE_CLIENT_ID` later to enable the Google button.
      </div>
    );
  }

  return <div ref={buttonRef} className="min-h-[44px]" />;
}

export default function Auth() {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated || auth.guestMode) {
      navigate('/dashboard', { replace: true });
    }
  }, [auth.guestMode, auth.isAuthenticated, navigate]);

  useEffect(() => {
    const magicToken = searchParams.get('magicToken');

    if (!magicToken) {
      return;
    }

    let isActive = true;

    async function verifyToken() {
      setIsSubmitting(true);
      setErrorMessage('');
      setStatusMessage('Verifying your magic link...');

      try {
        await verifyMagicLinkRequest(magicToken, store);

        if (!isActive) {
          return;
        }

        setStatusMessage('Magic link verified. You are signed in.');
        setSearchParams({}, { replace: true });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.response?.data?.message || 'Magic link verification failed.');
      } finally {
        if (isActive) {
          setIsSubmitting(false);
        }
      }
    }

    verifyToken();

    return () => {
      isActive = false;
    };
  }, [navigate, searchParams, setSearchParams, store]);

  async function handleMagicLinkSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');
    dispatch(exitGuestMode());

    try {
      const result = await sendMagicLinkRequest(email);
      setStatusMessage(`Magic link requested for ${result.email}.`);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Magic link request failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin(credential) {
    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');
    dispatch(exitGuestMode());

    try {
      await loginWithGoogleRequest(credential, store);
      setStatusMessage('Google login complete.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Google login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGuestMode() {
    dispatch(enterGuestMode());
    setErrorMessage('');
    setStatusMessage('Guest mode enabled. Protected API routes still require a valid JWT.');
    navigate('/dashboard', { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Aptico Access</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Sign up or log in</h1>
              <p className="max-w-xl text-sm leading-6 text-slate-300">
                Continue with Google or request a magic link. Guest mode is available for UI exploration, but protected
                API routes still expect a valid JWT.
              </p>
            </div>

            <div className="grid gap-6 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <div className="space-y-3">
                <h2 className="text-lg font-medium text-white">Continue with Google</h2>
                <GoogleButton
                  onError={setErrorMessage}
                  onSuccess={(credential) => {
                    void handleGoogleLogin(credential);
                  }}
                />
              </div>

              <div className="h-px bg-white/10" />

              <form className="space-y-4" onSubmit={handleMagicLinkSubmit}>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {isSubmitting ? 'Please wait...' : 'Send magic link'}
                </button>
              </form>

              <button
                type="button"
                onClick={handleGuestMode}
                className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Continue in guest mode
              </button>
            </div>

            {statusMessage ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {statusMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}
          </section>

          <aside className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Session State</p>
                <h2 className="text-2xl font-semibold text-white">Current auth store</h2>
              </div>

              <dl className="grid gap-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-slate-400">Authenticated</dt>
                  <dd className="mt-1 font-medium text-white">{String(auth.isAuthenticated)}</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-slate-400">Guest mode</dt>
                  <dd className="mt-1 font-medium text-white">{String(auth.guestMode)}</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-slate-400">User</dt>
                  <dd className="mt-1 break-words font-medium text-white">
                    {auth.user ? JSON.stringify(auth.user) : 'No user in session'}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-slate-400">Access token</dt>
                  <dd className="mt-1 break-all font-medium text-white">
                    {auth.accessToken ? `${auth.accessToken.slice(0, 32)}...` : 'No access token yet'}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
