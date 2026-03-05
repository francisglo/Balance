import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

export default function Register({ onRegister }) {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const result = await onRegister(username, password);
    if (!result.ok) {
      setError(result.error || 'No fue posible crear la cuenta.');
      return;
    }

    navigate('/');
  };

  return (
    <div className="AuthPage">
      <form className="AuthCard" onSubmit={handleSubmit}>
        <h1 className="AuthTitle">Crear cuenta</h1>
        <span className="AuthSubtitle">Regístrate para empezar a usar Balance.</span>

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
            autoComplete="new-password"
          />
        </div>

        <div className="AuthField">
          <label>Confirmar contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <div className="AuthError">{error}</div>}

        <button className="btn" type="submit">Crear cuenta</button>

        <div className="AuthFooter">
          ¿Ya tienes cuenta? <Link className="AuthLink" to="/login">Iniciar sesión</Link>
        </div>
      </form>
    </div>
  );
}
