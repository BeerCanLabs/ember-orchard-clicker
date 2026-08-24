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

function purchase(upgradeId) {
  const result = buyUpgrade(state, upgradeId);
  if (!result.ok) return false;
  state.embers = result.state.embers;
  state.owned = result.state.owned;
  $("status").textContent = `${result.upgrade.name} joined your orchard.`;
  render();
  save();
  return true;
}

$("orchard-button").addEventListener("click", gather);

// Stable delegated handler on a container whose children are not destroyed each tick.
$("upgrades").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button || button.disabled) return;
  purchase(button.dataset.id);
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
