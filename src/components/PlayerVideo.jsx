import { useEffect, useRef, useState } from 'react'
import CommanderDamage from './CommanderDamage.jsx'
import CommanderPicker from './CommanderPicker.jsx'

function cardImage(card) {
  if (card.image_uris?.normal) return card.image_uris.normal
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
  return null
}

export default function PlayerVideo({ player, isLocal, opponents, onLifeDelta, onSetLife, onCommanderDamage, onPoisonDelta, onReset, volume, rotated, onVolumeChange, onToggleRotate, onSetCommanders, onLoadDeck, isMuted, isVideoHidden, onToggleMute, onToggleVideo }) {
  const videoRef = useRef(null)
  const commanderBarRef = useRef(null)
  const [editingLife, setEditingLife] = useState(false)
  const [lifeInput, setLifeInput] = useState('')
  const [showCmdDmg, setShowCmdDmg] = useState(false)
  const [showCommanderPicker, setShowCommanderPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState('primary')
  const [commanderHoverRect, setCommanderHoverRect] = useState(null)

  const { stream, name, state } = player
  const life = state?.life ?? 40
  const commanderDamage = state?.commanderDamage ?? {}
  const poison = state?.poison ?? 0
  const commanders = state?.commanders ?? []

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
  const isEliminated = life <= 0 || Object.values(commanderDamage).some((d) => d >= 21) || poison >= 10

  return (
    <div className={`player-video ${isEliminated ? 'eliminated' : ''}`}>
      {/* Always keep video in DOM so videoRef is valid when srcObject is set */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="video-el"
        style={{ display: (stream && !(isLocal && isVideoHidden)) ? 'block' : 'none', transform: rotated ? 'rotate(180deg)' : undefined }}
      />
      {!stream && (
        <div className="video-placeholder">
          <span>{name?.[0]?.toUpperCase() ?? '?'}</span>
        </div>
      )}
      {isLocal && isVideoHidden && stream && (
        <div className="video-placeholder">
          <span>{name?.[0]?.toUpperCase() ?? '?'}</span>
        </div>
      )}

      <div className="player-overlay">
        <span className="player-name">{name}</span>

        {(isLocal || commanders.length > 0) && (
          <div
            ref={commanderBarRef}
            className="commander-bar"
            onMouseEnter={() => { if (commanderBarRef.current) setCommanderHoverRect(commanderBarRef.current.getBoundingClientRect()) }}
            onMouseLeave={() => setCommanderHoverRect(null)}
          >
            {[0, 1].map((i) => {
              const cmdr = commanders[i]
              const mode = i === 0 ? 'primary' : 'partner'
              const label = i === 0 ? '+CMDR' : '+PARTNER'
              if (!isLocal && !cmdr) return null
              return cmdr ? (
                <div key={i} className="commander-chip" title={cmdr.name}>
                  <span className="commander-chip-label">CMDR</span>
                  <span className="commander-chip-name">{cmdr.name}</span>
                  {isLocal && (
                    <button
                      className="commander-chip-remove"
                      onClick={(e) => { e.stopPropagation(); onSetCommanders(commanders.filter((_, j) => j !== i)) }}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <button
                  key={i}
                  className="commander-chip commander-chip-empty"
                  onClick={() => { setPickerMode(mode); setShowCommanderPicker(true) }}
                  title={label}
                >
                  <span className="commander-chip-label">{label}</span>
                </button>
              )
            })}
          </div>
        )}

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

        {isLocal && (
          <button
            className={`cmd-btn ${totalCmdDmg > 0 || poison > 0 ? 'has-damage' : ''}`}
            onClick={() => setShowCmdDmg(true)}
            title="Commander damage & poison"
          >
            DMG
          </button>
        )}

        {isLocal && (
          <button className="reset-btn" onClick={onReset} title="Reset to 40 life, clear commander damage">
            RESET
          </button>
        )}

        {isLocal && (
          <>
            <button
              className={`mute-btn${isMuted ? ' active' : ''}`}
              onClick={onToggleMute}
              title="Toggle microphone"
            >
              MUTE
            </button>
            <button
              className={`cam-btn${isVideoHidden ? ' active' : ''}`}
              onClick={onToggleVideo}
              title="Toggle camera"
            >
              CAM
            </button>
          </>
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
          poison={poison}
          onPoisonDelta={onPoisonDelta}
          onClose={() => setShowCmdDmg(false)}
        />
      )}

      {commanderHoverRect && commanders.length > 0 && commanders.some(c => cardImage(c)) && (
        <div style={{
          position: 'fixed',
          top: commanderHoverRect.bottom + 6,
          left: commanderHoverRect.left,
          zIndex: 100,
          lineHeight: 0,
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          display: 'flex',
          gap: 8,
        }}>
          {commanders.map((cmdr, i) => {
            const img = cardImage(cmdr)
            return img ? (
              <img key={i} src={img} alt={cmdr.name} style={{ width: commanders.length > 1 ? 180 : 300, borderRadius: 8, display: 'block' }} />
            ) : null
          })}
        </div>
      )}

      {showCommanderPicker && (
        <CommanderPicker
          mode={pickerMode}
          onSelect={(card) => {
            const updated = pickerMode === 'primary'
              ? [card, ...commanders.slice(1)]
              : [commanders[0], card]
            onSetCommanders(updated.filter(Boolean))
            setShowCommanderPicker(false)
          }}
          onClose={() => setShowCommanderPicker(false)}
          onLoadDeck={onLoadDeck}
        />
      )}
    </div>
  )
}
