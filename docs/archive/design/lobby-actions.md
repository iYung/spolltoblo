# Lobby Actions

## Goal

Rename the "Recently played by others" sidebar section to "Lobby Actions" and expand it into a unified feed that tracks both card plays and die rolls. Add a d20 roll button above the feed; rolls are broadcast to all players so everyone sees the result attributed to the roller.

## Affected files

- `src/components/CardSidebar.jsx` — rename section, add d20 button, render die roll entries in the feed
- `src/components/Room.jsx` — add `lobbyActions` state, handle incoming `d20-roll` game events, pass new state/callback to CardSidebar
- `src/index.css` — styles for d20 button and die roll feed entries

## What changes

### Room.jsx
- Add `const [lobbyActions, setLobbyActions] = useState([])` replacing or alongside `recentCards` (both card plays and rolls go into this array)
- Change `selectCard()` / `card-pinned` handler to push `{ type: 'card', card, playerName }` into `lobbyActions` instead of `recentCards`
- Add `rollD20()` function: picks `Math.ceil(Math.random() * 20)`, broadcasts `{ type: 'd20-roll', result, playerName }`, and pushes `{ type: 'roll', result, playerName }` locally into `lobbyActions`
- Handle incoming `d20-roll` game event in the WebSocket message handler, pushing a roll entry into `lobbyActions` for all other players
- Pass `lobbyActions` and `onRollD20` to `CardSidebar` (remove `recentCards` prop)

### CardSidebar.jsx
- Replace `recentCards` prop with `lobbyActions`
- Above the feed, add a "Roll d20" button that calls `onRollD20()`
- Rename section header from "Recently played by others" to "Lobby Actions"
- Render each entry by type:
  - `type: 'card'` → existing card-result layout (name + player, draggable)
  - `type: 'roll'` → simple text row: e.g. `PlayerName rolled a 17`

### index.css
- Style for d20 roll button (consistent with existing overlay/sidebar button patterns)
- Style for roll feed entries (distinct from card entries — no drag hint, maybe a die icon or accent color)

## What stays the same

- Card plays still appear in the feed with their existing draggable card layout
- The feed is at the bottom of the sidebar, below search results
- All existing game event types and WebSocket plumbing are untouched
- Sidebar resize, open/close, and search behavior are unchanged

## Open questions

None — all resolved before writing this doc:
- Card plays remain in the feed alongside die rolls (unified Lobby Actions feed)
- Rolls are broadcast to all players via the existing `broadcastGameEvent` WebSocket channel
