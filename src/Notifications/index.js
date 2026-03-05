import React from 'react';
import './Notifications.css';

const API_BASE_URL = (process.env.REACT_APP_DEX_SERVER_URL || 'http://localhost:4000').trim();
const SOUND_PREF_KEY = 'BALANCE_NOTIFICATIONS_SOUND_ENABLED';
const SOUND_LEVEL_KEY = 'BALANCE_NOTIFICATIONS_SOUND_LEVEL';
const ALERT_MODE_KEY = 'BALANCE_NOTIFICATIONS_ALERT_MODE';

function Notifications({ sessionToken }) {
  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [type, setType] = React.useState('info');
  const [remindAt, setRemindAt] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [dueReminders, setDueReminders] = React.useState([]);
  const [soundEnabled, setSoundEnabled] = React.useState(() => {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    return saved ? saved === 'true' : true;
  });
  const [soundLevel, setSoundLevel] = React.useState(() => {
    const saved = localStorage.getItem(SOUND_LEVEL_KEY);
    return saved === 'fuerte' ? 'fuerte' : 'suave';
  });
  const [alertMode, setAlertMode] = React.useState(() => {
    const saved = localStorage.getItem(ALERT_MODE_KEY);
    if (saved === 'visual' || saved === 'silencio' || saved === 'sonido') return saved;
    return 'visual';
  });
  const [visualPulse, setVisualPulse] = React.useState(false);
  const [notificationPermission, setNotificationPermission] = React.useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const announcedReminderIdsRef = React.useRef(new Set());

  React.useEffect(() => {
    localStorage.setItem(SOUND_PREF_KEY, String(soundEnabled));
  }, [soundEnabled]);

  React.useEffect(() => {
    localStorage.setItem(SOUND_LEVEL_KEY, soundLevel);
  }, [soundLevel]);

  React.useEffect(() => {
    localStorage.setItem(ALERT_MODE_KEY, alertMode);
  }, [alertMode]);

  const apiRequest = React.useCallback(async (path, method = 'GET', body = null) => {
    if (!sessionToken) {
      throw new Error('Inicia sesión para usar notificaciones.');
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Error al procesar notificaciones.');
    }
    return payload;
  }, [sessionToken]);

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const payload = await apiRequest('/notifications');
      setItems(payload.notifications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  const pollReminders = React.useCallback(async () => {
    try {
      const payload = await apiRequest('/notifications/reminders/poll');
      const due = payload.due || [];
      if (due.length > 0) {
        setDueReminders(prev => [...due, ...prev].slice(0, 5));
        await loadNotifications();
      }
    } catch {
      // noop
    }
  }, [apiRequest, loadNotifications]);

  React.useEffect(() => {
    if (!sessionToken) {
      setLoading(false);
      setItems([]);
      setError('No hay sesión activa para notificaciones.');
      return;
    }
    loadNotifications();
  }, [loadNotifications, sessionToken]);

  React.useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const pollMs = isHidden ? 60000 : 30000;
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(pollReminders, pollMs);
    };

    pollReminders();
    startPolling();

    const handleVisibilityChange = () => {
      startPolling();
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        pollReminders();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [pollReminders]);

  const sendBrowserNotification = React.useCallback((item) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(item.title || 'Recordatorio', {
      body: item.message || 'Tienes un recordatorio pendiente.',
      tag: item.id,
      renotify: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, []);

  const playReminderSound = React.useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.18);

      const maxGain = soundLevel === 'fuerte' ? 0.16 : 0.08;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(maxGain, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.24);

      oscillator.onended = () => {
        audioContext.close();
      };
    } catch {
      // noop
    }
  }, [soundEnabled, soundLevel]);

  React.useEffect(() => {
    if (dueReminders.length === 0) return;

    const newItems = dueReminders.filter(item => !announcedReminderIdsRef.current.has(item.id));
    if (newItems.length === 0) return;

    newItems.forEach((item) => {
      announcedReminderIdsRef.current.add(item.id);
      sendBrowserNotification(item);
    });

    if (newItems.length > 0 && alertMode === 'sonido' && soundEnabled) {
      playReminderSound();
    }

    if (newItems.length > 0 && alertMode === 'visual') {
      setVisualPulse(true);
      const timeout = setTimeout(() => setVisualPulse(false), 1600);
      return () => clearTimeout(timeout);
    }
  }, [dueReminders, sendBrowserNotification, playReminderSound, alertMode, soundEnabled]);

  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  };

  const createNotification = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    try {
      await apiRequest('/notifications', 'POST', {
        title,
        message,
        type,
        remindAt: remindAt || null,
      });
      setTitle('');
      setMessage('');
      setType('info');
      setRemindAt('');
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const markDone = async (id, isDone) => {
    try {
      await apiRequest(`/notifications/${id}`, 'PATCH', { isDone: !isDone, isRead: true });
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const markRead = async (id, isRead) => {
    try {
      await apiRequest(`/notifications/${id}`, 'PATCH', { isRead: !isRead });
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeNotification = async (id) => {
    try {
      await apiRequest(`/notifications/${id}`, 'DELETE');
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', 'POST');
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (value) => {
    if (!value) return 'Sin recordatorio';
    const date = new Date(value);
    return date.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="Notifications-root">
      <div className="Notifications-header">
        <h2>🔔 Notificaciones</h2>
        <div className="Notifications-headerActions">
          <select
            className="Notifications-soundSelect"
            value={alertMode}
            onChange={(e) => setAlertMode(e.target.value)}
            aria-label="Modo de alerta"
          >
            <option value="sonido">Modo: Sonido</option>
            <option value="visual">Modo: Visual</option>
            <option value="silencio">Modo: Silencio</option>
          </select>
          {alertMode === 'sonido' && (
            <button className="btn" onClick={() => setSoundEnabled(prev => !prev)}>
              {soundEnabled ? '🔊 On' : '🔇 Off'}
            </button>
          )}
          {alertMode === 'sonido' && soundEnabled && (
            <select
              className="Notifications-soundSelect"
              value={soundLevel}
              onChange={(e) => setSoundLevel(e.target.value)}
              aria-label="Nivel de sonido"
            >
              <option value="suave">Suave</option>
              <option value="fuerte">Fuerte</option>
            </select>
          )}
          {notificationPermission !== 'unsupported' && notificationPermission !== 'granted' && (
            <button className="btn" onClick={requestBrowserPermission}>Activar push</button>
          )}
          <button className="btn" onClick={markAllRead} disabled={items.length === 0}>Marcar todo leído</button>
        </div>
      </div>

      {dueReminders.length > 0 && (
        <div className={`Notifications-reminderBox ${visualPulse ? 'pulse' : ''}`}>
          {dueReminders.map(item => (
            <div key={item.id} className="Notifications-reminderItem">
              <strong>{item.title}</strong>
              <span>{item.message || 'Recordatorio activo'}</span>
            </div>
          ))}
        </div>
      )}

      <form className="Notifications-form" onSubmit={createNotification}>
        <input
          type="text"
          placeholder="Título de la notificación"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Mensaje (opcional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="Notifications-row">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
          </select>
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
          />
          <button className="btn" type="submit">Crear</button>
        </div>
      </form>

      {error && <div className="Notifications-error">{error}</div>}

      <div className="Notifications-list">
        {loading ? (
          <div className="Notifications-empty">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="Notifications-empty">No hay notificaciones</div>
        ) : (
          items.map(item => (
            <div key={item.id} className={`Notifications-item ${item.isDone ? 'done' : ''} ${item.isRead ? 'read' : 'unread'}`}>
              <div className="Notifications-main">
                <div className="Notifications-title">{item.title}</div>
                <div className="Notifications-message">{item.message || 'Sin mensaje'}</div>
                <div className="Notifications-meta">
                  <span>{item.type}</span>
                  <span>•</span>
                  <span>{formatDate(item.remindAt)}</span>
                </div>
              </div>
              <div className="Notifications-actions">
                <button className="btn" onClick={() => markRead(item.id, item.isRead)}>
                  {item.isRead ? 'No leído' : 'Leído'}
                </button>
                <button className="btn" onClick={() => markDone(item.id, item.isDone)}>
                  {item.isDone ? 'Reabrir' : 'Completar'}
                </button>
                <button className="btn" onClick={() => removeNotification(item.id)}>Borrar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;
