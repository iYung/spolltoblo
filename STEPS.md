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

