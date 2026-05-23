import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CommanderDamage from '../../components/CommanderDamage'

const defaultProps = {
  opponents: [],
  commanderDamage: {},
  onUpdate: vi.fn(),
  poison: 0,
  onPoisonDelta: vi.fn(),
  onClose: vi.fn(),
}

describe('CommanderDamage', () => {
  it('shows "No opponents yet." when opponents is empty', () => {
    render(<CommanderDamage {...defaultProps} />)
    expect(screen.getByText('No opponents yet.')).toBeInTheDocument()
  })

  it('renders opponent name and damage value for a single-commander opponent', () => {
    const opponents = [{ peerId: 'p1', name: 'Alice', state: { commanders: [] } }]
    const commanderDamage = { p1: 7 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders a label like "CommanderName (PlayerName)" when opponent has one commander', () => {
    const opponents = [{ peerId: 'p1', name: 'Alice', state: { commanders: [{ name: 'Atraxa' }] } }]
    const commanderDamage = { p1: 3 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} />)
    expect(screen.getByText('Atraxa (Alice)')).toBeInTheDocument()
  })

  it('shows ELIMINATED tag and danger style when damage >= 21', () => {
    const opponents = [{ peerId: 'p1', name: 'Alice', state: { commanders: [] } }]
    const commanderDamage = { p1: 21 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} />)
    expect(screen.getByText('ELIMINATED')).toBeInTheDocument()
    const valueSpan = screen.getByText('21')
    expect(valueSpan).toHaveClass('danger')
  })

  it('does not show ELIMINATED tag when damage < 21', () => {
    const opponents = [{ peerId: 'p1', name: 'Alice', state: { commanders: [] } }]
    const commanderDamage = { p1: 20 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} poison={0} />)
    const tags = screen.queryAllByText('ELIMINATED')
    expect(tags).toHaveLength(0)
  })

  it('disables -1 and -5 buttons when damage is 0', () => {
    const opponents = [{ peerId: 'p1', name: 'Alice', state: { commanders: [] } }]
    const commanderDamage = { p1: 0 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} />)
    const minusOneButtons = screen.getAllByText('-1')
    const minusFiveButtons = screen.getAllByText('-5')
    expect(minusOneButtons[0]).toBeDisabled()
    expect(minusFiveButtons[0]).toBeDisabled()
  })

  it('clicking +1 calls onUpdate(peerId, 1)', () => {
    const onUpdate = vi.fn()
    const opponents = [{ peerId: 'p1', name: 'Alice', state: { commanders: [] } }]
    const commanderDamage = { p1: 0 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} onUpdate={onUpdate} />)
    fireEvent.click(screen.getAllByText('+1')[0])
    expect(onUpdate).toHaveBeenCalledWith('p1', 1)
  })

  it('clicking -1 calls onUpdate(peerId, -1) when damage > 0', () => {
    const onUpdate = vi.fn()
    const opponents = [{ peerId: 'p1', name: 'Alice', state: { commanders: [] } }]
    const commanderDamage = { p1: 5 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} onUpdate={onUpdate} />)
    const minusOneButtons = screen.getAllByText('-1')
    fireEvent.click(minusOneButtons[0])
    expect(onUpdate).toHaveBeenCalledWith('p1', -1)
  })

  it('renders two separate rows for an opponent with 2 commanders', () => {
    const opponents = [{
      peerId: 'p1',
      name: 'Alice',
      state: { commanders: [{ name: 'Atraxa' }, { name: 'Breya' }] },
    }]
    const commanderDamage = { p1: 2, p1_2: 4 }
    render(<CommanderDamage {...defaultProps} opponents={opponents} commanderDamage={commanderDamage} />)
    expect(screen.getByText('Atraxa (Alice)')).toBeInTheDocument()
    expect(screen.getByText('Breya (Alice)')).toBeInTheDocument()
  })

  it('shows current poison value', () => {
    render(<CommanderDamage {...defaultProps} poison={6} />)
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('shows ELIMINATED tag in poison row when poison >= 10', () => {
    render(<CommanderDamage {...defaultProps} poison={10} />)
    expect(screen.getByText('ELIMINATED')).toBeInTheDocument()
  })

  it('disables poison -1 button when poison is 0', () => {
    render(<CommanderDamage {...defaultProps} poison={0} />)
    const minusOneButtons = screen.getAllByText('-1')
    const poisonMinusOne = minusOneButtons[minusOneButtons.length - 1]
    expect(poisonMinusOne).toBeDisabled()
  })

  it('clicking poison +1 calls onPoisonDelta(1)', () => {
    const onPoisonDelta = vi.fn()
    render(<CommanderDamage {...defaultProps} poison={3} onPoisonDelta={onPoisonDelta} />)
    const plusOneButtons = screen.getAllByText('+1')
    fireEvent.click(plusOneButtons[plusOneButtons.length - 1])
    expect(onPoisonDelta).toHaveBeenCalledWith(1)
  })

  it('clicking the overlay background calls onClose', () => {
    const onClose = vi.fn()
    const { container } = render(<CommanderDamage {...defaultProps} onClose={onClose} />)
    const overlay = container.querySelector('.cmd-dmg-overlay')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})
