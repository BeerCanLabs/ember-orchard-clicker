// Ticket Booth — account, cloud-save sync, and leaderboard client.
//
// Talks to the JSON API in server.js. Everything degrades gracefully: if the
// server is unreachable (e.g. the game was opened as a bare file), the game
// still runs on localStorage alone and simply shows an "offline" note.

(function () {
  const TOKEN_KEY = "ticket-booth-token";
  const NAME_KEY = "ticket-booth-username";

  const $ = (id) => document.getElementById(id);

  let token = localStorage.getItem(TOKEN_KEY) || null;
  let username = localStorage.getItem(NAME_KEY) || null;
  let saveTimer = null;

  // ── API helpers ──────────────────────────────────────────────────────────
  async function api(path, { method = "GET", body, auth = false } = {}) {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (auth && token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status}).`);
    }
    return data;
  }

  function setSession(newToken, newName) {
    token = newToken;
    username = newName;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(NAME_KEY, username);
  }

  function clearSession() {
    token = null;
    username = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
  }

  // ── Cloud save sync ────────────────────────────────────────────────────────
  // app.js calls this on every local save; we debounce a push to the cloud.
  window.TicketBoothSync = {
    onLocalSave(payload) {
      if (!token) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        api("/api/save", { method: "POST", body: { save: payload }, auth: true }).catch(
          () => {
            /* offline or expired — keep playing on localStorage */
          }
        );
      }, 1500);
    },
  };

  // ── UI: status pill + auth panel ──────────────────────────────────────────
  function setAccountLabel() {
    const label = $("account-name");
    const loginBtn = $("open-auth");
    const logoutBtn = $("logout-button");
    if (username) {
      if (label) label.textContent = username;
      if (loginBtn) loginBtn.hidden = true;
      if (logoutBtn) logoutBtn.hidden = false;
    } else {
      if (label) label.textContent = "Guest";
      if (loginBtn) loginBtn.hidden = false;
      if (logoutBtn) logoutBtn.hidden = true;
    }
  }

  function openAuth() {
    const overlay = $("auth-overlay");
    if (!overlay) return;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    setAuthError("");
    const field = $("auth-username");
    if (field) field.focus();
  }

  function closeAuth() {
    const overlay = $("auth-overlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    setTimeout(() => {
      if (!overlay.classList.contains("is-open")) overlay.hidden = true;
    }, 220);
  }

  function setAuthError(message) {
    const el = $("auth-error");
    if (el) el.textContent = message || "";
  }

  function setAuthBusy(busy) {
    for (const id of ["auth-login", "auth-register"]) {
      const btn = $(id);
      if (btn) btn.disabled = busy;
    }
  }

  // ── The "continue vs new" choice after logging in with an existing save ────
  function askContinueOrNew() {
    return new Promise((resolve) => {
      const overlay = $("choice-overlay");
      if (!overlay) return resolve("continue");
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("is-open"));

      const finish = (choice) => {
        overlay.classList.remove("is-open");
        setTimeout(() => {
          if (!overlay.classList.contains("is-open")) overlay.hidden = true;
        }, 220);
        $("choice-continue").onclick = null;
        $("choice-new").onclick = null;
        resolve(choice);
      };
      $("choice-continue").onclick = () => finish("continue");
      $("choice-new").onclick = () => finish("new");
    });
  }

  async function afterLogin(result) {
    setSession(result.token, result.username);
    setAccountLabel();
    closeAuth();

    if (result.hasSave) {
      const choice = await askContinueOrNew();
      if (choice === "continue") {
        try {
          const loaded = await api("/api/save", { auth: true });
          window.TicketBoothGame.applyCloudSave(loaded.save);
        } catch {
          setStatus("Couldn't load your cloud save — playing locally.");
        }
      } else {
        window.TicketBoothGame.startFreshRun();
        // Push the fresh run up so "continue" next time reflects it.
        pushNow();
      }
    } else {
      // Brand-new account: upload whatever's on screen so it's banked.
      pushNow();
    }
    refreshLeaderboard();
  }

  function pushNow() {
    if (!token || !window.TicketBoothGame) return;
    api("/api/save", {
      method: "POST",
      body: { save: window.TicketBoothGame.snapshot() },
      auth: true,
    }).catch(() => {});
  }

  function setStatus(message) {
    const el = $("status");
    if (el) el.textContent = message;
  }

  async function handleRegister() {
    setAuthError("");
    setAuthBusy(true);
    try {
      const result = await api("/api/register", {
        method: "POST",
        body: { username: $("auth-username").value, password: $("auth-password").value },
      });
      await afterLogin(result);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogin() {
    setAuthError("");
    setAuthBusy(true);
    try {
      const result = await api("/api/login", {
        method: "POST",
        body: { username: $("auth-username").value, password: $("auth-password").value },
      });
      await afterLogin(result);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await api("/api/logout", { method: "POST", auth: true });
    } catch {
      /* ignore */
    }
    clearSession();
    setAccountLabel();
    setStatus("Logged out. Your progress is still saved in this browser.");
    refreshLeaderboard();
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  async function refreshLeaderboard() {
    const list = $("leaderboard-list");
    const empty = $("leaderboard-empty");
    if (!list) return;
    try {
      const data = await api("/api/leaderboard");
      const entries = data.entries || [];
      list.replaceChildren();
      if (!entries.length) {
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      entries.forEach((entry, index) => {
        const row = document.createElement("li");
        row.className = "leaderboard-row";
        if (username && entry.username === username) row.classList.add("is-you");
        row.innerHTML = `
          <span class="leaderboard-rank">${index + 1}</span>
          <span class="leaderboard-name">${escapeHtml(entry.username)}</span>
          <span class="leaderboard-prestige">${formatNumber(entry.prestigeCount)}</span>
          <span class="leaderboard-tickets">${formatNumber(entry.lifetimeEmbers)}</span>
        `;
        list.append(row);
      });
    } catch {
      // Offline: leave a gentle note, don't nag.
      list.replaceChildren();
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Leaderboard is offline (start the server to compete).";
      }
    }
  }

  function formatNumber(value) {
    return Math.floor(Number(value) || 0).toLocaleString();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  // ── Wire up ────────────────────────────────────────────────────────────────
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(() => {
    setAccountLabel();

    if ($("open-auth")) $("open-auth").addEventListener("click", openAuth);
    if ($("auth-close")) $("auth-close").addEventListener("click", closeAuth);
    if ($("auth-overlay")) {
      $("auth-overlay").addEventListener("click", (event) => {
        if (event.target === $("auth-overlay")) closeAuth();
      });
    }
    if ($("auth-login")) $("auth-login").addEventListener("click", handleLogin);
    if ($("auth-register")) $("auth-register").addEventListener("click", handleRegister);
    if ($("logout-button")) $("logout-button").addEventListener("click", handleLogout);
    if ($("refresh-leaderboard")) {
      $("refresh-leaderboard").addEventListener("click", refreshLeaderboard);
    }

    // Submit auth form on Enter.
    const form = $("auth-form");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        handleLogin();
      });
    }

    // If we already have a token, verify it and pull the latest cloud save
    // in the background (silent — no continue/new prompt on a page reload).
    if (token) {
      api("/api/save", { auth: true })
        .then((loaded) => {
          if (loaded.save) window.TicketBoothGame.applyCloudSave(loaded.save);
        })
        .catch(() => {
          /* token expired or offline; keep local play */
        });
    }

    refreshLeaderboard();
    // Refresh the board periodically so standings stay live-ish.
    setInterval(refreshLeaderboard, 30000);
  });
})();
