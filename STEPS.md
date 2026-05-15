# Build Steps

## 1. Project Setup
- Initialize a Node.js project
- Choose a framework (e.g. Next.js or plain Vite + React)
- Set up a simple WebSocket or WebRTC signaling server for room management

## 2. Room & URL Sharing
- Generate a unique room ID when a player visits the app
- Shareable URL: `yourdomain.com/room/<id>`
- Players who join the same URL enter the same room

## 3. Webcam Streaming (WebRTC)
- Use WebRTC peer connections for low-latency video
- Use a signaling server (WebSocket) to exchange SDP offers/answers and ICE candidates
- Render each peer's video stream in the left play area
- Handle join/leave events gracefully

## 4. Layout — Split View
- Left area: webcam streams (main play area)
- Right panel: card search sidebar
  - Resizable (drag handle on the left edge)
  - Collapsible (toggle button to pull in/out)

## 5. Card Search Panel
- Search bar that queries the Scryfall API (`https://api.scryfall.com/cards/search?q=<term>`)
- Display results as a scrollable list with card name, mana cost, and image thumbnail
- Clicking a result shows full card details (oracle text, type line, image)

## 6. Life & Commander Damage Tracking
- Each player has a life total widget (default 40) with +/- controls
- Commander damage panel per player: one counter per opponent tracking damage from their commander
- At 21 commander damage from a single source, player is eliminated
- Totals sync across all clients in the room in real time via the existing WebSocket connection

## 7. Drag Card to Play Area
- Make search result cards draggable
- Drop targets on the left play area
- Dropped cards appear as small chips/overlays at drop position (percentage-based so layout-independent)
- Hovering a chip shows a popover with full card details; popup flips direction to stay on screen
- Chips have a grab handle (`⠿`) so they can be re-dragged to a new position after pinning

## 8. Polish & Deploy
- Responsive layout that works on typical laptop screens
- Deploy signaling server (e.g. Railway, Fly.io, or a VPS)
- Deploy frontend (e.g. Vercel or same server)
- Test with multiple browser tabs / real friends

---

## Upcoming Features

### Single header
Currently there are two horizontal bars at the top of the room: the main header (title + room ID + copy link) and the invite banner (share link prompt shown when alone). This looks like two headers.

**Fix:**
- Move the invite URL inline into the main header, shown only when `peers` is empty
- Replace the full-width invite banner div with a compact `<span>` + copy button that slots into the existing `.room-header` flex row
- Remove the `.invite-banner` element and its CSS entirely

### Per-user volume control
Allow each player to independently control the volume of any remote participant's audio stream.

**Steps:**
1. Add a `volumes` state object in `Room.jsx`: `{ [peerId]: number }` defaulting to `1.0`
2. Pass `volume` and `onVolumeChange` as props into `PlayerVideo` for non-local players
3. In `PlayerVideo`, add a range input (`0`–`1`, step `0.05`) that sets `videoRef.current.volume` directly on change
4. Show the slider on hover over the video (CSS: visible on `.player-video:hover`)
5. Persist the value in `volumes` state so it survives re-renders

### Per-user webcam rotation
Let each player flip any remote (or their own) video upside down — useful when a physical camera is mounted in an unusual orientation.

**Steps:**
1. Add a `rotations` state object in `Room.jsx`: `{ [peerId]: boolean }` defaulting to `false`
2. Pass `rotated` and `onToggleRotate` as props into `PlayerVideo`
3. In `PlayerVideo`, apply `transform: rotate(180deg)` to the `<video>` element when `rotated` is true
4. Add a small rotate button (e.g. `↻`) in the player overlay that toggles the state
5. Store rotation per-peerId so adjusting one player doesn't affect others

### App rename (MagicDesk / SpollToblo)
Rename the app away from "SpellTable" to avoid confusion with the official product. Name candidates: **MagicDesk** (clean, descriptive) or **SpollToblo** (chaotic, fun).

**Steps:**
1. Update the `<title>` in `index.html`
2. Replace the "SpellTable" heading in `App.jsx` (landing page) and `Room.jsx` (header)
3. Rename the project directory and update `"name"` in `package.json`
4. Update all references in `README.md` and `STEPS.md`
