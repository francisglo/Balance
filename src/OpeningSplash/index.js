import React from 'react';
import './OpeningSplash.css';

export default function OpeningSplash({ children }) {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timeout = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {showSplash && (
        <div className="OpeningSplash-overlay" role="status" aria-live="polite">
          <img src={`${process.env.PUBLIC_URL}/balance.gif`} alt="Balance opening" className="OpeningSplash-gif" />
          <div className="OpeningSplash-text">Cargando Balance...</div>
        </div>
      )}
      {children}
    </>
  );
}
