import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const API_BASE_URL = (process.env.REACT_APP_DEX_SERVER_URL || 'http://localhost:4000').trim();

export default function Login({ onLogin, onGoogleLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [googleEnabled, setGoogleEnabled] = React.useState(false);
  const [googleClientId, setGoogleClientId] = React.useState('');
  const googleButtonRef = React.useRef(null);

  React.useEffect(() => {
    let ignore = false;

    const loadConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/config`);
        const payload = await response.json();
        if (ignore) return;
        setGoogleEnabled(!!payload.googleEnabled);
        setGoogleClientId(payload.googleClientId || '');
      } catch {
        if (!ignore) {
          setGoogleEnabled(false);
          setGoogleClientId('');
        }
      }
    };

    loadConfig();
    return () => {
      ignore = true;
    };
  }, []);

  React.useEffect(() => {
    if (!googleEnabled || !googleClientId || !onGoogleLogin) return;

    const scriptId = 'google-identity-services';

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          const result = await onGoogleLogin(response.credential);
          if (!result.ok) {
            setError(result.error || 'No fue posible iniciar sesión con Google.');
            return;
          }
          navigate('/');
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });
    };

    const existing = document.getElementById(scriptId);
    if (existing) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.body.appendChild(script);
  }, [googleEnabled, googleClientId, navigate, onGoogleLogin]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Completa usuario y contraseña.');
      return;
    }

    const result = await onLogin(username, password);
    if (!result.ok) {
      setError(result.error || 'No fue posible iniciar sesión.');
      return;
    }

    navigate('/');
  };

  return (
    <div className="AuthPage">
      <form className="AuthCard" onSubmit={handleSubmit}>
        <h1 className="AuthTitle">Iniciar sesión</h1>
        <span className="AuthSubtitle">Entra a Balance con tu usuario y contraseña.</span>
        <span className="AuthGoogleStatus" aria-live="polite">
          <span className={`AuthGoogleDot ${googleEnabled ? 'on' : 'off'}`} />
          Google {googleEnabled ? 'disponible' : 'no configurado'}
        </span>

        <div className="AuthField">
          <label>Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="AuthField">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="AuthError">{error}</div>}

        <button className="btn" type="submit">Entrar</button>

        {googleEnabled && (
          <>
            <div className="AuthDivider">o</div>
            <div ref={googleButtonRef} className="AuthGoogleButton" />
          </>
        )}

        <div className="AuthFooter">
          ¿No tienes cuenta? <Link className="AuthLink" to="/register">Crear cuenta</Link>
        </div>
      </form>
    </div>
  );
}
