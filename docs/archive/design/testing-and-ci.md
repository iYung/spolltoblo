## Goal

Add a test suite (utilities, server, React components) and a GitHub Actions CI pipeline that runs on every push and PR across all branches.

---

## Affected files

| File | Change |
|------|--------|
| `package.json` | Add `test` / `test:run` scripts; add vitest + testing-library dev dependencies |
| `vite.config.js` | Add `test` block (vitest config: jsdom environment, setup file, coverage) |
| `server/index.js` | Reduce to entry point only — calls `createApp()` and listens |
| `server/app.js` *(new)* | Exports `createApp()` factory — testable, no side-effect listen |
| `src/test/setup.js` *(new)* | Global test setup: @testing-library/jest-dom matchers |
| `src/test/utils/id.test.js` *(new)* | Unit tests for `generateId()` |
| `src/test/utils/cardImages.test.js` *(new)* | Unit tests for `cardImages()` |
| `src/test/utils/enrichDeck.test.js` *(new)* | Unit tests for `enrichDeck()` with mocked fetch |
| `src/test/server/api.test.js` *(new)* | Integration tests for `GET /api/deck` via supertest |
| `src/test/server/websocket.test.js` *(new)* | Integration tests for WS room logic via ws client |
| `src/test/components/App.test.jsx` *(new)* | Component tests for landing page & join flow |
| `src/test/components/CommanderDamage.test.jsx` *(new)* | Component tests for damage panel & elimination display |
| `src/test/components/PlayerVideo.test.jsx` *(new)* | Component tests for elimination banner & local/remote controls |
| `src/test/components/CardSidebar.test.jsx` *(new)* | Component tests for lobby-mode filtering & all-cards toggle |
| `.github/workflows/ci.yml` *(new)* | GitHub Actions workflow: install → test |

---

## What changes

### Test framework: Vitest

Vitest is the natural choice: it shares Vite's config file, supports ES modules out of the box, and has a jsdom environment for React testing. No Babel or extra transform config needed.

Config added to `vite.config.js`:
```js
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.js'],
  globals: true,
}
```

New scripts in `package.json`:
- `"test"` → `vitest` (watch mode for dev)
- `"test:run"` → `vitest run` (single pass, used in CI)

New dev dependencies:
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`
- `supertest`

### Server refactor: `createApp()` factory

`server/index.js` currently starts listening on import, which blocks testing. Extract all logic into `server/app.js` which exports a `createApp()` factory function:

```js
// server/app.js
export function createApp() {
  const app = express()
  const server = createServer(app)
  const wss = new WebSocketServer({ server, path: '/ws' })
  const rooms = new Map()
  // ... all routes and WS handlers ...
  return { app, server, wss }
}
```

`server/index.js` becomes:
```js
import { createApp } from './app.js'
const { server } = createApp()
const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
```

This is a pure refactor — no behavior changes. Each test file creates its own server instance on a random port, ensuring isolation.

### Utility tests

**`id.test.js`** — tests for `generateId()`:
- Returns a string
- Is 8 characters long
- Contains only alphanumeric characters (base-36)
- Two successive calls return different values

**`cardImages.test.js`** — tests for `cardImages()`:
- Returns `[image_uris.normal]` for a single-faced card
- Returns image URLs from `card_faces` for a dual-faced card
- Ignores faces with no `image_uris`
- Returns `[]` for null/undefined input
- Returns `[]` when neither `image_uris` nor `card_faces` are present

**`enrichDeck.test.js`** — tests for `enrichDeck()` with `global.fetch` mocked via `vi.stubGlobal`:
- Deduplicates Scryfall IDs
- Batches IDs into chunks of 75
- Maps enriched data back to commander / partnerCommander / cards
- Throws on non-OK Scryfall response
- Handles missing commander (null) gracefully

### Server API tests (supertest)

**`api.test.js`** — tests for `GET /api/deck` with `global.fetch` mocked:
- Returns 400 `unknown-service` when `url` query param is missing
- Returns 400 `unknown-service` for a malformed URL
- Returns 400 `unknown-service` for a non-Archidekt URL
- Returns 400 `unknown-service` for a URL with no `/decks/` segment
- Returns 400 `not-found` when Archidekt deck ID segment is missing
- Returns `{ error: 'not-found' }` when upstream returns 404
- Returns `{ error: 'private' }` when upstream returns 401 or 403
- Returns 500 when upstream returns an unexpected error
- Returns normalized deck shape on success:
  - `name`, `commander`, `partnerCommander`, `cards`
  - Single commander → `partnerCommander: null`
  - Two commanders → both populated

### Server WebSocket tests

**`websocket.test.js`** — uses a real `ws.WebSocket` client against a live test server:
- `join` with wrong `JOIN_SECRET` → receives `error` message, connection closes
- `join` with correct secret → receives `room-peers` with empty peers list
- Second peer joins same room → first peer receives `peer-joined` message
- `offer` / `answer` / `ice-candidate` messages → forwarded to target peer with `from` field added
- `game-event` → broadcast to all peers except sender
- `player-order` with valid IDs → peers receive updated order; invalid IDs are filtered out
- Disconnect → remaining peers receive `peer-left`; empty room is cleaned up

### React component tests

All component tests use `@testing-library/react` with `render`, `screen`, and `userEvent`. WebRTC APIs (MediaStream, RTCPeerConnection) are not available in jsdom and are not tested — tests pass `null` for `stream` where needed.

**`App.test.jsx`**:
- Shows "Create Room" button when `window.location.pathname` is `/`
- Shows "Join Room" button and room hint when pathname has a room ID
- Clicking join with empty name uses default "Player"
- Pressing Enter in name input triggers join
- "Create Room" click calls `window.history.pushState`

**`CommanderDamage.test.jsx`**:
- Renders "No opponents yet" when `opponents` is empty
- Renders one row per opponent with single commander
- Renders two rows for an opponent with two commanders (partner)
- Row with `commanderDamage >= 21` shows ELIMINATED tag and `at-limit` class
- `-1` / `-5` buttons are disabled when damage is 0
- Clicking `+1` calls `onUpdate(peerId, 1)`
- Poison counter shows ELIMINATED when `>= 10`
- Poison `-1` disabled at 0
- Clicking poison `+1` calls `onPoisonDelta(1)`
- Clicking overlay calls `onClose`

**`PlayerVideo.test.jsx`**:
- Shows ELIMINATED banner when `life <= 0`
- Shows ELIMINATED banner when any `commanderDamage >= 21`
- Shows ELIMINATED banner when `poison >= 10`
- Does NOT show ELIMINATED banner at 40 life / 0 damage / 0 poison
- Local player sees MUTE and CAM buttons; remote player does not
- Life total click enters edit mode (input appears)
- Confirming life edit calls `onSetLife`
- Life `-1` button calls `onLifeDelta(-1)` for local player
- RESET button calls `onReset`

**`CardSidebar.test.jsx`**:
- Empty query → no results shown
- Lobby mode: typing filters `lobbyCards` by name (no fetch)
- Lobby mode + no match → "No results."
- "Search all cards" toggle appears when `lobbyCards.length > 0`
- Toggling to all-cards mode triggers debounced fetch (mocked)
- Successful fetch renders card name and mana cost
- 404 fetch → empty results (no error message)
- Fetch error → shows "Search failed. Try again."

### GitHub Actions CI

**`.github/workflows/ci.yml`**:
- Trigger: `push` and `pull_request` on all branches
- Job: `test`
  - `ubuntu-latest`
  - Node.js `lts/*` (matches `mise.toml`)
  - Steps: checkout → setup-node (with npm cache) → `npm ci` → `npm run test:run`
- No coverage gate (tests must pass; coverage reporting is informational only)

---

## What stays the same

- All runtime application behavior
- `npm run dev`, `npm run build`, `npm run start` scripts
- The WebSocket signaling protocol
- React component props and behavior
- Scryfall and Archidekt API integration

---

## Open questions

None — all answered before writing this doc:
- Scope: utilities + server + React components
- Coverage: no threshold, tests must pass
- CI trigger: all branches (push + pull_request)
