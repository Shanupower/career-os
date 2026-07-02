import { useState } from 'react'
import { useProfile } from '../../context/ProfileContext'

const PRESET_COLORS = [
  '#0d9488', // Teal
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#16a34a', // Green
]

export default function ChatIdentitySetup({ onComplete }) {
  const { profile } = useProfile()
  const defaultName = profile?.basics?.name || ''
  
  const [username, setUsername] = useState(defaultName)
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim()) return
    onComplete({
      userId: 'user_' + Math.random().toString(36).substring(2, 9),
      username: username.trim(),
      avatarColor: selectedColor,
    })
  }

  return (
    <div className="chat-identity-setup">
      <div className="chat-identity-card">
        <h2 className="chat-identity-title">Join Peer Chat</h2>
        <p className="chat-identity-subtitle">
          Connect with other professionals, share insights, and get resume feedback.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-identity-input"
            placeholder="Enter your display name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            required
            autoFocus
          />

          <div className="chat-identity-colors">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`chat-identity-color ${
                  selectedColor === color ? 'chat-identity-color--selected' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="chat-identity-submit"
            disabled={!username.trim()}
          >
            Start Chatting
          </button>
        </form>
      </div>
    </div>
  )
}
