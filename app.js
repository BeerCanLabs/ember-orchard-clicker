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
  levelProgress,
  grantExp,
  forceLevelUp,
  normalizeInventory,
  inventoryUsed,
  addItemToInventory,
  rollMilestoneItem,
  isMilestoneLevel,
  milestoneAnimation,
  INVENTORY_SIZE,
  CLICK_EXP,
  BUY_EXP,
  MAX_OWNED,
} = window.GameCore;

const saved = JSON.parse(localStorage.getItem("ember-orchard-save") || "{}");
const state = {
  embers: Number(saved.embers) || 0,
  owned: saved.owned && typeof saved.owned === "object" ? saved.owned : {},
  exp: Number(saved.exp) || 0,
  inventory: normalizeInventory(saved.inventory),
};

const $ = (id) => document.getElementById(id);
const format = (number) => Math.floor(number).toLocaleString();
const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const LEVEL_RING_RADIUS = 37;
const LEVEL_RING_CIRCUMFERENCE = 2 * Math.PI * LEVEL_RING_RADIUS;
const CURTAIN_OPEN_MS = 2800;

function playerLevel() {
  return levelProgress(state.exp).level;
}

function save() {
  localStorage.setItem(
    "ember-orchard-save",
    JSON.stringify({
      embers: state.embers,
      owned: state.owned,
      exp: state.exp,
      inventory: state.inventory,
    })
  );
}

function createUpgradeButton(upgrade) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "upgrade";
  button.dataset.id = upgrade.id;
  if (upgrade.reveal === "curtains") button.classList.add("upgrade-special");

  const icon = document.createElement("span");
  icon.className = "upgrade-icon";
  icon.textContent = upgrade.icon;
  icon.setAttribute("aria-hidden", "true");

  const info = document.createElement("span");
  info.className = "upgrade-info";

  const heading = document.createElement("span");
  heading.className = "upgrade-heading";

  const title = document.createElement("strong");
  title.dataset.role = "title";
  title.textContent = upgrade.name;

  const owned = document.createElement("span");
  owned.className = "owned-badge is-empty";
  owned.dataset.role = "owned";
  owned.textContent = "×0";

  heading.append(title, owned);

  const note = document.createElement("small");
  note.textContent = upgrade.note;

  info.append(heading, note);

  const priceTag = document.createElement("span");
  priceTag.className = "price-tag";

  const priceLabel = document.createElement("span");
  priceLabel.className = "price-label";
  priceLabel.textContent = "Price";

  const priceValue = document.createElement("span");
  priceValue.className = "price-value";
  priceValue.dataset.role = "cost";

  const buyLabel = document.createElement("span");
  buyLabel.className = "buy-label";
  buyLabel.dataset.role = "buy";
  buyLabel.textContent = "Buy";

  priceTag.append(priceLabel, priceValue, buyLabel);
  button.append(icon, info, priceTag);
  return button;
}

function createCurtainSlot(upgrade, button) {
  const slot = document.createElement("div");
  slot.className = "upgrade-slot is-curtained";
  slot.dataset.id = upgrade.id;
  slot.dataset.reveal = "curtains";

  const stage = document.createElement("div");
  stage.className = "curtain-stage";

  const left = document.createElement("div");
  left.className = "curtain curtain-left";
  left.setAttribute("aria-hidden", "true");

  const right = document.createElement("div");
  right.className = "curtain curtain-right";
  right.setAttribute("aria-hidden", "true");

  const valance = document.createElement("div");
  valance.className = "curtain-valance";
  valance.setAttribute("aria-hidden", "true");

  const lockedLabel = document.createElement("div");
  lockedLabel.className = "curtain-lock-label";
  lockedLabel.dataset.role = "lock-label";
  lockedLabel.textContent = "Opens at level 10";

  stage.append(valance, left, right, lockedLabel, button);
  slot.append(stage);
  return slot;
}

function mountUpgrades() {
  const list = $("upgrades");
  list.replaceChildren();
  for (const upgrade of upgrades) {
    const button = createUpgradeButton(upgrade);
    if (upgrade.reveal === "curtains") {
      list.append(createCurtainSlot(upgrade, button));
    } else {
      list.append(button);
    }
  }
}

function revealCurtains(slot, animate) {
  if (!slot || slot.classList.contains("is-open") || slot.classList.contains("is-opening")) return;
  slot.classList.remove("is-locked");
  if (!animate || prefersReducedMotion()) {
    slot.classList.add("is-open");
    return;
  }
  slot.classList.add("is-opening");
  $("status").textContent = "The premiere curtains part…";
  window.setTimeout(() => {
    slot.classList.remove("is-opening");
    slot.classList.add("is-open");
  }, CURTAIN_OPEN_MS);
}

function updateUpgradeButtons() {
  const level = playerLevel();

  for (const upgrade of upgrades) {
    const button = $("upgrades").querySelector(`button[data-id="${upgrade.id}"]`);
    if (!button) continue;

    const slot = button.closest(".upgrade-slot");
    const unlocked = isUnlocked(upgrade, state.owned, { level });
    const cost = price(upgrade, state.owned);
    const owned = state.owned[upgrade.id] || 0;
    const cap = maxFor(upgrade);
    const maxed = isMaxed(upgrade, state.owned);
    const canAfford = unlocked && !maxed && state.embers >= cost;

    if (slot) {
      if (!unlocked) {
        slot.classList.add("is-locked");
        slot.classList.remove("is-open", "is-opening");
        slot.dataset.ready = "1";
        delete slot.dataset.seenOpen;
        const lockLabel = slot.querySelector('[data-role="lock-label"]');
        if (lockLabel) {
          const need = upgrade.unlockAtLevel || 10;
          const remaining = Math.max(0, need - level);
          lockLabel.textContent =
            remaining <= 0 ? `Opens at level ${need}` : `Opens at level ${need} (${remaining} to go)`;
        }
      } else if (!slot.classList.contains("is-open") && !slot.classList.contains("is-opening")) {
        const animate = slot.dataset.ready === "1" && slot.dataset.seenOpen !== "1";
        revealCurtains(slot, animate);
        slot.dataset.seenOpen = "1";
        slot.dataset.ready = "1";
      } else {
        slot.classList.remove("is-locked");
        slot.dataset.ready = "1";
      }
    }

    button.disabled = !canAfford;
    button.classList.toggle("is-maxed", maxed);
    button.classList.toggle("is-locked", !unlocked);
    button.setAttribute("aria-hidden", unlocked ? "false" : "true");

    button.querySelector('[data-role="title"]').textContent = upgrade.name;

    const ownedBadge = button.querySelector('[data-role="owned"]');
    if (maxed && cap === 1) {
      ownedBadge.textContent = "OWNED";
    } else if (maxed) {
      ownedBadge.textContent = `MAX ${cap}`;
    } else {
      ownedBadge.textContent = `×${owned}`;
    }
    ownedBadge.classList.toggle("is-empty", owned === 0 && !maxed);
    ownedBadge.classList.toggle("is-max", maxed);

    const costEl = button.querySelector('[data-role="cost"]');
    const buyEl = button.querySelector('[data-role="buy"]');
    if (!unlocked) {
      costEl.textContent = "???";
      buyEl.textContent = "Locked";
    } else if (maxed) {
      costEl.textContent = "—";
      buyEl.textContent = cap === 1 ? "Owned" : "Maxed";
    } else {
      costEl.innerHTML = `${format(cost)} <span class="ember-mark">🎟</span>`;
      buyEl.textContent = canAfford ? "Buy" : "Need more";
    }
  }
}

function pulseLevelBadge(leveledUp) {
  const badge = $("level-badge");
  if (!badge) return;
  badge.classList.remove("is-gain", "is-level-up");
  void badge.offsetWidth;
  badge.classList.add(leveledUp ? "is-level-up" : "is-gain");
  window.setTimeout(() => badge.classList.remove("is-gain", "is-level-up"), leveledUp ? 900 : 420);
}

function spawnLevelSparkles() {
  if (prefersReducedMotion()) return;
  const badge = $("level-badge");
  if (!badge) return;
  const rect = badge.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 18; i += 1) {
    const spark = document.createElement("span");
    spark.className = "level-sparkle";
    spark.textContent = i % 2 === 0 ? "✦" : "✧";
    const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.35;
    const dist = 36 + Math.random() * 48;
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    spark.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    spark.style.setProperty("--delay", `${(i * 0.018).toFixed(3)}s`);
    document.body.appendChild(spark);
    window.setTimeout(() => spark.remove(), 1100);
  }
}

function playMilestoneAnimation(level) {
  if (prefersReducedMotion()) return;
  const kind = milestoneAnimation(level);
  const layer = document.createElement("div");
  layer.className = `milestone-fx milestone-fx-${kind}`;
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  if (kind === "gold-shower") {
    for (let i = 0; i < 36; i += 1) {
      const drop = document.createElement("span");
      drop.className = "milestone-drop";
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.setProperty("--fall", `${0.9 + Math.random() * 1.1}s`);
      drop.style.setProperty("--delay", `${Math.random() * 0.35}s`);
      drop.style.setProperty("--size", `${6 + Math.random() * 8}px`);
      layer.appendChild(drop);
    }
  } else if (kind === "star-nova") {
    for (let i = 0; i < 24; i += 1) {
      const star = document.createElement("span");
      star.className = "milestone-star";
      star.textContent = "★";
      const angle = (Math.PI * 2 * i) / 24;
      star.style.setProperty("--dx", `${Math.cos(angle) * 140}px`);
      star.style.setProperty("--dy", `${Math.sin(angle) * 140}px`);
      layer.appendChild(star);
    }
  } else if (kind === "ring-wave") {
    for (let i = 0; i < 4; i += 1) {
      const ring = document.createElement("span");
      ring.className = "milestone-ring";
      ring.style.setProperty("--delay", `${i * 0.14}s`);
      layer.appendChild(ring);
    }
  } else {
    for (let i = 0; i < 28; i += 1) {
      const shard = document.createElement("span");
      shard.className = "milestone-shard";
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 160;
      shard.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      shard.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      shard.style.setProperty("--hue", `${Math.floor(Math.random() * 360)}`);
      layer.appendChild(shard);
    }
  }

  window.setTimeout(() => layer.remove(), 2200);
}

function grantMilestoneReward(level) {
  const itemId = rollMilestoneItem();
  const result = addItemToInventory(state.inventory, itemId);
  playMilestoneAnimation(level);
  if (!result.ok) {
    $("status").textContent = `Level ${level} milestone! Satchel is full — no room for loot.`;
    return result;
  }
  state.inventory = result.inventory;
  const item = result.item;
  const stackNote = item.qty > 1 ? ` (×${item.qty})` : "";
  $("status").textContent = `Level ${level} milestone! Found ${item.name}${stackNote}.`;
  renderInventory();
  return result;
}

function renderLevel() {
  const progress = levelProgress(state.exp);
  $("level-value").textContent = String(progress.level);
  $("level-exp-tip").textContent = `${format(progress.exp)} / ${format(progress.next)} XP`;
  $("xp-to-next").textContent = format(Math.max(0, progress.next - progress.exp));

  const ring = $("level-ring-fill");
  if (ring) {
    const offset = LEVEL_RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress.ratio)));
    ring.style.strokeDasharray = `${LEVEL_RING_CIRCUMFERENCE}`;
    ring.style.strokeDashoffset = `${offset}`;
  }

  const badge = $("level-badge");
  if (badge) {
    badge.setAttribute(
      "aria-label",
      `Level ${progress.level}, ${progress.exp} of ${progress.next} experience`
    );
  }

  return progress;
}

function applyExp(amount) {
  const result = grantExp(state.exp, amount);
  state.exp = result.totalExp;
  renderLevel();
  pulseLevelBadge(result.leveledUp);

  if (result.leveledUp) {
    spawnLevelSparkles();
    const milestones = result.crossedLevels.filter((level) => isMilestoneLevel(level));
    if (milestones.length) {
      // Process in order; last message wins if multiple (rare with normal XP).
      for (const level of milestones) grantMilestoneReward(level);
    } else {
      $("status").textContent = `Level up! You reached level ${result.level}.`;
    }
  }
  return result;
}

function devForceLevelUp() {
  const result = forceLevelUp(state.exp);
  state.exp = result.totalExp;
  renderLevel();
  pulseLevelBadge(true);
  spawnLevelSparkles();
  const milestones = result.crossedLevels.filter((level) => isMilestoneLevel(level));
  if (milestones.length) {
    for (const level of milestones) grantMilestoneReward(level);
  } else {
    $("status").textContent = `Dev LOVE: jumped to level ${result.level}.`;
  }
  render();
  save();
  return result;
}

function render() {
  $("embers").textContent = format(state.embers);
  $("per-second").textContent = format(perSecond(state.owned, state.inventory));
  $("per-click").textContent = format(perClick(state.owned));
  $("owned-count").textContent = `${totalOwned(state.owned)} owned`;
  renderLevel();
  renderInventory();
  updateUpgradeButtons();
}

function gather(event) {
  playPress($("orchard-button"));
  const gain = perClick(state.owned);
  state.embers += gain;
  applyExp(CLICK_EXP);

  const bubble = document.createElement("span");
  bubble.className = "float";
  bubble.textContent = `+${format(gain)}`;
  bubble.style.left = `${event.clientX - 12}px`;
  bubble.style.top = `${event.clientY - 10}px`;
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 750);

  const xpBubble = document.createElement("span");
  xpBubble.className = "float float-xp";
  xpBubble.textContent = `+${CLICK_EXP} XP`;
  xpBubble.style.left = `${event.clientX + 10}px`;
  xpBubble.style.top = `${event.clientY + 8}px`;
  document.body.appendChild(xpBubble);
  setTimeout(() => xpBubble.remove(), 750);

  render();
  save();
}

function playPress(button) {
  button.classList.remove("is-pressed");
  void button.offsetWidth;
  button.classList.add("is-pressed");
  window.setTimeout(() => button.classList.remove("is-pressed"), 120);
}

const CONFETTI_COLORS = [
  "#ec6a3a",
  "#f5b0a9",
  "#34695e",
  "#f0c14a",
  "#6b8fd4",
  "#c45ad4",
  "#ff8fab",
  "#2db7a0",
  "#ffd166",
  "#ef476f",
];

const CONFETTI_SHAPES = ["", "is-circle", "is-strip", "is-diamond"];

function burstConfetti(originX, originY) {
  const count = 28;
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    const shape = CONFETTI_SHAPES[i % CONFETTI_SHAPES.length];
    piece.className = shape ? `confetti ${shape}` : "confetti";
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.setProperty("--color", CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    piece.style.setProperty("--size", `${5 + (i % 5) * 2}px`);

    const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7 + (i / count - 0.5) * 0.9;
    const speed = 70 + Math.random() * 120;
    const dx = Math.cos(angle) * speed * (0.55 + Math.random() * 0.7);
    const dy = Math.sin(angle) * speed - (40 + Math.random() * 50);
    const spin = `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 420)}deg`;
    const duration = 0.75 + Math.random() * 0.55;

    piece.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    piece.style.setProperty("--dy", `${(dy + 90 + Math.random() * 70).toFixed(1)}px`);
    piece.style.setProperty("--spin", spin);
    piece.style.setProperty("--duration", `${duration.toFixed(2)}s`);
    piece.style.setProperty("--end-scale", `${(0.55 + Math.random() * 0.5).toFixed(2)}`);

    document.body.appendChild(piece);
    window.setTimeout(() => piece.remove(), duration * 1000 + 40);
  }
}

function celebratePurchase(button, upgrade, originX, originY) {
  playPress(button);
  button.classList.remove("celebrate");
  void button.offsetWidth;
  button.classList.add("celebrate");
  window.setTimeout(() => button.classList.remove("celebrate"), 560);

  const stats = document.querySelector(".stats-board");
  if (stats) {
    stats.classList.remove("celebrate");
    void stats.offsetWidth;
    stats.classList.add("celebrate");
    window.setTimeout(() => stats.classList.remove("celebrate"), 560);
  }

  const status = $("status");
  status.classList.remove("is-celebrating");
  void status.offsetWidth;
  status.classList.add("is-celebrating");
  window.setTimeout(() => status.classList.remove("is-celebrating"), 700);

  const rect = button.getBoundingClientRect();
  const x = Number.isFinite(originX) ? originX : rect.left + rect.width / 2;
  const y = Number.isFinite(originY) ? originY : rect.top + rect.height / 2;
  burstConfetti(x, y);
}

function purchase(upgradeId, button, originX, originY) {
  const result = buyUpgrade(state, upgradeId, { level: playerLevel() });
  if (!result.ok) return false;
  state.embers = result.state.embers;
  state.owned = result.state.owned;
  const expResult = applyExp(result.expGained || BUY_EXP);
  if (!expResult.leveledUp) {
    if (result.upgrade.mult) {
      $("status").textContent = `${result.upgrade.name} doubles every ticket! (+${BUY_EXP} XP)`;
    } else {
      $("status").textContent = `${result.upgrade.name} joined the booth. (+${BUY_EXP} XP)`;
    }
  }
  if (button) celebratePurchase(button, result.upgrade, originX, originY);
  render();
  save();
  return true;
}

$("orchard-button").addEventListener("click", gather);

$("upgrades").addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button || button.disabled) return;
  playPress(button);
});

$("upgrades").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button || button.disabled) return;
  purchase(button.dataset.id, button, event.clientX, event.clientY);
});

function mountInventory() {
  const grid = $("satchel-grid");
  if (!grid) return;
  grid.replaceChildren();
  for (let i = 0; i < INVENTORY_SIZE; i += 1) {
    const slot = document.createElement("div");
    slot.className = "satchel-slot is-empty";
    slot.dataset.index = String(i);
    slot.setAttribute("role", "listitem");
    slot.innerHTML = `
      <span class="satchel-slot-index">${i + 1}</span>
      <span class="satchel-slot-empty">·</span>
      <span class="satchel-slot-item" hidden></span>
      <span class="satchel-slot-qty" hidden></span>
    `;
    grid.append(slot);
  }
}

function renderInventory() {
  const used = inventoryUsed(state.inventory);
  if ($("satchel-count")) $("satchel-count").textContent = `${used}/${INVENTORY_SIZE}`;
  if ($("satchel-capacity")) $("satchel-capacity").textContent = `${used} / ${INVENTORY_SIZE}`;

  const grid = $("satchel-grid");
  if (!grid) return;
  for (let i = 0; i < INVENTORY_SIZE; i += 1) {
    const slot = grid.querySelector(`[data-index="${i}"]`);
    if (!slot) continue;
    const item = state.inventory[i];
    const emptyMark = slot.querySelector(".satchel-slot-empty");
    const itemMark = slot.querySelector(".satchel-slot-item");
    const qtyMark = slot.querySelector(".satchel-slot-qty");
    if (item == null) {
      slot.classList.add("is-empty");
      slot.classList.remove("is-filled");
      slot.title = `Empty pocket ${i + 1}`;
      if (emptyMark) emptyMark.hidden = false;
      if (itemMark) {
        itemMark.hidden = true;
        itemMark.textContent = "";
      }
      if (qtyMark) {
        qtyMark.hidden = true;
        qtyMark.textContent = "";
      }
    } else {
      slot.classList.remove("is-empty");
      slot.classList.add("is-filled");
      slot.title = `${item.name}${item.qty > 1 ? ` ×${item.qty}` : ""}`;
      if (emptyMark) emptyMark.hidden = true;
      if (itemMark) {
        itemMark.hidden = false;
        itemMark.textContent = item.icon || "•";
      }
      if (qtyMark) {
        const showQty = item.qty > 1;
        qtyMark.hidden = !showQty;
        qtyMark.textContent = showQty ? `×${item.qty}` : "";
      }
    }
  }
}

function isSatchelOpen() {
  const overlay = $("satchel-overlay");
  return overlay && !overlay.hasAttribute("hidden");
}

function openSatchel() {
  const overlay = $("satchel-overlay");
  const button = $("satchel-button");
  if (!overlay) return;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  if (button) button.setAttribute("aria-expanded", "true");
  document.body.classList.add("satchel-open");
  renderInventory();
}

function closeSatchel() {
  const overlay = $("satchel-overlay");
  const button = $("satchel-button");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  if (button) button.setAttribute("aria-expanded", "false");
  document.body.classList.remove("satchel-open");
  window.setTimeout(() => {
    if (!overlay.classList.contains("is-open")) overlay.hidden = true;
  }, 220);
}

function toggleSatchel() {
  if (isSatchelOpen()) closeSatchel();
  else openSatchel();
}

$("satchel-button").addEventListener("click", (event) => {
  event.stopPropagation();
  toggleSatchel();
});

$("satchel-close").addEventListener("click", () => closeSatchel());

$("satchel-overlay").addEventListener("click", (event) => {
  if (event.target === $("satchel-overlay")) closeSatchel();
});

// Dev shortcut: type L-O-V-E to force one level-up. Temporary.
let loveBuffer = "";
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isSatchelOpen()) {
    closeSatchel();
    return;
  }

  const tag = (event.target && event.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;
  if (!event.key || event.key.length !== 1) return;

  loveBuffer = (loveBuffer + event.key.toUpperCase()).slice(-4);
  if (loveBuffer === "LOVE") {
    loveBuffer = "";
    devForceLevelUp();
  }
});

$("reset-button").addEventListener("click", () => {
  if (!confirm("Reset all ticket booth progress?")) return;
  state.embers = 0;
  state.owned = {};
  state.exp = 0;
  state.inventory = normalizeInventory([]);
  $("status").textContent = "A fresh booth awaits.";
  for (const slot of $("upgrades").querySelectorAll(".upgrade-slot")) {
    slot.classList.remove("is-open", "is-opening");
    slot.classList.add("is-locked", "is-curtained");
    delete slot.dataset.seenOpen;
    slot.dataset.ready = "1";
  }
  closeSatchel();
  render();
  save();
});

// Passive income: update numbers in place. Do NOT rebuild upgrade button DOM.
setInterval(() => {
  const cps = perSecond(state.owned, state.inventory);
  if (cps > 0) state.embers += cps / 10;
  render();
}, 100);

setInterval(save, 5000);
mountUpgrades();
mountInventory();
render();
