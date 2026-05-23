## Testing & CI Checklist

- [x] Task 1 — `package.json`, `vite.config.js` — Install Vitest and testing dependencies; add `test` (watch) and `test:run` (single-pass) scripts; add vitest config block to vite.config.js (environment: jsdom, globals: true, setupFiles); create `src/test/setup.js` that imports @testing-library/jest-dom

- [x] Task 2 — `server/app.js` (new), `server/index.js` — Refactor server into a `createApp()` factory: move all express routes, WebSocket handlers, and the `rooms` Map into `server/app.js` which exports `createApp()` returning `{ app, server, wss }`; reduce `server/index.js` to import `createApp` and call `server.listen()`

- [x] Task 3 — `src/test/utils/id.test.js` — Unit tests for `generateId()`: returns string, is 8 chars, is alphanumeric (base-36), successive calls differ

- [x] Task 4 — `src/test/utils/cardImages.test.js` — Unit tests for `cardImages()`: single-faced card returns `[image_uris.normal]`; dual-faced card returns both face URLs; face missing image_uris is skipped; null/undefined input returns `[]`; card with neither property returns `[]`

- [x] Task 5 — `src/test/utils/enrichDeck.test.js` — Unit tests for `enrichDeck()` with `global.fetch` mocked via `vi.stubGlobal`: deduplicates IDs; batches into chunks of 75; maps enriched cards back to commander / partnerCommander / cards; throws on non-OK response; handles null commander gracefully

- [x] Task 6 — `src/test/server/api.test.js` — Integration tests for `GET /api/deck` using supertest against `createApp().app` with `global.fetch` mocked: missing url → 400 unknown-service; malformed URL → 400; non-Archidekt URL → 400; no `/decks/` segment → 400; missing deck ID → 400 not-found; upstream 404 → `{ error: 'not-found' }`; upstream 401/403 → `{ error: 'private' }`; upstream network error → 500; success → normalized `{ name, commander, partnerCommander, cards }` shape

- [x] Task 7 — `src/test/server/websocket.test.js` — WebSocket integration tests using real `ws.WebSocket` client against `createApp()` server listening on a random port: wrong JOIN_SECRET → error message + close; correct join → room-peers response; second peer join → first peer gets peer-joined; offer/answer/ice-candidate forwarded with `from` field; game-event broadcast to all but sender; player-order synced with invalid IDs filtered; disconnect → peer-left + empty room cleanup

- [x] Task 8 — `src/test/components/App.test.jsx` — Component tests for App.jsx: shows "Create Room" when pathname is `/`; shows "Join Room" + room hint when pathname has an ID; empty name defaults to "Player"; Enter key triggers join; Create Room calls `window.history.pushState`

- [x] Task 9 — `src/test/components/CommanderDamage.test.jsx` — Component tests for CommanderDamage.jsx: "No opponents yet" when opponents is empty; one row per single-commander opponent; two rows for partner-commander opponent; ELIMINATED tag at damage >= 21; decrement buttons disabled at 0; +1 calls onUpdate; poison ELIMINATED at >= 10; poison -1 disabled at 0; overlay click calls onClose

- [x] Task 10 — `src/test/components/PlayerVideo.test.jsx` — Component tests for PlayerVideo.jsx: ELIMINATED banner at life <= 0; ELIMINATED at commanderDamage >= 21; ELIMINATED at poison >= 10; no banner at healthy state; local player sees MUTE + CAM buttons, remote does not; life click enters edit mode; confirming edit calls onSetLife; -1 button calls onLifeDelta(-1); RESET calls onReset

- [x] Task 11 — `src/test/components/CardSidebar.test.jsx` — Component tests for CardSidebar.jsx: empty query shows no results; lobby mode filters lobbyCards by name without fetch; no match shows "No results."; "Search all cards" toggle visible when lobbyCards present; toggling to all-cards fires debounced fetch (mocked); successful fetch renders card name; 404 → empty results; fetch error → "Search failed. Try again."

- [x] Task 12 — `.github/workflows/ci.yml` — GitHub Actions CI: triggers on push and pull_request for all branches; single job on ubuntu-latest; Node.js lts/* with npm cache; steps: checkout → setup-node → npm ci → npm run test:run
