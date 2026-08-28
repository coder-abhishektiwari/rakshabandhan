export function createPeerConnection(onTrack, onDataChannel, onIceCandidate, onConnected, onDisconnected) {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  if (import.meta.env.VITE_TURN_URL) {
    iceServers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_PASSWORD
    });
  }

  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    if (onTrack) onTrack(event.streams[0]);
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if (state === 'connected' && onConnected) onConnected();
    if (state === 'disconnected' || state === 'failed' || state === 'closed') {
      if (onDisconnected) onDisconnected();
    }
  };

  return pc;
}

export async function setupInitiator(pc, localStream, onDataChannel) {
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  const dc = pc.createDataChannel('rakhi');
  dc.onopen = () => onDataChannel(dc);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

export async function setupReceiver(pc, localStream, onDataChannel) {
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  pc.ondatachannel = (event) => {
    const dc = event.channel;
    dc.onopen = () => onDataChannel(dc);
  };
}

export async function handleOffer(pc, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function handleAnswer(pc, answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function handleIceCandidate(pc, candidate) {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

export async function getLocalAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return stream;
  } catch {
    return null;
  }
}
