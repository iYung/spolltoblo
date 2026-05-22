import { useState } from 'react'
import PlayerVideo from './PlayerVideo.jsx'

export default function VideoGrid({ players, myId, onLifeDelta, onSetLife, onCommanderDamage, onPoisonDelta, onReset, volumes, rotations, onVolumeChange, onToggleRotate, onSetCommanders, onLoadDeck, isMuted, isVideoHidden, onToggleMute, onToggleVideo, onReorder }) {
  const [dragIndex, setDragIndex] = useState(null)
  const count = players.length

  const gridStyle = {
    gridTemplateColumns: count <= 1 ? '1fr'
      : count <= 2 ? '1fr 1fr'
      : count <= 4 ? '1fr 1fr'
      : 'repeat(3, 1fr)',
  }

  return (
    <div className="video-grid" style={gridStyle}>
      {players.map((player, i) => (
        <div
          key={player.peerId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i); setDragIndex(null) }}
          style={{ position: 'relative', display: 'flex' }}
        >
          <span
            className="player-drag-handle"
            draggable={true}
            onDragStart={() => setDragIndex(i)}
            title="Drag to reorder"
          >⠿</span>
          <PlayerVideo
            player={player}
            isLocal={player.peerId === myId}
            opponents={players.filter((p) => p.peerId !== player.peerId)}
            onLifeDelta={onLifeDelta}
            onSetLife={onSetLife}
            onCommanderDamage={onCommanderDamage}
            onPoisonDelta={onPoisonDelta}
            onReset={onReset}
            volume={volumes?.[player.peerId] ?? 1}
            rotated={rotations?.[player.peerId] ?? false}
            onVolumeChange={(v) => onVolumeChange(player.peerId, v)}
            onToggleRotate={() => onToggleRotate(player.peerId)}
            onSetCommanders={onSetCommanders}
            onLoadDeck={onLoadDeck}
            isMuted={isMuted}
            isVideoHidden={isVideoHidden}
            onToggleMute={onToggleMute}
            onToggleVideo={onToggleVideo}
          />
        </div>
      ))}
    </div>
  )
}
