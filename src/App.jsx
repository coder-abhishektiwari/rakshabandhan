import React, { useState, useEffect, useRef, useCallback } from 'react'
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

  // Check URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomFromUrl = params.get('room')
    const roleFromUrl = params.get('role')

    if (roomFromUrl && roleFromUrl) {
      // Joiner flow: opposite role
      const joinerRole = roleFromUrl === 'brother' ? 'sister' : 'brother'
      setRole(joinerRole)
      setRoomId(roomFromUrl.toUpperCase())
      setScreen('joining')
      startJoining(roomFromUrl.toUpperCase(), joinerRole)
    }
  }, [])

  const startJoining = useCallback(async (rid, joinerRole) => {
    setJoinStatus('Joining room...')

    const ws = createSignaling(
      rid,
      'sister', // always joiner
      async (msg, ws) => {
        switch (msg.type) {
          case 'room-joined':
            setJoinStatus('Room joined! Connecting...')
            break

          case 'offer': {
            setJoinStatus('Setting up connection...')
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
                setJoinStatus('Connected 🟢')
              },
              () => {
                setJoinStatus('Connection lost...')
              }
            )
            pcRef.current = pc

            setupReceiver(pc, localStream, (dc) => {
              setDataChannel(dc)
            })

            const answer = await handleOffer(pc, msg.data)
            sendSignaling(ws, 'answer', answer)
            setJoinStatus('Setting up audio...')
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
            setJoinStatus('Disconnected')
            break

          case 'error':
            if (msg.message === 'ROOM_NOT_FOUND') {
              setJoinStatus('Room not found')
            } else if (msg.message === 'ROOM_FULL') {
              setJoinStatus('Room is full')
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
        setJoinStatus('WebSocket disconnected')
      }
    )

    wsRef.current = ws
  }, [])

  function handleCreatorRtcReady(pc, dc, localStream, remoteStream) {
    setPeerConnection(pc)
    setDataChannel(dc)
    setAudioStream(localStream)
    setRemoteAudioStream(remoteStream)
    setScreen('ceremony')
  }

  // Joiner: when DataChannel opens, go to ceremony
  useEffect(() => {
    if (dataChannel && dataChannel.readyState === 'open' && screen === 'joining') {
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
