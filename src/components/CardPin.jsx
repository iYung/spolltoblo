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

export default function CardPin({ pin, onRemove }) {
  const [hovered, setHovered] = useState(false)
  const img = cardImage(pin.card)

  return (
    <div
      className="card-pin"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-pin-chip">
        <span className="card-pin-name">{pin.card.name}</span>
        <button className="card-pin-remove" onClick={onRemove}>✕</button>
      </div>

      {hovered && (
        <div className="card-pin-popup">
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
