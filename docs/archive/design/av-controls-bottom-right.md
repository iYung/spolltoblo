# AV Controls — Move to Bottom Right

## Goal

Reduce clutter in the top-right overlay of each player card by separating game controls from A/V controls. Game controls stay top-right; A/V controls move to a new always-visible bottom-right overlay.

## Affected files

- `src/components/PlayerVideo.jsx` — move MUTE, CAM, FLIP CAM, and volume slider out of `.player-overlay` into a new bottom overlay element
- `src/index.css` — add `.player-overlay-bottom` styles; update `.volume-slider` visibility (no longer hover-only)

## What changes

### Top-right overlay (`.player-overlay`) — keeps game controls only

Local player retains:
- Life buttons (-5, -1, life total, +1, +5)
- DMG button
- RESET button
- Commander bar (chips + add buttons)

Remote players retain:
- Player name (already there, unchanged)

### New bottom-right overlay (`.player-overlay-bottom`) — A/V controls

All players get a new absolutely-positioned element anchored to the bottom-right of the video card containing:

**Local player:**
- MUTE button
- CAM button

**All players (including remote):**
- FLIP CAM button
- Volume slider (remote players only show this; local player does not have a volume slider for themselves)

Visibility: always visible (no hover-only behavior).

Style: mirrors the existing top overlay aesthetic — dark semi-transparent background, same button classes, same font sizes.

## What stays the same

- Commander bar stays in the top overlay, unchanged
- Button labels, colors, and active states (red mute/cam borders, etc.) are unchanged
- Room header buttons (Copy Link, Devices) are unaffected
- Sidebar controls are unaffected
- Remote player volume slider moves to bottom-right but keeps its existing slider styling; the `opacity: 0` / hover reveal behavior is removed (it will be always visible)

## Open questions

None — all clarified with user.
