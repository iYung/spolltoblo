import PlayerVideo from './PlayerVideo.jsx'

export default function VideoGrid({ players, myId, onLifeDelta, onSetLife, onCommanderDamage, volumes, rotations, onVolumeChange, onToggleRotate }) {
  const count = players.length

  const gridStyle = {
    gridTemplateColumns: count <= 1 ? '1fr'
      : count <= 2 ? '1fr 1fr'
      : count <= 4 ? '1fr 1fr'
      : 'repeat(3, 1fr)',
  }

  return (
    <div className="video-grid" style={gridStyle}>
      {players.map((player) => (
        <PlayerVideo
          key={player.peerId}
          player={player}
          isLocal={player.peerId === myId}
          opponents={players.filter((p) => p.peerId !== player.peerId)}
          onLifeDelta={onLifeDelta}
          onSetLife={onSetLife}
          onCommanderDamage={onCommanderDamage}
          volume={volumes?.[player.peerId] ?? 1}
          rotated={rotations?.[player.peerId] ?? false}
          onVolumeChange={(v) => onVolumeChange(player.peerId, v)}
          onToggleRotate={() => onToggleRotate(player.peerId)}
        />
      ))}
    </div>
  )
}
