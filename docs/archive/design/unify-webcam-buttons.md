# Unify Webcam Overlay Buttons

## Goal

All action buttons rendered inside the webcam player overlay (`PlayerVideo`) should share a single visual style. Currently five button classes are styled independently with inconsistent borders, font sizes, and padding.

## Affected files

- `src/index.css` — the only file that needs to change

## What changes

Introduce a shared `.overlay-btn` base class that defines the canonical overlay-button style, then keep the individual class names (so state modifiers like `.mute-btn.active` still work) but remove the duplicated base properties from each.

### Target unified style (`.overlay-btn`)

```css
background: rgba(255,255,255,0.1);
border: 1px solid var(--border);
border-radius: var(--radius);
color: var(--text-muted);
cursor: pointer;
font-size: 13px;
padding: 2px 6px;
line-height: 1.4;
flex-shrink: 0;
```

### Buttons that gain this class

| CSS class | What changes |
|---|---|
| `.life-btn` | gains border, radius 3px→6px, font 11px→13px, padding 2px 5px→2px 6px |
| `.cmd-btn` | font 11px→13px, padding 3px 7px→2px 6px |
| `.rotate-btn` | base properties collapsed into `.overlay-btn` (no visible change) |
| `.reset-btn` | base properties collapsed into `.overlay-btn` (no visible change) |
| `.mute-btn` / `.cam-btn` | base properties collapsed into `.overlay-btn` (no visible change) |

State modifiers (`.mute-btn.active`, `.cam-btn.active`, `.cmd-btn.has-damage`) and hover rules stay on their individual classes unchanged.

The JSX in `PlayerVideo.jsx` also needs `overlay-btn` added to each button's `className`.

## What stays the same

- All per-button state/hover behaviour (active, has-damage, red hover on reset, etc.)
- `volume-slider`, `close-btn`, `life-total`, `commander-chip` — untouched
- Every other component and file

## Open questions

None — user confirmed life-btn should match fully.
