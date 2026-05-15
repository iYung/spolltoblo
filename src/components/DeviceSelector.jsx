import { useState, useEffect, useRef } from 'react'

export default function DeviceSelector({ onClose, onApply }) {
  const [videoDevices, setVideoDevices] = useState([])
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedVideo, setSelectedVideo] = useState('')
  const [selectedAudio, setSelectedAudio] = useState('')
  const previewRef = useRef(null)
  const previewStreamRef = useRef(null)

  useEffect(() => {
    async function load() {
      // Need to request permissions first so labels are populated
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        tmp.getTracks().forEach((t) => t.stop())
      } catch {}
      const devices = await navigator.mediaDevices.enumerateDevices()
      const video = devices.filter((d) => d.kind === 'videoinput')
      const audio = devices.filter((d) => d.kind === 'audioinput')
      setVideoDevices(video)
      setAudioDevices(audio)
      setSelectedVideo(video[0]?.deviceId ?? '')
      setSelectedAudio(audio[0]?.deviceId ?? '')
    }
    load()
    return () => previewStreamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    if (!selectedVideo) return
    previewStreamRef.current?.getTracks().forEach((t) => t.stop())
    navigator.mediaDevices
      .getUserMedia({ video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true, audio: false })
      .then((stream) => {
        previewStreamRef.current = stream
        if (previewRef.current) previewRef.current.srcObject = stream
      })
      .catch(() => {
        if (previewRef.current) previewRef.current.srcObject = null
      })
  }, [selectedVideo])

  function apply() {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop())
    onApply({ videoDeviceId: selectedVideo, audioDeviceId: selectedAudio })
    onClose()
  }

  return (
    <div className="cmd-dmg-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="device-selector-panel">
        <div className="cmd-dmg-header">
          <h3>Camera &amp; Microphone</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <video ref={previewRef} autoPlay playsInline muted className="device-preview" />

        <label className="device-label">Camera</label>
        <select className="device-select" value={selectedVideo} onChange={(e) => setSelectedVideo(e.target.value)}>
          {videoDevices.length === 0 && <option value="">No cameras found</option>}
          {videoDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
          ))}
        </select>

        <label className="device-label">Microphone</label>
        <select className="device-select" value={selectedAudio} onChange={(e) => setSelectedAudio(e.target.value)}>
          {audioDevices.length === 0 && <option value="">No microphones found</option>}
          {audioDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
          ))}
        </select>

        <div className="device-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  )
}
