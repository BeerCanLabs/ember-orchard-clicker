(function (root, factory) {
  const core = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.GameCore = core;
})(typeof window !== "undefined" ? window : globalThis, () => {
  const MAX_OWNED = 50;

  // Shop order: clerk → season pass → queue runners → box office
  const upgrades = [
    { id: "lantern", icon: "▣", name: "Ticket clerk", note: "+1 ticket / second", baseCost: 100, cps: 1 },
    { id: "roots", icon: "◈", name: "Season pass", note: "+1 ticket / click", baseCost: 450, click: 1 },
    { id: "moth", icon: "♢", name: "Queue runners", note: "+5 tickets / second", baseCost: 1800, cps: 5 },
    { id: "grove", icon: "▤", name: "Box office", note: "+25 tickets / second", baseCost: 9500, cps: 25 },
  ];

  const count = (owned, id) => owned[id] || 0;
  const isMaxed = (upgrade, owned) => count(owned, upgrade.id) >= MAX_OWNED;
  const price = (upgrade, owned) => {
    const level = Math.min(count(owned, upgrade.id), MAX_OWNED);
    return Math.ceil(upgrade.baseCost * Math.pow(1.16, level));
  };
  const perSecond = (owned) => upgrades.reduce((sum, upgrade) => sum + (upgrade.cps || 0) * count(owned, upgrade.id), 0);
  const perClick = (owned) => 1 + upgrades.reduce((sum, upgrade) => sum + (upgrade.click || 0) * count(owned, upgrade.id), 0);

  /** Pure purchase attempt. Never mutates input. */
  function buyUpgrade(state, upgradeId) {
    const upgrade = upgrades.find((entry) => entry.id === upgradeId);
    if (!upgrade) return { ok: false, reason: "unknown", state };
    const ownedCount = count(state.owned, upgradeId);
    if (ownedCount >= MAX_OWNED) {
      return { ok: false, reason: "maxed", state, upgrade, cost: price(upgrade, state.owned) };
    }
    const cost = price(upgrade, state.owned);
    if ((state.embers || 0) < cost) return { ok: false, reason: "unaffordable", state, cost, upgrade };
    return {
      ok: true,
      cost,
      upgrade,
      state: {
        embers: state.embers - cost,
        owned: { ...state.owned, [upgradeId]: ownedCount + 1 },
      },
    };
  }

  return { upgrades, price, perSecond, perClick, buyUpgrade, count, isMaxed, MAX_OWNED };
});
