## Mute and Hide Video Checklist

- [x] Task 1 — `src/index.css` — Add `.mute-btn` and `.cam-btn` styles copied from the existing `.rotate-btn` rule (same `background`, `border`, `border-radius`, `color`, `cursor`, `font-size`, `padding`, `line-height`, `flex-shrink`). Add `.mute-btn.active` and `.cam-btn.active` variants that set `border-color: var(--red)` and `color: var(--red)` to clearly signal the track is disabled. No other files touched.

- [x] Task 2 — `src/components/Room.jsx` — Add state and handlers for mute/video-hidden (no other files touched):
  - Add `const [isMuted, setIsMuted] = useState(false)` and `const [isVideoHidden, setIsVideoHidden] = useState(false)` alongside the existing `useState` calls.
  - Add `function handleToggleMute()`: calls `setIsMuted(prev => !prev)`, then reads `localStreamRef.current.getAudioTracks()[0]` and sets `track.enabled = isMuted` (the pre-flip value means the new value is the opposite — use the functional updater pattern or a local variable to get the new value before setting track).
  - Add `function handleToggleVideo()`: same pattern with `getVideoTracks()[0]` and `isVideoHidden`.
  - Inside the existing `getUserMedia` `.then()` callback, after `localStreamRef.current = stream`, re-apply current state to the new tracks: `stream.getAudioTracks()[0]?.enabled = !isMuted` and `stream.getVideoTracks()[0]?.enabled = !isVideoHidden` so toggle state survives device switches.
  - Pass four new props to `<PlayArea>`: `isMuted={isMuted}`, `isVideoHidden={isVideoHidden}`, `onToggleMute={handleToggleMute}`, `onToggleVideo={handleToggleVideo}`.

- [x] Task 3 — `src/components/PlayArea.jsx` — Accept and forward the four new props (no logic added, no other files touched):
  - Add `isMuted`, `isVideoHidden`, `onToggleMute`, `onToggleVideo` to the destructured parameter list.
  - Pass all four as props to `<VideoGrid>` alongside the existing props.

- [x] Task 4 — `src/components/VideoGrid.jsx` — Accept and forward the four new props to `<PlayerVideo>` (no logic added, no other files touched):
  - Add `isMuted`, `isVideoHidden`, `onToggleMute`, `onToggleVideo` to the destructured parameter list.
  - Pass all four as props on every `<PlayerVideo>` instance inside `.map()`.

- [x] Task 5 — `src/components/PlayerVideo.jsx` — Render the buttons and cam-hidden placeholder (depends on Tasks 1–4 being complete so the props and CSS classes exist):
  - Add `isMuted`, `isVideoHidden`, `onToggleMute`, `onToggleVideo` to the destructured parameter list.
  - Change the `<video>` element's `style` to hide it when `isLocal && isVideoHidden`: replace the current `style={{ display: stream ? 'block' : 'none', ... }}` with `style={{ display: (stream && !(isLocal && isVideoHidden)) ? 'block' : 'none', ... }}`.
  - Add a second placeholder block after the existing `{!stream && <div className="video-placeholder">...}` that renders when `isLocal && isVideoHidden && stream`: `<div className="video-placeholder"><span>{name?.[0]?.toUpperCase() ?? '?'}</span></div>`. This reuses the identical markup and existing `.video-placeholder` styles.
  - Inside `<div className="player-overlay">`, after the existing `{isLocal && <button className="reset-btn" ...>RESET</button>}` block, add a new `{isLocal && (...)}` block containing two buttons:
    - `<button className={`mute-btn${isMuted ? ' active' : ''}`} onClick={onToggleMute} title="Toggle microphone">MUTE</button>`
    - `<button className={`cam-btn${isVideoHidden ? ' active' : ''}`} onClick={onToggleVideo} title="Toggle camera">CAM</button>`
