import React, { useState, useEffect } from 'react'
import Home from './components/Home'
import Room from './components/Room'
import Ceremony from './components/Ceremony'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [role, setRole] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [peerConnected, setPeerConnected] = useState(false)
  const [rtcReady, setRtcReady] = useState(false)
  const [signaling, setSignaling] = useState(null)
  const [peerConnection, setPeerConnection] = useState(null)
  const [audioStream, setAudioStream] = useState(null)
  const [remoteAudioStream, setRemoteAudioStream] = useState(null)
  const [dataChannel, setDataChannel] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomFromUrl = params.get('room')
    if (roomFromUrl) {
      setRole('sister')
      setRoomId(roomFromUrl.toUpperCase())
      setScreen('room')
    }
  }, [])

  function handleCreated(id) {
    setRoomId(id)
    setScreen('room')
  }

  function handleJoined(id) {
    setRoomId(id)
    setScreen('room')
  }

  function handlePeerConnected() {
    setPeerConnected(true)
  }

  function handleRtcReady(pc, dc, localStream, remoteStream) {
    setPeerConnection(pc)
    setDataChannel(dc)
    setAudioStream(localStream)
    setRemoteAudioStream(remoteStream)
    setRtcReady(true)
    setScreen('ceremony')
  }

  function handleBack() {
    setScreen('home')
    setRole(null)
    setRoomId(null)
    setPeerConnected(false)
    setRtcReady(false)
  }

  if (screen === 'ceremony' && rtcReady) {
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

  if (screen === 'room') {
    return (
      <Room
        role={role}
        roomId={roomId}
        peerConnected={peerConnected}
        onPeerConnected={handlePeerConnected}
        onRtcReady={handleRtcReady}
        onBack={handleBack}
      />
    )
  }

  return (
    <Home
      initialRole={role}
      onCreated={handleCreated}
      onJoined={handleJoined}
    />
  )
}
