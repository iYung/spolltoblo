import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardSidebar from '../../components/CardSidebar.jsx'

const defaultProps = {
  width: 320,
  onWidthChange: vi.fn(),
  onClose: vi.fn(),
  recentCards: [],
  onCardSelect: vi.fn(),
  deck: null,
  lobbyCards: [],
}

const lobbyCardList = [
  { id: 'a1', name: 'Lightning Bolt', mana_cost: '{R}' },
  { id: 'a2', name: 'Counterspell', mana_cost: '{U}{U}' },
]

describe('CardSidebar', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('empty query shows no results', () => {
    render(<CardSidebar {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /drag to board/i })).not.toBeInTheDocument()
    expect(screen.queryByText('No results.')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.card-result').length).toBe(0)
  })

  it('lobby mode: typing a matching name shows that card in results without fetching', () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<CardSidebar {...defaultProps} lobbyCards={lobbyCardList} />)
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'lightning' } })
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('lobby mode: typing a query with no match shows "No results."', () => {
    render(<CardSidebar {...defaultProps} lobbyCards={lobbyCardList} />)
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'xyzzy' } })
    expect(screen.getByText('No results.')).toBeInTheDocument()
  })

  it('"Search all cards" toggle button appears when lobbyCards is populated', () => {
    render(<CardSidebar {...defaultProps} lobbyCards={lobbyCardList} />)
    expect(screen.getByRole('button', { name: 'Search all cards' })).toBeInTheDocument()
  })

  it('clicking "Search all cards" toggle switches to all-cards mode label', () => {
    render(<CardSidebar {...defaultProps} lobbyCards={lobbyCardList} />)
    expect(screen.getByText('Searching lobby decks')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Search all cards' }))
    expect(screen.getByText('Searching all cards')).toBeInTheDocument()
  })

  it('all-cards mode: typing a query triggers fetch after debounce and renders card names', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: '1', name: 'Lightning Bolt', mana_cost: '{R}' }] }),
    }))

    render(<CardSidebar {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'lightning' } })
    expect(fetch).not.toHaveBeenCalled()

    await act(async () => { await vi.runAllTimersAsync() })

    expect(fetch).toHaveBeenCalledOnce()
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
  })

  it('fetch returns 404 → results are empty, no error shown', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }))

    render(<CardSidebar {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'noresult' } })

    await act(async () => { await vi.runAllTimersAsync() })

    expect(screen.queryByText('Search failed. Try again.')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.card-result').length).toBe(0)
  })

  it('fetch throws → shows "Search failed. Try again." error message', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    render(<CardSidebar {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'bolt' } })

    await act(async () => { await vi.runAllTimersAsync() })

    expect(screen.getByText('Search failed. Try again.')).toBeInTheDocument()
  })

  it('fetch returns non-ok, non-404 → shows "Search failed. Try again." error message', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }))

    render(<CardSidebar {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'bolt' } })

    await act(async () => { await vi.runAllTimersAsync() })

    expect(screen.getByText('Search failed. Try again.')).toBeInTheDocument()
  })

  it('close button click calls onClose', () => {
    const onClose = vi.fn()
    render(<CardSidebar {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
