import { Lock, Unlock } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

export default function IntelligenceToggle() {
  const { intelligenceVisible, toggleIntelligenceVisibility } = useChat()

  return (
    <button
      type="button"
      className={`intel-toggle ${intelligenceVisible ? 'intel-toggle--on' : ''}`}
      onClick={toggleIntelligenceVisibility}
      title={
        intelligenceVisible
          ? 'Intelligence data is visible & sharable'
          : 'Intelligence data is hidden from chat'
      }
    >
      {intelligenceVisible ? (
        <Unlock className="h-3.5 w-3.5 text-indigo-500" />
      ) : (
        <Lock className="h-3.5 w-3.5 text-stone-400" />
      )}
      <div className="intel-toggle-track">
        <div className="intel-toggle-thumb" />
      </div>
      <span className="intel-toggle-label">
        {intelligenceVisible ? 'Intel Visible' : 'Intel Hidden'}
      </span>
    </button>
  )
}
