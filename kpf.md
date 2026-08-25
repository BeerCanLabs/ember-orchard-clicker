# Key Product Functionality (KPF)

Each KPF below is a user-visible promise. Its automated test must continue to pass on every commit.

| KPF | Expected behavior | Automated coverage |
| --- | --- | --- |
| Claiming | Selecting **claim** earns tickets; the starting rate is one ticket per selection. | `claiming begins at one ticket per click` |
| First shop price | The first Ticket clerk costs **25** tickets. | `ticket clerk is the first shop entry and costs 25` |
| Shop order | Shop lists Ticket clerk → Season pass → Queue runners → Box office → Double feature. | `shop order ends with double feature after box office` |
| Passive progress | Ticket clerks add tickets every second. | `buying ticket clerks produces passive tickets` |
| Click progression | Season passes increase tickets earned per claim. | `season passes improve claim power` |
| Economy progression | Buying an upgrade raises its next price. | `upgrade prices increase with ownership` |
| Shop prices | Base prices are clerk 25, pass 112, runners 450, box office 2375. | `base shop prices are half of the prior elevated tier` |
| Upgrade integrity | Every upgrade is uniquely addressable by the game. | `each upgrade has a unique identifier` |
| Reliable purchases | An affordable upgrade click always spends tickets and grants ownership; unaffordable or unknown ids never mutate state. | `affordable upgrade purchases succeed and spend tickets`, `unaffordable upgrade purchases are rejected without mutation`, `unknown upgrade ids never alter state` |
| Rapid purchase consistency | Repeated upgrade clicks while funded apply in sequence without lost or double-spent purchases. | `rapid successive purchases remain consistent` |
| Ownership cap | Standard upgrades can be bought at most **50** times; further buys are rejected as maxed. | `standard upgrades can be owned at most 50 times`, `ownership just under the cap can still buy once` |
| Double feature | Costs **100,000**, unlocks at **player level 10**, purchasable once, doubles all earnings. | `double feature costs 100000 and can only be bought once`, `double feature stays locked until player reaches level 10`, `double feature doubles claim and passive earnings` |
| Experience | Manual **claim** grants **1 XP**; buying an upgrade grants **10 XP**. | `manual claims grant 1 exp and purchases grant 10 exp` |
| Leveling | Accumulated XP raises player level; the top-left ring shows progress to the next level. | `enough exp increases player level` |
| Force level | Completing the current XP bar raises exactly one level. | `force level up completes exactly one level` |
| Satchel inventory | Player has a satchel with **25** pockets; items stack to **4** per pocket. | `satchel inventory holds 25 slots and stacks items to four` |
| Iron Helmet | Owning at least one Iron Helmet grants **+10% tickets/sec**; extra helmets do not stack the bonus. | `iron helmet grants a non-stacking 10 percent passive bonus` |
| Milestone loot | Every **5** levels is a milestone; loot rolls Dice/Cards/Pictures often and Iron Helmet rarely. | `milestone levels are every five and item rolls include rare helmet` |
| Prestige | Costs **200,000** tickets; resets tickets, upgrades, level/XP, and satchel items; awards **+1 magic point** (magic has no effect yet). | `prestige costs 200000 and awards one magic point while wiping the run` |
| Lifetime tickets | Tickets earned add to a **lifetime total that never resets** (not even on prestige). | `prestige increments the prestige count and preserves lifetime tickets` |
| Prestige count | Each prestige increases the player's **prestige count by exactly one**. | `prestige increments the prestige count and preserves lifetime tickets`, `prestige from a save with no leaderboard counters starts them at safe defaults` |
| Accounts | Players can **create an account** and **log in** to reload a previous cloud save or start a new run. Passwords are hashed, never stored in plaintext. | `passwords are hashed, never stored in plaintext`, `credential validation enforces username and password rules`, `register then login round-trips and rejects duplicates/bad passwords` |
| Cloud save | A logged-in player's save is stored server-side and **survives updates** — logging back in restores it. | `a save can be stored and reloaded, surviving a fresh login`, `save/load require a valid session token` |
| Leaderboard | A small leaderboard ranks players by **prestige count**, then **total lifetime tickets**. It exposes only those two public counters. | `ranks by prestige count first, then lifetime tickets`, `reflects only the two public counters and honors the limit` |

## Test command

Run `npm test`. It uses Node's built-in test runner and does not download dependencies.

## UI note (upgrade click reliability)

The shop must **not** destroy/recreate upgrade buttons on the passive income tick. Buttons are mounted once and updated in place so clicks are never dropped mid-interaction.

## UI note (double feature reveal)

**Double feature** stays behind closed movie curtains until the player reaches **level 10**. Crossing that threshold plays a curtain-opening reveal (~2.8s; skipped when `prefers-reduced-motion` is set).

## UI note (level badge)

Player level is shown as a fixed circle in the **top-left**, with a ring filling toward the next level. Level-ups sparkle; every 5th level plays a unique milestone FX and grants a random satchel item.

## UI note (prestige)

A prestige bar under the stats board spends **200,000** tickets to wipe the current run and bank **+1 magic point**. Magic points are shown in the stats board and currently do nothing.

## UI note (accounts & leaderboard)

- An **account pill** in the header shows the current player (or "Guest") with a Log in / Log out control.
- Logging in when a cloud save exists prompts **Continue my save** vs **Start new**. On a page reload the latest cloud save is restored silently (no prompt).
- A **Leaderboard** section below the status line ranks players by **prestige count**, then **lifetime tickets**. The current player's row is highlighted. It refreshes on demand and every 30s.
- Accounts, cloud saves, and the leaderboard require the game to be served by `npm start` (the Node server). Opening `index.html` as a bare file still works — it falls back to local-only play and shows the leaderboard as "offline".

## Server / storage note

`server.js` serves the static game **and** a small JSON API (`/api/register`, `/api/login`, `/api/logout`, `/api/save`, `/api/leaderboard`). Accounts persist to `data/accounts.json` (gitignored). Passwords are hashed with Node's built-in `crypto.scrypt` (salt:hash), never stored in plaintext. No third-party dependencies or `npm install` required.

## Dev note (temporary)

Typing **LOVE** anywhere (outside text fields) forces exactly one level-up. Remove when asked.
