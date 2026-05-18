import { useState, useRef, useEffect } from 'react'

const SCRYFALL_SEARCH = 'https://api.scryfall.com/cards/search'

function cardImage(card) {
  if (card.image_uris?.normal) return card.image_uris.normal
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
  return null
}

export default function CommanderPicker({ onSelect, onClose, onLoadDeck, mode = 'primary' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hoverAnchor, setHoverAnchor] = useState(null)
  const [deckUrl, setDeckUrl] = useState('')
  const [deckLoading, setDeckLoading] = useState(false)
  const [deckError, setDeckError] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const q = `${query} is:commander`
        const res = await fetch(`${SCRYFALL_SEARCH}?q=${encodeURIComponent(q)}&order=name&unique=cards`)
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

  async function handleLoadDeck() {
    if (!deckUrl.trim() || !onLoadDeck) return
    setDeckLoading(true)
    setDeckError('')
    try {
      await onLoadDeck(deckUrl.trim())
      onClose()
    } catch (err) {
      const msg = err.message
      if (msg === 'not-found') setDeckError('Deck not found. Is the URL correct?')
      else if (msg === 'private') setDeckError('That deck is set to private.')
      else if (msg === 'unknown-service') setDeckError('Paste an Archidekt URL.')
      else setDeckError('Failed to load deck. Try again.')
    } finally {
      setDeckLoading(false)
    }
  }

  return (
    <div className="cmd-dmg-overlay" onClick={onClose}>
      <div className="commander-picker-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-dmg-header">
          <h3>{mode === 'partner' ? 'Add Partner Commander' : 'Select Commander'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="commander-picker-deck-loader">
          <input
            className="search-input"
            placeholder="Paste Archidekt URL to load deck…"
            value={deckUrl}
            onChange={(e) => setDeckUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadDeck()}
            disabled={deckLoading}
          />
          <button className="btn-primary" onClick={handleLoadDeck} disabled={deckLoading || !deckUrl.trim()}>
            {deckLoading ? 'Loading…' : 'Load'}
          </button>
          {deckError && <p className="sidebar-status error">{deckError}</p>}
        </div>

        <div className="commander-picker-divider">or search manually</div>

        <input
          className="search-input"
          style={{ margin: '0 12px', width: 'calc(100% - 24px)' }}
          placeholder="Search commanders…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="commander-picker-results">
          {loading && <p className="sidebar-status">Searching…</p>}
          {error && <p className="sidebar-status error">{error}</p>}
          {!loading && !error && results.length === 0 && query.trim() && (
            <p className="sidebar-status">No results.</p>
          )}
          {!loading && !error && results.length === 0 && !query.trim() && (
            <p className="sidebar-status muted">Type a commander's name to search.</p>
          )}

          {results.map((card) => (
            <div
              key={card.id}
              className="card-result"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => { setHoveredCard(card); setHoverAnchor(e.currentTarget.getBoundingClientRect()) }}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => onSelect(card)}
            >
              <div className="card-result-header">
                <span className="card-name">{card.name}</span>
                <span className="card-mana">{card.mana_cost ?? ''}</span>
              </div>
            </div>
          ))}
        </div>

        {hoveredCard && cardImage(hoveredCard) && hoverAnchor && (
          <div style={{
            position: 'fixed',
            top: Math.min(hoverAnchor.top, window.innerHeight - 420),
            left: hoverAnchor.right + 8,
            zIndex: 200,
            lineHeight: 0,
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}>
            <img src={cardImage(hoveredCard)} alt={hoveredCard.name} style={{ width: 240, borderRadius: 8, display: 'block' }} />
          </div>
        )}
      </div>
    </div>
  )
}
