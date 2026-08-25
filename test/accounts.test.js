const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createStore,
  hashPassword,
  verifyPassword,
  validateCredentials,
  buildLeaderboard,
} = require("../accounts.js");

test("KPF accounts: passwords are hashed, never stored in plaintext", () => {
  const hash = hashPassword("hunter2");
  assert.notEqual(hash, "hunter2");
  assert.ok(hash.includes(":"));
  assert.equal(verifyPassword("hunter2", hash), true);
  assert.equal(verifyPassword("wrong", hash), false);
});

test("KPF accounts: credential validation enforces username and password rules", () => {
  assert.equal(validateCredentials("ab", "longenough"), "Username must be 3-20 characters.");
  assert.equal(
    validateCredentials("has space", "longenough"),
    "Username may only contain letters, numbers, and underscores."
  );
  assert.equal(validateCredentials("gooduser", "short"), "Password must be at least 6 characters.");
  assert.equal(validateCredentials("gooduser", "goodpass"), null);
});

test("KPF accounts: register then login round-trips and rejects duplicates/bad passwords", () => {
  const store = createStore({ data: {} });
  const reg = store.register("Dax", "secretpass");
  assert.equal(reg.ok, true);
  assert.ok(reg.token);
  assert.equal(reg.hasSave, false);

  // Duplicate username (case-insensitive) is rejected.
  const dupe = store.register("dax", "otherpass");
  assert.equal(dupe.ok, false);
  assert.equal(dupe.status, 409);

  // Wrong password rejected.
  const bad = store.login("Dax", "nope");
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 401);

  // Correct login works.
  const ok = store.login("Dax", "secretpass");
  assert.equal(ok.ok, true);
  assert.equal(ok.username, "Dax");
});

test("KPF accounts: a save can be stored and reloaded, surviving a fresh login", () => {
  const store = createStore({ data: {} });
  const reg = store.register("Player", "secretpass");
  const save = { embers: 500, lifetimeEmbers: 12345, prestigeCount: 2, owned: { lantern: 3 } };
  const saved = store.saveSave(reg.token, save);
  assert.equal(saved.ok, true);
  assert.equal(saved.stats.lifetimeEmbers, 12345);
  assert.equal(saved.stats.prestigeCount, 2);

  // A brand-new login session still sees the save (simulates "after an update").
  const relogin = store.login("Player", "secretpass");
  assert.equal(relogin.hasSave, true);
  const loaded = store.loadSave(relogin.token);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.save.embers, 500);
  assert.equal(loaded.save.lifetimeEmbers, 12345);
});

test("KPF accounts: save/load require a valid session token", () => {
  const store = createStore({ data: {} });
  assert.equal(store.loadSave("bogus").ok, false);
  assert.equal(store.saveSave(null, { embers: 1 }).ok, false);
});

test("KPF leaderboard: ranks by prestige count first, then lifetime tickets", () => {
  const users = {
    a: { username: "Ana", stats: { prestigeCount: 5, lifetimeEmbers: 100 } },
    b: { username: "Ben", stats: { prestigeCount: 5, lifetimeEmbers: 900 } },
    c: { username: "Cid", stats: { prestigeCount: 8, lifetimeEmbers: 10 } },
    d: { username: "Dot", stats: { prestigeCount: 0, lifetimeEmbers: 999999 } },
  };
  const board = buildLeaderboard(users);
  assert.deepEqual(
    board.map((row) => row.username),
    ["Cid", "Ben", "Ana", "Dot"]
  );
  assert.equal(board[0].prestigeCount, 8);
  assert.equal(board[1].lifetimeEmbers, 900);
});

test("KPF leaderboard: reflects only the two public counters and honors the limit", () => {
  const users = {
    a: { username: "Ana", passwordHash: "x:y", stats: { prestigeCount: 1, lifetimeEmbers: 50 } },
    b: { username: "Ben", passwordHash: "x:y", stats: { prestigeCount: 2, lifetimeEmbers: 60 } },
  };
  const board = buildLeaderboard(users, 1);
  assert.equal(board.length, 1);
  assert.equal(board[0].username, "Ben");
  // No password material leaks into leaderboard rows.
  assert.deepEqual(Object.keys(board[0]).sort(), ["lifetimeEmbers", "prestigeCount", "username"]);
});
