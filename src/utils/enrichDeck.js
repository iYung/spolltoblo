const SCRYFALL_COLLECTION = 'https://api.scryfall.com/cards/collection'

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function enrichDeck(normalizedDeck) {
  const ids = [
    ...normalizedDeck.cards.map((c) => c.scryfallId),
    normalizedDeck.commander?.scryfallId,
    normalizedDeck.partnerCommander?.scryfallId,
  ].filter(Boolean)

  const uniqueIds = [...new Set(ids)]
  const chunks = chunk(uniqueIds, 75)

  const allCards = []
  for (const batch of chunks) {
    const res = await fetch(SCRYFALL_COLLECTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch.map((id) => ({ id })) }),
    })
    if (!res.ok) throw new Error(`Scryfall collection fetch failed: ${res.status}`)
    const data = await res.json()
    allCards.push(...(data.data ?? []))
  }

  const byId = Object.fromEntries(allCards.map((c) => [c.id, c]))

  return {
    name: normalizedDeck.name,
    commander: normalizedDeck.commander ? (byId[normalizedDeck.commander.scryfallId] ?? null) : null,
    partnerCommander: normalizedDeck.partnerCommander ? (byId[normalizedDeck.partnerCommander.scryfallId] ?? null) : null,
    cards: normalizedDeck.cards.map((c) => byId[c.scryfallId]).filter(Boolean),
  }
}
