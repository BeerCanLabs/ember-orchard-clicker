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
  inventoryCpsMultiplier,
  expRequiredForLevel,
  levelProgress,
  grantExp,
  forceLevelUp,
  createEmptyInventory,
  normalizeInventory,
  inventoryUsed,
  addItemToInventory,
  rollMilestoneItem,
  isMilestoneLevel,
  milestoneAnimation,
  prestige,
  CLICK_EXP,
  BUY_EXP,
  MAX_OWNED,
  INVENTORY_SIZE,
  MAX_ITEM_STACK,
  HELMET_CPS_BONUS,
  PRESTIGE_COST,
  MAGIC_PER_PRESTIGE,
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
  assert.equal(perSecond({ lantern: 3 }, []), 3);
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
  const result = buyUpgrade(before, "lantern", { level: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.state.embers, 35);
  assert.equal(result.state.owned.lantern, 1);
});

test("KPF: unaffordable upgrade purchases are rejected without mutation", () => {
  const before = { embers: 0, owned: {} };
  const result = buyUpgrade(before, "moth", { level: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unaffordable");
});

test("KPF: rapid successive purchases remain consistent", () => {
  let state = { embers: 5000, owned: {} };
  let buys = 0;
  for (let i = 0; i < 20; i += 1) {
    const result = buyUpgrade(state, "lantern", { level: 1 });
    if (!result.ok) break;
    state = result.state;
    buys += 1;
  }
  assert.ok(buys >= 2);
  assert.equal(state.owned.lantern, buys);
});

test("KPF: unknown upgrade ids never alter state", () => {
  const before = { embers: 10000, owned: { lantern: 2 } };
  const result = buyUpgrade(before, "not-real", { level: 99 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown");
});

test("KPF: standard upgrades can be owned at most 50 times", () => {
  assert.equal(MAX_OWNED, 50);
  const owned = { lantern: 50 };
  assert.equal(isMaxed(byId("lantern"), owned), true);
  const result = buyUpgrade({ embers: 1e12, owned }, "lantern", { level: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "maxed");
});

test("KPF: ownership just under the cap can still buy once", () => {
  const result = buyUpgrade({ embers: 1e12, owned: { roots: 49 } }, "roots", { level: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.state.owned.roots, 50);
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
  const bought = buyUpgrade({ embers: 100000, owned: {} }, "premiere", { level: 10 });
  assert.equal(bought.ok, true);
  assert.equal(bought.state.owned.premiere, 1);
  const again = buyUpgrade({ embers: 1e12, owned: bought.state.owned }, "premiere", { level: 99 });
  assert.equal(again.ok, false);
  assert.equal(again.reason, "maxed");
});

test("KPF: double feature stays locked until player reaches level 10", () => {
  const premiere = byId("premiere");
  assert.equal(isUnlocked(premiere, {}, { level: 9 }), false);
  assert.equal(buyUpgrade({ embers: 1e12, owned: {} }, "premiere", { level: 9 }).reason, "locked");
  assert.equal(isUnlocked(premiere, {}, { level: 10 }), true);
});

test("KPF: double feature doubles claim and passive earnings", () => {
  const owned = { lantern: 2, roots: 3, premiere: 1 };
  assert.equal(earningsMultiplier(owned), 2);
  assert.equal(perSecond(owned, []), 4);
  assert.equal(perClick(owned), 8);
});

test("KPF: manual claims grant 1 exp and purchases grant 10 exp", () => {
  assert.equal(CLICK_EXP, 1);
  assert.equal(BUY_EXP, 10);
  assert.equal(grantExp(0, CLICK_EXP).totalExp, 1);
  assert.equal(grantExp(0, BUY_EXP).totalExp, 10);
});

test("KPF: enough exp increases player level", () => {
  const need = expRequiredForLevel(1);
  const almost = grantExp(0, need - 1);
  assert.equal(almost.level, 1);
  const leveled = grantExp(almost.totalExp, 1);
  assert.equal(leveled.level, 2);
  assert.equal(leveled.leveledUp, true);
});

test("KPF: force level up completes exactly one level", () => {
  const start = levelProgress(0);
  const forced = forceLevelUp(0);
  assert.equal(forced.level, start.level + 1);
  assert.equal(forced.leveledUp, true);
  assert.equal(forced.exp, 0);
});

test("KPF: satchel inventory holds 25 slots and stacks items to four", () => {
  assert.equal(INVENTORY_SIZE, 25);
  assert.equal(MAX_ITEM_STACK, 4);
  let bag = createEmptyInventory();
  assert.equal(inventoryUsed(bag), 0);

  let result = addItemToInventory(bag, "dice");
  assert.equal(result.ok, true);
  bag = result.inventory;
  assert.equal(bag[0].qty, 1);

  for (let i = 0; i < 3; i += 1) {
    result = addItemToInventory(bag, "dice");
    assert.equal(result.ok, true);
    bag = result.inventory;
  }
  assert.equal(bag[0].qty, 4);
  assert.equal(inventoryUsed(bag), 1);

  // Fifth dice needs a new pocket
  result = addItemToInventory(bag, "dice");
  assert.equal(result.ok, true);
  bag = result.inventory;
  assert.equal(bag[0].qty, 4);
  assert.equal(bag[1].id, "dice");
  assert.equal(bag[1].qty, 1);
});

test("KPF: iron helmet grants a non-stacking 10 percent passive bonus", () => {
  assert.equal(HELMET_CPS_BONUS, 0.1);
  const owned = { lantern: 10 };
  assert.equal(perSecond(owned, []), 10);

  let bag = createEmptyInventory();
  bag = addItemToInventory(bag, "helmet").inventory;
  assert.equal(inventoryCpsMultiplier(bag), 1.1);
  assert.equal(perSecond(owned, bag), 11);

  // Second helmet does not increase the bonus further.
  bag = addItemToInventory(bag, "helmet").inventory;
  assert.equal(inventoryCpsMultiplier(bag), 1.1);
  assert.equal(perSecond(owned, bag), 11);
});

test("KPF: milestone levels are every five and item rolls include rare helmet", () => {
  assert.equal(isMilestoneLevel(5), true);
  assert.equal(isMilestoneLevel(10), true);
  assert.equal(isMilestoneLevel(7), false);
  assert.equal(milestoneAnimation(5), "gold-shower");
  assert.equal(milestoneAnimation(10), "star-nova");

  // Deterministic edges of the weighted table.
  assert.equal(rollMilestoneItem(() => 0), "dice");
  assert.equal(rollMilestoneItem(() => 0.999), "helmet");
});

test("KPF: prestige costs 200000 and awards one magic point while wiping the run", () => {
  assert.equal(PRESTIGE_COST, 200000);
  assert.equal(MAGIC_PER_PRESTIGE, 1);

  const bag = addItemToInventory(createEmptyInventory(), "dice").inventory;
  const before = {
    embers: 250000,
    owned: { lantern: 12, roots: 3, premiere: 1 },
    exp: 9999,
    inventory: bag,
    magicPoints: 2,
  };

  const blocked = prestige({ ...before, embers: 199999 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "unaffordable");
  assert.equal(before.magicPoints, 2);

  const result = prestige(before);
  assert.equal(result.ok, true);
  assert.equal(result.magicGained, 1);
  assert.equal(result.state.embers, 0);
  assert.deepEqual(result.state.owned, {});
  assert.equal(result.state.exp, 0);
  assert.equal(inventoryUsed(result.state.inventory), 0);
  assert.equal(result.state.magicPoints, 3);
  // Input not mutated
  assert.equal(before.embers, 250000);
  assert.equal(before.magicPoints, 2);
  assert.equal(before.owned.lantern, 12);
});

const { sanitizeStats } = require("../game-core.js");

test("KPF: prestige increments the prestige count and preserves lifetime tickets", () => {
  const before = {
    embers: 250000,
    owned: { lantern: 5 },
    exp: 100,
    inventory: createEmptyInventory(),
    magicPoints: 0,
    lifetimeEmbers: 900000,
    prestigeCount: 3,
  };
  const result = prestige(before);
  assert.equal(result.ok, true);
  // Lifetime tickets never reset on prestige.
  assert.equal(result.state.lifetimeEmbers, 900000);
  // Prestige count grows by exactly one.
  assert.equal(result.state.prestigeCount, 4);
  assert.equal(result.prestigeCount, 4);
  // Input not mutated.
  assert.equal(before.prestigeCount, 3);
  assert.equal(before.lifetimeEmbers, 900000);
});

test("KPF: prestige from a save with no leaderboard counters starts them at safe defaults", () => {
  const result = prestige({ embers: 200000, owned: {}, exp: 0, inventory: [], magicPoints: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.state.lifetimeEmbers, 0);
  assert.equal(result.state.prestigeCount, 1);
});

test("KPF: sanitizeStats clamps leaderboard counters to non-negative integers", () => {
  assert.deepEqual(sanitizeStats({ lifetimeEmbers: 12.9, prestigeCount: 3.7 }), {
    lifetimeEmbers: 12,
    prestigeCount: 3,
  });
  assert.deepEqual(sanitizeStats({ lifetimeEmbers: -5, prestigeCount: -1 }), {
    lifetimeEmbers: 0,
    prestigeCount: 0,
  });
  assert.deepEqual(sanitizeStats({}), { lifetimeEmbers: 0, prestigeCount: 0 });
});

