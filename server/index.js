import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')))
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'))
  })
}

// rooms: Map<roomId, Map<peerId, { ws, name, joinOrder }>>
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

        if (!rooms.has(roomId)) rooms.set(roomId, new Map())
        const room = rooms.get(roomId)

        const joinOrder = room.size

        // Tell new peer who is already here (with join order) and their own join order
        const existingPeers = [...room.entries()].map(([id, info]) => ({ peerId: id, name: info.name, joinOrder: info.joinOrder }))
        ws.send(JSON.stringify({ type: 'room-peers', myJoinOrder: joinOrder, peers: existingPeers }))

        // Notify everyone else that this peer joined
        room.forEach((peer) => {
          peer.ws.send(JSON.stringify({ type: 'peer-joined', peerId, name: msg.name, joinOrder }))
        })

        room.set(peerId, { ws, name: msg.name, joinOrder })
        break
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const room = rooms.get(currentRoom)
        if (!room) return
        const target = room.get(msg.to)
        if (target) {
          target.ws.send(JSON.stringify({ ...msg, from: currentPeerId }))
        }
        break
      }

      // Life totals, commander damage — broadcast to all peers in room
      case 'game-event': {
        const room = rooms.get(currentRoom)
        if (!room) return
        room.forEach((peer, peerId) => {
          if (peerId !== currentPeerId) {
            peer.ws.send(JSON.stringify({ ...msg, from: currentPeerId }))
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
    room.delete(currentPeerId)
    room.forEach((peer) => {
      peer.ws.send(JSON.stringify({ type: 'peer-left', peerId: currentPeerId }))
    })
    if (room.size === 0) rooms.delete(currentRoom)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
