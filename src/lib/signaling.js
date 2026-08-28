export function createSignaling(roomId, role, onMessage, onOpen, onClose) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    if (role === 'brother') {
      ws.send(JSON.stringify({ type: 'create-room' }));
    } else {
      ws.send(JSON.stringify({ type: 'join-room', roomId }));
    }
    if (onOpen) onOpen(ws);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      onMessage(msg, ws);
    } catch {}
  };

  ws.onclose = () => {
    if (onClose) onClose();
  };

  return ws;
}

export function sendSignaling(ws, type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}
