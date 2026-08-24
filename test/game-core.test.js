const test = require("node:test");
const assert = require("node:assert/strict");
const {
  upgrades,
  price,
  perSecond,
  perClick,
  buyUpgrade,
  isMaxed,
  isUnlocked,
  maxFor,
  totalOwned,
  earningsMultiplier,
  expRequiredForLevel,
  levelProgress,
  grantExp,
  createEmptyInventory,
  normalizeInventory,
  inventoryUsed,
  CLICK_EXP,
  BUY_EXP,
  MAX_OWNED,
  INVENTORY_SIZE,
} = require("../game-core.js");

const byId = (id) => upgrades.find((upgrade) => upgrade.id === id);

test("KPF: claiming begins at one ticket per click", () => {
  assert.equal(perClick({}), 1);
});

test("KPF: ticket clerk is the first shop entry and costs 25", () => {
  assert.equal(upgrades[0].id, "lantern");
  assert.equal(price(byId("lantern"), {}), 25);
});

test("KPF: shop order ends with double feature after box office", () => {
  assert.deepEqual(
    upgrades.map((upgrade) => upgrade.id),
    ["lantern", "roots", "moth", "grove", "premiere"]
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
  const before = { embers: 60, owned: {} };
  const result = buyUpgrade(before, "lantern");
  assert.equal(result.ok, true);
  assert.equal(result.state.embers, 35);
  assert.equal(result.state.owned.lantern, 1);
  assert.equal(before.embers, 60);
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
});

test("KPF: unknown upgrade ids never alter state", () => {
  const before = { embers: 10000, owned: { lantern: 2 } };
  const result = buyUpgrade(before, "not-real");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown");
  assert.equal(before.embers, 10000);
  assert.deepEqual(before.owned, { lantern: 2 });
});

test("KPF: standard upgrades can be owned at most 50 times", () => {
  assert.equal(MAX_OWNED, 50);
  assert.equal(maxFor(byId("lantern")), 50);
  const owned = { lantern: 50 };
  assert.equal(isMaxed(byId("lantern"), owned), true);
  const result = buyUpgrade({ embers: 1e12, owned }, "lantern");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "maxed");
});

test("KPF: ownership just under the cap can still buy once", () => {
  const result = buyUpgrade({ embers: 1e12, owned: { roots: 49 } }, "roots");
  assert.equal(result.ok, true);
  assert.equal(result.state.owned.roots, 50);
  const blocked = buyUpgrade(result.state, "roots");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "maxed");
});

test("KPF: base shop prices are half of the prior elevated tier", () => {
  assert.equal(price(byId("lantern"), {}), 25);
  assert.equal(price(byId("roots"), {}), 112);
  assert.equal(price(byId("moth"), {}), 450);
  assert.equal(price(byId("grove"), {}), 2375);
});

test("KPF: double feature costs 100000 and can only be bought once", () => {
  const premiere = byId("premiere");
  assert.equal(price(premiere, {}), 100000);
  assert.equal(maxFor(premiere), 1);
  const unlockedOwned = { lantern: 20 };
  assert.equal(isUnlocked(premiere, unlockedOwned), true);
  const bought = buyUpgrade({ embers: 100000, owned: unlockedOwned }, "premiere");
  assert.equal(bought.ok, true);
  assert.equal(bought.state.owned.premiere, 1);
  assert.equal(bought.state.embers, 0);
  const again = buyUpgrade(bought.state, "premiere");
  assert.equal(again.ok, false);
  assert.equal(again.reason, "maxed");
});

test("KPF: double feature stays locked until 20 total upgrades are owned", () => {
  const premiere = byId("premiere");
  assert.equal(isUnlocked(premiere, { lantern: 19 }), false);
  assert.equal(buyUpgrade({ embers: 1e12, owned: { lantern: 19 } }, "premiere").reason, "locked");
  assert.equal(isUnlocked(premiere, { lantern: 20 }), true);
  assert.equal(totalOwned({ lantern: 12, roots: 8 }), 20);
});

test("KPF: double feature doubles claim and passive earnings", () => {
  const owned = { lantern: 2, roots: 3, premiere: 1 };
  assert.equal(earningsMultiplier(owned), 2);
  // base cps 2, base click 1+3=4, both doubled
  assert.equal(perSecond(owned), 4);
  assert.equal(perClick(owned), 8);
});

test("KPF: manual claims grant 1 exp and purchases grant 10 exp", () => {
  assert.equal(CLICK_EXP, 1);
  assert.equal(BUY_EXP, 10);
  const click = grantExp(0, CLICK_EXP);
  assert.equal(click.totalExp, 1);
  assert.equal(click.level, 1);
  const buy = grantExp(0, BUY_EXP);
  assert.equal(buy.totalExp, 10);
});

test("KPF: enough exp increases player level", () => {
  const need = expRequiredForLevel(1);
  const almost = grantExp(0, need - 1);
  assert.equal(almost.level, 1);
  assert.equal(almost.leveledUp, false);
  const leveled = grantExp(almost.totalExp, 1);
  assert.equal(leveled.level, 2);
  assert.equal(leveled.leveledUp, true);
  assert.equal(leveled.exp, 0);
});

test("KPF: satchel inventory holds 25 empty slots and no items yet", () => {
  assert.equal(INVENTORY_SIZE, 25);
  const bag = createEmptyInventory();
  assert.equal(bag.length, 25);
  assert.equal(inventoryUsed(bag), 0);
  assert.ok(bag.every((slot) => slot === null));
  const normalized = normalizeInventory([null, null]);
  assert.equal(normalized.length, 25);
  assert.equal(inventoryUsed(normalized), 0);
});
