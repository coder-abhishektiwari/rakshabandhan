# Door Hoke Bhi Rakhi

A real-time interactive Raksha Bandhan ceremony for siblings who are physically far apart. Two phones, one shared virtual ceremony — with live audio, synchronized actions, and playful interactions.

## Tech Stack

- **Frontend:** React 18, Vite, Three.js
- **Backend:** Node.js, Express, ws (WebSocket)
- **Networking:** WebRTC (audio + DataChannel), WebSocket (signaling only)

## Local Setup

```bash
npm install
npm run dev
```

This runs Vite dev server on port 5173 and the Node server on port 3000 concurrently.

## Production

```bash
npm install
npm run build
npm start
```

The server serves the built React app and handles WebSocket connections on the same port.

## Deploy to Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables:
   - `PORT` (Render provides this automatically)
   - `VITE_TURN_URL` (optional, for TURN server)
   - `VITE_TURN_USERNAME` (optional)
   - `VITE_TURN_PASSWORD` (optional)
5. WebSocket works automatically over Render's HTTPS — no extra config needed

## Environment Variables

```env
# Optional TURN server credentials
VITE_TURN_URL=
VITE_TURN_USERNAME=
VITE_TURN_PASSWORD=

# Server port (default: 3000)
PORT=3000
```

## How to Test

**Phone 1 (Brother):**
1. Open the app
2. Select "I Am Bhai"
3. Tap "Create Rakhi Room"
4. Copy the share link or note the room code

**Phone 2 (Sister):**
1. Open the share link (auto-detects as sister)
2. Or manually select "I Am Behen" and enter the room code

**Together:**
- Talk via audio (microphone permission needed)
- Perform the ceremony: Aarti → Flower → Tikka → Akshat → Rakhi → Mithai → Mini Game → Together
- React with emojis anytime
- Celebrate at the end!

## Architecture

```
                 Node.js
              WebSocket Server
                    │
            SDP / ICE signaling
                    │
          ┌─────────┴─────────┐
          │                   │
       BROTHER              SISTER
          │                   │
          └────── WebRTC ─────┘
                 │       │
               Audio   DataChannel
```

- WebSocket: WebRTC signaling only
- WebRTC Audio: peer-to-peer microphone audio
- DataChannel "rakhi": all ceremony events (synchronized actions)
