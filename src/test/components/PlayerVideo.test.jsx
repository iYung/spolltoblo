import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PlayerVideo from '../../components/PlayerVideo.jsx'

beforeAll(() => {
  Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
    set: () => {},
    get: () => null,
    configurable: true,
  })
})

const defaultProps = {
  player: {
    stream: null,
    name: 'Alice',
    state: {
      life: 40,
      commanderDamage: {},
      poison: 0,
      commanders: [],
    },
  },
  isLocal: false,
  opponents: [],
  onLifeDelta: vi.fn(),
  onSetLife: vi.fn(),
  onCommanderDamage: vi.fn(),
  onPoisonDelta: vi.fn(),
  onReset: vi.fn(),
  volume: 1,
  rotated: false,
  onVolumeChange: vi.fn(),
  onToggleRotate: vi.fn(),
  onSetCommanders: vi.fn(),
  onLoadDeck: vi.fn(),
  isMuted: false,
  isVideoHidden: false,
  onToggleMute: vi.fn(),
  onToggleVideo: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
}

function buildProps(overrides = {}) {
  return {
    ...defaultProps,
    ...overrides,
    player: {
      ...defaultProps.player,
      ...(overrides.player ?? {}),
      state: {
        ...defaultProps.player.state,
        ...(overrides.player?.state ?? {}),
      },
    },
  }
}

describe('PlayerVideo', () => {
  it('does not show ELIMINATED banner at 40 life, 0 commander damage, 0 poison', () => {
    render(<PlayerVideo {...buildProps()} />)
    expect(screen.queryByText('ELIMINATED')).not.toBeInTheDocument()
  })

  it('shows ELIMINATED banner when life <= 0', () => {
    render(<PlayerVideo {...buildProps({ player: { state: { life: 0 } } })} />)
    expect(screen.getByText('ELIMINATED')).toBeInTheDocument()
  })

  it('shows ELIMINATED banner when any commanderDamage value >= 21', () => {
    render(
      <PlayerVideo
        {...buildProps({ player: { state: { commanderDamage: { opp1: 21 } } } })}
      />
    )
    expect(screen.getByText('ELIMINATED')).toBeInTheDocument()
  })

  it('shows ELIMINATED banner when poison >= 10', () => {
    render(<PlayerVideo {...buildProps({ player: { state: { poison: 10 } } })} />)
    expect(screen.getByText('ELIMINATED')).toBeInTheDocument()
  })

  it('local player sees MUTE button and CAM button', () => {
    render(<PlayerVideo {...buildProps({ isLocal: true })} />)
    expect(screen.getByRole('button', { name: 'MUTE' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CAM' })).toBeInTheDocument()
  })

  it('remote player does not see MUTE or CAM buttons', () => {
    render(<PlayerVideo {...buildProps({ isLocal: false })} />)
    expect(screen.queryByRole('button', { name: /^mute$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^cam$/i })).not.toBeInTheDocument()
  })

  it('local player sees life adjustment buttons and clicking -1 calls onLifeDelta(-1)', () => {
    const onLifeDelta = vi.fn()
    render(<PlayerVideo {...buildProps({ isLocal: true, onLifeDelta })} />)
    expect(screen.getByRole('button', { name: '-5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '-1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+5' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '-1' }))
    expect(onLifeDelta).toHaveBeenCalledWith(-1)
  })

  it('remote player does not see life adjustment buttons', () => {
    render(<PlayerVideo {...buildProps({ isLocal: false })} />)
    expect(screen.queryByRole('button', { name: '-1' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+1' })).not.toBeInTheDocument()
  })

  it('clicking the life total span enters edit mode and shows an input', () => {
    render(<PlayerVideo {...buildProps({ isLocal: true })} />)
    fireEvent.click(screen.getByText('40'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('typing a number in edit mode and pressing Enter calls onSetLife with that number', () => {
    const onSetLife = vi.fn()
    render(<PlayerVideo {...buildProps({ isLocal: true, onSetLife })} />)
    fireEvent.click(screen.getByText('40'))
    const input = screen.getByDisplayValue('40')
    fireEvent.change(input, { target: { value: '35' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSetLife).toHaveBeenCalledWith(35)
  })

  it('RESET button calls onReset', () => {
    const onReset = vi.fn()
    render(<PlayerVideo {...buildProps({ isLocal: true, onReset })} />)
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('opponent life span does not show CommanderDamage overlay before click', () => {
    render(<PlayerVideo {...buildProps({ isLocal: false })} />)
    expect(screen.queryByText('Damage Received by Alice')).not.toBeInTheDocument()
  })

  it('clicking the opponent life span shows the CommanderDamage overlay in readOnly mode', () => {
    render(<PlayerVideo {...buildProps({ isLocal: false })} />)
    fireEvent.click(screen.getByText('40'))
    expect(screen.getByText('Damage Received by Alice')).toBeInTheDocument()
    // readOnly means no +/- adjustment buttons inside the overlay
    expect(screen.queryByRole('button', { name: '+1' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '-1' })).not.toBeInTheDocument()
  })

  it('opponent life span has cursor:pointer style', () => {
    render(<PlayerVideo {...buildProps({ isLocal: false })} />)
    const lifeSpan = screen.getByText('40')
    expect(lifeSpan).toHaveStyle({ cursor: 'pointer' })
  })
})
