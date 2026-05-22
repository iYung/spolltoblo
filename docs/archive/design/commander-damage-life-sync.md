# Commander Damage +5/-5 with Life Sync

## Goal

Add ±5 increment buttons to the commander damage modal (matching the life total controls), and make every commander damage adjustment automatically mirror into the player's normal life total.

## Affected files

- `src/components/CommanderDamage.jsx` — add ±5 buttons per opponent row
- `src/components/Room.jsx` — update `updateCommanderDamage` to also adjust life by `-delta` in the same state update and broadcast

## What changes

### 1. `CommanderDamage.jsx` — new button layout

Each opponent row currently shows: `-1 | value | +1`

New layout: `-5 | -1 | value | +1 | +5`

The two new buttons call the existing `onCmdDmgDelta(peerId, delta)` prop with `±5`.

### 2. `Room.jsx` — `updateCommanderDamage` also adjusts life

When `updateCommanderDamage(fromPeerId, delta)` is called, the state update will:
- Increment `commanderDamage[fromPeerId]` by `delta` (existing behaviour)
- Decrement `life` by `delta` (new: taking more damage costs life; undoing damage restores life)

Both fields are written in a single `setGameState` call so they stay in sync locally.

The broadcast sends both fields in one event, or as two separate events in the same flush — either way peers see both changes atomically.

**Example:**
| Action | cmd damage delta | life delta |
|--------|-----------------|-----------|
| +1 (took 1 damage) | +1 | −1 |
| +5 (took 5 damage) | +5 | −5 |
| −1 (undo 1 damage) | −1 | +1 |
| −5 (undo 5 damage) | −5 | +5 |

## What stays the same

- The ±1 buttons remain; ±5 are added alongside them
- Elimination logic is unchanged (commander damage ≥ 21, life ≤ 0, or poison ≥ 10)
- Poison counter controls are unchanged
- Life buttons in `PlayerVideo.jsx` are unchanged
- Remote peer receives and applies the same events it already handles (`cmd-damage-update` + `life-update`)
- Reset still zeroes commander damage and restores life to 40

## Open questions

None — all clarified before writing this doc.
