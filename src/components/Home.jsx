import React, { useState, useEffect } from 'react'

export default function Home({ initialRole, onCreated, onJoined }) {
  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialRole) setSelectedRole(initialRole)
  }, [initialRole])

  function handleCreate() {
    onCreated(null)
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setError('Please enter a valid room code')
      return
    }
    onJoined(code)
  }

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

        {!selectedRole ? (
          <div className="role-select">
            <p className="role-question">Aap kaun ho?</p>
            <button
              className="role-btn brother-btn"
              onClick={() => setSelectedRole('brother')}
            >
              <span className="role-icon">👦</span>
              <span>I Am Bhai</span>
            </button>
            <button
              className="role-btn sister-btn"
              onClick={() => setSelectedRole('sister')}
            >
              <span className="role-icon">👧</span>
              <span>I Am Behen</span>
            </button>
          </div>
        ) : selectedRole === 'brother' ? (
          <div className="brother-options">
            <button className="create-btn" onClick={handleCreate}>
              <span className="btn-emoji">🪷</span>
              Create Rakhi Room
            </button>
          </div>
        ) : (
          <div className="sister-options">
            <p className="sister-hint">Bhai ne room code bheja hai?</p>
            <div className="join-form">
              <input
                type="text"
                className="code-input"
                placeholder="Room Code"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase())
                  setError('')
                }}
                maxLength={6}
              />
              <button className="join-btn" onClick={handleJoin}>
                Join
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
        )}

        <button
          className="back-btn"
          onClick={() => {
            setSelectedRole(null)
            setJoinCode('')
            setError('')
          }}
          style={{ opacity: selectedRole ? 1 : 0 }}
        >
          ← Back
        </button>

        <div className="home-flowers">🌸 ✿ 🌺</div>
      </div>
    </div>
  )
}
