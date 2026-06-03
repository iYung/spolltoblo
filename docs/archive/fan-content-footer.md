## Fan Content Footer Checklist

- [x] Task A — `src/components/Footer.jsx` — Create the Footer component with the WotC fan content disclaimer: "SpollToblo is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC." Link text "Fan Content Policy" should point to `https://company.wizards.com/en/legal/fancontentpolicy`, open in a new tab with `rel="noopener noreferrer"`. Style with small, muted, centered text to sit unobtrusively at the bottom.

- [x] Task B — `src/App.jsx` — Import `Footer` from `./components/Footer.jsx` and render `<Footer />` at the bottom of the landing screen (`!joined` branch), after the closing `</div>` of `.landing-card` but still inside the outer `div.landing`.
