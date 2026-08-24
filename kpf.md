# Key Product Functionality (KPF)

Each KPF below is a user-visible promise. Its automated test must continue to pass on every commit.

| KPF | Expected behavior | Automated coverage |
| --- | --- | --- |
| Claiming | Selecting **claim** earns tickets; the starting rate is one ticket per selection. | `claiming begins at one ticket per click` |
| First shop price | The first Ticket clerk costs **50** tickets. | `ticket clerk is the first shop entry and costs 50` |
| Shop order | Shop lists Ticket clerk → Season pass → Queue runners → Box office → Double feature. | `shop order ends with double feature after box office` |
| Passive progress | Ticket clerks add tickets every second. | `buying ticket clerks produces passive tickets` |
| Click progression | Season passes increase tickets earned per claim. | `season passes improve claim power` |
| Economy progression | Buying an upgrade raises its next price. | `upgrade prices increase with ownership` |
| Shop prices | Base prices are clerk 50, pass 225, runners 900, box office 4750. | `base shop prices are half of the prior elevated tier` |
| Upgrade integrity | Every upgrade is uniquely addressable by the game. | `each upgrade has a unique identifier` |
| Reliable purchases | An affordable upgrade click always spends tickets and grants ownership; unaffordable or unknown ids never mutate state. | `affordable upgrade purchases succeed and spend tickets`, `unaffordable upgrade purchases are rejected without mutation`, `unknown upgrade ids never alter state` |
| Rapid purchase consistency | Repeated upgrade clicks while funded apply in sequence without lost or double-spent purchases. | `rapid successive purchases remain consistent` |
| Ownership cap | Standard upgrades can be bought at most **50** times; further buys are rejected as maxed. | `standard upgrades can be owned at most 50 times`, `ownership just under the cap can still buy once` |
| Double feature | Costs **50,000**, unlocks after **20** total upgrades owned, purchasable once, doubles all earnings. | `double feature costs 50000 and can only be bought once`, `double feature stays locked until 20 total upgrades are owned`, `double feature doubles claim and passive earnings` |

## Test command

Run `npm test`. It uses Node's built-in test runner and does not download dependencies.

## UI note (upgrade click reliability)

The shop must **not** destroy/recreate upgrade buttons on the passive income tick. Buttons are mounted once and updated in place so clicks are never dropped mid-interaction.

## UI note (double feature reveal)

**Double feature** stays behind closed movie curtains until 20 upgrades are owned. Crossing that threshold plays a curtain-opening reveal (skipped when `prefers-reduced-motion` is set).
