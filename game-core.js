(function (root, factory) {
  const core = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.GameCore = core;
})(typeof window !== "undefined" ? window : globalThis, () => {
  const MAX_OWNED = 50;
  const CLICK_EXP = 1;
  const BUY_EXP = 10;
  const INVENTORY_SIZE = 25;
  const MAX_ITEM_STACK = 4;
  const HELMET_CPS_BONUS = 0.1;
  const PRESTIGE_COST = 200000;
  const MAGIC_PER_PRESTIGE = 1;

  // Shop order: clerk → season pass → queue runners → box office → double feature
  const upgrades = [
    { id: "lantern", icon: "▣", name: "Ticket clerk", note: "+1 ticket / second", baseCost: 25, cps: 1 },
    { id: "roots", icon: "◈", name: "Season pass", note: "+1 ticket / click", baseCost: 112, click: 1 },
    { id: "moth", icon: "♢", name: "Queue runners", note: "+5 tickets / second", baseCost: 450, cps: 5 },
    { id: "grove", icon: "▤", name: "Box office", note: "+25 tickets / second", baseCost: 2375, cps: 25 },
    {
      id: "premiere",
      icon: "★",
      name: "Double feature",
      note: "×2 all ticket earnings",
      baseCost: 100000,
      mult: 2,
      maxOwned: 1,
      unlockAtLevel: 10,
      reveal: "curtains",
    },
  ];

  const ITEMS = [
    { id: "dice", icon: "🎲", name: "Dice", weight: 32 },
    { id: "cards", icon: "🂠", name: "Cards", weight: 32 },
    { id: "pictures", icon: "🖼", name: "Pictures", weight: 32 },
    { id: "helmet", icon: "⛑", name: "Iron Helmet", weight: 4 },
  ];

  const itemById = (id) => ITEMS.find((item) => item.id === id);

  /** Empty bag: 25 open slots. */
  function createEmptyInventory() {
    return Array.from({ length: INVENTORY_SIZE }, () => null);
  }

  function normalizeInventory(inventory) {
    const next = createEmptyInventory();
    if (!Array.isArray(inventory)) return next;
    for (let i = 0; i < INVENTORY_SIZE; i += 1) {
      const slot = inventory[i];
      if (slot == null || typeof slot !== "object") {
        next[i] = null;
        continue;
      }
      const def = itemById(slot.id);
      if (!def) {
        next[i] = null;
        continue;
      }
      const qty = Math.min(MAX_ITEM_STACK, Math.max(1, Math.floor(Number(slot.qty) || 1)));
      next[i] = { id: def.id, icon: def.icon, name: def.name, qty };
    }
    return next;
  }

  function inventoryUsed(inventory) {
    return normalizeInventory(inventory).filter((slot) => slot != null).length;
  }

  function inventoryHasItem(inventory, itemId) {
    return normalizeInventory(inventory).some((slot) => slot && slot.id === itemId);
  }

  function inventoryCpsMultiplier(inventory) {
    // Iron Helmet: +10% tickets/sec, does not stack with multiple helmets.
    return inventoryHasItem(inventory, "helmet") ? 1 + HELMET_CPS_BONUS : 1;
  }

  /** Add one item, stacking up to MAX_ITEM_STACK per pocket. Pure. */
  function addItemToInventory(inventory, itemId) {
    const def = itemById(itemId);
    if (!def) return { ok: false, reason: "unknown", inventory: normalizeInventory(inventory) };
    const next = normalizeInventory(inventory).map((slot) => (slot ? { ...slot } : null));

    for (let i = 0; i < next.length; i += 1) {
      if (next[i] && next[i].id === itemId && next[i].qty < MAX_ITEM_STACK) {
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return { ok: true, reason: "stacked", inventory: next, index: i, item: next[i] };
      }
    }

    for (let i = 0; i < next.length; i += 1) {
      if (!next[i]) {
        next[i] = { id: def.id, icon: def.icon, name: def.name, qty: 1 };
        return { ok: true, reason: "placed", inventory: next, index: i, item: next[i] };
      }
    }

    return { ok: false, reason: "full", inventory: next };
  }

  /** Weighted random item. Helmet is intentionally rare. */
  function rollMilestoneItem(random = Math.random) {
    const total = ITEMS.reduce((sum, item) => sum + item.weight, 0);
    let ticket = random() * total;
    for (const item of ITEMS) {
      ticket -= item.weight;
      if (ticket <= 0) return item.id;
    }
    return ITEMS[0].id;
  }

  function isMilestoneLevel(level) {
    return level > 0 && level % 5 === 0;
  }

  /** Which flair animation to play for a 5-level milestone (cycles). */
  function milestoneAnimation(level) {
    const variants = ["gold-shower", "star-nova", "ring-wave", "prism-burst"];
    const index = Math.max(0, Math.floor(level / 5) - 1) % variants.length;
    return variants[index];
  }

  const count = (owned, id) => owned[id] || 0;
  const totalOwned = (owned) => upgrades.reduce((sum, upgrade) => sum + count(owned, upgrade.id), 0);
  const maxFor = (upgrade) => upgrade.maxOwned ?? MAX_OWNED;
  const isMaxed = (upgrade, owned) => count(owned, upgrade.id) >= maxFor(upgrade);

  /** context: { level } for level-gated unlocks */
  const isUnlocked = (upgrade, owned, context = {}) => {
    if (count(owned, upgrade.id) > 0) return true;
    if (upgrade.unlockAtLevel != null) {
      return (context.level || 1) >= upgrade.unlockAtLevel;
    }
    if (upgrade.unlockAt != null) {
      return totalOwned(owned) >= upgrade.unlockAt;
    }
    return true;
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

  const perSecond = (owned, inventory) =>
    basePerSecond(owned) * earningsMultiplier(owned) * inventoryCpsMultiplier(inventory);
  const perClick = (owned) => basePerClick(owned) * earningsMultiplier(owned);

  /** EXP needed to advance from `level` → `level + 1` (level is 1-based). */
  function expRequiredForLevel(level) {
    const safe = Math.max(1, Math.floor(level || 1));
    return Math.floor(12 * Math.pow(1.32, safe - 1));
  }

  /** Derive level progress from lifetime EXP. */
  function levelProgress(totalExp) {
    let remaining = Math.max(0, Math.floor(Number(totalExp) || 0));
    let level = 1;
    for (let i = 0; i < 10000; i += 1) {
      const need = expRequiredForLevel(level);
      if (remaining < need) {
        return {
          level,
          exp: remaining,
          next: need,
          totalExp: Math.max(0, Math.floor(Number(totalExp) || 0)),
          ratio: need === 0 ? 0 : remaining / need,
        };
      }
      remaining -= need;
      level += 1;
    }
    return { level, exp: remaining, next: expRequiredForLevel(level), totalExp: remaining, ratio: 0 };
  }

  function grantExp(totalExp, amount) {
    const before = levelProgress(totalExp);
    const afterTotal = before.totalExp + Math.max(0, Math.floor(amount || 0));
    const after = levelProgress(afterTotal);
    const crossed = [];
    for (let level = before.level + 1; level <= after.level; level += 1) crossed.push(level);
    return {
      ...after,
      gained: Math.max(0, Math.floor(amount || 0)),
      leveledUp: after.level > before.level,
      levelsGained: after.level - before.level,
      previousLevel: before.level,
      crossedLevels: crossed,
    };
  }

  /** Instantly complete the current level (dev shortcut helper). */
  function forceLevelUp(totalExp) {
    const progress = levelProgress(totalExp);
    const need = Math.max(1, progress.next - progress.exp);
    return grantExp(totalExp, need);
  }

  /** Pure purchase attempt. Never mutates input. context may include { level }. */
  function buyUpgrade(state, upgradeId, context = {}) {
    const upgrade = upgrades.find((entry) => entry.id === upgradeId);
    if (!upgrade) return { ok: false, reason: "unknown", state };
    if (!isUnlocked(upgrade, state.owned, context)) {
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
      expGained: BUY_EXP,
      state: {
        embers: state.embers - cost,
        owned: { ...state.owned, [upgradeId]: ownedCount + 1 },
      },
    };
  }

  /**
   * Prestige: spend PRESTIGE_COST tickets, wipe run progress (tickets, upgrades,
   * levels/XP, inventory), keep magic points and add MAGIC_PER_PRESTIGE.
   * Magic points have no effect yet.
   */
  function canPrestige(state) {
    return (state.embers || 0) >= PRESTIGE_COST;
  }

  function prestige(state) {
    if (!canPrestige(state)) {
      return {
        ok: false,
        reason: "unaffordable",
        cost: PRESTIGE_COST,
        state,
      };
    }
    const magicBefore = Math.max(0, Math.floor(Number(state.magicPoints) || 0));
    return {
      ok: true,
      cost: PRESTIGE_COST,
      magicGained: MAGIC_PER_PRESTIGE,
      state: {
        embers: 0,
        owned: {},
        exp: 0,
        inventory: createEmptyInventory(),
        magicPoints: magicBefore + MAGIC_PER_PRESTIGE,
      },
    };
  }

  return {
    upgrades,
    ITEMS,
    price,
    perSecond,
    perClick,
    buyUpgrade,
    prestige,
    canPrestige,
    count,
    totalOwned,
    isMaxed,
    isUnlocked,
    maxFor,
    earningsMultiplier,
    inventoryCpsMultiplier,
    inventoryHasItem,
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
    itemById,
    CLICK_EXP,
    BUY_EXP,
    MAX_OWNED,
    INVENTORY_SIZE,
    MAX_ITEM_STACK,
    HELMET_CPS_BONUS,
    PRESTIGE_COST,
    MAGIC_PER_PRESTIGE,
  };
});
