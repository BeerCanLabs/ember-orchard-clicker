# Ticket Booth

An original, single-page incremental browser game. Claim tickets, staff the booth, and your progress saves automatically in your browser. Create an account to sync your save across updates and climb the leaderboard.

## 🚀 Run on your Mac (one click)

**Easiest way:**

1. Make sure you have [Node.js](https://nodejs.org/) installed (LTS recommended)
2. Open **Terminal** and run this single command:

```bash
git clone https://github.com/BestDax/ember-orchard-clicker.git && cd ember-orchard-clicker && npm start
```

The game will automatically open at `http://localhost:3000`.

---

### Other options

- **Windows**: Clone the repo then run `install.bat`
- **Double-click**: Open `index.html` in your browser (no server needed) — the game plays fine, but **accounts and the leaderboard need the server** (`npm start`). Without it, progress is local-only.
- **VS Code**: [![Open in VS Code](https://img.shields.io/badge/Open%20in-VS%20Code-blue?logo=visualstudiocode)](https://vscode.dev/github/BestDax/ember-orchard-clicker)

## Accounts & leaderboard

Run `npm start` (no `npm install` needed — zero dependencies) and open `http://localhost:3000`.

- **Create an account** from the header to save your booth server-side. After any update, log back in to **continue your previous save** or **start a new run**.
- The **leaderboard** ranks players by how many times they've prestiged, then by total lifetime tickets earned.
- Accounts persist to `data/accounts.json` (gitignored). Passwords are hashed with Node's built-in `crypto.scrypt` — never stored in plaintext.
- To let friends compete, deploy `server.js` to any Node host (Render, Fly.io, Railway) — no code changes required.

## Files

- `index.html` — the page structure
- `style.css` — visual design and responsive layout
- `app.js` — game logic and saved progress
- `game-core.js` — pure, testable game rules
- `accounts.js` — account/save/leaderboard store (hashing + JSON persistence)
- `server.js` — static file server + JSON API
