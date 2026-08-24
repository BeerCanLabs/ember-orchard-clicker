# Key Product Functionality (KPF)

Each KPF below is a user-visible promise. Its automated test must continue to pass on every commit.

| KPF | Expected behavior | Automated coverage |
| --- | --- | --- |
| Claiming | Selecting **claim** earns tickets; the starting rate is one ticket per selection. | `gathering begins at one ember per click` |
| Immediate first upgrade | One claimed ticket can buy the first Ticket clerk. | `first upgrade is available after one gather` |
| Passive progress | Ticket clerks add tickets every second. | `buying lantern keepers produces passive embers` |
| Click progression | Season passes increase tickets earned per claim. | `deep roots improve gathering power` |
| Economy progression | Buying an upgrade raises its next price. | `upgrade prices increase with ownership` |
| Upgrade integrity | Every upgrade is uniquely addressable by the game. | `each upgrade has a unique identifier` |
| Reliable purchases | An affordable upgrade click always spends tickets and grants ownership; unaffordable or unknown ids never mutate state. | `affordable upgrade purchases succeed and spend embers`, `unaffordable upgrade purchases are rejected without mutation`, `unknown upgrade ids never alter state` |
| Rapid purchase consistency | Repeated upgrade clicks while funded apply in sequence without lost or double-spent purchases. | `rapid successive purchases remain consistent` |

## Test command

Run `npm test`. It uses Node's built-in test runner and does not download dependencies.

## UI note (upgrade click reliability)

The shop must **not** destroy/recreate upgrade buttons on the passive income tick. Buttons are mounted once and updated in place so clicks are never dropped mid-interaction.
