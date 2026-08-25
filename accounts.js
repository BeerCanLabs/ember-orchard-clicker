// Account + save + leaderboard store for Ticket Booth.
//
// Dependency-free on purpose: password hashing uses Node's built-in crypto
// (scrypt), and data persists to a single JSON file. No native modules, no
// `npm install` — keeping the project's "runs with zero downloads" promise.
//
// This module is pure-ish and unit-testable: pass an in-memory store to the
// factory in tests, or a file path in production.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SCRYPT_KEYLEN = 64;
const SESSION_BYTES = 32;
const MIN_USERNAME = 3;
const MAX_USERNAME = 20;
const MIN_PASSWORD = 6;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

/** Hash a password with a random salt. Returns "salt:hash" (hex). */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

/** Constant-time verify a password against a stored "salt:hash". */
function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(derived, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function validateCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") {
    return "Username and password are required.";
  }
  const name = username.trim();
  if (name.length < MIN_USERNAME || name.length > MAX_USERNAME) {
    return `Username must be ${MIN_USERNAME}-${MAX_USERNAME} characters.`;
  }
  if (!USERNAME_RE.test(name)) {
    return "Username may only contain letters, numbers, and underscores.";
  }
  if (password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  return null;
}

function sanitizeStats(stats = {}) {
  return {
    lifetimeEmbers: Math.max(0, Math.floor(Number(stats.lifetimeEmbers) || 0)),
    prestigeCount: Math.max(0, Math.floor(Number(stats.prestigeCount) || 0)),
  };
}

/**
 * Build a leaderboard array from a users map.
 * Sorted by prestigeCount desc, then lifetimeEmbers desc. Ties keep names
 * alphabetical so the order is deterministic (important for tests).
 */
function buildLeaderboard(users, limit = 100) {
  const rows = Object.values(users).map((user) => {
    const stats = sanitizeStats(user.stats);
    return {
      username: user.username,
      prestigeCount: stats.prestigeCount,
      lifetimeEmbers: stats.lifetimeEmbers,
    };
  });
  rows.sort((a, b) => {
    if (b.prestigeCount !== a.prestigeCount) return b.prestigeCount - a.prestigeCount;
    if (b.lifetimeEmbers !== a.lifetimeEmbers) return b.lifetimeEmbers - a.lifetimeEmbers;
    return a.username.localeCompare(b.username);
  });
  return rows.slice(0, Math.max(0, limit));
}

/**
 * Create an account store.
 * @param {object} options
 * @param {string} [options.filePath] persist to this JSON file
 * @param {object} [options.data] start from this in-memory object (tests)
 */
function createStore(options = {}) {
  const filePath = options.filePath || null;
  const key = (name) => String(name).trim().toLowerCase();

  let db = { users: {}, sessions: {} };

  if (options.data) {
    db = { users: {}, sessions: {}, ...options.data };
  } else if (filePath && fs.existsSync(filePath)) {
    try {
      db = { users: {}, sessions: {}, ...JSON.parse(fs.readFileSync(filePath, "utf8")) };
    } catch {
      db = { users: {}, sessions: {} };
    }
  }

  function persist() {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
  }

  function newSession(username) {
    const token = crypto.randomBytes(SESSION_BYTES).toString("hex");
    db.sessions[token] = { username, created: Date.now() };
    return token;
  }

  function register(username, password) {
    const error = validateCredentials(username, password);
    if (error) return { ok: false, status: 400, error };
    const id = key(username);
    if (db.users[id]) return { ok: false, status: 409, error: "That username is taken." };
    const clean = String(username).trim();
    db.users[id] = {
      username: clean,
      passwordHash: hashPassword(password),
      save: null,
      stats: { lifetimeEmbers: 0, prestigeCount: 0 },
      created: Date.now(),
    };
    const token = newSession(id);
    persist();
    return { ok: true, token, username: clean, hasSave: false };
  }

  function login(username, password) {
    const id = key(username);
    const user = db.users[id];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, status: 401, error: "Wrong username or password." };
    }
    const token = newSession(id);
    persist();
    return { ok: true, token, username: user.username, hasSave: user.save != null };
  }

  function logout(token) {
    if (token && db.sessions[token]) {
      delete db.sessions[token];
      persist();
    }
    return { ok: true };
  }

  function userForToken(token) {
    const session = token && db.sessions[token];
    if (!session) return null;
    return db.users[session.username] || null;
  }

  /** Load a user's cloud save (or null for a fresh start). */
  function loadSave(token) {
    const user = userForToken(token);
    if (!user) return { ok: false, status: 401, error: "Not signed in." };
    return { ok: true, save: user.save, stats: sanitizeStats(user.stats), username: user.username };
  }

  /** Persist a user's save and refresh their leaderboard stats. */
  function saveSave(token, save) {
    const user = userForToken(token);
    if (!user) return { ok: false, status: 401, error: "Not signed in." };
    user.save = save && typeof save === "object" ? save : null;
    if (user.save) {
      user.stats = sanitizeStats({
        lifetimeEmbers: user.save.lifetimeEmbers,
        prestigeCount: user.save.prestigeCount,
      });
    }
    persist();
    return { ok: true, stats: sanitizeStats(user.stats) };
  }

  function leaderboard(limit = 100) {
    return { ok: true, entries: buildLeaderboard(db.users, limit) };
  }

  return {
    register,
    login,
    logout,
    loadSave,
    saveSave,
    leaderboard,
    userForToken,
    _db: db,
  };
}

module.exports = {
  createStore,
  hashPassword,
  verifyPassword,
  validateCredentials,
  buildLeaderboard,
  sanitizeStats,
};
