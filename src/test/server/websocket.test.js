// @vitest-environment node
import { createApp } from '../../../server/app.js'
import WebSocket from 'ws'

function getPort(srv) {
  return srv.address().port
}

function connect(port) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`)
    ws.once('open', () => resolve(ws))
  })
}

function nextMsg(ws) {
  return new Promise((resolve) => ws.once('message', (data) => resolve(JSON.parse(data))))
}

let server
beforeEach(() => new Promise((resolve) => {
  ;({ server } = createApp())
  server.listen(0, resolve)
}))
afterEach(() => new Promise((res) => {
  server.closeAllConnections()
  server.close(res)
}))

test('wrong JOIN_SECRET sends error and closes', async () => {
  process.env.JOIN_SECRET = 'secret'
  const port = getPort(server)
  const ws = await connect(port)
  const closed = new Promise((resolve) => ws.once('close', resolve))
  ws.send(JSON.stringify({ type: 'join', roomId: 'r-wrong-1', peerId: 'p1', name: 'A', secret: 'wrong' }))
  const msg = await nextMsg(ws)
  expect(msg).toEqual({ type: 'error', reason: 'wrong-password' })
  await closed
  delete process.env.JOIN_SECRET
})

test('correct join receives room-peers', async () => {
  const port = getPort(server)
  const ws = await connect(port)
  const reply = nextMsg(ws)
  ws.send(JSON.stringify({ type: 'join', roomId: 'r-join-1', peerId: 'p1', name: 'A' }))
  expect(await reply).toEqual({ type: 'room-peers', myJoinOrder: 0, peers: [], playerOrder: ['p1'] })
  ws.close()
})

test('second peer join notifies first peer and gets peers list', async () => {
  const port = getPort(server)
  const ws1 = await connect(port)
  const ws1RoomPeers = nextMsg(ws1)
  ws1.send(JSON.stringify({ type: 'join', roomId: 'r-second-1', peerId: 'p1', name: 'A' }))
  await ws1RoomPeers

  const ws2 = await connect(port)
  const peer1Notified = nextMsg(ws1)
  const peer2RoomPeers = nextMsg(ws2)
  ws2.send(JSON.stringify({ type: 'join', roomId: 'r-second-1', peerId: 'p2', name: 'B' }))

  const peer1Msg = await peer1Notified
  expect(peer1Msg).toMatchObject({ type: 'peer-joined', peerId: 'p2', name: 'B', joinOrder: 1 })

  const peer2Msg = await peer2RoomPeers
  expect(peer2Msg.type).toBe('room-peers')
  expect(peer2Msg.peers).toEqual(expect.arrayContaining([expect.objectContaining({ peerId: 'p1', name: 'A' })]))

  ws1.close()
  ws2.close()
})

test('offer is forwarded from sender to target', async () => {
  const port = getPort(server)
  const ws1 = await connect(port)
  const ws1RoomPeers = nextMsg(ws1)
  ws1.send(JSON.stringify({ type: 'join', roomId: 'r-offer-1', peerId: 'p1', name: 'A' }))
  await ws1RoomPeers

  const ws2 = await connect(port)
  const ws1PeerJoined = nextMsg(ws1)
  const ws2RoomPeers = nextMsg(ws2)
  ws2.send(JSON.stringify({ type: 'join', roomId: 'r-offer-1', peerId: 'p2', name: 'B' }))
  await ws1PeerJoined
  await ws2RoomPeers

  const offerReceived = nextMsg(ws1)
  ws2.send(JSON.stringify({ type: 'offer', to: 'p1', sdp: 'test-sdp' }))
  const msg = await offerReceived
  expect(msg).toEqual({ type: 'offer', from: 'p2', to: 'p1', sdp: 'test-sdp' })

  ws1.close()
  ws2.close()
})

test('game-event broadcasts to all peers except sender', async () => {
  const port = getPort(server)
  const ws1 = await connect(port)
  const ws1RoomPeers = nextMsg(ws1)
  ws1.send(JSON.stringify({ type: 'join', roomId: 'r-game-1', peerId: 'p1', name: 'A' }))
  await ws1RoomPeers

  const ws2 = await connect(port)
  const ws1PeerJoined1 = nextMsg(ws1)
  const ws2RoomPeers = nextMsg(ws2)
  ws2.send(JSON.stringify({ type: 'join', roomId: 'r-game-1', peerId: 'p2', name: 'B' }))
  await ws1PeerJoined1
  await ws2RoomPeers

  const ws3 = await connect(port)
  const ws1PeerJoined2 = nextMsg(ws1)
  const ws2PeerJoined = nextMsg(ws2)
  const ws3RoomPeers = nextMsg(ws3)
  ws3.send(JSON.stringify({ type: 'join', roomId: 'r-game-1', peerId: 'p3', name: 'C' }))
  await ws1PeerJoined2
  await ws2PeerJoined
  await ws3RoomPeers

  const p2Received = nextMsg(ws2)
  const p3Received = nextMsg(ws3)
  const p1SenderReceived = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 200)
    ws1.once('message', (data) => { clearTimeout(timer); resolve(JSON.parse(data)) })
  })

  ws1.send(JSON.stringify({ type: 'game-event', event: 'life', value: 35 }))

  const [p2Msg, p3Msg, p1Msg] = await Promise.all([p2Received, p3Received, p1SenderReceived])
  expect(p2Msg).toMatchObject({ type: 'game-event', event: 'life', value: 35, from: 'p1' })
  expect(p3Msg).toMatchObject({ type: 'game-event', event: 'life', value: 35, from: 'p1' })
  expect(p1Msg).toBeNull()

  ws1.close()
  ws2.close()
  ws3.close()
})

test('player-order update is sent to other peers and invalid ids are filtered', async () => {
  const port = getPort(server)
  const ws1 = await connect(port)
  const ws1RoomPeers = nextMsg(ws1)
  ws1.send(JSON.stringify({ type: 'join', roomId: 'r-order-1', peerId: 'p1', name: 'A' }))
  await ws1RoomPeers

  const ws2 = await connect(port)
  const ws1PeerJoined = nextMsg(ws1)
  const ws2RoomPeers = nextMsg(ws2)
  ws2.send(JSON.stringify({ type: 'join', roomId: 'r-order-1', peerId: 'p2', name: 'B' }))
  await ws1PeerJoined
  await ws2RoomPeers

  const p2Received = nextMsg(ws2)
  ws1.send(JSON.stringify({ type: 'player-order', playerOrder: ['p2', 'p1', 'invalid-id'] }))
  const msg = await p2Received
  expect(msg).toEqual({ type: 'player-order', playerOrder: ['p2', 'p1'] })

  ws1.close()
  ws2.close()
})

test('disconnect cleanup notifies remaining peers', async () => {
  const port = getPort(server)
  const ws1 = await connect(port)
  const ws1RoomPeers = nextMsg(ws1)
  ws1.send(JSON.stringify({ type: 'join', roomId: 'r-disc-1', peerId: 'p1', name: 'A' }))
  await ws1RoomPeers

  const ws2 = await connect(port)
  const ws1PeerJoined = nextMsg(ws1)
  const ws2RoomPeers = nextMsg(ws2)
  ws2.send(JSON.stringify({ type: 'join', roomId: 'r-disc-1', peerId: 'p2', name: 'B' }))
  await ws1PeerJoined
  await ws2RoomPeers

  const p1Notified = nextMsg(ws1)
  ws2.close()
  const msg = await p1Notified
  expect(msg).toMatchObject({ type: 'peer-left', peerId: 'p2' })

  ws1.close()
})
