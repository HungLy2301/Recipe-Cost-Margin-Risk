// storage.js — makes the app work BOTH inside Claude and on a real website.
//
// THE PROBLEM THIS SOLVES:
// Inside Claude, the app saves your data using a special locker called
// `window.storage` that only exists there. On your own website that locker
// is missing, so every save would silently do nothing and your data would
// vanish on refresh.
//
// THE FIX:
// This file creates a `storage` object with the exact same three commands
// (get / set / delete). It checks which locker is available and uses it.
// `localStorage` is the browser's own standard locker — every browser has one.

const hasClaudeStorage =
  typeof window !== "undefined" &&
  window.storage &&
  typeof window.storage.get === "function";

const storage = {
  async get(key) {
    if (hasClaudeStorage) return window.storage.get(key, false);
    const value = localStorage.getItem(key);
    return value === null ? null : { key, value, shared: false };
  },

  async set(key, value) {
    if (hasClaudeStorage) return window.storage.set(key, value, false);
    localStorage.setItem(key, value);
    return { key, value, shared: false };
  },

  async delete(key) {
    if (hasClaudeStorage) return window.storage.delete(key, false);
    localStorage.removeItem(key);
    return { key, deleted: true, shared: false };
  },
};

export default storage;
