# Key Product Functionality (KPF)

Each KPF below is a user-visible promise. Its automated test must continue to pass on every commit.

| KPF | Expected behavior | Automated coverage |
| --- | --- | --- |
| Claiming | Selecting **claim** earns tickets; the starting rate is one ticket per selection. | `claiming begins at one ticket per click` |
| First shop price | The first Ticket clerk costs **25** tickets. | `ticket clerk is the first shop entry and costs 25` |
| Shop order | Shop lists Ticket clerk → Season pass → Queue runners → Box office → Double feature → Movie projector. | `shop order ends with double feature then movie projector` |
| Passive progress | Ticket clerks add tickets every second. | `buying ticket clerks produces passive tickets` |
| Click progression | Season passes increase tickets earned per claim. | `season passes improve claim power` |
| Economy progression | Buying an upgrade raises its next price. | `upgrade prices increase with ownership` |
| Shop prices | Base prices are clerk 25, pass 112, runners 450, box office 2375. | `base shop prices are half of the prior elevated tier` |
| Upgrade integrity | Every upgrade is uniquely addressable by the game. | `each upgrade has a unique identifier` |
| Reliable purchases | An affordable upgrade click always spends tickets and grants ownership; unaffordable or unknown ids never mutate state. | `affordable upgrade purchases succeed and spend tickets`, `unaffordable upgrade purchases are rejected without mutation`, `unknown upgrade ids never alter state` |
| Rapid purchase consistency | Repeated upgrade clicks while funded apply in sequence without lost or double-spent purchases. | `rapid successive purchases remain consistent` |
| Ownership cap | Standard upgrades can be bought at most **50** times; further buys are rejected as maxed. | `standard upgrades can be owned at most 50 times`, `ownership just under the cap can still buy once` |
| Double feature | Costs **100,000**, unlocks at **player level 10**, purchasable once, doubles all earnings — **including movie ticket payouts**. | `double feature costs 100000 and can only be bought once`, `double feature stays locked until player reaches level 10`, `double feature doubles claim and passive earnings`, `movie payouts respect the earnings multiplier (Double feature doubles movie tickets)` |
| Movie projector | Bought by **clicking the projector button itself** (NOT a shop entry) for a **one-time 10,000 tickets**, available from **player level 15**; required before any movie can be played; it does **not** change ticket earnings. Once owned, the button opens the picker any time — **no ticket balance is needed just to look inside**. | `the movie projector is bought via buyProjector for 10000 tickets, once, at level 15`, `hasProjector reflects ownership`, `the projector does not change ticket earnings` |
| Movie income counts | While a movie plays, its bonus tickets/sec are **folded into the top "Per second" stat** (with the earnings multiplier applied). | `movie payouts respect the earnings multiplier (Double feature doubles movie tickets)` (unit) + browser smoke `per-second at top includes the movie bonus while playing` |
| Experience | Manual **claim** grants **1 XP**; buying an upgrade grants **10 XP**. | `manual claims grant 1 exp and purchases grant 10 exp` |
| Leveling | Accumulated XP raises player level; the top-left ring shows progress to the next level. | `enough exp increases player level` |
| Level curve | Levels **1–10 keep the original steep ramp**; from **level 10 onward the XP curve flattens** to an ordinary-upgrade (~1.16×) growth so high levels stay reachable. | `levels 1–10 keep the original steep exp curve`, `after level 10 the exp curve grows gently (ordinary-upgrade rate), not explosively` |
| Force level | Completing the current XP bar raises exactly one level. | `force level up completes exactly one level` |
| Satchel inventory | Player has a satchel with **25** pockets; items stack to **4** per pocket. | `satchel inventory holds 25 slots and stacks items to four` |
| Iron Helmet | Owning at least one Iron Helmet grants **+10% tickets/sec**; extra helmets do not stack the bonus. | `iron helmet grants a non-stacking 10 percent passive bonus` |
| Milestone loot | Every **5** levels is a milestone; loot rolls Dice/Cards/Pictures often and Iron Helmet rarely. | `milestone levels are every five and item rolls include rare helmet` |
| Prestige | Costs **200,000** tickets; resets tickets, upgrades, level/XP, and satchel items; awards **+1 magic point** (magic has no effect yet). | `prestige costs 200000 and awards one magic point while wiping the run` |
| Movie unlock | Movies require the **Movie projector** upgrade AND player **level 15** (matinee); the **Grand Premiere** stays locked until **level 20**. | `the matinee unlocks at level 15, the premiere at level 20` |
| Movie cost | Playing the default movie (matinee) costs **10,000** tickets (10× the previous price). | `a movie costs 10000 tickets to play (10× the old price)` |
| Movie peak | While playing, the matinee grants a flat **1,000 bonus tickets/sec for the first 15 seconds**. | `a playing movie grants a flat 1000 tickets/sec for the first 15 seconds` |
| Movie fade | After 15s the bonus **fades gradually** (progressively fewer tickets), hitting **0 at 60s** — half rate at the fade midpoint. | `after the peak window a movie gives progressively fewer tickets, reaching zero at 60s` |
| Movie length | A showing plays for about **one minute** (0–60s), then stops. | `a movie plays for about one minute then stops` |
| Two movies | There are **two features** to choose from: the **Matinee** (feature 1) and the pricier **Grand Premiere** (feature 2). | `there are two playable movies to choose from`, `the default movie is the matinee (feature 1) at 10000 cost / 1000 per sec` |
| Premiere trade-off | The **Grand Premiere costs 50,000** (10× the old price), more than the Matinee, but **pays more tickets/sec**, while running for the **same length**. | `movie 2 (premiere) costs more than movie 1 but pays more per second`, `the premiere (feature 2) costs 50000 tickets (10× the old price)`, `premiere pays its higher flat rate during the peak, then fades to zero the same way`, `both movies run for exactly the same length (about one minute)` |

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

## UI note (movie projector)

Before movies can be played the player must **buy the movie projector** — but it is **NOT a shop entry**. Instead, the bottom-right **projector button itself is the purchase point**: from **player level 15** it appears showing a **"BUY 10,000 🎟" chip** with a gentle invite pulse. Clicking it while unowned **buys the projector** (spends 10,000 tickets, grants XP) and immediately opens the picker. Below level 15 the button is **hidden**.

Once owned, the same fixed **retro-badge projector button** (flat design, built from an inline SVG glyph — no image assets) drops the BUY chip and becomes the **movie player**: click it any time to open the **"Pick a movie"** prompt — **you do NOT need any ticket balance just to look inside**. The prompt lists **two features** — the **Matinee** (10,000 tickets, ~1,000/s, **unlocks at level 15**) and the **Grand Premiere** (50,000 tickets, ~4,000/s, **unlocks at level 20**). A feature you haven't reached the level for shows a **🔒 dashed, locked card**; a feature you can't afford is shown but disabled. Choosing an unlocked, affordable one spends its cost and starts a showing.

While a movie plays its bonus tickets/sec are **folded into the top "Per second" stat** so you see the movie's real contribution to your rate, and the **Double feature ×2 multiplier applies to movie payouts too** (a matinee under Double feature pours ~2,000/s, not 1,000). The on-button rate badge shows this multiplied rate.

When a movie plays the badge **comes alive** with an upgraded power-on animation: both film reels **spin** with an easing wobble (take-up reel faster than the feed reel), each reel **hub glows** hotter, a **light beam** flickers out of the lens, a warm **projected light-cone** spills out to the left of the button, the whole pill emits a **breathing orange halo** and a tiny mechanical **jitter** as if the machine is running. The button also shows the remaining time and current bonus rate, a "Now showing — <title>" banner appears, and the page gets a subtle projector flicker. Every movie pours in bonus tickets at its flat peak rate for 15s, then fades to 0 by 60s, after which it stops on its own. Both movies run for the **same length**; the pricier one just pays more per second. The playing state is **runtime-only** (not saved), so reloading mid-movie ends it rather than letting it be paused/resumed for exploit. **Prestiging while a movie is playing stops the showing immediately.** All power-on animations respect `prefers-reduced-motion`.

## Dev note (temporary)

Typing **LOVE** anywhere (outside text fields) forces exactly one level-up. Remove when asked.
