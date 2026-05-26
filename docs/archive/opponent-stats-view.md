## Opponent Stats View Checklist

- [x] Task A — `src/components/CommanderDamage.jsx` — Add optional `readOnly` boolean prop (default `false`) and `title` prop. When `readOnly` is true: skip rendering the +/- buttons on each damage row and the poison row (render only the value spans), hide the `p.cmd-dmg-hint` paragraph, and use the `title` prop as the `<h3>` text instead of the hard-coded "Commander Damage Taken" string. When `readOnly` is false, behavior is identical to today.

- [x] Task B — `src/components/Room.jsx` and `src/components/VideoGrid.jsx` — Thread `allPlayers` prop. In Room.jsx, pass the existing `allPlayers` array as an `allPlayers` prop to `<VideoGrid>`. In VideoGrid.jsx, accept `allPlayers` and forward it to each `<PlayerVideo>` instance.

- [x] Task C — `src/components/PlayerVideo.jsx` — Add `allPlayers` prop. Add `showOpponentStats` local state (boolean, default false). In the `!isLocal` branch of the life section (currently line 143), change the `<span className="life-total">` to include `onClick={() => setShowOpponentStats(true)}`, `title="Click to view damage & poison"`, and `style={{ cursor: 'pointer' }}`. Below the existing `showCmdDmg` block, add: when `showOpponentStats && !isLocal`, render `<CommanderDamage readOnly title={\`Damage Received by ${player.name}\`} opponents={allPlayers.filter(p => p.peerId !== player.peerId)} commanderDamage={commanderDamage} poison={poison} onClose={() => setShowOpponentStats(false)} />`.

- [x] Task D — `src/test/components/CommanderDamage.test.jsx` — Add tests for the `readOnly` prop: verify +/- buttons are not rendered, verify the supplied `title` appears in the header, verify damage values and poison value are still displayed.

- [x] Task E — `src/test/components/PlayerVideo.test.jsx` — Add a test for the non-local player case: clicking the life total span opens the opponent stats overlay (CommanderDamage is rendered with `readOnly`), and that the overlay is not shown before the click.
