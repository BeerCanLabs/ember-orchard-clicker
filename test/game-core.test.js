const test = require("node:test");
const assert = require("node:assert/strict");
const { upgrades, price, perSecond, perClick, buyUpgrade } = require("../game-core.js");

const byId = (id) => upgrades.find((upgrade) => upgrade.id === id);

test("KPF: gathering begins at one ember per click", () => {
  assert.equal(perClick({}), 1);
});

test("KPF: first upgrade is available after one gather", () => {
  assert.equal(price(byId("lantern"), {}), 1);
});

test("KPF: buying lantern keepers produces passive embers", () => {
  assert.equal(perSecond({ lantern: 3 }), 3);
});

test("KPF: deep roots improve gathering power", () => {
  assert.equal(perClick({ roots: 4 }), 5);
});

test("KPF: upgrade prices increase with ownership", () => {
  const lantern = byId("lantern");
  assert.ok(price(lantern, { lantern: 1 }) > price(lantern, {}));
});

test("KPF: each upgrade has a unique identifier", () => {
  assert.equal(new Set(upgrades.map((upgrade) => upgrade.id)).size, upgrades.length);
});

test("KPF: affordable upgrade purchases succeed and spend embers", () => {
  const before = { embers: 10, owned: {} };
  const result = buyUpgrade(before, "lantern");
  assert.equal(result.ok, true);
  assert.equal(result.state.embers, 9);
  assert.equal(result.state.owned.lantern, 1);
  // Pure function — original state is untouched (safe under rapid clicks / re-renders)
  assert.equal(before.embers, 10);
  assert.deepEqual(before.owned, {});
});

test("KPF: unaffordable upgrade purchases are rejected without mutation", () => {
  const before = { embers: 0, owned: {} };
  const result = buyUpgrade(before, "moth");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unaffordable");
  assert.equal(before.embers, 0);
  assert.deepEqual(before.owned, {});
});

test("KPF: rapid successive purchases remain consistent", () => {
  let state = { embers: 50, owned: {} };
  let buys = 0;
  // Simulate many clicks against the same upgrade id while funds last.
  for (let i = 0; i < 20; i += 1) {
    const result = buyUpgrade(state, "lantern");
    if (!result.ok) break;
    state = result.state;
    buys += 1;
  }
  assert.ok(buys >= 2, "should complete multiple buys while funded");
  assert.equal(state.owned.lantern, buys);
  assert.ok(state.embers >= 0);
  // Next buy must either succeed with exact remaining funds or fail cleanly.
  const next = buyUpgrade(state, "lantern");
  if (next.ok) {
    assert.equal(next.state.owned.lantern, buys + 1);
    assert.ok(next.state.embers >= 0);
  } else {
    assert.equal(next.reason, "unaffordable");
    assert.equal(state.owned.lantern, buys);
  }
});

test("KPF: unknown upgrade ids never alter state", () => {
  const before = { embers: 100, owned: { lantern: 2 } };
  const result = buyUpgrade(before, "not-real");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown");
  assert.equal(before.embers, 100);
  assert.deepEqual(before.owned, { lantern: 2 });
});
