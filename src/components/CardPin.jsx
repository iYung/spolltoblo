import { useState } from 'react'

function cardImage(card) {
  if (card.image_uris?.normal) return card.image_uris.normal
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
  return null
}

function cardText(card) {
  if (card.oracle_text) return card.oracle_text
  if (card.card_faces?.length) return card.card_faces.map((f) => f.oracle_text).filter(Boolean).join('\n—\n')
  return ''
}

export default function CardPin({ pin, areaRef, onRemove, onMove }) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const img = cardImage(pin.card)

  function handleDragHandleMouseDown(e) {
    e.preventDefault()
    setDragging(true)
    setHovered(false)

    function onMouseMove(ev) {
      const rect = areaRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100))
      onMove(pin.id, x, y)
    }

    function onMouseUp() {
      setDragging(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Position popup so it stays on screen
  const showAbove = pin.y > 38
  const popupStyle = {
    [showAbove ? 'bottom' : 'top']: 'calc(100% + 8px)',
    ...(pin.x > 65
      ? { right: 0 }
      : pin.x < 30
      ? { left: 0 }
      : { left: '50%', transform: 'translateX(-50%)' }),
  }

  return (
    <div
      className={`card-pin ${dragging ? 'card-pin-dragging' : ''}`}
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      onMouseEnter={() => { if (!dragging) setHovered(true) }}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-pin-chip">
        <span
          className="card-pin-handle"
          onMouseDown={handleDragHandleMouseDown}
          title="Drag to move"
        >⠿</span>
        <span className="card-pin-name">{pin.card.name}</span>
        <button className="card-pin-remove" onClick={onRemove}>✕</button>
      </div>

      {hovered && !dragging && (
        <div className="card-pin-popup" style={popupStyle}>
          {img && <img src={img} alt={pin.card.name} className="card-popup-img" />}
          <div className="card-popup-text">
            <div className="card-type">{pin.card.type_line}</div>
            <div className="card-oracle">{cardText(pin.card)}</div>
            {pin.card.power != null && (
              <div className="card-pt">{pin.card.power}/{pin.card.toughness}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
