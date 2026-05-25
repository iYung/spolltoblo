## Unify Webcam Buttons Checklist

- [x] Task A — `src/index.css` — Add a `.overlay-btn` rule with the shared base style (`background: rgba(255,255,255,0.1); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-muted); cursor: pointer; font-size: 13px; padding: 2px 6px; line-height: 1.4; flex-shrink: 0;`). Then strip those same duplicated properties from `.life-btn`, `.cmd-btn`, `.rotate-btn`, `.reset-btn`, and `.mute-btn, .cam-btn`, leaving only their unique properties (e.g. `.life-btn:hover`, `.cmd-btn:hover`, `.cmd-btn.has-damage`, `.rotate-btn:hover`, `.reset-btn:hover`, `.mute-btn.active`, `.cam-btn.active` stay untouched).

- [x] Task B — `src/components/PlayerVideo.jsx` — Add `overlay-btn` to the `className` of every overlay button: the four life buttons (`life-btn`), the DMG button (`cmd-btn`), the RESET button (`reset-btn`), the MUTE button (`mute-btn`), the CAM button (`cam-btn`), and the FLIP CAM button (`rotate-btn`).
