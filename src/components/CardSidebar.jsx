import { useState, useRef, useEffect } from 'react'
import { cardImages } from '../utils/cardImages.js'

const SCRYFALL_SEARCH = 'https://api.scryfall.com/cards/search'


export default function CardSidebar({ width, onWidthChange, onClose, lobbyActions = [], onRollD20, onCardSelect, deck, lobbyCards = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hoverAnchor, setHoverAnchor] = useState(null)
  const [searchAll, setSearchAll] = useState(false)
  const debounceRef = useRef(null)
  const resizingRef = useRef(false)

  function handleCardMouseEnter(e, card) {
    setHoveredCard(card)
    setHoverAnchor(e.currentTarget.getBoundingClientRect())
  }

  useEffect(() => {
    if (lobbyCards.length > 0 && !searchAll) {
      if (!query.trim()) { setResults([]); return }
      const q = query.toLowerCase()
      setResults(lobbyCards.filter((c) => c.name.toLowerCase().includes(q)))
      return
    }
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
  }, [query, lobbyCards, searchAll])

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

  const hoverImgs = hoveredCard ? cardImages(hoveredCard) : []

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
        {lobbyCards.length > 0 && (
          <div className="sidebar-deck-mode">
            {searchAll
              ? <span className="sidebar-status muted">Searching all cards</span>
              : <span className="sidebar-status muted">Searching lobby decks</span>
            }
            <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '2px 6px' }} onClick={() => setSearchAll((v) => !v)}>
              {searchAll ? 'Back to decks' : 'Search all cards'}
            </button>
          </div>
        )}
        {lobbyCards.length === 0 && !query.trim() && (
          <p className="sidebar-status muted">Load a deck URL to scope search to lobby decks.</p>
        )}
        {loading && <p className="sidebar-status">Searching…</p>}
        {error && <p className="sidebar-status error">{error}</p>}
        {!loading && !error && results.length === 0 && query.trim() && (
          <p className="sidebar-status">No results.</p>
        )}

        {results.map((card) => (
          <div
            key={card.id}
            className="card-result"
            draggable
            onDragStart={(e) => dragCard(e, card)}
            onMouseEnter={(e) => handleCardMouseEnter(e, card)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onCardSelect?.(card)}
          >
            <div className="card-result-header">
              <span className="card-name">{card.name}</span>
              <span className="card-mana">{card.mana_cost ?? ''}</span>
            </div>
            <div className="card-drag-hint">⠿ drag to board</div>
          </div>
        ))}
      </div>
      <button className="d20-btn" onClick={onRollD20}>Roll d20</button>
      {lobbyActions.length > 0 && (
        <div className="sidebar-recent">
          <div className="sidebar-recent-header">Lobby Actions</div>
          {lobbyActions.map((entry, i) => {
            if (entry.type === 'card') {
              return (
                <div
                  key={entry.card.id + '-' + i}
                  className="card-result"
                  draggable
                  onDragStart={(e) => dragCard(e, entry.card)}
                  onMouseEnter={(e) => handleCardMouseEnter(e, entry.card)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="card-result-header">
                    <span className="card-name">{entry.card.name}</span>
                    <span className="card-mana recent-player">{entry.playerName}</span>
                  </div>
                  <div className="card-drag-hint">⠿ drag to board</div>
                </div>
              )
            }
            return (
              <div key={'roll-' + i} className="action-roll-entry">
                <span className="recent-player">{entry.playerName}</span> rolled a <strong>{entry.result}</strong>
              </div>
            )
          })}
        </div>
      )}

      {hoverImgs.length > 0 && hoverAnchor && (
        <div style={{
          position: 'fixed',
          top: Math.min(hoverAnchor.top, window.innerHeight - 420),
          right: window.innerWidth - hoverAnchor.left + 8,
          zIndex: 50,
          lineHeight: 0,
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {hoverImgs.map((url, i) => (
              <img key={i} src={url} alt={hoveredCard.name} style={{ width: 300, borderRadius: 8, display: 'block' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
