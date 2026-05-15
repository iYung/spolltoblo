import { useState, useRef, useEffect } from 'react'

const SCRYFALL_SEARCH = 'https://api.scryfall.com/cards/search'

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

export default function CardSidebar({ width, onWidthChange, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const debounceRef = useRef(null)
  const resizingRef = useRef(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${SCRYFALL_SEARCH}?q=${encodeURIComponent(query)}&order=name&unique=cards`)
        if (res.status === 404) { setResults([]); setLoading(false); return }
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(data.data ?? [])
      } catch {
        setError('Search failed. Try again.')
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function startResize(e) {
    resizingRef.current = true
    const startX = e.clientX
    const startW = width

    function onMove(ev) {
      if (!resizingRef.current) return
      const delta = startX - ev.clientX
      onWidthChange(Math.max(200, Math.min(560, startW + delta)))
    }
    function onUp() {
      resizingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function dragCard(e, card) {
    e.dataTransfer.setData('card', JSON.stringify(card))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="card-sidebar" style={{ width }}>
      <div className="resize-handle" onMouseDown={startResize} />

      <div className="sidebar-header">
        <span>Card Search</span>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="sidebar-search">
        <input
          className="search-input"
          placeholder="Search cards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="sidebar-results">
        {loading && <p className="sidebar-status">Searching…</p>}
        {error && <p className="sidebar-status error">{error}</p>}
        {!loading && !error && results.length === 0 && query.trim() && (
          <p className="sidebar-status">No results.</p>
        )}
        {!loading && !error && results.length === 0 && !query.trim() && (
          <p className="sidebar-status muted">Type a card name to search. Drag cards onto the board for quick reference.</p>
        )}

        {results.map((card) => {
          const img = cardImage(card)
          const isExpanded = expanded === card.id
          return (
            <div
              key={card.id}
              className="card-result"
              draggable
              onDragStart={(e) => dragCard(e, card)}
            >
              <div className="card-result-header" onClick={() => setExpanded(isExpanded ? null : card.id)}>
                <span className="card-name">{card.name}</span>
                <span className="card-mana">{card.mana_cost ?? ''}</span>
              </div>
              {isExpanded && (
                <div className="card-detail">
                  {img && <img src={img} alt={card.name} className="card-img" />}
                  <div className="card-text">
                    <div className="card-type">{card.type_line}</div>
                    <div className="card-oracle">{cardText(card)}</div>
                    {card.power != null && (
                      <div className="card-pt">{card.power}/{card.toughness}</div>
                    )}
                  </div>
                </div>
              )}
              <div className="card-drag-hint">⠿ drag to board</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
