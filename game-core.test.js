const test = require("node:test");
const assert = require("node:assert/strict");
const { upgrades, price, perSecond, perClick } = require("./game-core.js");

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
