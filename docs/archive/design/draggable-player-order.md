# Draggable Player Order

## Goal
Let any player drag webcam cards to reorder them. The new order is shared with and persisted for the whole room — everyone sees the same layout.

## Affected files
- `server/index.js` — store and broadcast player order; send it to new joiners
- `src/components/Room.jsx` — add `playerOrder` state, apply it when sorting `allPlayers`, send/receive WebSocket messages
- `src/components/PlayArea.jsx` — pass `onReorder` prop through to VideoGrid
- `src/components/VideoGrid.jsx` — add HTML5 drag-and-drop handlers on player cards

## What changes

### Server (`server/index.js`)
The room data structure changes from a bare `Map<peerId, {...}>` to a wrapper object `{ peers: Map, playerOrder: string[] }`.

New message handling:
- **`player-order`** (received): update `room.playerOrder`, broadcast to all other peers in the room
- **`room-peers`** (sent on join): include current `playerOrder` so new joiners immediately see the shared order
- **`peer-joined`** (broadcast): include updated `playerOrder` with the new peerId appended to the end
- **`peer-left`** (broadcast): include updated `playerOrder` with the departed peerId removed

### Room.jsx
- Add `playerOrder` state: `string[]` of peerIds in display order
- Sort `allPlayers` by `playerOrder` index instead of `joinOrder` (fall back to `joinOrder` if a peerId isn't in the order yet)
- Handle incoming `room-peers` message: initialize `playerOrder` from `msg.playerOrder`
- Handle incoming `peer-joined`: update `playerOrder` from `msg.playerOrder`
- Handle incoming `peer-left`: update `playerOrder` from `msg.playerOrder`
- Handle incoming `player-order`: update `playerOrder` from `msg.playerOrder`
- Add `handleReorder(fromIndex, toIndex)`: reorders the local array and sends `{ type: 'player-order', playerOrder }` over WebSocket
- Pass `onReorder={handleReorder}` down through `PlayArea` → `VideoGrid`

### PlayArea.jsx
Pass `onReorder` as a prop to `VideoGrid` (no logic change, pure pass-through).

### VideoGrid.jsx
- Accept `onReorder` prop
- Track `dragIndex` in local state (index of card being dragged)
- On each player card div: set `draggable={true}`, add `onDragStart`, `onDragOver`, `onDrop` handlers
- `onDragStart`: record the dragged card's index
- `onDragOver`: `e.preventDefault()` so the browser allows dropping
- `onDrop`: call `onReorder(dragIndex, targetIndex)` if indices differ
- Add a CSS grab cursor to player cards

## What stays the same
- `joinOrder` field on each player — still assigned and stored, used as a fallback sort key for players not yet in `playerOrder`
- All game state (life, commander damage, etc.) is untouched — reorder is a separate concern
- Card drag-and-drop in the play area is unaffected
- The responsive grid column calculation is untouched

## Open questions
_None — resolved before writing this doc._
- Order is **shared across all players** (not local-only).
- Persistence across refreshes is handled implicitly: the server holds the order for the lifetime of the room, and new joiners receive it on connect. No localStorage needed.
