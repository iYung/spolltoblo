# Fan Content Footer

## Goal

Add a Wizards of the Coast fan content disclaimer footer to the landing/start page, satisfying the legal requirement for fan-made MTG content.

## Affected files

- `src/components/Footer.jsx` — new component (adapted from `../mtg-pai-gow/components/Footer.tsx`)
- `src/App.jsx` — import and render `<Footer />` inside the landing screen branch

## What changes

- A new `Footer` component is created in `src/components/Footer.jsx` containing the standard WotC fan content disclaimer, attributing the app by name ("SpollToblo").
- The footer is rendered at the bottom of the landing page (`!joined` branch in `App.jsx`), outside `.landing-card` but inside the root `div.landing`.
- Styling mirrors the mtg-pai-gow footer: small, muted text, centered, with an underlined link to the Fan Content Policy that opens in a new tab.

## What stays the same

- The footer does **not** appear during play (Room view).
- The `.landing-card` layout is unchanged.
- No new dependencies are introduced.

## Open questions

None — all answered before writing this doc.
