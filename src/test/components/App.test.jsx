import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App.jsx'

vi.mock('../../components/Room.jsx', () => ({ default: () => <div data-testid="room" /> }))

function setPathname(pathname) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname },
    writable: true,
    configurable: true,
  })
}

describe('App', () => {
  beforeEach(() => {
    setPathname('/')
  })

  it('shows "Create Room" button when pathname is /', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument()
  })

  it('shows "Join Room" button and room hint when pathname has a room ID', () => {
    setPathname('/someroom')
    render(<App />)
    expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument()
    expect(screen.getByText(/joining room/i)).toBeInTheDocument()
    expect(screen.getByText('someroom')).toBeInTheDocument()
  })

  it('uses "Player" as default name when name input is empty and join is clicked', () => {
    setPathname('/someroom')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /join room/i }))
    expect(screen.getByTestId('room')).toBeInTheDocument()
  })

  it('uses typed name when joining', async () => {
    setPathname('/someroom')
    render(<App />)
    await userEvent.type(screen.getByPlaceholderText('Your name'), 'Alice')
    fireEvent.click(screen.getByRole('button', { name: /join room/i }))
    expect(screen.getByTestId('room')).toBeInTheDocument()
  })

  it('pressing Enter in name input triggers join', () => {
    setPathname('/someroom')
    render(<App />)
    fireEvent.keyDown(screen.getByPlaceholderText('Your name'), { key: 'Enter' })
    expect(screen.getByTestId('room')).toBeInTheDocument()
  })

  it('clicking "Create Room" calls window.history.pushState with a new room ID', () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    expect(pushState).toHaveBeenCalledOnce()
    const url = pushState.mock.calls[0][2]
    expect(url).toMatch(/^\/[a-z0-9]{8}$/)
    pushState.mockRestore()
  })
})
