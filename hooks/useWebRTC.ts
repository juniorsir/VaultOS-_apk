
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const REST_URL = 'https://raindrops-0co5.onrender.com';
const SIGNALING_URL = 'wss://raindrops-2osp.onrender.com';
const API_KEY = 'PleaseGiveCreditIfYouUse';
const CHUNK_SIZE = 32 * 1024; // 32KB chunks for flow control
const BUFFER_THRESHOLD = 1024 * 1024; // 1MB Backpressure limit

interface TransferState {
  status: 'IDLE' | 'CREATING' | 'PAIRING' | 'CONNECTING' | 'CONNECTED' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR';
  error: string | null;
  roomId: string | null;
  isHost: boolean;
  progress: number;
  transferSpeed: number;
  fileName: string | null;
  fileSize: number | null;
  transferType: 'sending' | 'receiving' | null;
  peersCount: number;
}

export const useWebRTC = () => {
  const [state, setState] = useState<TransferState>({
    status: 'IDLE',
    error: null,
    roomId: null,
    isHost: false,
    progress: 0,
    transferSpeed: 0,
    fileName: null,
    fileSize: null,
    transferType: null,
    peersCount: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  
  // Transfer Refs
  const incomingBufferRef = useRef<ArrayBuffer[]>([]);
  const incomingBytesRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastProgressUpdate = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, []);

  // --- Core WebRTC Logic ---

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
        console.log('🚀 Data Channel OPEN');
        setState(prev => ({ ...prev, status: 'CONNECTED', error: null }));
    };

    channel.onmessage = handleDataMessage;
    
    channel.onclose = () => console.log('🚫 Data Channel CLOSED');
    channel.onerror = (err) => console.error('Data Channel Error:', err);

    dataChannelRef.current = channel;
  };

  const setupPeerConnection = useCallback(async (roomId: string, isInitiator: boolean) => {
    console.log(`🛠 Initializing PeerConnection (Initiator: ${isInitiator})`);
    
    if (pcRef.current) {
        pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        console.log('🕸 Connection State:', s);
        if (s === 'connected') {
            // Wait for data channel to open
        }
        if (s === 'disconnected' || s === 'failed') {
            setState(prev => ({ ...prev, status: 'PAIRING', error: 'Connection lost' }));
        }
    };

    if (isInitiator) {
      // Host creates the channel
      const channel = pc.createDataChannel("fileTransfer");
      setupDataChannel(channel);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('offer', { roomId, sdp: offer });
    } else {
      // Guest waits for the channel
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
    }

    pcRef.current = pc;
  }, []);

  const initializeSocket = useCallback((roomId: string) => {
    // Prevent duplicate connections
    if (socketRef.current && socketRef.current.connected) {
        // If room ID changed, re-join
        return socketRef.current;
    }

    const socket = io(SIGNALING_URL, {
      transports: ['websocket'], // Force WebSocket for stability
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('🔌 Signaling connected:', socket.id);
      socket.emit('join-room', roomId);
    });

    socket.on('peer-connected', async (data: any) => {
      console.log('👤 Peer Connected', data);
      setState(prev => ({ ...prev, status: 'CONNECTING', peersCount: 1 }));
      
      // Check if we should initiate (Host logic)
      // Robust check: if server sends 'initiator' ID, match it. Else fallback to isHost state.
      const isInitiator = (data && data.initiator && data.initiator === socket.id) || (!data?.initiator && state.isHost);
      
      setupPeerConnection(roomId, isInitiator);
    });

    socket.on('offer', async ({ sdp }) => {
        if (!pcRef.current) {
            // Passive peer setup if not already done
            await setupPeerConnection(roomId, false);
        }
        const pc = pcRef.current!;
        
        // Ensure state is ready
        if (pc.signalingState !== "stable") {
             await Promise.all([
                pc.setRemoteDescription(new RTCSessionDescription(sdp)),
                pc.createAnswer().then(answer => pc.setLocalDescription(answer))
             ]).then(() => {
                socket.emit('answer', { roomId, sdp: pc.localDescription });
             });
        } else {
             await pc.setRemoteDescription(new RTCSessionDescription(sdp));
             const answer = await pc.createAnswer();
             await pc.setLocalDescription(answer);
             socket.emit('answer', { roomId, sdp: answer });
        }
    });

    socket.on('answer', async ({ sdp }) => {
        const pc = pcRef.current;
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('ice-candidate', async ({ candidate }) => {
        const pc = pcRef.current;
        if (pc && candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error("Error adding ice candidate", e);
            }
        }
    });

    socket.on('peer-disconnected', () => {
      console.log('👤 Peer Disconnected');
      if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
      }
      setState(prev => ({ ...prev, status: 'PAIRING', peersCount: 0, error: 'Peer disconnected' }));
    });

    socketRef.current = socket;
    return socket;
  }, [setupPeerConnection, state.isHost]);

  // --- File Transfer Handling ---

  const handleDataMessage = (event: MessageEvent) => {
    const data = event.data;

    // Handle Metadata
    if (typeof data === 'string') {
        try {
            const meta = JSON.parse(data);
            if (meta.type === 'metadata') {
                incomingBufferRef.current = [];
                incomingBytesRef.current = 0;
                startTimeRef.current = Date.now();
                
                setState(prev => ({
                    ...prev,
                    status: 'TRANSFERRING',
                    transferType: 'receiving',
                    fileName: meta.name,
                    fileSize: meta.size,
                    progress: 0
                }));
            }
        } catch (e) {
            console.error("Failed to parse metadata", e);
        }
        return;
    }

    // Handle Binary Chunks
    if (data instanceof ArrayBuffer) {
        incomingBufferRef.current.push(data);
        incomingBytesRef.current += data.byteLength;

        if (state.fileSize) {
            updateProgress(incomingBytesRef.current, state.fileSize);

            if (incomingBytesRef.current >= state.fileSize) {
                finalizeDownload(state.fileName || 'file');
            }
        }
    }
  };

  const updateProgress = (current: number, total: number) => {
    const now = Date.now();
    // Throttle updates to ~60fps
    if (now - lastProgressUpdate.current > 16 || current >= total) {
        const elapsed = (now - startTimeRef.current) / 1000;
        const speed = elapsed > 0 ? current / elapsed : 0;
        const percent = (current / total) * 100;
        
        setState(prev => ({
            ...prev,
            progress: percent,
            transferSpeed: speed
        }));
        lastProgressUpdate.current = now;
    }
  };

  const finalizeDownload = (filename: string) => {
    const blob = new Blob(incomingBufferRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Reset buffer
    incomingBufferRef.current = [];
    incomingBytesRef.current = 0;
    setState(prev => ({ ...prev, status: 'COMPLETED' }));
  };

  // --- Exposed Actions ---

  const sendFile = async (file: File) => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== 'open') {
        setState(prev => ({ ...prev, error: 'Connection not ready' }));
        return;
    }

    setState(prev => ({
        ...prev,
        status: 'TRANSFERRING',
        transferType: 'sending',
        fileName: file.name,
        fileSize: file.size,
        progress: 0
    }));

    startTimeRef.current = Date.now();

    // 1. Send Metadata
    const metadata = JSON.stringify({
        type: 'metadata',
        name: file.name,
        size: file.size,
        mime: file.type
    });
    channel.send(metadata);

    // 2. Stream File
    const reader = new FileReader();
    let offset = 0;

    reader.onload = async (e) => {
        if (!e.target?.result) return;
        const buffer = e.target.result as ArrayBuffer;
        
        try {
            // Backpressure check
            while (channel.bufferedAmount > BUFFER_THRESHOLD) {
                await new Promise(r => setTimeout(r, 10));
            }
            
            channel.send(buffer);
            offset += buffer.byteLength;
            updateProgress(offset, file.size);

            if (offset < file.size) {
                readNextChunk();
            } else {
                setState(prev => ({ ...prev, status: 'COMPLETED' }));
            }
        } catch (err) {
            console.error('Send Error:', err);
            setState(prev => ({ ...prev, status: 'ERROR', error: 'Transfer interrupted' }));
        }
    };

    const readNextChunk = () => {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    };

    readNextChunk();
  };

  const createSession = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'CREATING', isHost: true }));
    try {
        const response = await axios.post(`${REST_URL}/pair/create`, {}, {
            headers: { 'x-api-key': API_KEY }
        });
        const { roomId } = response.data;

        if (!roomId) throw new Error("No room ID received");

        setState(prev => ({ ...prev, status: 'PAIRING', roomId }));
        initializeSocket(roomId);

    } catch (err: any) {
        setState(prev => ({ ...prev, status: 'ERROR', error: err.message || "Failed to create session" }));
    }
  }, [initializeSocket]);

  const joinSession = useCallback((inputRoomId: string) => {
    setState(prev => ({ ...prev, status: 'CONNECTING', isHost: false, roomId: inputRoomId }));
    initializeSocket(inputRoomId);
  }, [initializeSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
    }
    if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
    }
    if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
    }
    setState(prev => ({ 
        status: 'IDLE', 
        error: null, 
        roomId: null, 
        isHost: false, 
        progress: 0,
        transferSpeed: 0,
        fileName: null,
        fileSize: null,
        transferType: null,
        peersCount: 0
    }));
  }, []);

  return {
    ...state,
    createSession,
    joinSession,
    sendFile,
    disconnect
  };
};
