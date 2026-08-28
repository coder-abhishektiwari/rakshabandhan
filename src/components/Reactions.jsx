import React, { useEffect, useState } from 'react'

export default function Reactions({ onSendReaction }) {
  const [floating, setFloating] = useState([])

  const emojis = ['❤️', '😂', '😭', '😈', '🙏', '🫶']

  function handleClick(emoji) {
    onSendReaction(emoji)
    const id = Date.now() + Math.random()
    setFloating(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }])
    setTimeout(() => {
      setFloating(prev => prev.filter(f => f.id !== id))
    }, 2000)
  }

  return (
    <div className="reactions-container">
      {floating.map(f => (
        <div
          key={f.id}
          className="floating-emoji"
          style={{ left: `${f.x}%` }}
        >
          {f.emoji}
        </div>
      ))}
      <div className="reaction-bar">
        {emojis.map(emoji => (
          <button
            key={emoji}
            className="reaction-btn"
            onClick={() => handleClick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

export function FloatingReaction({ emoji }) {
  const x = Math.random() * 80 + 10
  return (
    <div className="floating-emoji" style={{ left: `${x}%` }}>
      {emoji}
    </div>
  )
}
