(function (root, factory) {
  const core = factory();
  if (typeof module !== "undefined") module.exports = core;
  root.GameCore = core;
})(typeof window !== "undefined" ? window : globalThis, () => {
  const upgrades = [
    { id: "lantern", icon: "◉", name: "Lantern keeper", note: "+1 ember / second", baseCost: 1, cps: 1 },
    { id: "moth", icon: "♢", name: "Glow moths", note: "+5 embers / second", baseCost: 15, cps: 5 },
    { id: "roots", icon: "♧", name: "Deep roots", note: "+1 ember / click", baseCost: 4, click: 1 },
    { id: "grove", icon: "✤", name: "Sunken grove", note: "+25 embers / second", baseCost: 75, cps: 25 },
  ];

  const count = (owned, id) => owned[id] || 0;
  const price = (upgrade, owned) => Math.ceil(upgrade.baseCost * Math.pow(1.16, count(owned, upgrade.id)));
  const perSecond = (owned) => upgrades.reduce((sum, upgrade) => sum + (upgrade.cps || 0) * count(owned, upgrade.id), 0);
  const perClick = (owned) => 1 + upgrades.reduce((sum, upgrade) => sum + (upgrade.click || 0) * count(owned, upgrade.id), 0);

  return { upgrades, price, perSecond, perClick };
});
