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
  volumes,
  rotations,
  onVolumeChange,
  onToggleRotate,
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
        volumes={volumes}
        rotations={rotations}
        onVolumeChange={onVolumeChange}
        onToggleRotate={onToggleRotate}
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
