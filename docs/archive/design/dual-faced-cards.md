# Dual-Faced Card Hover Support

## Goal

When hovering over a dual-faced card (DFC), show both faces side by side instead of only the front face. No changes to card chips or list items — the change is entirely in the hover popup.

## Affected files

- `src/components/CardSidebar.jsx` — hover popup in search results and recent cards
- `src/components/CardPin.jsx` — hover popup for pinned cards on the play area
- `src/components/PlayerVideo.jsx` — hover popup for commander chips
- `src/components/CommanderPicker.jsx` — hover popup in commander search results

## What changes

**`cardImage()` helper** (currently duplicated in all 4 files) is not enough for DFCs — it returns only one URL. Instead of a single `<img>`, the hover popup will render a helper that returns either one or two images based on `card.card_faces`.

**Hover popup** in all 4 components: when the hovered card has `card.card_faces` with at least 2 entries each having their own `image_uris`, render two `<img>` tags side by side inside the popup container. For single-faced cards the popup is unchanged (one image, same as today).

**Layout**: both images at the same size as the current single image (`w-auto`, height fixed at the current popup height). The popup container expands horizontally to fit two images when needed. No flip animation, no toggle button — both faces always visible simultaneously.

**Shared helper**: extract a `cardImages(card)` helper that returns an array of image URLs (`[frontUrl]` or `[frontUrl, backUrl]`) and use it in all 4 popup render sites. The existing `cardImage()` (used to gate whether to show a popup at all) stays in place — it only needs to return a truthy value for DFCs, which it already does via `card.card_faces?.[0]?.image_uris?.normal`.

## What stays the same

- Card chip/list appearance — no DFC indicator added
- Hover trigger (mouseenter/mouseleave) and popup positioning logic
- Single-faced card behavior
- All other game logic, data fetching, and WebSocket handling
- `cardImage()` as the guard condition for showing the popup at all

## Open questions

None — user confirmed side-by-side display with no chip indicator.
