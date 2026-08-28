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

export default function Room({
  role,
  roomId: initialRoomId,
  peerConnected,
  onPeerConnected,
  onRtcReady,
  onBack
}) {
  const [status, setStatus] = useState('Connecting...')
  const [actualRoomId, setActualRoomId] = useState(initialRoomId || '')
  const wsRef = useRef(null)
  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const roleRef = useRef(role)
  const localStreamRef = useRef(null)

  const shareLink = actualRoomId
    ? `${window.location.origin}?room=${actualRoomId}`
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
        text: 'Come celebrate Raksha Bandhan with me! Join my Rakhi room:',
        url: shareLink
      }).catch(() => {})
    } else {
      copyLink()
    }
  }

  const setupWebRTC = useCallback(async (remoteWs) => {
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

    if (roleRef.current === 'brother') {
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

  useEffect(() => {
    let cancelled = false

    const ws = createSignaling(
      initialRoomId,
      roleRef.current,
      async (msg, ws) => {
        if (cancelled) return
        switch (msg.type) {
          case 'room-created':
            setActualRoomId(msg.roomId)
            setStatus('Room created! Share the link with your sister ❤️')
            break

          case 'room-joined':
            setStatus('Room joined! Waiting for WebRTC connection...')
            break

          case 'error':
            if (msg.message === 'ROOM_NOT_FOUND') {
              setStatus('Room not found. Check the code and try again.')
            } else if (msg.message === 'ROOM_FULL') {
              setStatus('Room is full. Only 2 people allowed.')
            }
            break

          case 'peer-joined':
            onPeerConnected()
            setStatus('Sister joined! Connecting audio...')
            await setupWebRTC(ws)
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
            setStatus(`${msg.role} disconnected`)
            break
        }
      },
      async (ws) => {
        wsRef.current = ws
        if (roleRef.current === 'brother') {
          setStatus('Creating room...')
        } else {
          setStatus('Joining room...')
        }
      },
      () => {
        setStatus('WebSocket disconnected')
      }
    )

    return () => {
      cancelled = true
      ws.close()
      if (pcRef.current) pcRef.current.close()
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return (
    <div className="room">
      <ConnectionStatus status={status} />

      <div className="room-card">
        <div className="room-diyas">
          <span className="diya-emoji">🪔</span>
          <span className="diya-emoji">🪔</span>
        </div>

        <h2 className="room-title">
          {role === 'brother' ? 'Your Rakhi Room' : 'Joining Rakhi Room'}
        </h2>

        {actualRoomId && (
          <>
            <div className="room-code">{actualRoomId}</div>

            {role === 'brother' && (
              <div className="share-section">
                <p className="share-label">Share this link with your Behen ❤️</p>

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
            )}
          </>
        )}

        <div className="room-status-visual">
          <div className={`role-dot ${role === 'brother' ? 'active' : ''}`}>
            👦 Bhai
          </div>
          <div className="connection-line">
            <div className={`line-fill ${peerConnected ? 'filled' : ''}`} />
          </div>
          <div className={`role-dot ${role === 'sister' ? 'active' : ''}`}>
            👧 Behen
          </div>
        </div>

        <button className="home-back-btn" onClick={onBack}>
          ← Back to Home
        </button>
      </div>
    </div>
  )
}
