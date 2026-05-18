# Decklists Feature

Players paste a Moxfield or Archidekt deck URL when they join. This auto-sets their commander and scopes card search to only their deck — no more searching all of Scryfall.

---

## User flow

1. Player enters their name and joins. Once in the room, they paste a deck URL into the sidebar and hit Load.
2. The server fetches the deck from Moxfield/Archidekt and returns normalized card data.
3. The client batch-fetches full card details (image, mana cost, oracle text) from Scryfall.
4. The player's commander is set automatically from the deck's commander slot.
5. Card search in the sidebar now filters the player's own deck instead of all of Scryfall.
6. Other players in the room see the commander update (same `commander-update` game-event as today).

---

## Step 1 — Server-side deck proxy

Moxfield and Archidekt both have CORS restrictions on direct browser fetches. Add a proxy endpoint to the existing Express server.

**`server/index.js`**

Add `GET /api/deck?url=<encodedUrl>`:

1. Parse the URL to detect the service (moxfield.com vs archidekt.com).
2. Extract the deck ID from the URL path:
   - Moxfield: `https://www.moxfield.com/decks/{deckId}` → `deckId` is the slug after `/decks/`
   - Archidekt: `https://archidekt.com/decks/{numericId}/{slug}` → first path segment after `/decks/`
3. Fetch from the upstream API:
   - Moxfield: `GET https://api2.moxfield.com/v2/decks/all/{deckId}` (no auth required for public decks)
   - Archidekt: `GET https://archidekt.com/api/decks/{numericId}/` (public decks, no auth)
4. Normalize the response into a shared format (see Step 2) and return it as JSON.
5. Return a clear error JSON (`{ error: 'not-found' }`, `{ error: 'private' }`, `{ error: 'unknown-service' }`) for bad inputs.

---

## Step 2 — Deck normalization

The proxy returns a unified shape regardless of source service:

```js
{
  name: string,               // deck name
  commander: {                // null if no commander slot
    name: string,
    scryfallId: string,
  } | null,
  partnerCommander: {         // null unless deck has a partner
    name: string,
    scryfallId: string,
  } | null,
  cards: [
    { name: string, scryfallId: string, quantity: number }
  ]
}
```

**Moxfield mapping:**
- `boards.commanders.cards` → commander(s); if two entries, one is partner
- `boards.mainboard.cards` → main deck cards
- Each card entry has `.card.name` and `.card.scryfall_id`

**Archidekt mapping:**
- Cards where `categories` includes `"Commander"` → commander(s)
- All other cards → main deck
- Each card has `.card.oracleCard.name` and `.card.uid` (Scryfall ID)

---

## Step 3 — Scryfall enrichment (client-side)

Once the normalized deck arrives, fetch full card objects from Scryfall so the sidebar has images, mana costs, and oracle text without per-keystroke API calls.

Use the **collection endpoint**: `POST https://api.scryfall.com/cards/collection`  
Body: `{ identifiers: [{ id: scryfallId }, ...] }` — up to 75 cards per request.

For a 100-card Commander deck this is 2 requests, fired once on deck load.

Store the result as an array of full Scryfall card objects in state alongside the deck. These become the search corpus.

---

## Step 4 — State changes

**`Room.jsx`**

Add a `deck` field to each player's game state entry:

```js
{
  life: 40,
  commanderDamage: {},
  poison: 0,
  commander: null,
  deck: null,  // { name, cards: [...full Scryfall objects] }
}
```

When the local player loads a deck:
1. Set `deck` in local `gameState`.
2. Auto-call `setMyCommander(card)` with the commander's Scryfall card object — this broadcasts via the existing `commander-update` game-event. No new event type needed.

The deck card list is local-only (not broadcast). Other players only see the commander, same as today.

---

## Step 5 — UI: deck URL input

Add a "Load deck" section at the top of the sidebar: a text input + Load button. Players paste their Moxfield or Archidekt URL here and hit Load. On submit it fetches, normalizes, and enriches the deck, replacing any previously loaded one. This also works as a mid-session deck swap.

---

## Step 6 — Card search changes (`CardSidebar.jsx`)

`CardSidebar` currently fires a Scryfall search on every debounced keystroke. Change the behavior based on whether a deck is loaded:

**With deck loaded:**
- Filter `deck.cards` locally by `card.name.toLowerCase().includes(query.toLowerCase())`.
- Results are instant (no API call).
- Display a label at the top: "Searching your deck · _Deck Name_"
- Show a "Search all cards" toggle to fall back to Scryfall if needed.

**Without deck loaded (fallback):**
- Existing Scryfall debounced search, unchanged.
- Show a prompt: "Load a deck URL to scope search to your cards."

`CardSidebar` receives `deck` as a new prop from `Room.jsx`.

---

## Step 7 — Commander auto-set (replaces CommanderPicker flow)

When a deck loads and `normalized.commander` is non-null:

1. Find the matching full Scryfall card object in the enriched deck.
2. Call `onSetCommander(card)` immediately.
3. The `CommanderPicker` component can remain for players without a deck URL, or for manually overriding the auto-set commander.

If the deck has partner commanders, call `onSetCommander` with the primary commander. A follow-up can add partner support to the commander damage tracking.

---

## Files touched

| File | Change |
|---|---|
| `server/index.js` | Add `/api/deck` proxy endpoint |
| `src/components/Room.jsx` | Add `deck` state; fetch/enrich on load; pass `deck` to `CardSidebar`; auto-set commander |
| `src/components/CardSidebar.jsx` | Accept `deck` prop; local filter when loaded, Scryfall fallback when not; add in-sidebar Load Deck input |
| `src/components/CommanderPicker.jsx` | Minor: show auto-set commander as pre-selected (no commander change required in behaviour) |

No new components required unless the deck-loading logic in `Room.jsx` grows large enough to extract into a `useDeck` hook.

---

## Checklist

### Server proxy (`server/index.js`)
- [ ] Add `GET /api/deck?url=` route
- [ ] Detect service from URL (moxfield.com vs archidekt.com)
- [ ] Extract Moxfield deck ID (slug after `/decks/`)
- [ ] Extract Archidekt deck ID (numeric segment after `/decks/`)
- [ ] Fetch from Moxfield API (`api2.moxfield.com/v2/decks/all/{id}`)
- [ ] Fetch from Archidekt API (`archidekt.com/api/decks/{id}/`)
- [ ] Normalize Moxfield response to shared format
- [ ] Normalize Archidekt response to shared format
- [ ] Return error JSON for unknown service, not-found, and private decks

### Scryfall enrichment utility
- [ ] Create `src/utils/enrichDeck.js` that accepts a normalized deck
- [ ] Split card list into chunks of 75
- [ ] POST each chunk to `https://api.scryfall.com/cards/collection`
- [ ] Merge all responses into a single array of full Scryfall card objects
- [ ] Return `{ name, commander, partnerCommander, cards }` with full Scryfall objects on `cards`

### State (`Room.jsx`)
- [ ] Add `deck: null` to the initial game state entry for the local player
- [ ] Add `loadDeck(url)` async function: call `/api/deck`, then enrich, then `setGameState`
- [ ] After deck loads, auto-call `setMyCommander` with the commander's Scryfall card object
- [ ] Pass `deck` and `onLoadDeck` down to `CardSidebar`

### Sidebar UI (`CardSidebar.jsx`)
- [ ] Add deck URL text input at the top of the sidebar
- [ ] Add Load button that calls `onLoadDeck(url)`
- [ ] Show a loading indicator while fetching/enriching
- [ ] Show an error message on failure (not-found, private, unknown-service)
- [ ] Show deck name label once a deck is loaded (e.g. "Deck: Atraxa Superfriends")

### Card search (`CardSidebar.jsx`)
- [ ] Accept `deck` prop
- [ ] When `deck` is loaded: filter `deck.cards` locally by name substring match
- [ ] When `deck` is null: fall back to existing Scryfall debounced search (no change)
- [ ] Show "Searching your deck" label when in deck mode
- [ ] Add "Search all cards" toggle to override to Scryfall search even when a deck is loaded

### Commander auto-set (`Room.jsx` + `CommanderPicker.jsx`)
- [ ] On deck load, find the commander in the enriched cards array and call `setMyCommander`
- [ ] `CommanderPicker` remains available for manual override / players without a deck

---

## Out of scope for this branch

- Displaying other players' full decklists (privacy — only their commander is shared)
- Sideboard / maybeboard cards
- Deck validation or legality checking
- Syncing which cards a player has drawn/played
