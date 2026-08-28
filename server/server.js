import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function broadcast(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const participant of room.participants) {
    if (participant.ws !== excludeWs && participant.ws.readyState === 1) {
      participant.ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentRole = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create-room': {
        const roomId = generateRoomId();
        currentRoom = roomId;
        currentRole = 'brother';
        rooms.set(roomId, {
          participants: [{ ws, role: 'brother' }]
        });
        ws.send(JSON.stringify({ type: 'room-created', roomId }));
        break;
      }

      case 'join-room': {
        const { roomId } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'ROOM_NOT_FOUND' }));
          return;
        }
        if (room.participants.length >= 2) {
          ws.send(JSON.stringify({ type: 'error', message: 'ROOM_FULL' }));
          return;
        }
        currentRoom = roomId;
        currentRole = 'sister';
        room.participants.push({ ws, role: 'sister' });

        ws.send(JSON.stringify({ type: 'room-joined', roomId }));
        broadcast(roomId, { type: 'peer-joined', role: 'sister' }, ws);
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        if (currentRoom) {
          broadcast(currentRoom, msg, ws);
        }
        break;
      }

      case 'ceremony': {
        if (currentRoom) {
          broadcast(currentRoom, { ...msg, from: currentRole }, ws);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants = room.participants.filter(p => p.ws !== ws);
        broadcast(currentRoom, { type: 'peer-left', role: currentRole });
        if (room.participants.length === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

// Serve static files in production
app.use(express.static(join(__dirname, '..', 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
