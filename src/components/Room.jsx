import { useState, useEffect, useRef, useCallback } from 'react'
import { generateId } from '../utils/id.js'
import VideoGrid from './VideoGrid.jsx'
import CardSidebar from './CardSidebar.jsx'
import PlayArea from './PlayArea.jsx'

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
const DEFAULT_LIFE = 40

export default function Room({ roomId, playerName, password }) {
  const myId = useRef(generateId())
  const myJoinOrder = useRef(0)
  const wsRef = useRef(null)
  const pcsRef = useRef({}) // peerId -> RTCPeerConnection
  const localStreamRef = useRef(null)

  const [localStream, setLocalStream] = useState(null)
  const [peers, setPeers] = useState({}) // peerId -> { stream, name }
  const [gameState, setGameState] = useState({}) // peerId -> { life, commanderDamage }
  const [pinnedCards, setPinnedCards] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [copyMsg, setCopyMsg] = useState('')
  const [volumes, setVolumes] = useState({})
  const [rotations, setRotations] = useState({})
  const [authError, setAuthError] = useState(false)

  // Initialize my own game state
  useEffect(() => {
    setGameState((prev) => ({
      ...prev,
      [myId.current]: {
        life: DEFAULT_LIFE,
        commanderDamage: {},
      },
    }))
  }, [])

  // Get camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream
        setLocalStream(stream)
      })
      .catch(() => {
        // No camera — create empty stream so WebRTC still works
        localStreamRef.current = new MediaStream()
        setLocalStream(new MediaStream())
      })
    return () => localStreamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const sendWs = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  function broadcastGameEvent(payload) {
    sendWs({ type: 'game-event', payload })
  }

  function createPC(peerId) {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current)
    })

    pc.ontrack = ({ streams: [remoteStream] }) => {
      // Create a new MediaStream reference each time so React re-renders
      // and the srcObject effect in PlayerVideo re-runs for each incoming track.
      const stream = new MediaStream(remoteStream.getTracks())
      setPeers((prev) => ({ ...prev, [peerId]: { ...prev[peerId], stream } }))
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendWs({ type: 'ice-candidate', to: peerId, candidate })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') pc.close()
    }

    pcsRef.current[peerId] = pc
    return pc
  }

  // WebSocket + signaling
  useEffect(() => {
    if (!localStream) return

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = import.meta.env.DEV ? 'localhost:3001' : window.location.host
    const ws = new WebSocket(`${proto}://${host}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId, peerId: myId.current, name: playerName, secret: password }))
    }

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'room-peers': {
          myJoinOrder.current = msg.myJoinOrder
          for (const peer of msg.peers) {
            if (peer.peerId === myId.current) continue
            setPeers((prev) => ({ ...prev, [peer.peerId]: { ...prev[peer.peerId], name: peer.name, joinOrder: peer.joinOrder, stream: prev[peer.peerId]?.stream ?? null } }))
            const pc = createPC(peer.peerId)
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            sendWs({ type: 'offer', to: peer.peerId, sdp: offer })
          }
          break
        }

        case 'peer-joined': {
          setPeers((prev) => ({ ...prev, [msg.peerId]: { name: msg.name, stream: null, joinOrder: msg.joinOrder } }))
          setGameState((prev) => ({
            ...prev,
            [msg.peerId]: { life: DEFAULT_LIFE, commanderDamage: {} },
          }))
          // They will send us an offer — just prepare state
          break
        }

        case 'offer': {
          if (!pcsRef.current[msg.from]) {
            setPeers((prev) => ({ ...prev, [msg.from]: { name: msg.name, stream: null, ...prev[msg.from] } }))
          }
          const pc = pcsRef.current[msg.from] || createPC(msg.from)
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendWs({ type: 'answer', to: msg.from, sdp: answer })
          break
        }

        case 'answer': {
          const pc = pcsRef.current[msg.from]
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          break
        }

        case 'ice-candidate': {
          const pc = pcsRef.current[msg.from]
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          break
        }

        case 'peer-left': {
          pcsRef.current[msg.peerId]?.close()
          delete pcsRef.current[msg.peerId]
          setPeers((prev) => { const n = { ...prev }; delete n[msg.peerId]; return n })
          setGameState((prev) => { const n = { ...prev }; delete n[msg.peerId]; return n })
          break
        }

        case 'error': {
          if (msg.reason === 'wrong-password') setAuthError(true)
          break
        }

        case 'game-event': {
          const { payload } = msg
          if (payload.type === 'life-update') {
            setGameState((prev) => ({
              ...prev,
              [msg.from]: { ...prev[msg.from], life: payload.life },
            }))
          } else if (payload.type === 'cmd-damage-update') {
            setGameState((prev) => ({
              ...prev,
              [msg.from]: {
                ...prev[msg.from],
                commanderDamage: payload.commanderDamage,
              },
            }))
          }
          break
        }
      }
    }

    ws.onclose = () => {
      Object.values(pcsRef.current).forEach((pc) => pc.close())
      pcsRef.current = {}
    }

    return () => ws.close()
  }, [localStream, roomId, playerName]) // eslint-disable-line

  function updateMyLife(delta) {
    setGameState((prev) => {
      const current = prev[myId.current]?.life ?? DEFAULT_LIFE
      const life = current + delta
      const updated = { ...prev, [myId.current]: { ...prev[myId.current], life } }
      broadcastGameEvent({ type: 'life-update', life })
      return updated
    })
  }

  function setMyLife(life) {
    setGameState((prev) => {
      const updated = { ...prev, [myId.current]: { ...prev[myId.current], life } }
      broadcastGameEvent({ type: 'life-update', life })
      return updated
    })
  }

  function resetMyStats() {
    setGameState((prev) => {
      const updated = { ...prev, [myId.current]: { life: DEFAULT_LIFE, commanderDamage: {} } }
      broadcastGameEvent({ type: 'life-update', life: DEFAULT_LIFE })
      broadcastGameEvent({ type: 'cmd-damage-update', commanderDamage: {} })
      return updated
    })
  }

  function updateCommanderDamage(fromPeerId, delta) {
    setGameState((prev) => {
      const current = prev[myId.current]?.commanderDamage ?? {}
      const commanderDamage = {
        ...current,
        [fromPeerId]: (current[fromPeerId] ?? 0) + delta,
      }
      const updated = {
        ...prev,
        [myId.current]: { ...prev[myId.current], commanderDamage },
      }
      broadcastGameEvent({ type: 'cmd-damage-update', commanderDamage })
      return updated
    })
  }

  function pinCard(card, x, y) {
    setPinnedCards((prev) => [...prev, { id: generateId(), card, x, y }])
  }

  function unpinCard(id) {
    setPinnedCards((prev) => prev.filter((p) => p.id !== id))
  }

  function moveCard(id, x, y) {
    setPinnedCards((prev) => prev.map((p) => p.id === id ? { ...p, x, y } : p))
  }

  function handleVolumeChange(peerId, value) {
    setVolumes((prev) => ({ ...prev, [peerId]: value }))
  }

  function handleToggleRotate(peerId) {
    setRotations((prev) => ({ ...prev, [peerId]: !prev[peerId] }))
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopyMsg('Copied!')
    setTimeout(() => setCopyMsg(''), 2000)
  }

  const myState = gameState[myId.current] ?? { life: DEFAULT_LIFE, commanderDamage: {} }
  const allPlayers = [
    { peerId: myId.current, name: playerName, stream: localStream, isLocal: true, state: myState, joinOrder: myJoinOrder.current },
    ...Object.entries(peers).map(([peerId, peer]) => ({
      peerId,
      name: peer.name ?? peerId,
      stream: peer.stream,
      isLocal: false,
      state: gameState[peerId] ?? { life: DEFAULT_LIFE, commanderDamage: {} },
      joinOrder: peer.joinOrder ?? Infinity,
    })),
  ].sort((a, b) => a.joinOrder - b.joinOrder)

  const alone = Object.keys(peers).length === 0

  if (authError) {
    return (
      <div className="landing">
        <div className="landing-card">
          <h1>Wrong password</h1>
          <p>The password you entered is incorrect.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="room">
      <div className="room-header">
        <span className="room-title">SpollToblo</span>
        <span className="room-id">Room: {roomId}</span>
        {alone && (
          <>
            <span className="invite-inline-label">Share:</span>
            <code className="invite-url-inline">{window.location.href}</code>
          </>
        )}
        <button className="btn-ghost" onClick={copyLink}>
          {copyMsg || 'Copy Link'}
        </button>
      </div>

      <div className="room-body">
        <PlayArea
          players={allPlayers}
          myId={myId.current}
          pinnedCards={pinnedCards}
          onPinCard={pinCard}
          onUnpinCard={unpinCard}
          onMoveCard={moveCard}
          onLifeDelta={updateMyLife}
          onSetLife={setMyLife}
          onCommanderDamage={updateCommanderDamage}
          onReset={resetMyStats}
          volumes={volumes}
          rotations={rotations}
          onVolumeChange={handleVolumeChange}
          onToggleRotate={handleToggleRotate}
        />

        {sidebarOpen && (
          <CardSidebar
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {!sidebarOpen && (
          <button className="sidebar-open-btn" onClick={() => setSidebarOpen(true)}>
            ◀ Cards
          </button>
        )}
      </div>
    </div>
  )
}
