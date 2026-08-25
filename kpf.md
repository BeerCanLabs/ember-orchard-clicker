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
| Movie cost | Playing the default movie (matinee) costs **1,000** tickets. | `a movie costs 1000 tickets to play` |
| Movie peak | While playing, the matinee grants a flat **1,000 bonus tickets/sec for the first 15 seconds**. | `a playing movie grants a flat 1000 tickets/sec for the first 15 seconds` |
| Movie fade | After 15s the bonus **fades gradually** (progressively fewer tickets), hitting **0 at 60s** — half rate at the fade midpoint. | `after the peak window a movie gives progressively fewer tickets, reaching zero at 60s` |
| Movie length | A showing plays for about **one minute** (0–60s), then stops. | `a movie plays for about one minute then stops` |
| Two movies | There are **two features** to choose from: the **Matinee** (feature 1) and the pricier **Grand Premiere** (feature 2). | `there are two playable movies to choose from`, `the default movie is the matinee (feature 1) at 1000 cost / 1000 per sec` |
| Premiere trade-off | The **Grand Premiere costs more** than the Matinee but **pays more tickets/sec**, while running for the **same length**. | `movie 2 (premiere) costs more than movie 1 but pays more per second`, `premiere pays its higher flat rate during the peak, then fades to zero the same way`, `both movies run for exactly the same length (about one minute)` |

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

A fixed **3D movie projector** (built entirely from CSS elements — no image assets) sits in the **bottom-right**: a metallic housing, lens barrel, power LED, two film reels, and a little stand. Clicking it opens a **"Pick a movie"** prompt listing **two features** — the **Matinee** (1,000 tickets, ~1,000/s) and the **Grand Premiere** (5,000 tickets, ~4,000/s). Choosing one spends its cost and starts a showing. When a movie plays the projector **turns on**: the lens glows, a light beam shoots out and flickers, the power LED lights green and blinks, and both reels spin. The button also shows the remaining time and current bonus rate, a "Now showing — <title>" banner appears, and the page gets a subtle projector flicker. Every movie pours in bonus tickets at its flat peak rate for 15s, then fades to 0 by 60s, after which it stops on its own. Both movies run for the **same length**; the pricier one just pays more per second. The playing state is **runtime-only** (not saved), so reloading mid-movie ends it rather than letting it be paused/resumed for exploit. All power-on animations respect `prefers-reduced-motion`.

## Dev note (temporary)

Typing **LOVE** anywhere (outside text fields) forces exactly one level-up. Remove when asked.
