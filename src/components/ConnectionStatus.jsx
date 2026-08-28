import React from 'react'

export default function ConnectionStatus({ status }) {
  return (
    <div className="connection-status">
      <div className="status-dot" />
      <span className="status-text">{status}</span>
    </div>
  )
}
