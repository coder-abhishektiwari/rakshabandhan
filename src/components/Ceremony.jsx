import React, { useState, useEffect, useRef, useCallback } from 'react'
import ThreeScene from './ThreeScene'
import AudioControls from './AudioControls'
import ConnectionStatus from './ConnectionStatus'
import Reactions, { FloatingReaction } from './Reactions'

const STAGES = [
  'ready', 'aarti', 'flower', 'tikka', 'akshat',
  'rakhi', 'mithai', 'game', 'together', 'done'
]

export default function Ceremony({
  role,
  roomId,
  dataChannel,
  peerConnection,
  audioStream,
  remoteAudioStream
}) {
  const [stage, setStage] = useState('ready')
  const [ceremonyData, setCeremonyData] = useState({})
  const [peerReady, setPeerReady] = useState(false)
  const [myReady, setMyReady] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState([])
  const [muteSpeaker, setMuteSpeaker] = useState(false)
  const [speakerError, setSpeakerError] = useState(false)
  const audioRef = useRef(null)
  const stageRef = useRef('ready')

  useEffect(() => {
    if (remoteAudioStream && audioRef.current) {
      audioRef.current.srcObject = remoteAudioStream
    }
  }, [remoteAudioStream])

  useEffect(() => {
    if (!dataChannel) return

    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleRemoteMessage(msg)
      } catch {}
    }

    dataChannel.addEventListener('message', handler)
    return () => dataChannel.removeEventListener('message', handler)
  }, [dataChannel])

  function sendCeremony(type, data = {}) {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type, ...data }))
    }
  }

  function handleRemoteMessage(msg) {
    switch (msg.type) {
      case 'ready':
        setPeerReady(true)
        break
      case 'aarti':
        setCeremonyData({ angle: msg.angle, speed: msg.speed })
        setStage('aarti')
        break
      case 'flower':
        setStage('flower')
        setCeremonyData({ received: true })
        break
      case 'tikka':
        setStage('tikka')
        setCeremonyData({ placed: true })
        break
      case 'akshat':
        setStage('akshat')
        setCeremonyData({ falling: true })
        break
      case 'rakhi':
        setStage('rakhi')
        setCeremonyData({ tied: true })
        break
      case 'sweet':
        setStage('mithai')
        setCeremonyData({ sweet: msg.value, from: 'sister' })
        break
      case 'sweet-response':
        if (msg.value === 'return') {
          setCeremonyData({ returned: true })
        } else {
          setStage(nextStage('mithai'))
        }
        break
      case 'answer':
        setCeremonyData(prev => ({
          ...prev,
          answers: { ...prev.answers, [msg.question]: msg.value }
        }))
        break
      case 'holding':
        setCeremonyData(prev => ({
          ...prev,
          peerHolding: msg.value
        }))
        break
      case 'reaction':
        const id = Date.now() + Math.random()
        setFloatingReactions(prev => [...prev, { id, emoji: msg.value }])
        setTimeout(() => {
          setFloatingReactions(prev => prev.filter(f => f.id !== id))
        }, 2500)
        break
      case 'game-answers':
        setCeremonyData(prev => ({
          ...prev,
          peerAnswers: msg.answers
        }))
        break
      case 'advance':
        if (msg.toStage) setStage(msg.toStage)
        break
    }
  }

  function nextStage(current) {
    const idx = STAGES.indexOf(current)
    if (idx < STAGES.length - 1) {
      return STAGES[idx + 1]
    }
    return 'done'
  }

  function advanceStage() {
    const next = nextStage(stage)
    setStage(next)
    setCeremonyData({})
    sendCeremony('advance', { toStage: next })
  }

  function sendReaction(emoji) {
    sendCeremony('reaction', { value: emoji })
    const id = Date.now() + Math.random()
    setFloatingReactions(prev => [...prev, { id, emoji }])
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(f => f.id !== id))
    }, 2500)
  }

  function handleReady() {
    setMyReady(true)
    sendCeremony('ready')
    if (peerReady) {
      setTimeout(() => {
        setStage('aarti')
        sendCeremony('advance', { toStage: 'aarti' })
      }, 1500)
    }
  }

  useEffect(() => {
    if (myReady && peerReady && stage === 'ready') {
      setTimeout(() => {
        setStage('aarti')
        sendCeremony('advance', { toStage: 'aarti' })
      }, 1500)
    }
  }, [myReady, peerReady, stage])

  return (
    <div className="ceremony">
      <audio ref={audioRef} autoPlay playsInline muted={muteSpeaker} style={{ display: 'none' }} />

      <ConnectionStatus status={`Room: ${roomId} | ${role === 'brother' ? '👦 Bhai' : '👧 Behen'}`} />

      <ThreeScene stage={stage} ceremonyData={ceremonyData} role={role} />

      <div className="ceremony-overlay">
        <h1 className="ceremony-title">Door Hoke Bhi Rakhi</h1>

        {stage === 'ready' && (
          <div className="stage-content ready-stage">
            <p className="stage-text">Aaj distance sirf jagah ka hai.</p>
            <p className="stage-subtitle">Ready?</p>
            {!myReady ? (
              <button className="ready-btn" onClick={handleReady}>
                I'M READY ❤️
              </button>
            ) : (
              <div className="waiting-text">
                <span className="pulse">Waiting for {peerReady ? 'you both...' : 'sibling...'}</span>
                {peerReady && <p className="both-ready">🪔 Rakhi shuru karte hain...</p>}
              </div>
            )}
            {peerReady && !myReady && (
              <p className="peer-status">
                {role === 'brother' ? '👧 Behen is ready' : '👦 Bhai is ready'}
              </p>
            )}
          </div>
        )}

        {stage === 'aarti' && (
          <AartiStage role={role} ceremonyData={ceremonyData} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'flower' && (
          <FlowerStage role={role} ceremonyData={ceremonyData} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'tikka' && (
          <TikkaStage role={role} ceremonyData={ceremonyData} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'akshat' && (
          <AkshatStage role={role} ceremonyData={ceremonyData} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'rakhi' && (
          <RakhiStage role={role} ceremonyData={ceremonyData} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'mithai' && (
          <MithaiStage role={role} ceremonyData={ceremonyData} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'game' && (
          <GameStage role={role} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'together' && (
          <TogetherStage role={role} ceremonyData={ceremonyData} sendCeremony={sendCeremony} advanceStage={advanceStage} />
        )}

        {stage === 'done' && (
          <DoneStage />
        )}

        <div className="floating-reactions-layer">
          {floatingReactions.map(f => (
            <FloatingReaction key={f.id} emoji={f.emoji} />
          ))}
        </div>
      </div>

      <Reactions onSendReaction={sendReaction} />

      <div className="bottom-controls">
        <AudioControls audioStream={audioStream} remoteAudioStream={remoteAudioStream} />
        <button
          className="audio-btn speaker-btn"
          onClick={() => setMuteSpeaker(!muteSpeaker)}
        >
          {muteSpeaker ? '🔇' : '🔈'}
          <span className="audio-label">{muteSpeaker ? 'Speaker Off' : 'Speaker On'}</span>
        </button>
      </div>
    </div>
  )
}

/* ========== STAGE COMPONENTS ========== */

function AartiStage({ role, ceremonyData, sendCeremony, advanceStage }) {
  const isSister = role === 'sister'
  const [angle, setAngle] = useState(0)
  const [rotations, setRotations] = useState(0)
  const lastAngleRef = useRef(0)
  const totalRotationRef = useRef(0)
  const containerRef = useRef(null)
  const throttleRef = useRef(0)

  function handleTouchMove(e) {
    if (!isSister) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = containerRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const newAngle = Math.atan2(touch.clientY - cy, touch.clientX - cx)

    const delta = newAngle - lastAngleRef.current
    lastAngleRef.current = newAngle

    if (Math.abs(delta) < 0.5) {
      totalRotationRef.current += Math.abs(delta)
      setAngle(prev => prev + delta)
    }

    const newRotations = Math.floor(totalRotationRef.current / (Math.PI * 2))
    setRotations(newRotations)

    const now = Date.now()
    if (now - throttleRef.current > 100) {
      throttleRef.current = now
      sendCeremony('aarti', { angle, speed: 0.8 })
    }
  }

  useEffect(() => {
    if (!isSister && ceremonyData.angle !== undefined) {
      setAngle(ceremonyData.angle)
    }
  }, [ceremonyData, isSister])

  useEffect(() => {
    if (rotations >= 3) {
      setTimeout(() => advanceStage(), 1500)
    }
  }, [rotations, advanceStage])

  return (
    <div className="stage-content aarti-stage">
      <p className="stage-label">🪔 AARTI</p>

      {isSister ? (
        <>
          <p className="stage-instruction">Thali ghumaao — 3 rounds</p>
          <div
            ref={containerRef}
            className="aarti-touch-area"
            onTouchMove={handleTouchMove}
            onMouseMove={(e) => {
              if (!isSister) return
              const rect = containerRef.current.getBoundingClientRect()
              const cx = rect.left + rect.width / 2
              const cy = rect.top + rect.height / 2
              const a = Math.atan2(e.clientY - cy, e.clientX - cx)
              setAngle(a)
              sendCeremony('aarti', { angle: a, speed: 0.8 })
            }}
          >
            <div className="aarti-thali" style={{ transform: `rotate(${angle}rad)` }}>
              🪷
            </div>
          </div>
          <p className="aarti-count">{rotations} / 3 rounds</p>
          {rotations >= 3 && <p className="stage-complete">✨ Aarti Complete</p>}
        </>
      ) : (
        <>
          <p className="stage-waiting">🪔 Behen aarti kar rahi hai...</p>
          <div className="aarti-display">
            <div className="aarti-thali watching" style={{ transform: `rotate(${angle}rad)` }}>
              🪷
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FlowerStage({ role, ceremonyData, sendCeremony, advanceStage }) {
  const isSister = role === 'sister'
  const [sent, setSent] = useState(false)
  const [received, setReceived] = useState(ceremonyData.received || false)

  useEffect(() => {
    if (ceremonyData.received) setReceived(true)
  }, [ceremonyData])

  function sendFlower() {
    setSent(true)
    sendCeremony('flower')
    setTimeout(() => advanceStage(), 2500)
  }

  return (
    <div className="stage-content flower-stage">
      <p className="stage-label">🌹 FLOWER</p>

      {isSister ? (
        !sent ? (
          <>
            <p className="stage-instruction">Bhai ko phool bhejo</p>
            <button className="action-btn flower-send" onClick={sendFlower}>
              <span className="big-emoji">🌹</span>
              Send Flower
            </button>
          </>
        ) : (
          <div className="flower-sent-anim">
            <span className="big-emoji flying-flower">🌹</span>
            <p>Flower sent!</p>
          </div>
        )
      ) : (
        <div className="flower-receive">
          {received ? (
            <>
              <span className="big-emoji received-flower">🌹</span>
              <p className="flower-message">Rose received from Behen!</p>
              <p className="stage-instruction">React karo!</p>
            </>
          ) : (
            <p className="stage-waiting">Behen phool bhej rahi hai...</p>
          )}
        </div>
      )}
    </div>
  )
}

function TikkaStage({ role, ceremonyData, sendCeremony, advanceStage }) {
  const isSister = role === 'sister'
  const [placed, setPlaced] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 50, y: 80 })
  const targetRef = useRef(null)

  function handleDrag(e) {
    if (!isSister) return
    const touch = e.touches ? e.touches[0] : e
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    setDragPos({ x, y })

    if (x > 35 && x < 65 && y > 20 && y < 40) {
      setPlaced(true)
      sendCeremony('tikka')
      setTimeout(() => advanceStage(), 2000)
    }
  }

  useEffect(() => {
    if (ceremonyData.placed) setPlaced(true)
  }, [ceremonyData])

  return (
    <div className="stage-content tikka-stage">
      <p className="stage-label">✨ TIKKA</p>

      {isSister ? (
        !placed ? (
          <>
            <p className="stage-instruction">Kumkum drag karo bhai ki forehead pe</p>
            <div
              className="tikka-area"
              onTouchMove={handleDrag}
              onMouseMove={(e) => { if (e.buttons === 1) handleDrag(e) }}
              onMouseDown={handleDrag}
            >
              <div className="tikka-head" ref={targetRef}>
                <div className="forehead-dot" />
                <span className="head-emoji">👦</span>
              </div>
              <div
                className="tikka-kumkum"
                style={{ left: `${dragPos.x}%`, top: `${dragPos.y}%` }}
              >
                🔴
              </div>
            </div>
          </>
        ) : (
          <div className="tikka-placed">
            <span className="big-emoji">✨</span>
            <p className="stage-complete">TIKKA LAG GAYA!</p>
          </div>
        )
      ) : (
        <div className="tikka-receive">
          {placed ? (
            <>
              <span className="big-emoji">✨</span>
              <p className="stage-complete">Tikka lag gaya!</p>
              <div className="tikka-on-forehead">🔴</div>
            </>
          ) : (
            <p className="stage-waiting">Behen tikka laga rahi hai...</p>
          )}
        </div>
      )}
    </div>
  )
}

function AkshatStage({ role, ceremonyData, sendCeremony, advanceStage }) {
  const isSister = role === 'sister'
  const [done, setDone] = useState(false)
  const [falling, setFalling] = useState(ceremonyData.falling || false)

  useEffect(() => {
    if (ceremonyData.falling) setFalling(true)
  }, [ceremonyData])

  function doAkshat() {
    setDone(true)
    setFalling(true)
    sendCeremony('akshat')
    setTimeout(() => advanceStage(), 2500)
  }

  return (
    <div className="stage-content akshat-stage">
      <p className="stage-label">🌾 AKSHAT</p>

      {isSister ? (
        !done ? (
          <>
            <p className="stage-instruction">Chawal daalo</p>
            <button className="action-btn akshat-btn" onClick={doAkshat}>
              <span className="big-emoji">🌾</span>
              Throw Akshat
            </button>
          </>
        ) : (
          <div className="akshat-done">
            <div className="rice-particles">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="rice-grain" style={{
                  left: `${40 + Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 0.5}s`
                }}>·</span>
              ))}
            </div>
            <p className="stage-complete">✨ Akshat sampann</p>
          </div>
        )
      ) : (
        <div className="akshat-receive">
          {falling ? (
            <>
              <div className="rice-particles">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span key={i} className="rice-grain" style={{
                    left: `${40 + Math.random() * 20}%`,
                    animationDelay: `${Math.random() * 0.5}s`
                  }}>·</span>
                ))}
              </div>
              <p className="stage-waiting">Chawal gir rahe hain...</p>
            </>
          ) : (
            <p className="stage-waiting">Akshat ka wait...</p>
          )}
        </div>
      )}
    </div>
  )
}

function RakhiStage({ role, ceremonyData, sendCeremony, advanceStage }) {
  const isSister = role === 'sister'
  const [tied, setTied] = useState(ceremonyData.tied || false)
  const [dragPos, setDragPos] = useState({ x: 20, y: 70 })

  useEffect(() => {
    if (ceremonyData.tied) setTied(true)
  }, [ceremonyData])

  function handleDrag(e) {
    if (!isSister) return
    const touch = e.touches ? e.touches[0] : e
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    setDragPos({ x, y })

    if (x > 55 && x < 85 && y > 30 && y < 60) {
      setTied(true)
      sendCeremony('rakhi')
      setTimeout(() => advanceStage(), 3000)
    }
  }

  return (
    <div className="stage-content rakhi-stage">
      <p className="stage-label">🪢 RAKHI</p>

      {isSister ? (
        !tied ? (
          <>
            <p className="stage-instruction">Rakhi karo bhai ke wrist pe</p>
            <div
              className="rakhi-area"
              onTouchMove={handleDrag}
              onMouseMove={(e) => { if (e.buttons === 1) handleDrag(e) }}
              onMouseDown={handleDrag}
            >
              <div className="rakhi-wrist-target">
                <div className="wrist-line" />
                <span className="wrist-emoji">💪</span>
              </div>
              <div
                className="rakhi-drag"
                style={{ left: `${dragPos.x}%`, top: `${dragPos.y}%` }}
              >
                🪢
              </div>
            </div>
          </>
        ) : (
          <div className="rakhi-tied">
            <span className="big-emoji rakhi-glow">🪢</span>
            <p className="stage-complete">RAKHI BANDH GAYI ❤️</p>
            <div className="celebration-particles">
              {Array.from({ length: 15 }).map((_, i) => (
                <span key={i} className="confetti" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1}s`
                }}>✦</span>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="rakhi-receive">
          {tied ? (
            <>
              <span className="big-emoji rakhi-glow">🪢</span>
              <p className="stage-complete">Rakhi bandh gayi! ❤️</p>
              <div className="celebration-particles">
                {Array.from({ length: 15 }).map((_, i) => (
                  <span key={i} className="confetti" style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1}s`
                  }}>✦</span>
                ))}
              </div>
            </>
          ) : (
            <p className="stage-waiting">🪢 Rakhi aa rahi hai...</p>
          )}
        </div>
      )}
    </div>
  )
}

function MithaiStage({ role, ceremonyData, sendCeremony, advanceStage }) {
  const isSister = role === 'sister'
  const [chosen, setChosen] = useState(null)
  const [sent, setSent] = useState(false)
  const [response, setResponse] = useState(null)

  const sweets = [
    { id: 'ladoo', emoji: '🍬', name: 'Ladoo' },
    { id: 'chocolate', emoji: '🍫', name: 'Chocolate' },
    { id: 'icecream', emoji: '🍨', name: 'Ice Cream' }
  ]

  useEffect(() => {
    if (ceremonyData.sweet && isSister === false) {
      setChosen(ceremonyData.sweet)
    }
    if (ceremonyData.returned) {
      setResponse('returned')
    }
  }, [ceremonyData, isSister])

  function chooseSweet(id) {
    setChosen(id)
    setSent(true)
    sendCeremony('sweet', { value: id })
  }

  function respond(val) {
    setResponse(val)
    sendCeremony('sweet-response', { value: val })
    if (val === 'eat') {
      setTimeout(() => advanceStage(), 2000)
    }
  }

  if (isSister) {
    return (
      <div className="stage-content mithai-stage">
        <p className="stage-label">🍬 MITHAI</p>
        {!sent ? (
          <>
            <p className="stage-instruction">Bhai ko mithai bhejo</p>
            <div className="sweet-choices">
              {sweets.map(s => (
                <button key={s.id} className="sweet-btn" onClick={() => chooseSweet(s.id)}>
                  <span className="big-emoji">{s.emoji}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="sweet-sent">
            <span className="big-emoji">{sweets.find(s => s.id === chosen)?.emoji}</span>
            <p>{sweets.find(s => s.id === chosen)?.name} bheja!</p>
            {response === 'returned' && (
              <p className="stage-waiting">Bhai ne wapas bheja! 😂</p>
            )}
            {response === 'eat' && (
              <p className="stage-complete">Bhai ne kha liya! 😋</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="stage-content mithai-stage">
      <p className="stage-label">🍬 MITHAI</p>
      {chosen && !response ? (
        <>
          <p className="stage-instruction">Behen ne {sweets.find(s => s.id === chosen)?.emoji} {sweets.find(s => s.id === chosen)?.name} bheja!</p>
          <div className="sweet-choices">
            <button className="sweet-btn accept" onClick={() => respond('eat')}>
              <span className="big-emoji">😋</span>
              <span>Kha Li</span>
            </button>
            <button className="sweet-btn reject" onClick={() => respond('return')}>
              <span className="big-emoji">😈</span>
              <span>Wapas Bhej</span>
            </button>
          </div>
        </>
      ) : response === 'returned' ? (
        <p className="stage-waiting">Mithai wapas bheji! 😈</p>
      ) : response === 'eat' ? (
        <p className="stage-complete">😋 Kha liya!</p>
      ) : (
        <p className="stage-waiting">Behen mithai bhej rahi hai...</p>
      )}
    </div>
  )
}

function GameStage({ role, sendCeremony, advanceStage }) {
  const questions = [
    { id: 0, text: 'Who is more dramatic?' },
    { id: 1, text: 'Who gets angry faster?' },
    { id: 2, text: 'Who is more mischievous?' }
  ]
  const options = [
    { id: 'bhai', label: '👦 Bhai' },
    { id: 'behen', label: '👧 Behen' }
  ]

  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [peerAnswers, setPeerAnswers] = useState(null)
  const [revealing, setRevealing] = useState(false)
  const [countdown, setCountdown] = useState(null)

  function answerQuestion(qId, val) {
    const newAnswers = [...answers, { question: qId, value: val }]
    setAnswers(newAnswers)
    sendCeremony('answer', { question: qId, value: val })

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setCurrentQ(-1)
    }
  }

  useEffect(() => {
    if (answers.length === questions.length && !peerAnswers) {
      sendCeremony('game-answers', { answers })
    }
  }, [answers])

  useEffect(() => {
    if (peerAnswers) {
      setRevealing(true)
      setCountdown(3)
    }
  }, [peerAnswers])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setTimeout(() => advanceStage(), 4000)
      return
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const allDone = answers.length === questions.length
  const peerDone = peerAnswers && peerAnswers.length === questions.length

  if (countdown !== null && countdown > 0) {
    return (
      <div className="stage-content game-stage">
        <p className="countdown-big">{countdown}</p>
        <p className="stage-text">REVEAL</p>
      </div>
    )
  }

  if (revealing && countdown === 0) {
    const matchCount = questions.filter((q, i) => {
      const my = answers[i]?.value
      const peer = peerAnswers?.[i]?.value
      return my === peer
    }).length

    return (
      <div className="stage-content game-stage reveal">
        <p className="stage-label">🎉 RESULTS</p>
        {questions.map((q, i) => {
          const my = answers[i]?.value
          const peer = peerAnswers?.[i]?.value
          const match = my === peer
          return (
            <div key={q.id} className="game-result">
              <p className="game-q">{q.text}</p>
              <p className={`game-a ${match ? 'match' : 'mismatch'}`}>
                {role === 'brother' ? '👦' : '👧'} {my} vs {role === 'brother' ? '👧' : '👦'} {peer}
                {match ? ' ✅' : ' ❌'}
              </p>
            </div>
          )
        })}
        <p className="game-score">
          {matchCount}/{questions.length} Match
          {matchCount === questions.length ? ' 😂' : ' — Bhai clearly doesn\'t know his sister 😂'}
        </p>
      </div>
    )
  }

  if (allDone && !peerDone) {
    return (
      <div className="stage-content game-stage">
        <p className="stage-waiting">Waiting for sibling's answers...</p>
      </div>
    )
  }

  if (currentQ >= 0 && currentQ < questions.length) {
    return (
      <div className="stage-content game-stage">
        <p className="stage-label">🎮 MINI GAME</p>
        <p className="game-question">{questions[currentQ].text}</p>
        <p className="game-progress">Question {currentQ + 1} / {questions.length}</p>
        <div className="sweet-choices">
          {options.map(opt => (
            <button
              key={opt.id}
              className="sweet-btn game-opt"
              onClick={() => answerQuestion(questions[currentQ].id, opt.id)}
            >
              <span className="big-emoji">{opt.id === 'bhai' ? '👦' : '👧'}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return null
}

function TogetherStage({ role, ceremonyData, sendCeremony, advanceStage }) {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [peerHolding, setPeerHolding] = useState(false)
  const intervalRef = useRef(null)
  const progressRef = useRef(0)

  useEffect(() => {
    if (ceremonyData.peerHolding !== undefined) {
      setPeerHolding(ceremonyData.peerHolding)
    }
  }, [ceremonyData])

  function startHold() {
    setHolding(true)
    sendCeremony('holding', { value: true })
  }

  function stopHold() {
    setHolding(false)
    sendCeremony('holding', { value: false })
    progressRef.current = 0
    setProgress(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => {
    if (holding && peerHolding) {
      intervalRef.current = setInterval(() => {
        progressRef.current += 2
        setProgress(progressRef.current)
        if (progressRef.current >= 100) {
          clearInterval(intervalRef.current)
          setTimeout(() => advanceStage(), 2000)
        }
      }, 50)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (holding && !peerHolding) {
        progressRef.current = Math.max(0, progressRef.current - 3)
        setProgress(progressRef.current)
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [holding, peerHolding])

  return (
    <div className="stage-content together-stage">
      <p className="stage-label">🤝 TOGETHER</p>

      <div className="together-visual">
        <div className={`hand ${role === 'brother' ? 'left-hand' : 'right-hand'} ${progress >= 100 ? 'glow' : ''}`}>
          {role === 'brother' ? '🤚' : '✋'}
        </div>
        <div className={`hand ${role === 'brother' ? 'right-hand' : 'left-hand'} ${peerHolding ? 'peer-active' : ''}`}>
          {role === 'brother' ? '✋' : '🤚'}
        </div>
      </div>

      {!peerHolding && holding && (
        <p className="stage-waiting">Bhai ka haath bhi chahiye...</p>
      )}

      {peerHolding && !holding && (
        <p className="stage-instruction">Ab tum bhi dabao!</p>
      )}

      <button
        className={`hold-btn ${holding ? 'holding' : ''}`}
        onMouseDown={startHold}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={startHold}
        onTouchEnd={stopHold}
      >
        🤝 PRESS AND HOLD
      </button>

      {(holding || peerHolding) && (
        <div className="hold-progress">
          <div className="hold-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

function DoneStage() {
  return (
    <div className="stage-content done-stage">
      <div className="celebration-particles big">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} className="confetti" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            fontSize: `${Math.random() * 1 + 0.8}rem`
          }}>✦</span>
        ))}
      </div>
      <p className="done-text">❤️ RAKHI COMPLETE</p>
      <p className="done-subtitle">Door the...</p>
      <p className="done-subtitle">phir bhi saath.</p>
      <p className="done-message">Happy Raksha Bandhan ❤️</p>
      <div className="done-diyas">
        🪔 🌸 🪔
      </div>
    </div>
  )
}
