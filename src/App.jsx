import React, { useState, useEffect, useRef } from 'react'
import Home from './components/Home'
import Ceremony from './components/Ceremony'
import ConnectionStatus from './components/ConnectionStatus'
import { createSignaling, sendSignaling } from './lib/signaling'
import {
  createPeerConnection,
  setupReceiver,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  getLocalAudio
} from './lib/webrtc'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [role, setRole] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [peerConnection, setPeerConnection] = useState(null)
  const [audioStream, setAudioStream] = useState(null)
  const [remoteAudioStream, setRemoteAudioStream] = useState(null)
  const [dataChannel, setDataChannel] = useState(null)
  const [joinStatus, setJoinStatus] = useState('')

  const wsRef = useRef(null)
  const pcRef = useRef(null)
  const startedRef = useRef(false)

  // Check URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomFromUrl = params.get('room')
    const roleFromUrl = params.get('role')

    if (roomFromUrl && roleFromUrl) {
      const joinerRole = roleFromUrl === 'brother' ? 'sister' : 'brother'
      setRole(joinerRole)
      setRoomId(roomFromUrl.toUpperCase())
      setScreen('joining')
    }
  }, [])

  // Start joining - NO cleanup return (connection must persist to ceremony)
  useEffect(() => {
    if (screen !== 'joining' || !roomId || !role) return
    if (startedRef.current) return
    startedRef.current = true

    console.log('[APP] Starting join for room:', roomId, 'role:', role)

    const ws = createSignaling(
      roomId,
      'sister',
      async (msg, ws) => {
        console.log('[APP] Joiner received:', msg.type)

        switch (msg.type) {
          case 'room-joined':
            setJoinStatus('Room joined! Waiting for connection...')
            break

          case 'offer': {
            setJoinStatus('Setting up connection...')
            try {
              const localStream = await getLocalAudio()
              setAudioStream(localStream)

              const pc = createPeerConnection(
                (stream) => {
                  setRemoteAudioStream(stream)
                },
                () => {},
                (candidate) => {
                  sendSignaling(ws, 'ice-candidate', candidate)
                },
                () => {
                  setJoinStatus('Connected!')
                },
                () => {
                  setJoinStatus('Connection lost...')
                }
              )
              pcRef.current = pc

              setupReceiver(pc, localStream, (dc) => {
                console.log('[APP] DataChannel opened for joiner')
                setDataChannel(dc)
              })

              const answer = await handleOffer(pc, msg.data)
              sendSignaling(ws, 'answer', answer)
              setJoinStatus('Connecting audio...')
            } catch (err) {
              console.error('[APP] Error handling offer:', err)
              setJoinStatus('Connection error. Try again.')
            }
            break
          }

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
            setJoinStatus('Sibling disconnected')
            break

          case 'error':
            if (msg.message === 'ROOM_NOT_FOUND') {
              setJoinStatus('Room not found. Check the link.')
            } else if (msg.message === 'ROOM_FULL') {
              setJoinStatus('Room is full.')
            } else {
              setJoinStatus('Error: ' + msg.message)
            }
            break
        }
      },
      (ws) => {
        wsRef.current = ws
      },
      () => {
        setJoinStatus('Connection lost')
      }
    )

    wsRef.current = ws
  }, [screen, roomId, role])

  // Cleanup only on actual component unmount
  useEffect(() => {
    return () => {
      console.log('[APP] Unmount cleanup')
      if (wsRef.current) wsRef.current.close()
      if (pcRef.current) pcRef.current.close()
    }
  }, [])

  function handleCreatorRtcReady(pc, dc, localStream, remoteStream) {
    setPeerConnection(pc)
    setDataChannel(dc)
    setAudioStream(localStream)
    setRemoteAudioStream(remoteStream)
    setScreen('ceremony')
  }

  // When DataChannel is ready for joiner, go to ceremony
  useEffect(() => {
    if (dataChannel && screen === 'joining') {
      console.log('[APP] Joiner DataChannel ready, going to ceremony')
      setScreen('ceremony')
    }
  }, [dataChannel, screen])

  if (screen === 'ceremony' && dataChannel) {
    return (
      <Ceremony
        role={role}
        roomId={roomId}
        dataChannel={dataChannel}
        peerConnection={peerConnection}
        audioStream={audioStream}
        remoteAudioStream={remoteAudioStream}
      />
    )
  }

  if (screen === 'joining') {
    return (
      <div className="home">
        <ConnectionStatus status={joinStatus} />
        <div className="home-card">
          <div className="home-diyas">
            <span className="diya-emoji">🪔</span>
            <span className="diya-emoji">🪔</span>
          </div>
          <h2 className="room-title">
            {role === 'brother' ? '👦 Joining as Bhai' : '👧 Joining as Behen'}
          </h2>
          <div className="room-code">{roomId}</div>
          <p className="stage-waiting" style={{ marginTop: 16 }}>{joinStatus}</p>
        </div>
      </div>
    )
  }

  return <Home onRtcReady={handleCreatorRtcReady} />
}
