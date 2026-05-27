import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import Room from '../../components/Room.jsx'

// ─── Browser API stubs ────────────────────────────────────────────────────────

class MockMediaStream {
  getTracks() { return [] }
  getAudioTracks() { return [] }
  getVideoTracks() { return [] }
}

class MockRTCPeerConnection {
  getSenders() { return [] }
  addTrack() {}
  ontrack = null
  onicecandidate = null
  onconnectionstatechange = null
  get connectionState() { return 'connected' }
  createOffer() { return Promise.resolve({ type: 'offer', sdp: '' }) }
  setLocalDescription() { return Promise.resolve() }
  setRemoteDescription() { return Promise.resolve() }
  createAnswer() { return Promise.resolve({ type: 'answer', sdp: '' }) }
  addIceCandidate() { return Promise.resolve() }
  close() {}
}

class MockWebSocket {
  constructor() {
    this.readyState = MockWebSocket.OPEN
    MockWebSocket.last = this
  }
  send(data) {
    ;(this.sent = this.sent ?? []).push(JSON.parse(data))
  }
  simulateMessage(data) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
  close() {
    this.onclose?.()
  }
}
MockWebSocket.OPEN = 1
MockWebSocket.last = null

vi.stubGlobal('WebSocket', MockWebSocket)
vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection)
vi.stubGlobal('RTCSessionDescription', class { constructor(d) { Object.assign(this, d) } })
vi.stubGlobal('RTCIceCandidate', class { constructor(d) { Object.assign(this, d) } })
vi.stubGlobal('MediaStream', MockMediaStream)

Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) },
  writable: true,
  configurable: true,
})

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
})

// PlayArea is a complex sub-tree not relevant to lobbyActions — stub it out
vi.mock('../../components/PlayArea.jsx', () => ({ default: () => null }))
vi.mock('../../components/DeviceSelector.jsx', () => ({ default: () => null }))

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderRoom(props = {}) {
  await act(async () => {
    render(<Room roomId="test-room" playerName="Alice" password="" {...props} />)
  })
  // getUserMedia resolves asynchronously; wait until the WS is instantiated
  await waitFor(() => expect(MockWebSocket.last).not.toBeNull())
}

function simulateServerEvent(payload) {
  act(() => {
    MockWebSocket.last.simulateMessage({
      type: 'game-event',
      from: 'peer1',
      payload,
    })
  })
}

const CARD = { id: 'c1', name: 'Sol Ring', mana_cost: '{1}' }
const OTHER_CARD = { id: 'c2', name: 'Black Lotus', mana_cost: '{0}' }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Room — lobbyActions state management', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    MockWebSocket.last = null
  })

  it('card-pinned event after a roll entry — no crash, both entries render', async () => {
    await renderRoom()

    simulateServerEvent({ type: 'd20-roll', result: 17, playerName: 'Bob' })
    simulateServerEvent({ type: 'card-pinned', card: CARD, playerName: 'Bob' })

    expect(screen.getByText('Sol Ring')).toBeInTheDocument()
    expect(screen.getByText('17')).toBeInTheDocument()
  })

  it('card-pinned event deduplicates the same card — only one entry', async () => {
    await renderRoom()

    simulateServerEvent({ type: 'card-pinned', card: CARD, playerName: 'Bob' })
    simulateServerEvent({ type: 'card-pinned', card: CARD, playerName: 'Bob' })

    expect(screen.getAllByText('Sol Ring')).toHaveLength(1)
  })

  it('card-pinned deduplication preserves roll entries and removes only the matching card', async () => {
    await renderRoom()

    simulateServerEvent({ type: 'd20-roll', result: 20, playerName: 'Bob' })
    simulateServerEvent({ type: 'card-pinned', card: CARD, playerName: 'Bob' })
    simulateServerEvent({ type: 'card-pinned', card: OTHER_CARD, playerName: 'Bob' })
    // Pin CARD again — should remove the first CARD entry, keep roll + OTHER_CARD
    simulateServerEvent({ type: 'card-pinned', card: CARD, playerName: 'Bob' })

    expect(screen.getAllByText('Sol Ring')).toHaveLength(1)
    expect(screen.getByText('Black Lotus')).toBeInTheDocument()
    expect(document.querySelector('.action-roll-entry')).toBeInTheDocument()
  })

  it('Roll d20 button adds a roll entry and does not crash when card entries are present', async () => {
    await renderRoom()

    simulateServerEvent({ type: 'card-pinned', card: CARD, playerName: 'Bob' })

    vi.spyOn(Math, 'random').mockReturnValue(0.85) // Math.ceil(0.85 * 20) = 17
    fireEvent.click(screen.getByRole('button', { name: 'Roll d20' }))

    expect(screen.getByText('Sol Ring')).toBeInTheDocument()
    expect(document.querySelector('.action-roll-entry')).toBeInTheDocument()
  })

  it('d20-roll event after a card entry — no crash, both entries render', async () => {
    await renderRoom()

    simulateServerEvent({ type: 'card-pinned', card: CARD, playerName: 'Bob' })
    simulateServerEvent({ type: 'd20-roll', result: 3, playerName: 'Bob' })

    expect(screen.getByText('Sol Ring')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
