import { useEffect, useRef, useState } from 'react'
import CommanderDamage from './CommanderDamage.jsx'

export default function PlayerVideo({ player, isLocal, opponents, onLifeDelta, onSetLife, onCommanderDamage, onReset, volume, rotated, onVolumeChange, onToggleRotate }) {
  const videoRef = useRef(null)
  const [editingLife, setEditingLife] = useState(false)
  const [lifeInput, setLifeInput] = useState('')
  const [showCmdDmg, setShowCmdDmg] = useState(false)

  const { stream, name, state } = player
  const life = state?.life ?? 40
  const commanderDamage = state?.commanderDamage ?? {}

  // Use addtrack listener so we re-attach when audio/video tracks arrive on the same
  // MediaStream object (reference doesn't change, so [stream] alone wouldn't re-fire).
  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.srcObject = stream ?? null
    if (!stream) return
    function onTrack() {
      if (videoRef.current) videoRef.current.srcObject = stream
    }
    stream.addEventListener('addtrack', onTrack)
    return () => stream.removeEventListener('addtrack', onTrack)
  }, [stream])

  useEffect(() => {
    if (videoRef.current && !isLocal) videoRef.current.volume = volume
  }, [volume, isLocal])

  function commitLifeEdit() {
    const val = parseInt(lifeInput, 10)
    if (!isNaN(val)) onSetLife(val)
    setEditingLife(false)
  }

  const totalCmdDmg = Object.values(commanderDamage).reduce((a, b) => a + b, 0)
  const isEliminated = life <= 0 || Object.values(commanderDamage).some((d) => d >= 21)

  return (
    <div className={`player-video ${isEliminated ? 'eliminated' : ''}`}>
      {/* Always keep video in DOM so videoRef is valid when srcObject is set */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="video-el"
        style={{ display: stream ? 'block' : 'none', transform: rotated ? 'rotate(180deg)' : undefined }}
      />
      {!stream && (
        <div className="video-placeholder">
          <span>{name?.[0]?.toUpperCase() ?? '?'}</span>
        </div>
      )}

      <div className="player-overlay">
        <span className="player-name">{name}</span>

        <div className="life-section">
          {isLocal ? (
            <>
              <button className="life-btn" onClick={() => onLifeDelta(-5)}>-5</button>
              <button className="life-btn" onClick={() => onLifeDelta(-1)}>-1</button>
              {editingLife ? (
                <input
                  className="life-input"
                  value={lifeInput}
                  onChange={(e) => setLifeInput(e.target.value)}
                  onBlur={commitLifeEdit}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitLifeEdit() }}
                  autoFocus
                />
              ) : (
                <span
                  className="life-total"
                  onClick={() => { setLifeInput(String(life)); setEditingLife(true) }}
                  title="Click to set"
                >
                  {life}
                </span>
              )}
              <button className="life-btn" onClick={() => onLifeDelta(1)}>+1</button>
              <button className="life-btn" onClick={() => onLifeDelta(5)}>+5</button>
            </>
          ) : (
            <span className="life-total">{life}</span>
          )}
        </div>

        {isLocal && opponents.length > 0 && (
          <button
            className={`cmd-btn ${totalCmdDmg > 0 ? 'has-damage' : ''}`}
            onClick={() => setShowCmdDmg(true)}
            title="Commander damage"
          >
            ⚔ {totalCmdDmg > 0 ? totalCmdDmg : 'CMD'}
          </button>
        )}

        {isLocal && (
          <button className="reset-btn" onClick={onReset} title="Reset to 40 life, clear commander damage">
            RESET LIFE
          </button>
        )}

        <button className="rotate-btn" onClick={onToggleRotate} title="Flip video">FLIP CAM</button>

        {!isLocal && (
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              onVolumeChange(v)
              if (videoRef.current) videoRef.current.volume = v
            }}
          />
        )}
      </div>

      {isEliminated && (
        <div className="eliminated-banner">ELIMINATED</div>
      )}

      {showCmdDmg && (
        <CommanderDamage
          opponents={opponents}
          commanderDamage={commanderDamage}
          onUpdate={onCommanderDamage}
          onClose={() => setShowCmdDmg(false)}
        />
      )}
    </div>
  )
}
