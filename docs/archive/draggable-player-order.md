# Draggable Player Order Checklist

- [x] Task 1 — `server/index.js` — Refactor room structure and add player-order sync

  The `rooms` map currently stores `Map<peerId, { ws, name, joinOrder }>` directly as the room value.
  Change it to store `{ peers: Map<peerId, { ws, name, joinOrder }>, playerOrder: string[] }`.
  Update every place that reads `rooms.get(roomId)` to use `.peers` (the `join`, `offer/answer/ice-candidate`, `game-event`, and `ws.on('close')` handlers).

  Then add/update message handling:
  - **`join`**: append new peerId to `room.playerOrder`. Include `playerOrder: room.playerOrder` in the `room-peers` message sent to the new peer. Include `playerOrder: room.playerOrder` in the `peer-joined` broadcast to existing peers.
  - **`peer-left`** (ws.on('close')): remove the departed peerId from `room.playerOrder` before broadcasting. Include `playerOrder: room.playerOrder` in the `peer-left` broadcast.
  - **`player-order`** (new case): set `room.playerOrder = msg.playerOrder`, then broadcast `{ type: 'player-order', playerOrder: room.playerOrder }` to all other peers in the room.

- [x] Task 2 — `src/components/Room.jsx` — Add playerOrder state, sorting, WS handling, and reorder callback

  1. Add state: `const [playerOrder, setPlayerOrder] = useState([])`
  2. Update `allPlayers` sort: instead of sorting by `joinOrder`, sort by index in `playerOrder`. Build a lookup `const orderMap = Object.fromEntries(playerOrder.map((id, i) => [id, i]))` then sort by `orderMap[a.peerId] ?? Infinity` (fall back so unordered peers go to end).
  3. Handle new WS message fields in existing handlers:
     - `room-peers`: call `setPlayerOrder(msg.playerOrder ?? [])` (the server now includes `playerOrder`)
     - `peer-joined`: call `setPlayerOrder(msg.playerOrder ?? [])` 
     - `peer-left`: call `setPlayerOrder(msg.playerOrder ?? [])`
     - Add new case `player-order`: call `setPlayerOrder(msg.playerOrder)`
  4. Add handler: `function handleReorder(fromIndex, toIndex) { ... }` — reorder the `playerOrder` array (remove item at `fromIndex`, insert at `toIndex`), call `setPlayerOrder(next)`, and send `{ type: 'player-order', playerOrder: next }` over `wsRef.current`.
  5. Pass `onReorder={handleReorder}` to `<PlayArea>`.

- [x] Task 3 — `src/components/PlayArea.jsx` — Pass onReorder through to VideoGrid

  Accept `onReorder` in the props destructure and forward it to `<VideoGrid onReorder={onReorder} .../>`. No logic change.

- [x] Task 4 — `src/components/VideoGrid.jsx` — Drag-and-drop to reorder player cards

  Accept `onReorder` prop. Add local state `const [dragIndex, setDragIndex] = useState(null)`.

  On each player card div (the outermost div rendered per player in the map):
  - Set `draggable={true}`
  - `onDragStart={() => setDragIndex(i)}` where `i` is the map index
  - `onDragOver={(e) => e.preventDefault()}`
  - `onDrop={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i); setDragIndex(null) }}`

  Add to the player card div's inline style (or className): `cursor: 'grab'` so it's visually clear the cards are draggable.
