import { createApp } from '../../../server/app.js'
import request from 'supertest'

let app, server
beforeEach(() => {
  ({ app, server } = createApp())
})
afterEach(() => new Promise((res) => server.close(res)))

describe('GET /api/deck', () => {
  it('missing url param returns 400 unknown-service', async () => {
    const res = await request(app).get('/api/deck')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'unknown-service' })
  })

  it('malformed url string returns 400 unknown-service', async () => {
    const res = await request(app).get('/api/deck?url=not-a-url')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'unknown-service' })
  })

  it('non-archidekt url returns 400 unknown-service', async () => {
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Fmoxfield.com%2Fdecks%2F123')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'unknown-service' })
  })

  it('archidekt url with no /decks/ segment returns 400 unknown-service', async () => {
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fsomething%2F123')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'unknown-service' })
  })

  it('archidekt url with /decks/ but no id after it returns 400 not-found', async () => {
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'not-found' })
  })

  it('upstream 404 returns body error not-found with status 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }))
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F999')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ error: 'not-found' })
    vi.unstubAllGlobals()
  })

  it('upstream 401 returns body error private with status 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false }))
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F999')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ error: 'private' })
    vi.unstubAllGlobals()
  })

  it('upstream 403 returns body error private with status 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 403, ok: false }))
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F999')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ error: 'private' })
    vi.unstubAllGlobals()
  })

  it('upstream throws returns 500 fetch-failed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F999')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'fetch-failed' })
    vi.unstubAllGlobals()
  })

  it('success: upstream valid json returns name, commander, partnerCommander, cards', async () => {
    const mockData = {
      name: 'My Deck',
      cards: [
        { card: { oracleCard: { name: 'Sol Ring' }, uid: 'abc' }, categories: ['Commander'], quantity: 1 },
        { card: { oracleCard: { name: 'Lightning Bolt' }, uid: 'def' }, categories: [], quantity: 2 },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => mockData }))
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F123')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('My Deck')
    expect(res.body.commander).toEqual({ name: 'Sol Ring', scryfallId: 'abc' })
    expect(res.body.partnerCommander).toBeNull()
    expect(res.body.cards).toEqual([{ name: 'Lightning Bolt', scryfallId: 'def', quantity: 2 }])
    vi.unstubAllGlobals()
  })

  it('success with two commanders populates commander and partnerCommander', async () => {
    const mockData = {
      name: 'Partner Deck',
      cards: [
        { card: { oracleCard: { name: 'Tana' }, uid: 'uid1' }, categories: ['Commander'], quantity: 1 },
        { card: { oracleCard: { name: 'Tymna' }, uid: 'uid2' }, categories: ['Commander'], quantity: 1 },
        { card: { oracleCard: { name: 'Forest' }, uid: 'uid3' }, categories: [], quantity: 10 },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => mockData }))
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F456')
    expect(res.status).toBe(200)
    expect(res.body.commander).toEqual({ name: 'Tana', scryfallId: 'uid1' })
    expect(res.body.partnerCommander).toEqual({ name: 'Tymna', scryfallId: 'uid2' })
    expect(res.body.cards).toEqual([{ name: 'Forest', scryfallId: 'uid3', quantity: 10 }])
    vi.unstubAllGlobals()
  })

  it('success with no commanders returns commander null and partnerCommander null', async () => {
    const mockData = {
      name: 'Commanderless Deck',
      cards: [
        { card: { oracleCard: { name: 'Island' }, uid: 'uid4' }, categories: [], quantity: 20 },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => mockData }))
    const res = await request(app).get('/api/deck?url=https%3A%2F%2Farchidekt.com%2Fdecks%2F789')
    expect(res.status).toBe(200)
    expect(res.body.commander).toBeNull()
    expect(res.body.partnerCommander).toBeNull()
    expect(res.body.cards).toEqual([{ name: 'Island', scryfallId: 'uid4', quantity: 20 }])
    vi.unstubAllGlobals()
  })
})
