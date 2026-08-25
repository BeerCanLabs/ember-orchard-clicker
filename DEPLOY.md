# Deploying Ticket Booth (game on GitHub Pages + backend on Render)

The game (HTML/CSS/JS) is hosted **free on GitHub Pages** — you just refresh
the page. Accounts and the leaderboard need a small server, which GitHub Pages
can't run, so the backend lives on a **free Render service**. The game on Pages
talks to the backend on Render.

You do this **once**. After that, code changes auto-publish on merge.

---

## Part A — Deploy the backend to Render (free)

1. Go to **https://render.com** and sign up (free — you can use "Sign in with
   GitHub").
2. Click **New +** → **Blueprint**.
3. Choose the **`ember-orchard-clicker`** repo. Render finds `render.yaml`
   automatically.
4. Click **Apply**. Render creates a web service + a 1 GB persistent disk (so
   accounts survive restarts). No build step, no dependencies.
5. When it finishes, copy the service URL from the top of the page. It looks
   like:  `https://ticket-booth.onrender.com`

> Free Render services sleep after ~15 min idle and take ~30 s to wake on the
> next request. That's fine for a small game — the first login after a nap is
> just a little slow.

---

## Part B — Point the game at your backend

1. Open **`config.js`** and set the URL you copied:

   ```js
   window.TICKET_BOOTH_API = "https://ticket-booth.onrender.com";
   ```

2. Commit and push that change (or ask Switch to do it — just paste the URL).

3. If your GitHub Pages URL is **not** `https://bestdax.github.io`, also update
   `ALLOWED_ORIGINS` in `render.yaml` to match, and re-apply the blueprint.

---

## Part C — Publish the game on GitHub Pages

If Pages is already serving `https://bestdax.github.io/ember-orchard-clicker/`,
you only need to make sure it publishes from the branch that has this code.

1. GitHub repo → **Settings** → **Pages**.
2. Under **Build and deployment** → **Source: Deploy from a branch**.
3. Branch: **`main`**, folder: **`/ (root)`**. Save.
4. After this PR is merged into `main`, Pages redeploys in ~1 minute. Refresh
   the page and the accounts/leaderboard UI is live.

---

## How to verify it worked

1. Open `https://bestdax.github.io/ember-orchard-clicker/`.
2. Click **Log in** → **Create account**. If it succeeds, the backend is wired
   up correctly.
3. Prestige once, then check the **Leaderboard** — you should appear.
4. Open the site on your phone, log in with the same account → your save loads.
   That confirms cross-device accounts work.

If login says the leaderboard is "offline", `config.js` isn't pointing at the
right URL, or the Render service is still waking up — wait 30 s and retry.

---

## Local development (unchanged)

`npm start` still runs everything locally at `http://localhost:3000` with
`config.js` left as `""` (same-origin). No Render needed for local play.
