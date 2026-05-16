import { useRef } from 'react'
import VideoGrid from './VideoGrid.jsx'
import CardPin from './CardPin.jsx'

export default function PlayArea({
  players,
  myId,
  pinnedCards,
  onPinCard,
  onUnpinCard,
  onMoveCard,
  onLifeDelta,
  onSetLife,
  onCommanderDamage,
  onPoisonDelta,
  onReset,
  volumes,
  rotations,
  onVolumeChange,
  onToggleRotate,
  onSetCommander,
}) {
  const areaRef = useRef(null)

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('card')
    if (!raw) return
    const card = JSON.parse(raw)
    const rect = areaRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onPinCard(card, x, y)
  }

  return (
    <div
      ref={areaRef}
      className="play-area"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <VideoGrid
        players={players}
        myId={myId}
        onLifeDelta={onLifeDelta}
        onSetLife={onSetLife}
        onCommanderDamage={onCommanderDamage}
        onPoisonDelta={onPoisonDelta}
        onReset={onReset}
        volumes={volumes}
        rotations={rotations}
        onVolumeChange={onVolumeChange}
        onToggleRotate={onToggleRotate}
        onSetCommander={onSetCommander}
      />

      {pinnedCards.map((pin) => (
        <CardPin
          key={pin.id}
          pin={pin}
          areaRef={areaRef}
          onRemove={() => onUnpinCard(pin.id)}
          onMove={onMoveCard}
        />
      ))}
    </div>
  )
}
