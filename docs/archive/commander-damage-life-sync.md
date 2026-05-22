# Commander Damage Life Sync Checklist

- [x] Task A — `src/components/CommanderDamage.jsx` — Add ±5 buttons to every commander damage row. In both the single-commander branch (line 28–30) and the partner branch (lines 45–47), change the `.cmd-dmg-controls` div from `-1 | value | +1` to `-5 | -1 | value | +1 | +5`. The two new buttons call `onUpdate(key, -5)` and `onUpdate(key, 5)` respectively. The `-5` button should be disabled when `dmg <= 0` (same guard as `-1`).

- [x] Task B — `src/components/Room.jsx` — Update `updateCommanderDamage` (lines 309–323) to also adjust the player's life total by `-delta` in the same `setGameState` call. Read the current `life` from `prev[myId.current]?.life ?? DEFAULT_LIFE`, compute `life + (-delta)`, write both `commanderDamage` and the new `life` into the updated state, and broadcast a `life-update` event (with the new life value) immediately after the existing `cmd-damage-update` broadcast.
