const test = require("node:test");
const assert = require("node:assert/strict");
const {
  upgrades,
  price,
  perSecond,
  perClick,
  buyUpgrade,
  isMaxed,
  MAX_OWNED,
} = require("../game-core.js");

const byId = (id) => upgrades.find((upgrade) => upgrade.id === id);

test("KPF: claiming begins at one ticket per click", () => {
  assert.equal(perClick({}), 1);
});

test("KPF: ticket clerk is the first shop entry and costs 100", () => {
  assert.equal(upgrades[0].id, "lantern");
  assert.equal(price(byId("lantern"), {}), 100);
});

test("KPF: shop order is clerk, season pass, queue runners, box office", () => {
  assert.deepEqual(
    upgrades.map((upgrade) => upgrade.id),
    ["lantern", "roots", "moth", "grove"]
  );
});

test("KPF: buying ticket clerks produces passive tickets", () => {
  assert.equal(perSecond({ lantern: 3 }), 3);
});

test("KPF: season passes improve claim power", () => {
  assert.equal(perClick({ roots: 4 }), 5);
});

test("KPF: upgrade prices increase with ownership", () => {
  const lantern = byId("lantern");
  assert.ok(price(lantern, { lantern: 1 }) > price(lantern, {}));
});

test("KPF: each upgrade has a unique identifier", () => {
  assert.equal(new Set(upgrades.map((upgrade) => upgrade.id)).size, upgrades.length);
});

test("KPF: affordable upgrade purchases succeed and spend tickets", () => {
  const before = { embers: 250, owned: {} };
  const result = buyUpgrade(before, "lantern");
  assert.equal(result.ok, true);
  assert.equal(result.state.embers, 150);
  assert.equal(result.state.owned.lantern, 1);
  assert.equal(before.embers, 250);
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
  let state = { embers: 5000, owned: {} };
  let buys = 0;
  for (let i = 0; i < 20; i += 1) {
    const result = buyUpgrade(state, "lantern");
    if (!result.ok) break;
    state = result.state;
    buys += 1;
  }
  assert.ok(buys >= 2, "should complete multiple buys while funded");
  assert.equal(state.owned.lantern, buys);
  assert.ok(state.embers >= 0);
  const next = buyUpgrade(state, "lantern");
  if (next.ok) {
    assert.equal(next.state.owned.lantern, buys + 1);
    assert.ok(next.state.embers >= 0);
  } else {
    assert.ok(next.reason === "unaffordable" || next.reason === "maxed");
    assert.equal(state.owned.lantern, buys);
  }
});

test("KPF: unknown upgrade ids never alter state", () => {
  const before = { embers: 10000, owned: { lantern: 2 } };
  const result = buyUpgrade(before, "not-real");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown");
  assert.equal(before.embers, 10000);
  assert.deepEqual(before.owned, { lantern: 2 });
});

test("KPF: each upgrade can be owned at most 50 times", () => {
  assert.equal(MAX_OWNED, 50);
  const owned = { lantern: 50 };
  assert.equal(isMaxed(byId("lantern"), owned), true);
  const result = buyUpgrade({ embers: 1e12, owned }, "lantern");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "maxed");
  assert.equal(owned.lantern, 50);
});

test("KPF: ownership just under the cap can still buy once", () => {
  const result = buyUpgrade({ embers: 1e12, owned: { roots: 49 } }, "roots");
  assert.equal(result.ok, true);
  assert.equal(result.state.owned.roots, 50);
  const blocked = buyUpgrade(result.state, "roots");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "maxed");
});

test("KPF: base shop prices are substantially elevated", () => {
  assert.ok(price(byId("lantern"), {}) >= 100);
  assert.ok(price(byId("roots"), {}) >= 400);
  assert.ok(price(byId("moth"), {}) >= 1500);
  assert.ok(price(byId("grove"), {}) >= 9000);
});
