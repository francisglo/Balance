// Simple localStorage-based storage service for prototyping
const KEY_PREFIX = 'BALANCE_V1_';

function generateId() {
  return `${Date.now()}_${Math.floor(Math.random()*1000)}`;
}

function getRaw(key) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('storage.getRaw error', e);
    return [];
  }
}

function saveRaw(key, data) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('storage.saveRaw error', e);
    return false;
  }
}

export function getCollection(name) {
  return getRaw(name) || [];
}

export function saveCollection(name, items) {
  return saveRaw(name, items || []);
}

export function addItem(name, item) {
  const list = getCollection(name);
  const newItem = { id: generateId(), ...item };
  list.push(newItem);
  saveCollection(name, list);
  return newItem;
}

export function updateItem(name, id, patch) {
  const list = getCollection(name);
  const idx = list.findIndex(i => i.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  saveCollection(name, list);
  return list[idx];
}

export function deleteItem(name, id) {
  const list = getCollection(name);
  const newList = list.filter(i => i.id !== id);
  saveCollection(name, newList);
  return true;
}

export function seedIfEmpty(name, items) {
  const list = getCollection(name);
  if (!list || list.length === 0) {
    const seeded = items.map(i => ({ id: generateId(), ...i }));
    saveCollection(name, seeded);
    return seeded;
  }
  return list;
}

const storageAPI = {
  getCollection,
  saveCollection,
  addItem,
  updateItem,
  deleteItem,
  seedIfEmpty,
};

export default storageAPI;