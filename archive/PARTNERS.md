# Partners Feature Design

## Checklist

### Room.jsx
- [x] Change initial game state from `commander: null` to `commanders: []`
- [x] Replace `setMyCommander(card)` with `setMyCommanders(commanders)` (takes full array)
- [x] Update `resetMyStats` to clear `commanders: []`
- [x] Update `loadDeck` to build `commanders` array from `enriched.commander` + `enriched.partnerCommander` (filter nulls)
- [x] Update `peer-joined` sync to broadcast `commanders-update` with the full array
- [x] Rename `commander-update` game event handler to `commanders-update`, write array into state
- [x] Update `broadcastGameEvent` calls for commanders to send `{ type: 'commanders-update', commanders: [...] }`

### PlayerVideo.jsx
- [x] Read `commanders = state?.commanders ?? []` instead of `commander`
- [x] Update commander chip to show 0, 1, or 2 commanders per the display table in the design
- [x] Add `+ partner` button beside the chip when local player has exactly 1 commander
- [x] Add `×` remove button on each chip when local player has 2 commanders
- [x] Update hover preview to show both card images side by side when 2 commanders are set
- [x] Open `CommanderPicker` in `'primary'` or `'partner'` mode based on which slot is empty
- [x] Handle `onSelect` to write into the correct slot (index 0 or 1)

### CommanderPicker.jsx
- [x] Add `mode` prop (`'primary'` | `'partner'`, default `'primary'`)
- [x] Update panel title to reflect mode ("Select Commander" vs "Add Partner Commander")

### CommanderDamage.jsx
- [x] Accept `opponents` as `[{ peerId, name, commanders: Card[] }]`
- [x] Render two labeled damage rows per opponent when they have 2 commanders
- [x] Use `${peerId}_2` as the damage key for the second commander row

---


Support for two-commander pods: partner commanders (e.g. Tymna + Thrasios) and any
Archidekt deck with two cards in the Commander category.

## What already works

The server and `enrichDeck.js` already extract and return `partnerCommander` from
Archidekt. The gap is entirely in state management and UI.

---

## State model change

**Current** (`Room.jsx` game state per player):
```js
{ life, commanderDamage: { [peerId]: number }, poison, commander: Card|null, deck }
```

**Proposed:**
```js
{ life, commanderDamage: { [peerId]: number, [`${peerId}_2`]: number }, poison, commanders: Card[], deck }
```

Two changes:
- `commander: Card|null` → `commanders: Card[]` (0, 1, or 2 entries)
- Commander damage keys gain an optional `_2` suffix for damage taken from an opponent's
  second commander. The existing `[peerId]` key stays as-is so old state merges cleanly.

---

## Files to change

### `Room.jsx`

| Location | Change |
|---|---|
| Initial state (`useEffect`) | `commander: null` → `commanders: []` |
| `setMyCommander(card)` | Replace with `setMyCommanders(commanders)` — takes the full array |
| `resetMyStats` | Clear to `commanders: []` |
| `loadDeck` | After enrichment, build `commanders` from `enriched.commander` + `enriched.partnerCommander` (filter nulls), call `setMyCommanders` |
| `peer-joined` sync | Broadcast `commanders-update` with the full array |
| `game-event` handler (`commander-update`) | Rename to `commanders-update`, write the array into state |
| `broadcastGameEvent` for commanders | Send `{ type: 'commanders-update', commanders: [...] }` |

### `PlayerVideo.jsx`

**Commander chip** — currently one chip showing a single name or `+CMDR`.
New behavior:

| State | Display |
|---|---|
| 0 commanders, local | `[+CMDR]` button → opens picker |
| 1 commander, local | chip with name + small `+ partner` button beside it |
| 2 commanders, local | two chips, each with a small `×` to remove |
| 0 commanders, remote | nothing shown |
| 1–2 commanders, remote | chips (name only, no controls) |

Hover preview: if 2 commanders, show both card images side by side (each 180px wide).

Elimination check needs no change — `Object.values(commanderDamage).some(d => d >= 21)`
still works regardless of how many keys there are.

### `CommanderPicker.jsx`

Add a `mode` prop: `'primary'` (default) | `'partner'`.

- Title: "Select Commander" vs "Add Partner Commander"
- No filter change needed — let the user pick freely, same as today
- `onSelect` signature stays the same (`card` → parent decides what to do with it)

Caller (`PlayerVideo`) passes `mode` and handles the slot assignment:
```js
// slot 0 empty → open in primary mode, set commanders[0]
// slot 0 filled, slot 1 empty → open in partner mode, set commanders[1]
```

### `CommanderDamage.jsx`

When an opponent has 2 commanders, render two rows for that opponent:

```
Tymna the Weaver (Ivan)      [−1]  [3]  [+1]
Thrasios (Ivan)              [−1]  [0]  [+1]
```

The row key for the second commander is `${peerId}_2`.

The `opponents` prop already carries each opponent's player object. Add a
`commandersMap` prop (or derive from the existing `players` list) so the component
knows each opponent's commander names for labeling.

```js
// CommanderDamage gets:
opponents: [{ peerId, name, commanders: Card[] }]
```

---

## Network events

Replace the existing `commander-update` event with `commanders-update`:

```js
// broadcast on change:
{ type: 'commanders-update', commanders: Card[] }   // 0–2 entries

// receive:
setGameState(prev => ({
  ...prev,
  [from]: { ...prev[from], commanders: payload.commanders }
}))
```

The old `commander-update` key can be kept as a no-op fallback for a session or two
if you care about mixed-version clients; otherwise just rename it.

---

## Elimination logic

No change needed. A player is eliminated when:
- `life <= 0`
- `poison >= 10`
- **any single damage key** `>= 21` — each partner track is independent, matching MTG rules

---

## Out of scope

- Background commander from the deck (non-partner second commanders, e.g. Companion)
- Displaying partner card art in the opponent's video tile (remote players already show their chip)
- Commander search filtering to `is:partner` when in partner mode
