import { enrichDeck } from '../../utils/enrichDeck.js'

const makeScryfallCard = (id) => ({ id, name: `Card ${id}` })

const makeFetch = (responses) => {
  let call = 0
  return vi.fn(async () => {
    const data = responses[call++]
    return {
      ok: true,
      json: async () => ({ data }),
    }
  })
}

describe('enrichDeck', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('makes one fetch call when IDs fit in a single chunk', async () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({ scryfallId: `id-${i}` }))
    const scryfallCards = cards.map((c) => makeScryfallCard(c.scryfallId))
    const fetch = makeFetch([scryfallCards])
    vi.stubGlobal('fetch', fetch)

    await enrichDeck({ name: 'Test', commander: null, partnerCommander: null, cards })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('makes two fetch calls when IDs exceed 75', async () => {
    const cards = Array.from({ length: 80 }, (_, i) => ({ scryfallId: `id-${i}` }))
    const firstBatch = cards.slice(0, 75).map((c) => makeScryfallCard(c.scryfallId))
    const secondBatch = cards.slice(75).map((c) => makeScryfallCard(c.scryfallId))
    const fetch = makeFetch([firstBatch, secondBatch])
    vi.stubGlobal('fetch', fetch)

    await enrichDeck({ name: 'Test', commander: null, partnerCommander: null, cards })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('deduplicates IDs when commander and card share the same scryfallId', async () => {
    const sharedId = 'shared-id'
    const cards = [{ scryfallId: sharedId }, { scryfallId: 'other-id' }]
    const commander = { scryfallId: sharedId }
    const scryfallCards = [makeScryfallCard(sharedId), makeScryfallCard('other-id')]
    const fetch = makeFetch([scryfallCards])
    vi.stubGlobal('fetch', fetch)

    await enrichDeck({ name: 'Test', commander, partnerCommander: null, cards })

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    const sentIds = body.identifiers.map((i) => i.id)
    expect(sentIds).toHaveLength(2)
    expect(new Set(sentIds).size).toBe(2)
  })

  it('maps enriched card data back correctly for commander, partnerCommander, and cards', async () => {
    const commanderCard = makeScryfallCard('cmd-id')
    const partnerCard = makeScryfallCard('partner-id')
    const card1 = makeScryfallCard('card-1')
    const card2 = makeScryfallCard('card-2')
    const fetch = makeFetch([[commanderCard, partnerCard, card1, card2]])
    vi.stubGlobal('fetch', fetch)

    const result = await enrichDeck({
      name: 'My Deck',
      commander: { scryfallId: 'cmd-id' },
      partnerCommander: { scryfallId: 'partner-id' },
      cards: [{ scryfallId: 'card-1' }, { scryfallId: 'card-2' }],
    })

    expect(result.commander).toEqual(commanderCard)
    expect(result.partnerCommander).toEqual(partnerCard)
    expect(result.cards).toEqual([card1, card2])
    expect(result.name).toBe('My Deck')
  })

  it('filters out cards where no matching Scryfall data was returned', async () => {
    const cards = [{ scryfallId: 'found-id' }, { scryfallId: 'missing-id' }]
    const fetch = makeFetch([[makeScryfallCard('found-id')]])
    vi.stubGlobal('fetch', fetch)

    const result = await enrichDeck({ name: 'Test', commander: null, partnerCommander: null, cards })

    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].id).toBe('found-id')
  })

  it('throws an error when fetch returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))

    await expect(
      enrichDeck({ name: 'Test', commander: null, partnerCommander: null, cards: [{ scryfallId: 'x' }] })
    ).rejects.toThrow('Scryfall collection fetch failed: 404')
  })

  it('handles null commander gracefully', async () => {
    const cards = [{ scryfallId: 'card-1' }]
    const fetch = makeFetch([[makeScryfallCard('card-1')]])
    vi.stubGlobal('fetch', fetch)

    const result = await enrichDeck({ name: 'Test', commander: null, partnerCommander: null, cards })

    expect(result.commander).toBeNull()
    expect(result.partnerCommander).toBeNull()
    expect(result.cards).toHaveLength(1)
  })
})
