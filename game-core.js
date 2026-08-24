(function (root, factory) {
  const core = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.GameCore = core;
})(typeof window !== "undefined" ? window : globalThis, () => {
  const upgrades = [
    { id: "lantern", icon: "▣", name: "Ticket clerk", note: "+1 ticket / second", baseCost: 1, cps: 1 },
    { id: "moth", icon: "♢", name: "Queue runners", note: "+5 tickets / second", baseCost: 15, cps: 5 },
    { id: "roots", icon: "◈", name: "Season pass", note: "+1 ticket / click", baseCost: 4, click: 1 },
    { id: "grove", icon: "▤", name: "Box office", note: "+25 tickets / second", baseCost: 75, cps: 25 },
  ];

  const count = (owned, id) => owned[id] || 0;
  const price = (upgrade, owned) => Math.ceil(upgrade.baseCost * Math.pow(1.16, count(owned, upgrade.id)));
  const perSecond = (owned) => upgrades.reduce((sum, upgrade) => sum + (upgrade.cps || 0) * count(owned, upgrade.id), 0);
  const perClick = (owned) => 1 + upgrades.reduce((sum, upgrade) => sum + (upgrade.click || 0) * count(owned, upgrade.id), 0);

  /** Pure purchase attempt. Never mutates input. */
  function buyUpgrade(state, upgradeId) {
    const upgrade = upgrades.find((entry) => entry.id === upgradeId);
    if (!upgrade) return { ok: false, reason: "unknown", state };
    const cost = price(upgrade, state.owned);
    if ((state.embers || 0) < cost) return { ok: false, reason: "unaffordable", state, cost, upgrade };
    return {
      ok: true,
      cost,
      upgrade,
      state: {
        embers: state.embers - cost,
        owned: { ...state.owned, [upgradeId]: count(state.owned, upgradeId) + 1 },
      },
    };
  }

  return { upgrades, price, perSecond, perClick, buyUpgrade, count };
});
