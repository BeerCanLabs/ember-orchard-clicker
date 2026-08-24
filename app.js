const { upgrades, price, perSecond, perClick, buyUpgrade } = window.GameCore;

const saved = JSON.parse(localStorage.getItem("ember-orchard-save") || "{}");
const state = {
  embers: Number(saved.embers) || 0,
  owned: saved.owned && typeof saved.owned === "object" ? saved.owned : {},
};

const $ = (id) => document.getElementById(id);
const format = (number) => Math.floor(number).toLocaleString();

function save() {
  localStorage.setItem(
    "ember-orchard-save",
    JSON.stringify({ embers: state.embers, owned: state.owned })
  );
}

/** Build upgrade buttons once — never replace them on the passive tick. */
function mountUpgrades() {
  const list = $("upgrades");
  list.replaceChildren();
  for (const upgrade of upgrades) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade";
    button.dataset.id = upgrade.id;

    const icon = document.createElement("span");
    icon.className = "upgrade-icon";
    icon.textContent = upgrade.icon;

    const body = document.createElement("span");
    const title = document.createElement("strong");
    title.dataset.role = "title";
    const note = document.createElement("small");
    note.textContent = upgrade.note;
    body.append(title, note);

    const cost = document.createElement("span");
    cost.className = "cost";
    cost.dataset.role = "cost";

    button.append(icon, body, cost);
    list.append(button);
  }
}

function updateUpgradeButtons() {
  for (const upgrade of upgrades) {
    const button = $("upgrades").querySelector(`button[data-id="${upgrade.id}"]`);
    if (!button) continue;
    const cost = price(upgrade, state.owned);
    const owned = state.owned[upgrade.id] || 0;
    button.disabled = state.embers < cost;
    button.querySelector('[data-role="title"]').textContent = owned
      ? `${upgrade.name} ×${owned}`
      : upgrade.name;
    button.querySelector('[data-role="cost"]').textContent = `${format(cost)} ✹`;
  }
}

function render() {
  $("embers").textContent = format(state.embers);
  $("per-second").textContent = format(perSecond(state.owned));
  $("per-click").textContent = format(perClick(state.owned));
  $("owned-count").textContent = `${Object.values(state.owned).reduce((a, b) => a + b, 0)} owned`;
  updateUpgradeButtons();
}

function gather(event) {
  const gain = perClick(state.owned);
  state.embers += gain;
  const bubble = document.createElement("span");
  bubble.className = "float";
  bubble.textContent = `+${format(gain)}`;
  bubble.style.left = `${event.clientX - 12}px`;
  bubble.style.top = `${event.clientY - 10}px`;
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 750);
  render();
  save();
}

function playPress(button) {
  button.classList.remove("is-pressed");
  // Force reflow so rapid clicks retrigger the press class cleanly.
  void button.offsetWidth;
  button.classList.add("is-pressed");
  window.setTimeout(() => button.classList.remove("is-pressed"), 120);
}

function burstSparks(button, glyph) {
  const rect = button.getBoundingClientRect();
  const originX = rect.left + rect.width * 0.22;
  const originY = rect.top + rect.height * 0.5;
  const marks = [glyph, "✹", "✦", "·", glyph];
  for (let i = 0; i < marks.length; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.textContent = marks[i];
    const angle = (-70 + i * 35) * (Math.PI / 180);
    const distance = 28 + (i % 3) * 14;
    spark.style.left = `${originX}px`;
    spark.style.top = `${originY}px`;
    spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * distance - 18}px`);
    spark.style.setProperty("--spin", `${i % 2 === 0 ? 18 : -22}deg`);
    document.body.appendChild(spark);
    window.setTimeout(() => spark.remove(), 750);
  }
}

function celebratePurchase(button, upgrade) {
  playPress(button);
  button.classList.remove("celebrate");
  void button.offsetWidth;
  button.classList.add("celebrate");
  window.setTimeout(() => button.classList.remove("celebrate"), 560);

  const stats = document.querySelector(".stats");
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

  burstSparks(button, upgrade.icon);
}

function purchase(upgradeId, button) {
  const result = buyUpgrade(state, upgradeId);
  if (!result.ok) return false;
  state.embers = result.state.embers;
  state.owned = result.state.owned;
  $("status").textContent = `${result.upgrade.name} joined your orchard.`;
  if (button) celebratePurchase(button, result.upgrade);
  render();
  save();
  return true;
}

$("orchard-button").addEventListener("click", gather);

// Stable delegated handler on a container whose children are not destroyed each tick.
$("upgrades").addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button || button.disabled) return;
  playPress(button);
});

$("upgrades").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button || button.disabled) return;
  purchase(button.dataset.id, button);
});

$("reset-button").addEventListener("click", () => {
  if (!confirm("Reset all orchard progress?")) return;
  state.embers = 0;
  state.owned = {};
  $("status").textContent = "A fresh orchard awaits.";
  render();
  save();
});

// Passive income: update numbers in place. Do NOT rebuild upgrade button DOM.
setInterval(() => {
  const cps = perSecond(state.owned);
  if (cps > 0) state.embers += cps / 10;
  render();
}, 100);

setInterval(save, 5000);
mountUpgrades();
render();
