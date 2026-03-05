import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TodoProvider } from '../TodoContext';

import { AppUI } from './AppUI';
import Finance from '../Finance';
import Login from '../Auth/Login';
import Register from '../Auth/Register';
import OpeningSplash from '../OpeningSplash';

const SESSION_KEY = 'BALANCE_AUTH_SESSION';
const API_BASE_URL = process.env.REACT_APP_DEX_SERVER_URL || 'http://localhost:4000';

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function authRequest(path, method = 'GET', body = null, token = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: payload.error || 'Error de servidor.' };
  }

  return { ok: true, data: payload };
}

function App() {
  const [session, setSession] = React.useState(getSession);
  const [checkingSession, setCheckingSession] = React.useState(true);

  React.useEffect(() => {
    const validateSession = async () => {
      const current = getSession();
      if (!current?.token) {
        setCheckingSession(false);
        return;
      }

      const result = await authRequest('/auth/me', 'GET', null, current.token);
      if (!result.ok) {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        setCheckingSession(false);
        return;
      }

      const nextSession = { token: current.token, username: result.data.user.username };
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setCheckingSession(false);
    };

    validateSession();
  }, []);

  const login = async (username, password) => {
    const result = await authRequest('/auth/login', 'POST', {
      username,
      password,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const nextSession = {
      token: result.data.token,
      username: result.data.user.username,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    return { ok: true };
  };

  const loginWithGoogle = async (idToken) => {
    const result = await authRequest('/auth/google', 'POST', { idToken });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const nextSession = {
      token: result.data.token,
      username: result.data.user.username,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    return { ok: true };
  };

  const register = async (username, password) => {
    const result = await authRequest('/auth/register', 'POST', {
      username,
      password,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const nextSession = {
      token: result.data.token,
      username: result.data.user.username,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    return { ok: true };
  };

  const logout = async () => {
    if (session?.token) {
      await authRequest('/auth/logout', 'POST', null, session.token);
    }
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (checkingSession) {
    return null;
  }

  return (
    <TodoProvider>
      <BrowserRouter>
        <OpeningSplash>
          <Routes>
            <Route
              path="/login"
              element={session ? <Navigate to="/" replace /> : <Login onLogin={login} onGoogleLogin={loginWithGoogle} />}
            />
            <Route
              path="/register"
              element={session ? <Navigate to="/" replace /> : <Register onRegister={register} />}
            />
            <Route
              path="/"
              element={session ? <AppUI onLogout={logout} username={session.username} sessionToken={session.token} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/finance"
              element={session ? <Finance /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
          </Routes>
        </OpeningSplash>
      </BrowserRouter>
    </TodoProvider>
  );
}

export default App;

