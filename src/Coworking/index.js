import React from 'react';
import './Coworking.css';

const STORAGE_KEY = 'BALANCE_V1_coworking';
const API_BASE_URL = process.env.REACT_APP_DEX_SERVER_URL || 'http://localhost:4000';

const defaultState = {
  currentUser: { id: 'user_me', name: 'Tú', status: 'idle', currentTask: '', avatar: '👤' },
  colleagues: [
    { id: 'col_ana', name: 'Ana López', status: 'focus', currentTask: 'OKR Q1', avatar: '👩‍💼' },
    { id: 'col_mario', name: 'Mario Ruiz', status: 'break', currentTask: '', avatar: '👨‍💼' },
    { id: 'col_lina', name: 'Lina Vega', status: 'focus', currentTask: 'Reporte', avatar: '👩‍🔬' },
  ],
  sessions: [
    { id: 'ses_1', name: 'Focus Morning', type: 'pomodoro', duration: 25, participants: ['user_me', 'col_ana'], startedAt: new Date(Date.now() - 5 * 60000).toISOString(), active: true },
    { id: 'ses_2', name: 'Brainstorm', type: 'freeflow', duration: 60, participants: ['col_mario', 'col_lina'], startedAt: new Date(Date.now() - 15 * 60000).toISOString(), active: true },
  ],
  sharedTimer: {
    type: 'pomodoro', // pomodoro, break, custom
    duration: 25,
    elapsed: 0,
    isRunning: false,
    participants: ['user_me', 'col_ana'],
  },
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : defaultState;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getStatusIcon(status) {
  const map = {
    focus: '🎯',
    break: '☕',
    meeting: '📞',
    idle: '💤',
  };
  return map[status] || '❓';
}

function getStatusColor(status) {
  const map = {
    focus: '#4ade80',
    break: '#fbbf24',
    meeting: '#60a5fa',
    idle: '#9ca3af',
  };
  return map[status] || '#9ca3af';
}

function avatarFromName(name = '') {
  const options = ['👩‍💻', '🧑‍💻', '👨‍💻', '👩‍🔬', '🧑‍🔬', '👨‍🔬', '👩‍💼', '🧑‍💼', '👨‍💼'];
  const index = Math.abs((name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % options.length;
  return options[index];
}

export default function CoworkingSpace({ username, sessionToken }) {
  const [state, setState] = React.useState(loadState);
  const [activeSession, setActiveSession] = React.useState(state.sessions[0]?.id || null);
  const [userStatus, setUserStatus] = React.useState('idle');
  const [userTask, setUserTask] = React.useState('');
  const [timerRunning, setTimerRunning] = React.useState(false);
  const [newSessionName, setNewSessionName] = React.useState('');
  const [showNewSession, setShowNewSession] = React.useState(false);
  const [selectedSessionType, setSelectedSessionType] = React.useState('pomodoro');

  React.useEffect(() => {
    if (!username) return;
    setState(prev => ({
      ...prev,
      currentUser: {
        ...prev.currentUser,
        name: username,
        avatar: avatarFromName(username),
      },
    }));
  }, [username]);

  React.useEffect(() => {
    if (!sessionToken) return;

    let cancelled = false;

    const loadUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok || cancelled) return;

        const currentName = (username || state.currentUser.name || '').toLowerCase();
        const mapped = (payload.users || [])
          .filter(user => (user.username || '').toLowerCase() !== currentName)
          .map(user => ({
            id: `col_${user.username}`,
            name: user.username,
            status: user.online ? 'focus' : 'idle',
            currentTask: user.online ? 'Disponible en coworking' : '',
            avatar: avatarFromName(user.username),
          }));

        setState(prev => ({
          ...prev,
          colleagues: mapped,
        }));
      } catch {
        // fallback silencioso
      }
    };

    loadUsers();
    const intervalId = setInterval(loadUsers, 20000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionToken, username, state.currentUser.name]);

  React.useEffect(() => {
    saveState(state);
  }, [state]);

  // Timer de pomodoro compartido
  React.useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setState(prev => {
        const newElapsed = prev.sharedTimer.elapsed + 1;
        const isComplete = newElapsed >= prev.sharedTimer.duration * 60;
        return {
          ...prev,
          sharedTimer: {
            ...prev.sharedTimer,
            elapsed: isComplete ? 0 : newElapsed,
            isRunning: !isComplete,
          },
        };
      });
      if (state.sharedTimer.elapsed >= state.sharedTimer.duration * 60) {
        setTimerRunning(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, state.sharedTimer]);

  const updateUserStatus = (status) => {
    setUserStatus(status);
    setState(prev => ({
      ...prev,
      currentUser: { ...prev.currentUser, status },
    }));
  };

  const updateUserTask = (task) => {
    setUserTask(task);
    setState(prev => ({
      ...prev,
      currentUser: { ...prev.currentUser, currentTask: task },
    }));
  };

  const joinSession = (sessionId) => {
    setActiveSession(sessionId);
    setState(prev => {
      const session = prev.sessions.find(s => s.id === sessionId);
      if (session && !session.participants.includes('user_me')) {
        return {
          ...prev,
          sessions: prev.sessions.map(s =>
            s.id === sessionId ? { ...s, participants: [...s.participants, 'user_me'] } : s
          ),
        };
      }
      return prev;
    });
  };

  const leaveSession = (sessionId) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s =>
        s.id === sessionId
          ? { ...s, participants: s.participants.filter(p => p !== 'user_me') }
          : s
      ),
    }));
    if (activeSession === sessionId) {
      setActiveSession(null);
    }
  };

  const createSession = (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    const newSession = {
      id: `ses_${Date.now()}`,
      name: newSessionName,
      type: selectedSessionType,
      duration: selectedSessionType === 'pomodoro' ? 25 : 60,
      participants: ['user_me'],
      startedAt: new Date().toISOString(),
      active: true,
    };
    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
    }));
    setActiveSession(newSession.id);
    setNewSessionName('');
    setShowNewSession(false);
  };

  const startSharedTimer = () => {
    setState(prev => ({
      ...prev,
      sharedTimer: { ...prev.sharedTimer, elapsed: 0, isRunning: true },
    }));
    setTimerRunning(true);
  };

  const pauseSharedTimer = () => {
    setTimerRunning(false);
  };

  const resetSharedTimer = () => {
    setState(prev => ({
      ...prev,
      sharedTimer: { ...prev.sharedTimer, elapsed: 0, isRunning: false },
    }));
    setTimerRunning(false);
  };

  const changeTimerType = (type) => {
    const durations = { pomodoro: 25, break: 5, longbreak: 15 };
    setState(prev => ({
      ...prev,
      sharedTimer: { ...prev.sharedTimer, type, duration: durations[type], elapsed: 0, isRunning: false },
    }));
    setTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="Coworking-root">
      <div className="Coworking-header">
        <h2>👥 Coworking Space</h2>
        <span>Sesiones colaborativas en tiempo real</span>
      </div>

      <div className="Coworking-layout">
        {/* Panel de usuario */}
        <section className="Coworking-userPanel">
          <h3>Tu Estado</h3>
          <div className="Coworking-userCard">
            <div className="Coworking-avatar-lg">{state.currentUser.avatar}</div>
            <div className="Coworking-userInfo">
              <div className="Coworking-userName">{state.currentUser.name}</div>
              <div className="Coworking-userStatus">{getStatusIcon(userStatus)} {userStatus}</div>
            </div>
          </div>

          <div className="Coworking-section">
            <label>Status</label>
            <div className="Coworking-statusButtons">
              {['focus', 'break', 'meeting', 'idle'].map(s => (
                <button
                  key={s}
                  className={`Coworking-statusBtn ${userStatus === s ? 'active' : ''}`}
                  onClick={() => updateUserStatus(s)}
                >
                  {getStatusIcon(s)}
                </button>
              ))}
            </div>
          </div>

          <div className="Coworking-section">
            <label>Tarea Actual</label>
            <input
              type="text"
              placeholder="¿En qué trabajas?"
              value={userTask}
              onChange={e => updateUserTask(e.target.value)}
              className="Coworking-input"
            />
          </div>
        </section>

        {/* Timer Compartido */}
        <section className="Coworking-timerPanel">
          <h3>⏱️ Timer Compartido</h3>
          <div className="Coworking-timerDisplay">
            <div className="Coworking-timerValue">{formatTime(state.sharedTimer.elapsed)}</div>
            <div className="Coworking-timerDuration">/ {state.sharedTimer.duration} min</div>
          </div>

          <div className="Coworking-timerButtons">
            {!timerRunning ? (
              <button className="Coworking-btn primary" onClick={startSharedTimer}>
                ▶ Iniciar
              </button>
            ) : (
              <button className="Coworking-btn secondary" onClick={pauseSharedTimer}>
                ⏸ Pausar
              </button>
            )}
            <button className="Coworking-btn secondary" onClick={resetSharedTimer}>
              ↺ Reset
            </button>
          </div>

          <div className="Coworking-timerTypes">
            <button
              className={`Coworking-timerType ${state.sharedTimer.type === 'pomodoro' ? 'active' : ''}`}
              onClick={() => changeTimerType('pomodoro')}
            >
              🍅 25 min
            </button>
            <button
              className={`Coworking-timerType ${state.sharedTimer.type === 'break' ? 'active' : ''}`}
              onClick={() => changeTimerType('break')}
            >
              ☕ 5 min
            </button>
            <button
              className={`Coworking-timerType ${state.sharedTimer.type === 'longbreak' ? 'active' : ''}`}
              onClick={() => changeTimerType('longbreak')}
            >
              🏖️ 15 min
            </button>
          </div>

          <div className="Coworking-participants">
            <strong>Participando ({state.sharedTimer.participants.length})</strong>
            {state.sharedTimer.participants.map(pId => {
              const person = pId === 'user_me' ? state.currentUser : state.colleagues.find(c => c.id === pId);
              return (
                <div key={pId} className="Coworking-participant">
                  <span className="Coworking-avatar-sm">{person?.avatar}</span>
                  <span>{person?.name}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sesiones */}
        <section className="Coworking-sessionsPanel">
          <div className="Coworking-sessionsHeader">
            <h3>📌 Sesiones Activas</h3>
            <button
              className="Coworking-addBtn"
              onClick={() => setShowNewSession(!showNewSession)}
            >
              +
            </button>
          </div>

          {showNewSession && (
            <form className="Coworking-newSessionForm" onSubmit={createSession}>
              <input
                type="text"
                placeholder="Nombre de sesión"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                autoFocus
              />
              <div className="Coworking-typeSelect">
                <button
                  type="button"
                  className={`${selectedSessionType === 'pomodoro' ? 'active' : ''}`}
                  onClick={() => setSelectedSessionType('pomodoro')}
                >
                  🍅 Pomodoro
                </button>
                <button
                  type="button"
                  className={`${selectedSessionType === 'freeflow' ? 'active' : ''}`}
                  onClick={() => setSelectedSessionType('freeflow')}
                >
                  💭 Freeflow
                </button>
              </div>
              <div className="Coworking-formButtons">
                <button type="submit" className="Coworking-btn-small">
                  Crear
                </button>
                <button
                  type="button"
                  className="Coworking-btn-small secondary"
                  onClick={() => setShowNewSession(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="Coworking-sessionsList">
            {state.sessions.filter(s => s.active).length === 0 ? (
              <div className="Coworking-noSessions">No hay sesiones activas</div>
            ) : (
              state.sessions
                .filter(s => s.active)
                .map(session => {
                  const isUserIn = session.participants.includes('user_me');
                  return (
                    <div key={session.id} className={`Coworking-sessionCard ${isUserIn ? 'joined' : ''}`}>
                      <div className="Coworking-sessionInfo">
                        <h4>{session.name}</h4>
                        <div className="Coworking-sessionMeta">
                          <span className="Coworking-sessionType">{session.type === 'pomodoro' ? '🍅' : '💭'}</span>
                          <span>{session.duration} min</span>
                          <span>👥 {session.participants.length}</span>
                        </div>
                      </div>

                      {isUserIn ? (
                        <button
                          className="Coworking-sessionBtn active"
                          onClick={() => leaveSession(session.id)}
                        >
                          Salir
                        </button>
                      ) : (
                        <button className="Coworking-sessionBtn" onClick={() => joinSession(session.id)}>
                          Unirse
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </section>

        {/* Compañeros */}
        <section className="Coworking-colleaguesPanel">
          <h3>👥 Compañeros Online</h3>
          <div className="Coworking-colleaguesList">
            {state.colleagues.map(colleague => (
              <div key={colleague.id} className="Coworking-colleagueCard">
                <div className="Coworking-colleagueHeader">
                  <div className="Coworking-avatar-md" style={{ borderColor: getStatusColor(colleague.status) }}>
                    {colleague.avatar}
                  </div>
                  <div className="Coworking-colleagueInfo">
                    <div className="Coworking-colleagueName">{colleague.name}</div>
                    <div className="Coworking-colleagueStatus" style={{ color: getStatusColor(colleague.status) }}>
                      {getStatusIcon(colleague.status)} {colleague.status}
                    </div>
                  </div>
                </div>
                {colleague.currentTask && (
                  <div className="Coworking-colleagueTask">💼 {colleague.currentTask}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
