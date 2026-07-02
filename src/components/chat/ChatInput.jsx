import { useEffect, useRef, useState } from 'react'
import { Paperclip, Send, Sparkles } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

export default function ChatInput({ onShareIntelligence }) {
  const { sendMessage, sendTyping, shareResume, intelligenceVisible } = useChat()
  const [text, setText] = useState('')
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const handleSend = () => {
    if (!text.trim()) return
    sendMessage(text)
    setText('')
    sendTyping(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e) => {
    setText(e.target.value)
    sendTyping(true)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false)
    }, 2000)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      shareResume(file)
    }
    e.target.value = ''
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  return (
    <div className="chat-input-area">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />

      <div className="chat-input-row">
        <button
          type="button"
          className="chat-input-btn chat-input-attach"
          onClick={() => fileInputRef.current?.click()}
          title="Share Resume PDF file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="chat-input-btn chat-input-intel"
          onClick={onShareIntelligence}
          disabled={!intelligenceVisible}
          title={
            intelligenceVisible
              ? 'Share Intelligence Profile Card'
              : 'Intelligence data is hidden (enable toggle in header to share)'
          }
        >
          <Sparkles className="h-5 w-5" />
        </button>

        <textarea
          className="chat-input-field"
          placeholder="Type a message..."
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button
          type="button"
          className="chat-input-btn chat-input-send"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
