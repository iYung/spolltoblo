## AV Controls — Bottom Right Checklist

- [x] Task A — `src/index.css` — Add `.player-overlay-bottom` styles: `position: absolute; bottom: 0; right: 0; display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: linear-gradient(transparent, rgba(0,0,0,0.85))` (mirroring the top overlay's dark fade, reversed). Also remove the `.player-video:hover .volume-slider { opacity: 1 }` rule and set `.volume-slider { opacity: 1 }` directly so it is always visible.

- [x] Task B — `src/components/PlayerVideo.jsx` — Remove MUTE button, CAM button, FLIP CAM button, and volume slider from the `.player-overlay` div. Create a new `<div className="player-overlay-bottom">` sibling to `.player-overlay` (inside the same wrapper) containing: MUTE + CAM (local player only, inside `{isLocal && ...}`), FLIP CAM (all players), and the volume slider (remote players only, inside `{!isLocal && ...}`).
