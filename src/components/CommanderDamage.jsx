export default function CommanderDamage({ opponents, commanderDamage, onUpdate, poison, onPoisonDelta, onClose }) {
  const poisonLethal = poison >= 10
  return (
    <div className="cmd-dmg-overlay" onClick={onClose}>
      <div className="cmd-dmg-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-dmg-header">
          <h3>Commander Damage Taken</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <p className="cmd-dmg-hint">Track damage you've taken from each opponent's commander. 21+ = eliminated.</p>

        {opponents.length === 0 ? (
          <p className="cmd-dmg-empty">No opponents yet.</p>
        ) : (
          <ul className="cmd-dmg-list">
            {opponents.flatMap((opp) => {
              const oppCommanders = opp.state?.commanders ?? []
              if (oppCommanders.length <= 1) {
                const dmg = commanderDamage[opp.peerId] ?? 0
                const atLimit = dmg >= 21
                const label = oppCommanders.length === 1
                  ? `${oppCommanders[0].name} (${opp.name})`
                  : opp.name
                return [(
                  <li key={opp.peerId} className={`cmd-dmg-row ${atLimit ? 'at-limit' : ''}`}>
                    <span className="opp-name">{label}</span>
                    <div className="cmd-dmg-controls">
                      <button onClick={() => onUpdate(opp.peerId, -1)} disabled={dmg <= 0}>-1</button>
                      <span className={`cmd-dmg-value ${atLimit ? 'danger' : ''}`}>{dmg}</span>
                      <button onClick={() => onUpdate(opp.peerId, 1)}>+1</button>
                    </div>
                    {atLimit && <span className="eliminated-tag">ELIMINATED</span>}
                  </li>
                )]
              }
              return oppCommanders.map((cmdr, i) => {
                const key = i === 0 ? opp.peerId : `${opp.peerId}_2`
                const dmg = commanderDamage[key] ?? 0
                const atLimit = dmg >= 21
                const label = `${cmdr.name} (${opp.name})`
                return (
                  <li key={key} className={`cmd-dmg-row ${atLimit ? 'at-limit' : ''}`}>
                    <span className="opp-name">{label}</span>
                    <div className="cmd-dmg-controls">
                      <button onClick={() => onUpdate(key, -1)} disabled={dmg <= 0}>-1</button>
                      <span className={`cmd-dmg-value ${atLimit ? 'danger' : ''}`}>{dmg}</span>
                      <button onClick={() => onUpdate(key, 1)}>+1</button>
                    </div>
                    {atLimit && <span className="eliminated-tag">ELIMINATED</span>}
                  </li>
                )
              })
            })}
          </ul>
        )}

        <div className="cmd-dmg-poison-row">
          <span className="cmd-dmg-poison-label">☠ Poison counters</span>
          <div className="cmd-dmg-controls">
            <button onClick={() => onPoisonDelta(-1)} disabled={poison <= 0}>-1</button>
            <span className={`cmd-dmg-value ${poisonLethal ? 'danger' : ''}`}>{poison}</span>
            <button onClick={() => onPoisonDelta(1)}>+1</button>
          </div>
          {poisonLethal && <span className="eliminated-tag">ELIMINATED</span>}
        </div>
      </div>
    </div>
  )
}
