import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import Room from '../../components/Room.jsx'
import { generateId } from '../../utils/id.js'

vi.mock('../../utils/id.js', () => ({ generateId: vi.fn() }))

// ─── Browser API stubs ────────────────────────────────────────────────────────

class MockMediaStream {
  getTracks() { return [] }
  getAudioTracks() { return [] }
  getVideoTracks() { return [] }
}

class MockRTCPeerConnection {
  static instances = []

  constructor() {
    this._connectionState = 'connected'
    this.getSenders = vi.fn(() => [])
    this.addTrack = vi.fn()
    this.ontrack = null
    this.onicecandidate = null
    this.onconnectionstatechange = null
    this.createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: '' })
    this.setLocalDescription = vi.fn().mockResolvedValue(undefined)
    this.setRemoteDescription = vi.fn().mockResolvedValue(undefined)
    this.createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: '' })
    this.addIceCandidate = vi.fn().mockResolvedValue(undefined)
    this.close = vi.fn()
    this.getStats = vi.fn().mockResolvedValue({ forEach: () => {} })
    MockRTCPeerConnection.instances.push(this)
  }

  get connectionState() { return this._connectionState }

  simulateStateChange(state) {
    this._connectionState = state
    this.onconnectionstatechange?.()
  }
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

const deviceChangeListeners = []
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
    addEventListener: vi.fn((event, cb) => { if (event === 'devicechange') deviceChangeListeners.push(cb) }),
    removeEventListener: vi.fn(),
  },
  writable: true,
  configurable: true,
})

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
})

// PlayArea is a complex sub-tree not relevant to these tests — stub it out
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

// ─── Global teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(generateId).mockReturnValue('default-test-id')
})

afterEach(() => {
  MockRTCPeerConnection.instances = []
  deviceChangeListeners.length = 0
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Room — lobbyActions state management', () => {
  afterEach(() => {
    vi.clearAllMocks()
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

describe('Room — peer connection reconnection', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    MockWebSocket.last = null
  })

  async function renderWithPeer(myPeerId, remotePeerId) {
    vi.mocked(generateId).mockReturnValue(myPeerId)
    await renderRoom()
    await act(async () => {
      MockWebSocket.last.simulateMessage({
        type: 'room-peers',
        myJoinOrder: 0,
        peers: [{ peerId: remotePeerId, name: 'Bob', joinOrder: 1 }],
        playerOrder: [myPeerId, remotePeerId],
      })
    })
    await act(async () => {}) // flush offer creation
    return MockRTCPeerConnection.instances[0]
  }

  it('closes the PC immediately when connection state becomes failed', async () => {
    const pc = await renderWithPeer('aaaa', 'zzzz')
    act(() => { pc.simulateStateChange('failed') })
    expect(pc.close).toHaveBeenCalled()
  })

  it('sends a new offer after the reconnect delay when local ID is smaller than peer ID', async () => {
    const pc = await renderWithPeer('aaaa', 'zzzz')

    vi.useFakeTimers()
    act(() => { pc.simulateStateChange('failed') })
    await act(async () => { await vi.runAllTimersAsync() })

    const offers = MockWebSocket.last.sent.filter(m => m.type === 'offer' && m.to === 'zzzz')
    expect(offers.length).toBe(2) // initial offer + reconnect offer
    expect(MockRTCPeerConnection.instances.length).toBe(2)
  })

  it('does not send a reconnect offer when local ID is larger than peer ID', async () => {
    const pc = await renderWithPeer('zzzz', 'aaaa')

    vi.useFakeTimers()
    act(() => { pc.simulateStateChange('failed') })
    await act(async () => { await vi.runAllTimersAsync() })

    const offers = MockWebSocket.last.sent.filter(m => m.type === 'offer')
    expect(offers.length).toBe(1) // only the initial offer, no reconnect
  })

  it('triggers reconnect after the disconnected timeout elapses', async () => {
    const pc = await renderWithPeer('aaaa', 'zzzz')

    vi.useFakeTimers()
    act(() => { pc.simulateStateChange('disconnected') })
    // Before 8s: no reconnect yet
    await act(async () => { vi.advanceTimersByTime(7000) })
    expect(pc.close).not.toHaveBeenCalled()

    // After 8s: reconnect fires
    await act(async () => { await vi.runAllTimersAsync() })
    expect(pc.close).toHaveBeenCalled()
  })
})

describe('Room — adaptive video quality', () => {
  function makeStats({ limitationReason = 'none', fractionLost = 0 } = {}) {
    const reports = [
      { type: 'outbound-rtp', kind: 'video', qualityLimitationReason: limitationReason },
      { type: 'remote-inbound-rtp', kind: 'video', fractionLost },
    ]
    return { forEach: (cb) => reports.forEach(cb) }
  }

  async function renderWithConnectedPeer() {
    vi.mocked(generateId).mockReturnValue('aaaa')
    await renderRoom()
    await act(async () => {
      MockWebSocket.last.simulateMessage({
        type: 'room-peers',
        myJoinOrder: 0,
        peers: [{ peerId: 'zzzz', name: 'Bob', joinOrder: 1 }],
        playerOrder: ['aaaa', 'zzzz'],
      })
    })
    await act(async () => {})
    const pc = MockRTCPeerConnection.instances[0]
    pc.getStats = vi.fn().mockResolvedValue(makeStats())
    pc._connectionState = 'connected'
    return pc
  }

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    MockWebSocket.last = null
  })

  it('applies video bitrate cap to senders when a peer connection first reaches connected', async () => {
    const mockSender = {
      track: { kind: 'video' },
      getParameters: vi.fn(() => ({ encodings: [{}] })),
      setParameters: vi.fn().mockResolvedValue(undefined),
    }
    const pc = await renderWithConnectedPeer()
    pc.getSenders.mockReturnValue([mockSender])

    await act(async () => { pc.simulateStateChange('connected') })

    expect(mockSender.setParameters).toHaveBeenCalledWith(
      expect.objectContaining({ encodings: [{ maxBitrate: 2_500_000 }] })
    )
  })

  it('steps quality down to medium after 2 consecutive bad ticks due to bandwidth limitation', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const pc = await renderWithConnectedPeer()
    pc.getStats = vi.fn().mockResolvedValue(makeStats({ limitationReason: 'bandwidth' }))

    const callsBefore = navigator.mediaDevices.getUserMedia.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) }) // 2 ticks

    await waitFor(() => {
      const newCalls = navigator.mediaDevices.getUserMedia.mock.calls.slice(callsBefore)
      expect(newCalls.some(([c]) => c.video?.width?.ideal === 640)).toBe(true)
    })
  })

  it('steps quality down to medium after 2 consecutive bad ticks due to high packet loss', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const pc = await renderWithConnectedPeer()
    pc.getStats = vi.fn().mockResolvedValue(makeStats({ fractionLost: 0.1 }))

    const callsBefore = navigator.mediaDevices.getUserMedia.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) }) // 2 ticks

    await waitFor(() => {
      const newCalls = navigator.mediaDevices.getUserMedia.mock.calls.slice(callsBefore)
      expect(newCalls.some(([c]) => c.video?.width?.ideal === 640)).toBe(true)
    })
  })

  it('does not step down quality after only one bad tick', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const pc = await renderWithConnectedPeer()
    pc.getStats = vi.fn()
      .mockResolvedValueOnce(makeStats({ limitationReason: 'bandwidth' }))
      .mockResolvedValue(makeStats())

    const callsBefore = navigator.mediaDevices.getUserMedia.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) }) // 1 bad tick

    expect(navigator.mediaDevices.getUserMedia.mock.calls.length).toBe(callsBefore)
  })

  it('suppresses step-up while the 3-minute cooldown is active after a step-down', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const pc = await renderWithConnectedPeer()
    pc.getStats = vi.fn().mockResolvedValue(makeStats({ limitationReason: 'bandwidth' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) }) // step down

    pc.getStats.mockResolvedValue(makeStats())
    const callsAfterStepDown = navigator.mediaDevices.getUserMedia.mock.calls.length
    // 12 stable ticks = 60s, well within the 3-min cooldown
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })

    const newCalls = navigator.mediaDevices.getUserMedia.mock.calls.slice(callsAfterStepDown)
    // Should not have stepped back up (no high-quality call without width constraint)
    expect(newCalls.some(([c]) => c.video && !c.video.width)).toBe(false)
  })

  it('steps quality back up to high after 12 stable ticks once the cooldown expires', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const pc = await renderWithConnectedPeer()
    pc.getStats = vi.fn().mockResolvedValue(makeStats({ limitationReason: 'bandwidth' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) }) // step down

    pc.getStats.mockResolvedValue(makeStats())
    // Advance past the 3-min cooldown (180s) plus 12 stable ticks (60s) = 240s
    await act(async () => { await vi.advanceTimersByTimeAsync(3 * 60 * 1000 + 60000) })

    await waitFor(() => {
      const last = navigator.mediaDevices.getUserMedia.mock.lastCall
      expect(last[0].video?.width).toBeUndefined()
    })
  })
})

describe('Room — audio track recovery', () => {
  afterEach(() => {
    vi.clearAllMocks()
    MockWebSocket.last = null
  })

  it('re-acquires the mic when the audio track ends', async () => {
    const audioTrack = { kind: 'audio', enabled: true, onended: null, stop: vi.fn() }
    const mockStream = {
      getTracks: () => [audioTrack],
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [],
    }
    navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream)

    await renderRoom()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)

    await act(async () => { audioTrack.onended?.() })
    await act(async () => {})

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('re-acquires the mic when the OS changes audio devices', async () => {
    await renderRoom()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)

    await act(async () => { deviceChangeListeners.forEach(cb => cb()) })
    await act(async () => {})

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
  })
})
