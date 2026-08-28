export function createSignaling(roomId, role, onMessage, onOpen, onClose) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;
  console.log('[WS] Connecting to', url, 'as', role);

  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[WS] Connected');
    if (role === 'brother') {
      ws.send(JSON.stringify({ type: 'create-room' }));
      console.log('[WS] Sent create-room');
    } else {
      ws.send(JSON.stringify({ type: 'join-room', roomId }));
      console.log('[WS] Sent join-room', roomId);
    }
    if (onOpen) onOpen(ws);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log('[WS] Received:', msg.type, msg);
      onMessage(msg, ws);
    } catch (err) {
      console.error('[WS] Error handling message:', err);
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
  };

  ws.onclose = (event) => {
    console.log('[WS] Closed:', event.code, event.reason);
    if (onClose) onClose();
  };

  return ws;
}

export function sendSignaling(ws, type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg = JSON.stringify({ type, data });
    console.log('[WS] Sending:', type);
    ws.send(msg);
  } else {
    console.warn('[WS] Cannot send, readyState:', ws?.readyState);
  }
}
