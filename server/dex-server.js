require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.DEX_SERVER_PORT || 4000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const DATA_PATH = path.join(__dirname, 'dex-data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_VERSION = 2;
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 14);
const MAX_MESSAGES_PER_CONVERSATION = Number(process.env.MAX_MESSAGES_PER_CONVERSATION || 500);
const BACKUP_INTERVAL_MINUTES = Number(process.env.BACKUP_INTERVAL_MINUTES || 30);
const MAX_BACKUP_FILES = Number(process.env.MAX_BACKUP_FILES || 30);
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

const createEmptyDb = () => ({
  meta: {
    version: DB_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastCompactedAt: null,
  },
  conversations: {},
  notifications: {},
  users: {},
  sessions: {},
});

const sanitizeConversationMap = (value) => {
  if (!value || typeof value !== 'object') return {};
  const output = {};

  Object.entries(value).forEach(([key, messages]) => {
    if (!Array.isArray(messages)) return;
    output[key] = messages
      .filter(m => m && typeof m === 'object' && sanitize(m.text))
      .map(m => ({
        id: sanitize(m.id) || `m_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
        from: sanitize(m.from),
        to: sanitize(m.to),
        text: sanitize(m.text),
        timestamp: sanitize(m.timestamp) || new Date().toISOString(),
      }))
      .slice(-MAX_MESSAGES_PER_CONVERSATION);
  });

  return output;
};

const sanitizeUsers = (value) => {
  if (!value || typeof value !== 'object') return {};
  const output = {};
  Object.entries(value).forEach(([key, user]) => {
    if (!user || typeof user !== 'object') return;
    output[key] = {
      username: sanitize(user.username),
      salt: sanitize(user.salt),
      passwordHash: sanitize(user.passwordHash),
      authProvider: sanitize(user.authProvider) || 'local',
      createdAt: sanitize(user.createdAt) || new Date().toISOString(),
    };
  });
  return output;
};

const sanitizeNotifications = (value) => {
  if (!value || typeof value !== 'object') return {};
  const output = {};

  Object.entries(value).forEach(([userKey, list]) => {
    if (!Array.isArray(list)) return;
    output[userKey] = list
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        id: sanitize(item.id) || `n_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
        title: sanitize(item.title),
        message: sanitize(item.message),
        type: sanitize(item.type) || 'info',
        remindAt: sanitize(item.remindAt) || null,
        createdAt: sanitize(item.createdAt) || new Date().toISOString(),
        updatedAt: sanitize(item.updatedAt) || new Date().toISOString(),
        isRead: !!item.isRead,
        isDone: !!item.isDone,
        notifiedAt: sanitize(item.notifiedAt) || null,
      }))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });

  return output;
};

const sanitizeSessions = (value) => {
  if (!value || typeof value !== 'object') return {};
  const output = {};
  Object.entries(value).forEach(([token, session]) => {
    if (!session || typeof session !== 'object') return;
    output[token] = {
      username: sanitize(session.username),
      provider: sanitize(session.provider) || 'local',
      createdAt: sanitize(session.createdAt) || new Date().toISOString(),
    };
  });
  return output;
};

const normalizeDb = (parsed) => {
  const normalized = createEmptyDb();

  if (parsed && typeof parsed === 'object' && parsed.meta && typeof parsed.meta === 'object') {
    normalized.meta = {
      ...normalized.meta,
      ...parsed.meta,
      version: DB_VERSION,
      updatedAt: new Date().toISOString(),
    };
  }

  normalized.conversations = sanitizeConversationMap(parsed?.conversations);
  normalized.notifications = sanitizeNotifications(parsed?.notifications);
  normalized.users = sanitizeUsers(parsed?.users);
  normalized.sessions = sanitizeSessions(parsed?.sessions);

  return normalized;
};

const isSessionExpired = (session) => {
  const created = Date.parse(session.createdAt || '');
  if (!Number.isFinite(created)) return true;
  const ttlMs = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return (Date.now() - created) > ttlMs;
};

const compactDb = (db) => {
  let changed = false;

  Object.entries(db.sessions).forEach(([token, session]) => {
    if (isSessionExpired(session)) {
      delete db.sessions[token];
      changed = true;
    }
  });

  Object.entries(db.conversations).forEach(([key, messages]) => {
    if (!Array.isArray(messages)) {
      db.conversations[key] = [];
      changed = true;
      return;
    }

    if (messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      db.conversations[key] = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
      changed = true;
    }
  });

  if (!db.notifications || typeof db.notifications !== 'object') {
    db.notifications = {};
    changed = true;
  }

  if (changed) {
    db.meta.lastCompactedAt = new Date().toISOString();
  }

  return changed;
};

const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

const getBackupFiles = () => {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('dex-data-') && name.endsWith('.json'))
    .sort((a, b) => b.localeCompare(a));
};

const cleanupOldBackups = () => {
  const backups = getBackupFiles();
  if (backups.length <= MAX_BACKUP_FILES) return;
  backups.slice(MAX_BACKUP_FILES).forEach((fileName) => {
    const backupPath = path.join(BACKUP_DIR, fileName);
    try {
      fs.unlinkSync(backupPath);
    } catch {
      // noop
    }
  });
};

let lastBackupAt = 0;

const maybeBackupCurrentDb = () => {
  if (!fs.existsSync(DATA_PATH)) return;

  const now = Date.now();
  const intervalMs = Math.max(1, BACKUP_INTERVAL_MINUTES) * 60 * 1000;
  if ((now - lastBackupAt) < intervalMs) return;

  ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `dex-data-${stamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    fs.copyFileSync(DATA_PATH, backupPath);
    lastBackupAt = now;
    cleanupOldBackups();
  } catch {
    // noop
  }
};

const loadDb = () => {
  try {
    if (!fs.existsSync(DATA_PATH)) return createEmptyDb();
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeDb(parsed);
  } catch {
    return createEmptyDb();
  }
};

const writeDbAtomic = (db) => {
  const tmpPath = `${DATA_PATH}.tmp`;
  const payload = JSON.stringify(db, null, 2);
  fs.writeFileSync(tmpPath, payload, 'utf8');
  fs.renameSync(tmpPath, DATA_PATH);
};

const saveDb = (db) => {
  maybeBackupCurrentDb();
  db.meta = {
    ...db.meta,
    version: DB_VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeDbAtomic(db);
};

const conversationKey = (a, b) => [a, b].sort((x, y) => x.localeCompare(y)).join('__');

const sanitize = (value) => String(value || '').trim();
const usernameKey = (username) => sanitize(username).toLowerCase();

const hashPassword = (password, salt) => {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${password}`)
    .digest('hex');
};

const createSessionToken = () => crypto.randomBytes(24).toString('hex');

const db = loadDb();
if (compactDb(db)) {
  saveDb(db);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({
    ok: true,
    service: 'dex-realtime',
    timestamp: new Date().toISOString(),
    db: {
      version: db.meta?.version || DB_VERSION,
      users: Object.keys(db.users).length,
      sessions: Object.keys(db.sessions).length,
      conversations: Object.keys(db.conversations).length,
    },
  });
});

app.get('/auth/config', (_, res) => {
  res.json({
    ok: true,
    googleEnabled: !!GOOGLE_CLIENT_ID,
    googleClientId: GOOGLE_CLIENT_ID || null,
  });
});

const getSessionFromRequest = (req) => {
  const bearer = sanitize(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = bearer || sanitize(req.headers['x-session-token']);
  if (!token) return null;
  const session = db.sessions[token];
  if (!session) return null;
  return { token, ...session };
};

const requireSession = (req, res) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ ok: false, error: 'Sesión inválida.' });
    return null;
  }
  return session;
};

const getNotificationList = (username) => {
  const key = usernameKey(username);
  if (!db.notifications[key]) {
    db.notifications[key] = [];
  }
  return db.notifications[key];
};

const sortNotifications = (list) => {
  return list.sort((a, b) => {
    const aDue = a.remindAt ? Date.parse(a.remindAt) : Number.MAX_SAFE_INTEGER;
    const bDue = b.remindAt ? Date.parse(b.remindAt) : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
};

app.post('/auth/register', (req, res) => {
  const username = sanitize(req.body?.username);
  const password = sanitize(req.body?.password);

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const key = usernameKey(username);
  if (db.users[key]) {
    return res.status(409).json({ ok: false, error: 'Ese usuario ya existe.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  db.users[key] = {
    username,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const token = createSessionToken();
  db.sessions[token] = {
    username,
    createdAt: new Date().toISOString(),
  };

  saveDb(db);
  return res.status(201).json({ ok: true, token, user: { username } });
});

app.post('/auth/login', (req, res) => {
  const username = sanitize(req.body?.username);
  const password = sanitize(req.body?.password);

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos.' });
  }

  const key = usernameKey(username);
  const user = db.users[key];
  if (!user) {
    return res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
  }

  if (!user.salt || !user.passwordHash) {
    return res.status(400).json({
      ok: false,
      error: 'Esta cuenta usa Gmail. Inicia sesión con Google.',
    });
  }

  const incomingHash = hashPassword(password, user.salt);
  if (incomingHash !== user.passwordHash) {
    return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
  }

  const token = createSessionToken();
  db.sessions[token] = {
    username: user.username,
    createdAt: new Date().toISOString(),
  };
  saveDb(db);

  return res.json({ ok: true, token, user: { username: user.username } });
});

app.post('/auth/google', async (req, res) => {
  const idToken = sanitize(req.body?.idToken);
  if (!idToken) {
    return res.status(400).json({ ok: false, error: 'idToken es requerido.' });
  }

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      ok: false,
      error: 'Configura GOOGLE_CLIENT_ID en variables de entorno para habilitar login con Gmail.',
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = sanitize(payload?.email);
    const emailVerified = !!payload?.email_verified;

    if (!email || !emailVerified) {
      return res.status(401).json({
        ok: false,
        error: 'No se pudo verificar la cuenta de Gmail.',
      });
    }

    const key = usernameKey(email);
    if (!db.users[key]) {
      db.users[key] = {
        username: email,
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };
    } else {
      db.users[key] = {
        ...db.users[key],
        authProvider: 'google',
      };
    }

    const token = createSessionToken();
    db.sessions[token] = {
      username: email,
      createdAt: new Date().toISOString(),
      provider: 'google',
    };

    saveDb(db);
    return res.json({ ok: true, token, user: { username: email, provider: 'google' } });
  } catch {
    return res.status(401).json({ ok: false, error: 'idToken de Google inválido o expirado.' });
  }
});

app.get('/auth/me', (req, res) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Sesión inválida.' });
  }

  return res.json({ ok: true, user: { username: session.username } });
});

app.get('/auth/users', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const users = Object.values(db.users)
    .map((user) => {
      const cleanUsername = sanitize(user.username);
      return {
        username: cleanUsername,
        provider: sanitize(user.authProvider) || 'local',
        createdAt: sanitize(user.createdAt) || null,
        online: userToSocket.has(cleanUsername),
      };
    })
    .filter(user => !!user.username)
    .sort((a, b) => a.username.localeCompare(b.username));

  return res.json({ ok: true, users });
});

app.post('/auth/logout', (req, res) => {
  const session = getSessionFromRequest(req);
  if (session?.token && db.sessions[session.token]) {
    delete db.sessions[session.token];
    saveDb(db);
  }
  return res.json({ ok: true });
});

app.get('/notifications', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const list = sortNotifications([...getNotificationList(session.username)]);
  return res.json({ ok: true, notifications: list });
});

app.post('/notifications', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const title = sanitize(req.body?.title);
  const message = sanitize(req.body?.message);
  const type = sanitize(req.body?.type) || 'info';
  const remindAt = sanitize(req.body?.remindAt) || null;

  if (!title) {
    return res.status(400).json({ ok: false, error: 'El título es requerido.' });
  }

  const list = getNotificationList(session.username);
  const now = new Date().toISOString();
  const notification = {
    id: `n_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    title,
    message,
    type,
    remindAt,
    createdAt: now,
    updatedAt: now,
    isRead: false,
    isDone: false,
    notifiedAt: null,
  };

  list.unshift(notification);
  db.notifications[usernameKey(session.username)] = sortNotifications(list);
  saveDb(db);
  return res.status(201).json({ ok: true, notification });
});

app.patch('/notifications/:id', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const id = sanitize(req.params.id);
  const list = getNotificationList(session.username);
  const index = list.findIndex(n => n.id === id);

  if (index < 0) {
    return res.status(404).json({ ok: false, error: 'Notificación no encontrada.' });
  }

  const current = list[index];
  const title = sanitize(req.body?.title);
  const message = sanitize(req.body?.message);
  const type = sanitize(req.body?.type);
  const remindAt = req.body?.remindAt === null ? null : (sanitize(req.body?.remindAt) || current.remindAt);

  list[index] = {
    ...current,
    title: title || current.title,
    message: message || current.message,
    type: type || current.type,
    remindAt,
    isRead: typeof req.body?.isRead === 'boolean' ? req.body.isRead : current.isRead,
    isDone: typeof req.body?.isDone === 'boolean' ? req.body.isDone : current.isDone,
    updatedAt: new Date().toISOString(),
  };

  db.notifications[usernameKey(session.username)] = sortNotifications(list);
  saveDb(db);
  return res.json({ ok: true, notification: list[index] });
});

app.delete('/notifications/:id', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const id = sanitize(req.params.id);
  const list = getNotificationList(session.username);
  const nextList = list.filter(n => n.id !== id);

  db.notifications[usernameKey(session.username)] = nextList;
  saveDb(db);
  return res.json({ ok: true });
});

app.post('/notifications/mark-all-read', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const list = getNotificationList(session.username).map(n => ({
    ...n,
    isRead: true,
    updatedAt: new Date().toISOString(),
  }));

  db.notifications[usernameKey(session.username)] = list;
  saveDb(db);
  return res.json({ ok: true, count: list.length });
});

app.get('/notifications/reminders/poll', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const now = Date.now();
  const list = getNotificationList(session.username);
  const due = [];

  const nextList = list.map(n => {
    const remindAtMs = n.remindAt ? Date.parse(n.remindAt) : null;
    if (!n.isDone && remindAtMs && Number.isFinite(remindAtMs) && remindAtMs <= now && !n.notifiedAt) {
      const marked = {
        ...n,
        notifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      due.push(marked);
      return marked;
    }
    return n;
  });

  db.notifications[usernameKey(session.username)] = nextList;
  if (due.length > 0) {
    saveDb(db);
  }

  return res.json({ ok: true, due });
});

app.get('/dex/users', (_, res) => {
  const connected = new Set(Array.from(userToSocket.keys()));
  const users = Object.values(db.users)
    .map((user) => ({
      username: sanitize(user.username),
      online: connected.has(sanitize(user.username)),
    }))
    .filter((user) => !!user.username);

  res.json({ users });
});

app.post('/dex/message', (req, res) => {
  const from = sanitize(req.body?.from);
  const to = sanitize(req.body?.to);
  const text = sanitize(req.body?.text);
  const incomingId = sanitize(req.body?.id);

  if (!from || !to || !text) {
    return res.status(400).json({ ok: false, error: 'from, to y text son requeridos.' });
  }

  const payload = {
    id: incomingId || `m_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    from,
    to,
    text,
    timestamp: new Date().toISOString(),
  };

  const key = conversationKey(from, to);
  db.conversations[key] = [...(db.conversations[key] || []), payload].slice(-MAX_MESSAGES_PER_CONVERSATION);
  saveDb(db);

  return res.status(201).json({ ok: true, message: payload, conversationId: key });
});

app.get('/dex/db/stats', (_, res) => {
  const totalMessages = Object.values(db.conversations).reduce((acc, messages) => {
    return acc + (Array.isArray(messages) ? messages.length : 0);
  }, 0);

  res.json({
    ok: true,
    db: {
      version: db.meta?.version || DB_VERSION,
      users: Object.keys(db.users).length,
      sessions: Object.keys(db.sessions).length,
      conversations: Object.keys(db.conversations).length,
      notificationsUsers: Object.keys(db.notifications || {}).length,
      totalMessages,
      lastCompactedAt: db.meta?.lastCompactedAt || null,
      updatedAt: db.meta?.updatedAt || null,
    },
    backups: {
      directory: BACKUP_DIR,
      files: getBackupFiles().length,
      maxFiles: MAX_BACKUP_FILES,
      intervalMinutes: BACKUP_INTERVAL_MINUTES,
    },
    policies: {
      sessionTtlDays: SESSION_TTL_DAYS,
      maxMessagesPerConversation: MAX_MESSAGES_PER_CONVERSATION,
    },
  });
});

app.get('/dex/db/backups', (_, res) => {
  const files = getBackupFiles().map((name) => {
    const fullPath = path.join(BACKUP_DIR, name);
    const stat = fs.statSync(fullPath);
    return {
      name,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  });

  res.json({
    ok: true,
    directory: BACKUP_DIR,
    total: files.length,
    files,
  });
});

app.get('/dex/history', (req, res) => {
  const user = sanitize(req.query.user);
  const peer = sanitize(req.query.peer);

  if (!user || !peer) {
    return res.status(400).json({ error: 'user y peer son requeridos' });
  }

  const key = conversationKey(user, peer);
  return res.json({
    conversationId: key,
    messages: db.conversations[key] || [],
  });
});

app.delete('/dex/history', (req, res) => {
  const user = sanitize(req.query.user);
  const peer = sanitize(req.query.peer);

  if (!user || !peer) {
    return res.status(400).json({ error: 'user y peer son requeridos' });
  }

  const key = conversationKey(user, peer);
  delete db.conversations[key];
  saveDb(db);
  return res.json({ ok: true });
});

const userToSocket = new Map();
const socketToUser = new Map();

const broadcastUsers = () => {
  io.emit('dex:users', Array.from(userToSocket.keys()));
};

if (!process.env.VERCEL) {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('dex:join', ({ username }) => {
      const cleanName = sanitize(username);
      if (!cleanName) return;

      userToSocket.set(cleanName, socket.id);
      socketToUser.set(socket.id, cleanName);
      broadcastUsers();

      socket.emit('dex:joined', { username: cleanName });
    });

    socket.on('dex:message', ({ to, text, clientId }) => {
      const from = socketToUser.get(socket.id);
      const cleanTo = sanitize(to);
      const cleanText = sanitize(text);
      if (!from || !cleanTo || !cleanText) return;

      const payload = {
        id: clientId || `m_${Date.now()}`,
        from,
        to: cleanTo,
        text: cleanText,
        timestamp: new Date().toISOString(),
      };

      const key = conversationKey(from, cleanTo);
      db.conversations[key] = [...(db.conversations[key] || []), payload].slice(-MAX_MESSAGES_PER_CONVERSATION);
      saveDb(db);

      socket.emit('dex:message:ack', payload);

      const targetSocketId = userToSocket.get(cleanTo);
      if (targetSocketId) {
        io.to(targetSocketId).emit('dex:message', payload);
      }
    });

    socket.on('dex:read', ({ to }) => {
      const from = socketToUser.get(socket.id);
      const cleanTo = sanitize(to);
      if (!from || !cleanTo) return;

      const targetSocketId = userToSocket.get(cleanTo);
      if (targetSocketId) {
        io.to(targetSocketId).emit('dex:read', { from });
      }
    });

    socket.on('disconnect', () => {
      const username = socketToUser.get(socket.id);
      if (username) {
        userToSocket.delete(username);
        socketToUser.delete(socket.id);
        broadcastUsers();
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Dex realtime server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
