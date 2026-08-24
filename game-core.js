(function (root, factory) {
  const core = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.GameCore = core;
})(typeof window !== "undefined" ? window : globalThis, () => {
  const MAX_OWNED = 50;

  // Shop order: clerk → season pass → queue runners → box office → double feature
  const upgrades = [
    { id: "lantern", icon: "▣", name: "Ticket clerk", note: "+1 ticket / second", baseCost: 50, cps: 1 },
    { id: "roots", icon: "◈", name: "Season pass", note: "+1 ticket / click", baseCost: 225, click: 1 },
    { id: "moth", icon: "♢", name: "Queue runners", note: "+5 tickets / second", baseCost: 900, cps: 5 },
    { id: "grove", icon: "▤", name: "Box office", note: "+25 tickets / second", baseCost: 4750, cps: 25 },
    {
      id: "premiere",
      icon: "★",
      name: "Double feature",
      note: "×2 all ticket earnings",
      baseCost: 50000,
      mult: 2,
      maxOwned: 1,
      unlockAt: 20,
      reveal: "curtains",
    },
  ];

  const count = (owned, id) => owned[id] || 0;
  const totalOwned = (owned) => upgrades.reduce((sum, upgrade) => sum + count(owned, upgrade.id), 0);
  const maxFor = (upgrade) => upgrade.maxOwned ?? MAX_OWNED;
  const isMaxed = (upgrade, owned) => count(owned, upgrade.id) >= maxFor(upgrade);
  const isUnlocked = (upgrade, owned) => {
    if (!upgrade.unlockAt) return true;
    if (count(owned, upgrade.id) > 0) return true;
    return totalOwned(owned) >= upgrade.unlockAt;
  };

  const price = (upgrade, owned) => {
    const level = Math.min(count(owned, upgrade.id), maxFor(upgrade));
    return Math.ceil(upgrade.baseCost * Math.pow(1.16, level));
  };

  const earningsMultiplier = (owned) =>
    upgrades.reduce((mult, upgrade) => mult * Math.pow(upgrade.mult || 1, count(owned, upgrade.id)), 1);

  const basePerSecond = (owned) =>
    upgrades.reduce((sum, upgrade) => sum + (upgrade.cps || 0) * count(owned, upgrade.id), 0);
  const basePerClick = (owned) =>
    1 + upgrades.reduce((sum, upgrade) => sum + (upgrade.click || 0) * count(owned, upgrade.id), 0);

  const perSecond = (owned) => basePerSecond(owned) * earningsMultiplier(owned);
  const perClick = (owned) => basePerClick(owned) * earningsMultiplier(owned);

  /** Pure purchase attempt. Never mutates input. */
  function buyUpgrade(state, upgradeId) {
    const upgrade = upgrades.find((entry) => entry.id === upgradeId);
    if (!upgrade) return { ok: false, reason: "unknown", state };
    if (!isUnlocked(upgrade, state.owned)) {
      return { ok: false, reason: "locked", state, upgrade };
    }
    const ownedCount = count(state.owned, upgradeId);
    if (ownedCount >= maxFor(upgrade)) {
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

  return {
    upgrades,
    price,
    perSecond,
    perClick,
    buyUpgrade,
    count,
    totalOwned,
    isMaxed,
    isUnlocked,
    maxFor,
    earningsMultiplier,
    MAX_OWNED,
  };
});
