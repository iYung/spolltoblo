# Disconnect / Rejoin

## Goal

When a player disconnects (browser crash, network drop, page reload), their seat and game state are preserved. Other players see their card greyed out with a "Disconnected" indicator and a "Kick" button. If the player reconnects to the same room before the room empties, they are restored to their original seat with their life total, poison, commander damage, and commanders intact. Any player can kick a disconnected peer to permanently remove them from the room.

## Affected files

- `src/utils/id.js` — persist peerId to localStorage so it survives page reloads
- `server/index.js` — distinguish disconnect from leave; add `'rejoin'` handler
- `src/components/Room.jsx` — handle `'peer-disconnected'` and `'peer-rejoined'` events; send stored peerId on join
- `src/components/PlayerVideo.jsx` — render "Disconnected" overlay when peer is marked disconnected
- `src/index.css` — styles for the disconnected state

## What changes

### Identity persistence (`src/utils/id.js`)

Currently `generateId()` is called on every page load, so a reconnecting player always gets a new random peerId. We change this so the peerId is written to `localStorage` on first generation and reused on subsequent loads. If the stored value is missing or malformed, a fresh ID is generated and saved.

### Server: soft disconnect vs. hard leave (`server/index.js`)

Currently the `ws.on('close')` handler immediately deletes the peer from the room and broadcasts `'peer-left'`.

New behavior:
- Mark the peer as `disconnected: true` in the room map (keep name, joinOrder, game state placeholder).
- Broadcast `'peer-disconnected'` (instead of `'peer-left'`) so remaining clients know to grey out the card rather than remove it.
- When the room becomes empty, clean up any disconnected peers and delete the room as before.

A new `'rejoin'` message type is added. When received with a `peerId` that exists in the room in a disconnected state:
- Update the peer's `ws` reference to the new connection.
- Clear the `disconnected` flag.
- Broadcast `'peer-rejoined'` to all other peers (includes the peer's `name` and `joinOrder` so clients can re-establish WebRTC).
- Reply to the rejoining peer with `'room-peers'` (same payload as the initial join) so they can re-establish connections to everyone else.

If the `peerId` is not found or is not disconnected, fall back to treating it as a normal `'join'`.

### Client: sending identity and handling new events (`src/components/Room.jsx`)

On initial connection, the client reads its peerId from localStorage (via the updated `id.js`) and sends it in the `'join'` / `'rejoin'` message.

New event handlers:
- **`'peer-disconnected'`**: Mark the peer as `disconnected: true` in the `peers` state map. Do NOT delete their entry from `peers` or `gameState`. Close and remove their RTCPeerConnection (the WebRTC session is broken anyway).
- **`'peer-rejoined'`**: Clear the `disconnected` flag for the peer. Re-establish a WebRTC connection (create offer, same as `'peer-joined'`). Existing `gameState` for that peerId is preserved — no reset needed.

The initial state sync that fires on `'peer-joined'` (broadcasting own life, commanders, deck) also fires on `'peer-rejoined'`, ensuring the rejoining player gets up-to-date state from everyone else.

### Disconnected UI (`PlayerVideo.jsx` + CSS)

When a peer has `disconnected: true`, render a semi-transparent overlay on their card with the text "Disconnected" and a "Kick" button. Video and audio tracks are gone (WebRTC closed), so the video element will be blank; the overlay communicates this clearly. Life totals and other counters remain visible beneath the overlay.

The overlay is only shown on remote peers — it never appears on the local player's own card.

### Kick (`PlayerVideo.jsx`, `Room.jsx`, `server/index.js`)

Clicking "Kick" on a disconnected card sends a `'kick'` WebSocket message from the client to the server, containing the target `peerId`.

Server handler for `'kick'`:
- Verify the target peerId exists in the room and is currently `disconnected: true`. Ignore the request if neither condition holds (prevents kicking connected players).
- Permanently delete the peer from the room map.
- Broadcast `'peer-left'` with the kicked peerId to all remaining clients, so they fully remove the slot.

Clients receiving `'peer-left'` already handle full removal (delete from `peers` and `gameState`), so no new client-side handler is needed for kick — it reuses the existing `'peer-left'` path.

## What stays the same

- The `'peer-left'` event is still used (and still causes full removal) when the room empties and stale disconnected slots are cleaned up. No semantic change for clean voluntary leaves — if a player leaves without disconnecting abruptly, the current flow still fires.
- Game state (life, commanders, commander damage, poison) continues to be owned by the clients. The server does not store game state — it only keeps the peer's identity slot alive.
- Deck data is **not** restored on rejoin (too large; player can reload their deck).
- WebRTC signaling (offer/answer/ice-candidate) is unchanged.
- The room URL / room ID scheme is unchanged.

## Open questions

None — all answered before writing this doc.
