## Goal

Request a 16/9 aspect ratio from the webcam by default, so the browser picks the best resolution that fits that ratio rather than defaulting to whatever it likes (typically 640x480, which is 4:3).

## Affected files

- `src/components/Room.jsx` — only file that needs to change. This is where `getUserMedia` is called for the local stream, both on initial load and whenever the user changes their device selection via DeviceSelector. DeviceSelector preview is left unchanged.

## What changes

### `src/components/Room.jsx`

The `useEffect` that calls `getUserMedia` currently builds `videoConstraint` as either `{ deviceId: { exact: videoDeviceId } }` (when a device is selected) or the bare value `true` (when no device is selected). Neither form specifies any aspect ratio.

Change `videoConstraint` to always include `aspectRatio: { ideal: 16/9 }`. Using `ideal` (not `exact`) means the browser falls back gracefully if the camera cannot satisfy it.

Before:
```js
const videoConstraint = videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true
```

After:
```js
const videoConstraint = videoDeviceId
  ? { deviceId: { exact: videoDeviceId }, aspectRatio: { ideal: 16/9 } }
  : { aspectRatio: { ideal: 16/9 } }
```

The permission-probe call (`getUserMedia({ video: true, audio: true })`) does not need to change — it is only used to trigger the browser permission prompt so device labels are populated, and is immediately stopped.

## What stays the same

- `src/components/DeviceSelector.jsx` — preview stream is left at browser defaults.
- The `audio` constraints are not touched anywhere.
- The `DeviceSelector` UI (dropdowns, preview element, apply/cancel flow) is unchanged.
- WebRTC peer connection setup, track replacement logic (`sender.replaceTrack`), and all signaling code in `Room.jsx` are unchanged.
- The `PlayerVideo` component is unchanged.
- The server (`server/index.js`) is entirely unaffected.

## Open questions

None — decisions made: aspect ratio only (no fixed dimensions), 16/9, DeviceSelector preview unchanged.
