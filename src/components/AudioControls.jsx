import React, { useState } from 'react'

export default function AudioControls({ audioStream, remoteAudioStream }) {
  const [muted, setMuted] = useState(false)

  function toggleMute() {
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => {
        track.enabled = muted
      })
      setMuted(!muted)
    }
  }

  return (
    <button className="audio-btn" onClick={toggleMute}>
      {muted ? '🔇' : '🔊'}
      <span className="audio-label">{muted ? 'Unmute' : 'Mute'}</span>
    </button>
  )
}
