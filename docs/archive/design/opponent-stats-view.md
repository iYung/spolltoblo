# Opponent Stats View

## Goal

When a player clicks another player's life total, they see a read-only panel showing that player's received commander damage (broken down per attacker) and their current poison counters.

---

## Affected files

- `src/components/PlayerVideo.jsx`
- `src/components/CommanderDamage.jsx`
- `src/components/VideoGrid.jsx`
- `src/components/Room.jsx` (minimal)
- `src/index.css`
- `src/test/components/PlayerVideo.test.jsx`
- `src/test/components/CommanderDamage.test.jsx`

---

## What changes

### 1. `CommanderDamage.jsx` — add `readOnly` and `title` props

A new optional `readOnly` boolean prop (default `false`). When `true`:

- The +/- buttons on each damage row are hidden; only the numeric value is rendered.
- The poison +/- buttons are hidden; only the value is rendered.
- The hint paragraph (`p.cmd-dmg-hint`) is hidden.
- The header `<h3>` renders the `title` prop instead of the hard-coded string (caller passes "Damage Received by [name]" in read-only mode, local view keeps the existing text).

No new component is needed — the same component handles both modes. `onUpdate` and `onPoisonDelta` are only called by buttons, so they can be omitted (or ignored) when `readOnly` is true.

### 2. `PlayerVideo.jsx` — click opponent life total to open read-only panel

- Add `allPlayers` prop (array of all players in the room, passed down from VideoGrid → Room).
- Add `showOpponentStats` local state (boolean, default `false`).
- The opponent life-total `<span>` (currently line 143, the `!isLocal` branch) gets:
  - `onClick={() => setShowOpponentStats(true)}`
  - `title="Click to view damage & poison"`
  - `style={{ cursor: 'pointer' }}`
- When `showOpponentStats && !isLocal`, render:

```jsx
<CommanderDamage
  readOnly
  title={`Damage Received by ${player.name}`}
  opponents={allPlayers.filter(p => p.peerId !== player.peerId)}
  commanderDamage={commanderDamage}
  poison={poison}
  onClose={() => setShowOpponentStats(false)}
/>
```

`opponents` here means "the players whose commanders could have dealt damage to this player" — every player except the target.

### 3. `VideoGrid.jsx` — thread `allPlayers` down

VideoGrid already receives and maps over players. Add `allPlayers` to its prop list and pass it to each `<PlayerVideo>`.

### 4. `Room.jsx` — pass `allPlayers` to `VideoGrid`

Room already builds the `allPlayers` array. Pass it as a prop to `VideoGrid`.

### 5. `src/index.css` — read-only row style

The read-only value display needs to look clean without the button gap. Add a modifier class `.cmd-dmg-controls--readonly` that removes `gap` and justifies the value centrally, or simply rely on the buttons being absent.

Add `cursor: pointer` to `.life-total` when hovered in the opponent context — this can be done via a utility class added in PlayerVideo.

---

## What stays the same

- The existing local-player `CommanderDamage` modal (the `DMG` button flow) is **unchanged** — same props, same behavior, same edit controls.
- `commanderDamage` key format (`peerId` / `peerId_2`) is unchanged.
- Attacker labeling logic already handles disambiguation: `"CommanderName (PlayerName)"` for every row, so two players running the same commander are naturally distinguishable.
- No WebSocket or server changes needed — the target player's state is already synchronized via `game-event` messages.
- No routing or Room-level state changes needed beyond passing the extra prop.

---

## Open questions

None — resolved before design was written:

- **Read-only vs editable**: read-only.
- **Per-attacker or total**: per-attacker breakdown. Existing label logic (`"CardName (PlayerName)"`) already handles same-commander disambiguation and partner split.
