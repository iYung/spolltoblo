import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.get('/api/deck', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'unknown-service' })

  let parsed
  try { parsed = new URL(url) } catch { return res.status(400).json({ error: 'unknown-service' }) }

  const host = parsed.hostname.replace(/^www\./, '')
  const segments = parsed.pathname.split('/').filter(Boolean)
  const deckIdx = segments.indexOf('decks')
  if (deckIdx === -1) return res.status(400).json({ error: 'unknown-service' })

  try {
    if (host === 'archidekt.com') {
      const deckId = segments[deckIdx + 1]
      if (!deckId) return res.status(400).json({ error: 'not-found' })
      const upstream = await fetch(`https://archidekt.com/api/decks/${deckId}/`, {
        headers: { 'User-Agent': 'spolltoblo/1.0' },
      })
      if (upstream.status === 404) return res.json({ error: 'not-found' })
      if (upstream.status === 401 || upstream.status === 403) return res.json({ error: 'private' })
      if (!upstream.ok) return res.status(500).json({ error: 'fetch-failed' })
      const data = await upstream.json()

      const allCards = data.cards ?? []
      const commanders = allCards.filter((e) => e.categories?.includes('Commander'))
      const mainCards = allCards.filter((e) => !e.categories?.includes('Commander'))

      return res.json({
        name: data.name ?? 'Unknown Deck',
        commander: commanders[0] ? { name: commanders[0].card.oracleCard.name, scryfallId: commanders[0].card.uid } : null,
        partnerCommander: commanders[1] ? { name: commanders[1].card.oracleCard.name, scryfallId: commanders[1].card.uid } : null,
        cards: mainCards.map((e) => ({ name: e.card.oracleCard.name, scryfallId: e.card.uid, quantity: e.quantity })),
      })
    }

    return res.status(400).json({ error: 'unknown-service' })
  } catch {
    return res.status(500).json({ error: 'fetch-failed' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')))
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'))
  })
}

// rooms: Map<roomId, { peers: Map<peerId, { ws, name, joinOrder }>, playerOrder: string[] }>
const rooms = new Map()

wss.on('connection', (ws) => {
  let currentRoom = null
  let currentPeerId = null

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    switch (msg.type) {
      case 'join': {
        const secret = process.env.JOIN_SECRET
        if (secret && msg.secret !== secret) {
          ws.send(JSON.stringify({ type: 'error', reason: 'wrong-password' }))
          ws.close()
          return
        }

        const { roomId, peerId } = msg
        currentRoom = roomId
        currentPeerId = peerId

        if (!rooms.has(roomId)) rooms.set(roomId, { peers: new Map(), playerOrder: [] })
        const room = rooms.get(roomId)

        const joinOrder = room.peers.size

        // Append the new peer to the shared player order
        room.playerOrder.push(peerId)

        // Tell new peer who is already here (with join order) and their own join order
        const existingPeers = [...room.peers.entries()].map(([id, info]) => ({ peerId: id, name: info.name, joinOrder: info.joinOrder }))
        ws.send(JSON.stringify({ type: 'room-peers', myJoinOrder: joinOrder, peers: existingPeers, playerOrder: room.playerOrder }))

        // Notify everyone else that this peer joined
        room.peers.forEach((peer) => {
          peer.ws.send(JSON.stringify({ type: 'peer-joined', peerId, name: msg.name, joinOrder, playerOrder: room.playerOrder }))
        })

        room.peers.set(peerId, { ws, name: msg.name, joinOrder })
        break
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const room = rooms.get(currentRoom)
        if (!room) return
        const target = room.peers.get(msg.to)
        if (target) {
          target.ws.send(JSON.stringify({ ...msg, from: currentPeerId }))
        }
        break
      }

      // Life totals, commander damage — broadcast to all peers in room
      case 'game-event': {
        const room = rooms.get(currentRoom)
        if (!room) return
        room.peers.forEach((peer, peerId) => {
          if (peerId !== currentPeerId) {
            peer.ws.send(JSON.stringify({ ...msg, from: currentPeerId }))
          }
        })
        break
      }

      case 'player-order': {
        const room = rooms.get(currentRoom)
        if (!room) return
        room.playerOrder = msg.playerOrder
        room.peers.forEach((peer, peerId) => {
          if (peerId !== currentPeerId) {
            peer.ws.send(JSON.stringify({ type: 'player-order', playerOrder: room.playerOrder }))
          }
        })
        break
      }
    }
  })

  ws.on('close', () => {
    if (!currentRoom || !currentPeerId) return
    const room = rooms.get(currentRoom)
    if (!room) return
    room.peers.delete(currentPeerId)
    room.playerOrder = room.playerOrder.filter((id) => id !== currentPeerId)
    room.peers.forEach((peer) => {
      peer.ws.send(JSON.stringify({ type: 'peer-left', peerId: currentPeerId, playerOrder: room.playerOrder }))
    })
    if (room.peers.size === 0) rooms.delete(currentRoom)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
