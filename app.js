const upgrades = [
  { id: "lantern", icon: "◉", name: "Lantern keeper", note: "+1 ember / second", baseCost: 15, cps: 1 },
  { id: "moth", icon: "♢", name: "Glow moths", note: "+5 embers / second", baseCost: 80, cps: 5 },
  { id: "roots", icon: "♧", name: "Deep roots", note: "+1 ember / click", baseCost: 45, click: 1 },
  { id: "grove", icon: "✤", name: "Sunken grove", note: "+25 embers / second", baseCost: 420, cps: 25 },
];

const saved = JSON.parse(localStorage.getItem("ember-orchard-save") || "{}");
const state = { embers: saved.embers || 0, owned: saved.owned || {}, lastSaved: Date.now() };
const $ = (id) => document.getElementById(id);
const format = (number) => Math.floor(number).toLocaleString();
const price = (upgrade) => Math.ceil(upgrade.baseCost * Math.pow(1.16, state.owned[upgrade.id] || 0));
const perSecond = () => upgrades.reduce((sum, u) => sum + (u.cps || 0) * (state.owned[u.id] || 0), 0);
const perClick = () => 1 + upgrades.reduce((sum, u) => sum + (u.click || 0) * (state.owned[u.id] || 0), 0);

function save() { localStorage.setItem("ember-orchard-save", JSON.stringify(state)); }
function render() {
  $("embers").textContent = format(state.embers);
  $("per-second").textContent = format(perSecond());
  $("per-click").textContent = format(perClick());
  $("owned-count").textContent = `${Object.values(state.owned).reduce((a,b) => a+b,0)} owned`;
  $("upgrades").innerHTML = upgrades.map(u => {
    const cost = price(u), count = state.owned[u.id] || 0;
    return `<button class="upgrade" data-id="${u.id}" ${state.embers < cost ? "disabled" : ""}><span class="upgrade-icon">${u.icon}</span><span><strong>${u.name}${count ? ` ×${count}` : ""}</strong><small>${u.note}</small></span><span class="cost">${format(cost)} ✹</span></button>`;
  }).join("");
}
function gather(event) {
  state.embers += perClick();
  const bubble = document.createElement("span"); bubble.className = "float"; bubble.textContent = `+${format(perClick())}`; bubble.style.left = `${event.clientX - 12}px`; bubble.style.top = `${event.clientY - 10}px`; document.body.appendChild(bubble); setTimeout(() => bubble.remove(), 750);
  render(); save();
}
$("orchard-button").addEventListener("click", gather);
$("upgrades").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]"); if (!button) return;
  const upgrade = upgrades.find(u => u.id === button.dataset.id), cost = price(upgrade);
  if (state.embers < cost) return;
  state.embers -= cost; state.owned[upgrade.id] = (state.owned[upgrade.id] || 0) + 1;
  $("status").textContent = `${upgrade.name} joined your orchard.`; render(); save();
});
$("reset-button").addEventListener("click", () => { if (confirm("Reset all orchard progress?")) { state.embers = 0; state.owned = {}; $("status").textContent = "A fresh orchard awaits."; render(); save(); } });
setInterval(() => { state.embers += perSecond() / 10; render(); }, 100);
setInterval(save, 5000); render();
