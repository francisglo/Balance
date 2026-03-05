import React from 'react';
import './Coworking.css';

const STORAGE_KEY = 'BALANCE_V1_coworking';
const API_BASE_URL = (process.env.REACT_APP_DEX_SERVER_URL || 'http://localhost:4000').trim();

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

function generateThinkInsights(rawText, fallbackPeople = []) {
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const sentences = rawText
    .replace(/\n+/g, ' ')
    .split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

  const lowered = lines.map(line => line.toLowerCase());

  const summaryBase = lines.find((line, index) => {
    const l = lowered[index];
    return l.includes('decid') || l.includes('acord') || l.includes('objetivo') || l.includes('lanz');
  }) || sentences[0] || 'Se revisaron puntos clave y se estableció dirección de ejecución.';

  const decisionCandidates = lines
    .filter((line, index) => {
      const l = lowered[index];
      return l.includes('decid') || l.includes('acord') || l.includes('prior') || l.includes('lanz');
    })
    .slice(0, 3);

  const decisions = decisionCandidates.length
    ? decisionCandidates
    : [
        'Definir fecha de entrega con hitos semanales.',
        'Priorizar MVP con foco en velocidad de ejecución.',
      ];

  const taskRegex = /^[-*•]?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,}?)\s*[:-]\s*(.+)$/;
  const parsedTasks = lines
    .map(line => line.match(taskRegex))
    .filter(Boolean)
    .slice(0, 4)
    .map(match => ({ owner: match[1].trim(), task: match[2].trim() }));

  const fallbackTasks = fallbackPeople.slice(0, 2).map((person, idx) => ({
    owner: person.name,
    task: idx === 0 ? 'Definir entregables de interfaz' : 'Alinear arquitectura y dependencias',
  }));

  const tasks = parsedTasks.length ? parsedTasks : fallbackTasks;

  const keyIdea =
    lines.find((line, index) => {
      const l = lowered[index];
      return l.includes('idea') || l.includes('ia') || l.includes('automat') || l.includes('insight');
    }) || 'Integrar IA para acelerar decisiones y convertir reuniones en ejecución.';

  return {
    summary: summaryBase,
    decisions,
    tasks,
    keyIdea,
    map: [
      'Tema central',
      'Decisiones',
      'Acciones',
      'Riesgos',
      'Próximo checkpoint',
    ],
  };
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
  const currentUserName = state.currentUser?.name || '';
  const [meetingInput, setMeetingInput] = React.useState('');
  const [thinkResult, setThinkResult] = React.useState(null);

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
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok || cancelled) return;

        const currentName = (username || currentUserName || '').toLowerCase();
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
    const intervalId = setInterval(loadUsers, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionToken, username, currentUserName]);

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

  const runThinkEngine = () => {
    if (!meetingInput.trim()) return;
    const insight = generateThinkInsights(meetingInput, [state.currentUser, ...state.colleagues]);
    setThinkResult(insight);
  };

  return (
    <div className="Coworking-root">
      <div className="Coworking-header">
        <h2>🧠 THINK — Beyond Meethink</h2>
        <span>Reuniones inteligentes · decisiones automáticas · generación de ideas</span>
      </div>

      <section className="Coworking-thinkPanel">
        <div className="Coworking-thinkIntro">
          <h3>Las reuniones no son para hablar. Son para pensar juntos.</h3>
          <p>
            THINK resume discusiones, detecta ideas clave, crea planes de acción y genera mapas mentales.
          </p>
        </div>

        <div className="Coworking-thinkGrid">
          <div className="Coworking-thinkComposer">
            <label>Acta o notas de reunión</label>
            <textarea
              className="Coworking-thinkInput"
              placeholder={
                'Ejemplo:\nSe decidió lanzar el producto en junio.\nAna: diseño UI\nCarlos: arquitectura backend\nIdea clave: integrar IA para análisis de reuniones.'
              }
              value={meetingInput}
              onChange={(event) => setMeetingInput(event.target.value)}
            />
            <button type="button" className="Coworking-btn primary" onClick={runThinkEngine}>
              Generar Think Engine
            </button>
          </div>

          <div className="Coworking-thinkOutput">
            <h4>Resultado automático</h4>
            {!thinkResult ? (
              <div className="Coworking-thinkEmpty">Cierra una reunión y ejecuta THINK para ver resumen, decisiones y tareas.</div>
            ) : (
              <>
                <div className="Coworking-thinkBlock">
                  <strong>Resumen</strong>
                  <p>- {thinkResult.summary}</p>
                </div>

                <div className="Coworking-thinkBlock">
                  <strong>Decisiones</strong>
                  <ul>
                    {thinkResult.decisions.map((decision, index) => (
                      <li key={`decision-${index}`}>{decision}</li>
                    ))}
                  </ul>
                </div>

                <div className="Coworking-thinkBlock">
                  <strong>Tareas</strong>
                  <ul>
                    {thinkResult.tasks.map((task, index) => (
                      <li key={`task-${index}`}>
                        {task.owner}: {task.task}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="Coworking-thinkBlock">
                  <strong>Idea clave</strong>
                  <p>- {thinkResult.keyIdea}</p>
                </div>

                <div className="Coworking-thinkBlock">
                  <strong>Mapa de ideas</strong>
                  <div className="Coworking-thinkMap">
                    {thinkResult.map.map((item, index) => (
                      <span key={`map-${index}`}>{item}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

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
