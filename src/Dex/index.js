import React from 'react';
import { io } from 'socket.io-client';
import './Dex.css';

const STORAGE_KEY = 'BALANCE_V1_dex';
const DEX_USER_KEY = 'BALANCE_V1_dex_user';
const DEX_SERVER_URL = process.env.REACT_APP_DEX_SERVER_URL || 'http://localhost:4000';

const defaultState = {
  user: { name: 'Tú', id: 'user_me' },
  contacts: [
    { id: 'c_ana', name: 'Ana López', status: 'En línea', lastSeen: new Date().toISOString() },
    { id: 'c_mario', name: 'Mario Ruiz', status: 'Disponible', lastSeen: new Date().toISOString() },
    { id: 'c_lina', name: 'Lina Vega', status: 'Ocupada', lastSeen: new Date().toISOString() },
  ],
  messages: {
    c_ana: [{ id: 'm1', from: 'Ana', text: 'Hola, ¿cómo va tu semana?', time: '09:12', read: true }],
    c_mario: [{ id: 'm2', from: 'Mario', text: 'Revisé el OKR, se ve bien.', time: '11:40', read: true }],
    c_lina: [{ id: 'm3', from: 'Lina', text: '¿Tienes avances del reporte?', time: '18:05', read: false }],
  },
};

const statusList = ['En línea', 'Disponible', 'Ocupada', 'Offline'];

const autoReplies = [
  'Perfecto, lo reviso ahora.',
  'Recibido ✅',
  'Gracias, te respondo en unos minutos.',
  'Me parece bien, avancemos con eso.',
  'Anotado. Lo agrego a mi lista.',
  'Buen punto, lo validamos juntos.',
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : defaultState.contacts,
      messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : defaultState.messages,
    };
  } catch {
    return defaultState;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getStatusColor(status) {
  const map = {
    'En línea': '#4ade80',
    'Disponible': '#60a5fa',
    'Ocupada': '#f97316',
    'Offline': '#9ca3af',
  };
  return map[status] || '#9ca3af';
}

function getOrCreateDexUser() {
  const saved = localStorage.getItem(DEX_USER_KEY);
  if (saved) return saved;
  const generated = `User${Math.floor(Math.random() * 9000 + 1000)}`;
  localStorage.setItem(DEX_USER_KEY, generated);
  return generated;
}

export default function Dex() {
  const [state, setState] = React.useState(loadState);
  const [dexUser] = React.useState(getOrCreateDexUser);
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false);
  const [activeId, setActiveId] = React.useState(state.contacts[0]?.id || '');
  const [message, setMessage] = React.useState('');
  const [searchContact, setSearchContact] = React.useState('');
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchMessage, setSearchMessage] = React.useState('');
  const [showNewContactForm, setShowNewContactForm] = React.useState(false);
  const [newContactName, setNewContactName] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState('');
  const messagesEndRef = React.useRef(null);
  const autoReplyTimeoutRef = React.useRef(null);
  const socketRef = React.useRef(null);
  const activeIdRef = React.useRef(activeId);
  const loadedHistoryRef = React.useRef(new Set());
  const activeThreadLength = state.messages[activeId]?.length || 0;

  React.useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  React.useEffect(() => {
    saveState(state);
  }, [state]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadLength]);

  React.useEffect(() => {
    if (!isSearchOpen) {
      setSearchMessage('');
    }
  }, [isSearchOpen]);

  React.useEffect(() => {
    if (!isRealtimeConnected || !activeId) return;
    const contact = state.contacts.find(c => c.id === activeId);
    if (!contact?.isRemote) return;

    const historyKey = `${dexUser}::${contact.name}`;
    if (loadedHistoryRef.current.has(historyKey)) return;

    const controller = new AbortController();

    fetch(`${DEX_SERVER_URL}/dex/history?user=${encodeURIComponent(dexUser)}&peer=${encodeURIComponent(contact.name)}`, {
      signal: controller.signal,
    })
      .then(res => res.json())
      .then((data) => {
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        const normalized = messages.map((item) => {
          const date = new Date(item.timestamp || Date.now());
          const isMine = item.from === dexUser;
          return {
            id: item.id || `m_${date.getTime()}`,
            from: isMine ? 'Tú' : contact.name,
            text: item.text || '',
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: date.toISOString(),
            read: !isMine || item.read !== false,
          };
        });

        setState(prev => {
          const existing = prev.messages[activeId] || [];
          const existingIds = new Set(existing.map(m => m.id));
          const merged = [...existing, ...normalized.filter(m => !existingIds.has(m.id))]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          return {
            ...prev,
            messages: {
              ...prev.messages,
              [activeId]: merged,
            },
          };
        });

        loadedHistoryRef.current.add(historyKey);
      })
      .catch(() => {
        // fallback local silencioso
      });

    return () => controller.abort();
  }, [activeId, dexUser, isRealtimeConnected, state.contacts]);

  React.useEffect(() => {
    return () => {
      if (autoReplyTimeoutRef.current) {
        clearTimeout(autoReplyTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const socket = io(DEX_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsRealtimeConnected(true);
      socket.emit('dex:join', { username: dexUser });
    });

    socket.on('disconnect', () => {
      setIsRealtimeConnected(false);
    });

    socket.on('dex:users', (users) => {
      const onlineUsers = (users || []).filter(name => name && name !== dexUser);
      setState(prev => {
        const localContacts = prev.contacts.filter(c => !c.isRemote);
        const remoteMap = new Map(prev.contacts.filter(c => c.isRemote).map(c => [c.name, c]));

        onlineUsers.forEach((name) => {
          const existing = remoteMap.get(name);
          remoteMap.set(name, {
            id: existing?.id || `remote:${name}`,
            name,
            status: 'En línea',
            lastSeen: new Date().toISOString(),
            isRemote: true,
          });
        });

        for (const [name, contact] of remoteMap.entries()) {
          if (!onlineUsers.includes(name)) {
            remoteMap.set(name, {
              ...contact,
              status: 'Offline',
            });
          }
        }

        return {
          ...prev,
          user: { ...prev.user, name: dexUser },
          contacts: [...localContacts, ...Array.from(remoteMap.values())],
        };
      });
    });

    socket.on('dex:message', ({ id, from, text, timestamp }) => {
      const remoteId = `remote:${from}`;
      const messageDate = new Date(timestamp || Date.now());
      setState(prev => {
        const hasContact = prev.contacts.some(c => c.id === remoteId);
        const contacts = hasContact
          ? prev.contacts
          : [
              ...prev.contacts,
              {
                id: remoteId,
                name: from,
                status: 'En línea',
                lastSeen: new Date().toISOString(),
                isRemote: true,
              },
            ];

        return {
          ...prev,
          contacts,
          messages: {
            ...prev.messages,
            [remoteId]: [
              ...(prev.messages[remoteId] || []),
              {
                id: id || `m_${Date.now()}`,
                from,
                text,
                time: messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: messageDate.toISOString(),
                read: activeIdRef.current === remoteId,
              },
            ],
          },
        };
      });
    });

    socket.on('dex:read', ({ from }) => {
      const remoteId = `remote:${from}`;
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [remoteId]: (prev.messages[remoteId] || []).map(m =>
            m.from === 'Tú' ? { ...m, read: true } : m
          ),
        },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [dexUser]);

  // Sincronización de estado con Strategy y otros tabs
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          setState(JSON.parse(e.newValue || JSON.stringify(defaultState)));
        } catch {
          setState(defaultState);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-update de estados online/offline cada 30s
  React.useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        contacts: prev.contacts.map(c => {
          if (c.isRemote) return c;
          const rnd = Math.random();
          if (rnd > 0.95) {
            return { ...c, status: statusList[Math.floor(Math.random() * statusList.length)], lastSeen: new Date().toISOString() };
          }
          return c;
        }),
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeContact = state.contacts.find(c => c.id === activeId);
  const thread = (state.messages[activeId] || []).filter(m =>
    m.text.toLowerCase().includes(searchMessage.toLowerCase())
  );

  const filteredContacts = state.contacts.filter(c =>
    c.name.toLowerCase().includes(searchContact.toLowerCase())
  );

  // Contador de mensajes no leídos
  const getUnreadCount = (contactId) => {
    return (state.messages[contactId] || []).filter(m => m.from !== 'Tú' && !m.read).length;
  };

  // Contador total de mensajes
  const getTotalUnread = () => {
    return state.contacts.reduce((sum, c) => sum + getUnreadCount(c.id), 0);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeId) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { 
      id: `m_${Date.now()}`, 
      from: 'Tú', 
      text: message.trim(), 
      time, 
      timestamp: now.toISOString(),
      read: false 
    };
    setState(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [activeId]: [...(prev.messages[activeId] || []), newMsg],
      },
    }));

    const targetContact = state.contacts.find(c => c.id === activeId);
    const isRemoteTarget = !!targetContact?.isRemote;
    const targetOnline = targetContact?.status !== 'Offline';

    if (isRemoteTarget && socketRef.current && isRealtimeConnected && targetOnline) {
      socketRef.current.emit('dex:message', {
        to: targetContact.name,
        text: message.trim(),
        clientId: newMsg.id,
      });
      setMessage('');
      return;
    }

    if (autoReplyTimeoutRef.current) {
      clearTimeout(autoReplyTimeoutRef.current);
    }

    autoReplyTimeoutRef.current = setTimeout(() => {
      setState(prev => {
        const contact = prev.contacts.find(c => c.id === activeId);
        if (!contact || contact.status === 'Offline') {
          const updated = (prev.messages[activeId] || []).map(m =>
            m.from === 'Tú' ? { ...m, read: true } : m
          );
          return {
            ...prev,
            messages: {
              ...prev.messages,
              [activeId]: updated,
            },
          };
        }

        const replyText = autoReplies[Math.floor(Math.random() * autoReplies.length)];
        const replyDate = new Date();
        const reply = {
          id: `m_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
          from: contact.name,
          text: replyText,
          time: replyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: replyDate.toISOString(),
          read: activeId === prev.user.activeChatId,
        };

        const updatedThread = [...(prev.messages[activeId] || []), reply].map(m =>
          m.from === 'Tú' ? { ...m, read: true } : m
        );

        return {
          ...prev,
          user: {
            ...prev.user,
            activeChatId: activeId,
          },
          messages: {
            ...prev.messages,
            [activeId]: updatedThread,
          },
        };
      });
    }, 1200 + Math.floor(Math.random() * 1800));

    setMessage('');
  };

  const createContact = (e) => {
    e.preventDefault();
    if (!newContactName.trim()) return;
    const newId = `c_${Date.now()}`;
    const newContact = {
      id: newId,
      name: newContactName.trim(),
      status: statusList[Math.floor(Math.random() * statusList.length)],
      lastSeen: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      contacts: [...prev.contacts, newContact],
      messages: { ...prev.messages, [newId]: [] },
    }));
    setActiveId(newId);
    setNewContactName('');
    setShowNewContactForm(false);
  };

  const deleteContact = (id) => {
    const target = state.contacts.find(c => c.id === id);
    if (target?.isRemote) return;
    if (window.confirm('¿Borrar este contacto y su historial?')) {
      setState(prev => ({
        ...prev,
        contacts: prev.contacts.filter(c => c.id !== id),
        messages: Object.keys(prev.messages).reduce((acc, k) => {
          if (k !== id) acc[k] = prev.messages[k];
          return acc;
        }, {}),
      }));
      if (activeId === id) {
        const nextId = state.contacts.find(c => c.id !== id)?.id || '';
        setActiveId(nextId);
      }
    }
  };

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    const editingContact = state.contacts.find(c => c.id === editingId);
    if (editingContact?.isRemote) return;
    setState(prev => ({
      ...prev,
      contacts: prev.contacts.map(c =>
        c.id === editingId ? { ...c, name: editName.trim() } : c
      ),
    }));
    setEditingId(null);
    setEditName('');
  };

  const deleteMessage = (msgId) => {
    setState(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [activeId]: prev.messages[activeId].filter(m => m.id !== msgId),
      },
    }));
  };

  const updateContactStatus = (id, newStatus) => {
    setState(prev => ({
      ...prev,
      contacts: prev.contacts.map(c =>
        c.id === id ? { ...c, status: newStatus, lastSeen: new Date().toISOString() } : c
      ),
    }));
  };

  // Marcar como leído cuando se selecciona un contacto
  React.useEffect(() => {
    if (!activeId) return;

    const contact = state.contacts.find(c => c.id === activeId);

    setState(prev => ({
      ...prev,
      user: {
        ...prev.user,
        activeChatId: activeId,
      },
      messages: {
        ...prev.messages,
        [activeId]: (prev.messages[activeId] || []).map(m =>
          m.from !== 'Tú' ? { ...m, read: true } : m
        ),
      },
    }));

    if (contact?.isRemote && isRealtimeConnected && socketRef.current) {
      socketRef.current.emit('dex:read', { to: contact.name });
    }
  }, [activeId, isRealtimeConnected, state.contacts]);

  return (
    <div className="Dex-root">
      <div className="Dex-header">
        <h2>💬 Dex</h2>
        <span>Red de mensajería inteligente</span>
        {getTotalUnread() > 0 && <div className="Dex-headerBadge">{getTotalUnread()}</div>}
      </div>

      <div className="Dex-layout">
        <aside className="Dex-sidebar">
          <div className="Dex-sidebarHeader">
            <div className="Dex-search">
              <input 
                placeholder="Buscar contacto" 
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
              />
            </div>
            <button 
              className="Dex-addBtn"
              onClick={() => setShowNewContactForm(!showNewContactForm)}
              title="Agregar contacto"
            >
              +
            </button>
          </div>

          {showNewContactForm && (
            <form className="Dex-newContactForm" onSubmit={createContact}>
              <input
                type="text"
                placeholder="Nombre del contacto"
                value={newContactName}
                onChange={e => setNewContactName(e.target.value)}
                autoFocus
              />
              <div className="Dex-formButtons">
                <button type="submit" className="btn-small">Crear</button>
                <button 
                  type="button" 
                  className="btn-small secondary"
                  onClick={() => setShowNewContactForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="Dex-contacts">
            {filteredContacts.length === 0 ? (
              <div className="Dex-emptyContacts">No hay contactos</div>
            ) : (
              filteredContacts.map(c => (
                <div
                  key={c.id}
                  className={`Dex-contactItem ${c.id === activeId ? 'active' : ''}`}
                >
                  {editingId === c.id ? (
                    <div className="Dex-editForm">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                      />
                      <div className="Dex-formButtons">
                        <button 
                          className="btn-tiny"
                          onClick={saveEdit}
                        >
                          ✓
                        </button>
                        <button 
                          className="btn-tiny"
                          onClick={() => setEditingId(null)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="Dex-contactButton"
                        onClick={() => setActiveId(c.id)}
                      >
                        <div className="Dex-avatar">
                          <span>{c.name[0]}</span>
                          <div 
                            className="Dex-statusDot" 
                            style={{ backgroundColor: getStatusColor(c.status) }}
                          />
                        </div>
                        <div className="Dex-contactInfo">
                          <div className="Dex-contactName">{c.name}</div>
                          <div className="Dex-contactStatus">{c.status}</div>
                        </div>
                        {getUnreadCount(c.id) > 0 && (
                          <div className="Dex-badge">{getUnreadCount(c.id)}</div>
                        )}
                      </button>
                      <div className="Dex-contactActions">
                          {!c.isRemote && (
                            <>
                              <button
                                className="icon-btn"
                                onClick={() => startEdit(c.id, c.name)}
                                title="Editar"
                              >
                                ✎
                              </button>
                              <button
                                className="icon-btn delete"
                                onClick={() => deleteContact(c.id)}
                                title="Borrar"
                              >
                                🗑
                              </button>
                            </>
                          )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="Dex-chat">
          {activeContact ? (
            <>
              <div className="Dex-chatHeader">
                <div className="Dex-avatar">
                  <span>{activeContact.name[0]}</span>
                  <div 
                    className="Dex-statusDot" 
                    style={{ backgroundColor: getStatusColor(activeContact.status) }}
                  />
                </div>
                <div className="Dex-headerInfo">
                  <div className="Dex-contactName">{activeContact.name}</div>
                  <div className="Dex-headerStatus">
                    {activeContact.status}
                    {!activeContact.isRemote && (
                      <select 
                        value={activeContact.status}
                        onChange={e => updateContactStatus(activeId, e.target.value)}
                        className="Dex-statusSelect"
                      >
                        <option>En línea</option>
                        <option>Disponible</option>
                        <option>Ocupada</option>
                        <option>Offline</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {isSearchOpen && (
                <div className="Dex-searchBar">
                  <input
                    type="text"
                    placeholder="Buscar en mensajes..."
                    value={searchMessage}
                    onChange={e => setSearchMessage(e.target.value)}
                    autoFocus
                  />
                  <button 
                    className="btn-tiny"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    ✕
                  </button>
                  {thread.length === 0 && searchMessage && (
                    <span className="Dex-searchHint">Sin resultados</span>
                  )}
                </div>
              )}
              {!isSearchOpen && (
                <button 
                  className="Dex-searchToggle"
                  onClick={() => setIsSearchOpen(true)}
                  title="Buscar mensajes"
                >
                  🔍
                </button>
              )}

              <div className="Dex-messages">
                {thread.length === 0 ? (
                  <div className="Dex-noMessages">Sin mensajes. ¡Inicia la conversación!</div>
                ) : (
                  thread.map(m => (
                    <div key={m.id} className={`Dex-message ${m.from === 'Tú' ? 'out' : 'in'}`}>
                      <div className="Dex-bubble">
                        <div className="Dex-text">{m.text}</div>
                        <div className="Dex-time">
                          {m.time}
                          {m.from === 'Tú' && (
                            <span className="Dex-readStatus">{m.read ? '✓✓' : '✓'}</span>
                          )}
                        </div>
                      </div>
                      {m.from === 'Tú' && (
                        <button
                          className="Dex-deleteMsg"
                          onClick={() => deleteMessage(m.id)}
                          title="Borrar mensaje"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="Dex-inputBar" onSubmit={sendMessage}>
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={isRealtimeConnected ? `Escribe como ${dexUser}...` : 'Escribe un mensaje...'}
                />
                <button className="btn" type="submit" disabled={!message.trim()}>Enviar</button>
              </form>
            </>
          ) : (
            <div className="Dex-empty">Selecciona un contacto o crea uno nuevo</div>
          )}
        </section>
      </div>
    </div>
  );
}
