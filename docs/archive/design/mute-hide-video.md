# Mute and Hide Video Buttons

## Goal

Add a **MUTE** (microphone toggle) and a **CAM** (camera toggle) button to the local player's video tile. When muted, other players hear silence. When the camera is hidden, other players see a black frame (the browser still sends an enabled-but-blank track — no renegotiation needed).

## Affected files

- `src/components/Room.jsx` — owns local stream; manages `isMuted` and `isVideoHidden` state and the toggle handlers
- `src/components/PlayArea.jsx` — threads `isMuted`, `isVideoHidden`, `onToggleMute`, `onToggleVideo` through to VideoGrid
- `src/components/VideoGrid.jsx` — threads same props through to PlayerVideo
- `src/components/PlayerVideo.jsx` — renders MUTE / CAM buttons for `isLocal`, reads state to style buttons and hide the `<video>` element when appropriate
- `src/index.css` — styles for active (toggled-on/muted) state of both buttons

## What changes

### Room.jsx

- Add `const [isMuted, setIsMuted] = useState(false)` and `const [isVideoHidden, setIsVideoHidden] = useState(false)`.
- Add `handleToggleMute`: flips `isMuted`, then finds the first audio track on `localStreamRef.current` and sets `track.enabled = !isMuted`.
- Add `handleToggleVideo`: flips `isVideoHidden`, then finds the first video track on `localStreamRef.current` and sets `track.enabled = !isVideoHidden`.
- When device selection re-runs and a new stream is created, re-apply current `isMuted`/`isVideoHidden` to the new tracks so the toggle state survives device switches.
- Pass `isMuted`, `isVideoHidden`, `onToggleMute={handleToggleMute}`, `onToggleVideo={handleToggleVideo}` to `PlayArea`.

### PlayArea.jsx

- Accept and forward the four new props to `VideoGrid`.

### VideoGrid.jsx

- Accept and forward the four new props to `PlayerVideo`.

### PlayerVideo.jsx

- Accept `isMuted`, `isVideoHidden`, `onToggleMute`, `onToggleVideo` props.
- Render MUTE and CAM buttons inside the `player-overlay` only when `isLocal`.
- When `isLocal && isVideoHidden`, show the placeholder `<div>` instead of the `<video>` element (same letter-avatar, same look as "no stream").
- Apply an `active` CSS class to each button to signal the toggled-on (muted/hidden) state.

### index.css

- Add `.mute-btn` and `.cam-btn` styles matching the existing overlay button family (`rotate-btn`, `reset-btn`).
- Add `.mute-btn.active` and `.cam-btn.active` with a red-tinted border and text color to clearly indicate the track is disabled.

## What stays the same

- Remote player tiles are unaffected — they continue to show volume sliders and flip-cam as before.
- WebRTC connections are not renegotiated; `track.enabled` silences/blacks out the track in-place.
- All existing buttons (FLIP CAM, RESET, DMG, life controls) are unchanged.
- No server-side changes; state is local only — other players will simply receive silence or black video but won't see a badge indicating mute/cam-off.

## Open questions

None — user confirmed local-player-only scope.
