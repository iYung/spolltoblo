import { useState, useEffect } from 'react'
import Room from './components/Room.jsx'
import { generateId } from './utils/id.js'

export default function App() {
  const [roomId, setRoomId] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    const path = window.location.pathname.slice(1)
    if (path) setRoomId(path)
  }, [])

  function createRoom() {
    const id = generateId()
    window.history.pushState({}, '', `/${id}`)
    setRoomId(id)
  }

  function join() {
    const name = nameInput.trim() || 'Player'
    setPlayerName(name)
    setJoined(true)
  }

  if (!joined) {
    return (
      <div className="landing">
        <div className="landing-card">
          <h1>SpellTable</h1>
          <p>Play Magic: The Gathering over webcam with friends.</p>
          <input
            className="name-input"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            autoFocus
          />
          {roomId ? (
            <button className="btn-primary" onClick={join}>Join Room</button>
          ) : (
            <button className="btn-primary" onClick={() => { createRoom(); join() }}>
              Create Room
            </button>
          )}
          {roomId && (
            <p className="room-hint">Joining room <code>{roomId}</code></p>
          )}
        </div>
      </div>
    )
  }

  return <Room roomId={roomId} playerName={playerName} />
}
