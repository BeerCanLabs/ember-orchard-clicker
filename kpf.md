# Key Product Functionality (KPF)

Each KPF below is a user-visible promise. Its automated test must continue to pass on every commit.

| KPF | Expected behavior | Automated coverage |
| --- | --- | --- |
| Claiming | Selecting **claim** earns tickets; the starting rate is one ticket per selection. | `claiming begins at one ticket per click` |
| First shop price | The first Ticket clerk costs **100** tickets. | `ticket clerk is the first shop entry and costs 100` |
| Shop order | Shop lists Ticket clerk → Season pass → Queue runners → Box office. | `shop order is clerk, season pass, queue runners, box office` |
| Passive progress | Ticket clerks add tickets every second. | `buying ticket clerks produces passive tickets` |
| Click progression | Season passes increase tickets earned per claim. | `season passes improve claim power` |
| Economy progression | Buying an upgrade raises its next price. | `upgrade prices increase with ownership` |
| Elevated prices | Base shop prices are high (clerk ≥100, pass ≥400, runners ≥1500, box office ≥9000). | `base shop prices are substantially elevated` |
| Upgrade integrity | Every upgrade is uniquely addressable by the game. | `each upgrade has a unique identifier` |
| Reliable purchases | An affordable upgrade click always spends tickets and grants ownership; unaffordable or unknown ids never mutate state. | `affordable upgrade purchases succeed and spend tickets`, `unaffordable upgrade purchases are rejected without mutation`, `unknown upgrade ids never alter state` |
| Rapid purchase consistency | Repeated upgrade clicks while funded apply in sequence without lost or double-spent purchases. | `rapid successive purchases remain consistent` |
| Ownership cap | Each upgrade can be bought at most **50** times; further buys are rejected as maxed. | `each upgrade can be owned at most 50 times`, `ownership just under the cap can still buy once` |

## Test command

Run `npm test`. It uses Node's built-in test runner and does not download dependencies.

## UI note (upgrade click reliability)

The shop must **not** destroy/recreate upgrade buttons on the passive income tick. Buttons are mounted once and updated in place so clicks are never dropped mid-interaction.
