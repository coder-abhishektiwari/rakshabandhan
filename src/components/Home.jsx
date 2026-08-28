import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createSignaling, sendSignaling } from '../lib/signaling'
import {
  createPeerConnection,
  setupInitiator,
  setupReceiver,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  getLocalAudio
} from '../lib/webrtc'
import ConnectionStatus from './ConnectionStatus'

export default function Home({ onRtcReady }) {
  const [phase, setPhase] = useState('select') // select | created | joining | waiting | error
  const [myRole, setMyRole] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [status, setStatus] = useState('')
  const [peerConnected, setPeerConnected] = useState(false)
  const wsRef = useRef(null)
  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const localStreamRef = useRef(null)

  const shareLink = roomId
    ? `${window.location.origin}?room=${roomId}&role=${myRole}`
    : ''

  function copyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareLink)
    }
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({
        title: 'Rakhi Room',
        text: 'Come celebrate Raksha Bandhan with me!',
        url: shareLink
      }).catch(() => {})
    } else {
      copyLink()
    }
  }

  const setupWebRTC = useCallback(async (remoteWs, role) => {
    const localStream = await getLocalAudio()
    localStreamRef.current = localStream

    const onTrack = (stream) => {
      onRtcReady(pcRef.current, dcRef.current, localStream, stream)
    }

    const onIce = (candidate) => {
      sendSignaling(remoteWs, 'ice-candidate', candidate)
    }

    const onConnected = () => {
      setStatus('WebRTC Connected 🟢')
    }

    const onDisconnected = () => {
      setStatus('Connection lost...')
    }

    const pc = createPeerConnection(onTrack, () => {}, onIce, onConnected, onDisconnected)
    pcRef.current = pc

    if (role === 'brother') {
      const offer = await setupInitiator(pc, localStream, (dc) => {
        dcRef.current = dc
      })
      sendSignaling(remoteWs, 'offer', offer)
      setStatus('Setting up audio...')
    } else {
      setupReceiver(pc, localStream, (dc) => {
        dcRef.current = dc
      })
      setStatus('Setting up audio...')
    }
  }, [onRtcReady])

  async function handleRoleSelect(role) {
    setMyRole(role)
    setPhase('created')
    setStatus('Creating room...')

    const ws = createSignaling(
      null,
      'brother', // creator always initiates
      async (msg, ws) => {
        switch (msg.type) {
          case 'room-created':
            setRoomId(msg.roomId)
            setStatus('Room created! Share the link ❤️')
            break

          case 'peer-joined':
            setPeerConnected(true)
            setStatus('Sibling joined! Connecting audio...')
            await setupWebRTC(ws, role)
            break

          case 'offer':
            setStatus('Setting up connection...')
            if (pcRef.current) {
              const answer = await handleOffer(pcRef.current, msg.data)
              sendSignaling(ws, 'answer', answer)
            }
            break

          case 'answer':
            if (pcRef.current) {
              await handleAnswer(pcRef.current, msg.data)
            }
            break

          case 'ice-candidate':
            if (pcRef.current) {
              await handleIceCandidate(pcRef.current, msg.data)
            }
            break

          case 'peer-left':
            setPeerConnected(false)
            setStatus('Disconnected')
            break

          case 'error':
            setStatus('Error: ' + msg.message)
            setPhase('error')
            break
        }
      },
      (ws) => {
        wsRef.current = ws
      },
      () => {
        setStatus('WebSocket disconnected')
      }
    )

    wsRef.current = ws
  }

  function goBack() {
    setPhase('select')
    setMyRole(null)
    setRoomId('')
    setStatus('')
    setPeerConnected(false)
    if (wsRef.current) wsRef.current.close()
    if (pcRef.current) pcRef.current.close()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
    }
  }

  // Phase 1: Role Selection
  if (phase === 'select') {
    return (
      <div className="home">
        <div className="home-card">
          <div className="home-diyas">
            <span className="diya-emoji">🪔</span>
            <span className="diya-emoji">🪔</span>
          </div>
          <h1 className="home-title">Door Hoke Bhi Rakhi</h1>
          <p className="home-subtitle">
            Aaj distance sirf jagah ka hai.
          </p>

          <div className="role-select">
            <p className="role-question">Aap kaun ho?</p>
            <button
              className="role-btn brother-btn"
              onClick={() => handleRoleSelect('brother')}
            >
              <span className="role-icon">👦</span>
              <span>I Am Bhai</span>
            </button>
            <button
              className="role-btn sister-btn"
              onClick={() => handleRoleSelect('sister')}
            >
              <span className="role-icon">👧</span>
              <span>I Am Behen</span>
            </button>
          </div>

          <div className="home-flowers">🌸 ✿ 🌺</div>
        </div>
      </div>
    )
  }

  // Phase 2: Room Created - Show share link
  if (phase === 'created') {
    return (
      <div className="home">
        <ConnectionStatus status={status} />
        <div className="home-card">
          <div className="room-diyas">
            <span className="diya-emoji">🪔</span>
            <span className="diya-emoji">🪔</span>
          </div>

          <h2 className="room-title">
            {myRole === 'brother' ? '👦 Bhai ka Room' : '👧 Behen ka Room'}
          </h2>

          {roomId && (
            <>
              <div className="room-code">{roomId}</div>

              <div className="share-section">
                <p className="share-label">
                  {myRole === 'brother'
                    ? 'Is link ko apni Behen ko bhejo ❤️'
                    : 'Is link ko apne Bhai ko bhejo ❤️'}
                </p>

                <div className="share-link-box">
                  <span className="share-link-text">{shareLink}</span>
                </div>

                <div className="share-buttons">
                  <button className="share-btn copy-btn" onClick={copyLink}>
                    📋 Copy Link
                  </button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button className="share-btn native-share-btn" onClick={shareNative}>
                      📤 Share
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="room-status-visual">
            <div className={`role-dot ${myRole === 'brother' ? 'active' : ''}`}>
              👦 Bhai
            </div>
            <div className="connection-line">
              <div className={`line-fill ${peerConnected ? 'filled' : ''}`} />
            </div>
            <div className={`role-dot ${myRole === 'sister' ? 'active' : ''}`}>
              👧 Behen
            </div>
          </div>

          <button className="home-back-btn" onClick={goBack}>
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  // Phase: Error
  return (
    <div className="home">
      <div className="home-card">
        <p className="error-text">{status}</p>
        <button className="home-back-btn" onClick={goBack} style={{ marginTop: 20 }}>
          ← Try Again
        </button>
      </div>
    </div>
  )
}
