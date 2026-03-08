
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { updateProgressNotification, clearProgressNotification, notifyTaskCompletion } from '../utils/backgroundTasks';

const REST_URL = '';
const SIGNALING_URL = '';
const API_KEY = 'PleaseGiveCreditIfYouUse';
const CHUNK_SIZE = 64 * 1024; // 64KB chunks for better throughput
const BUFFER_THRESHOLD = 8 * 1024 * 1024; // 8MB Backpressure limit

export interface TransferItem {
  id: string;
  fileName: string;
  fileSize: number;
  type: 'sending' | 'receiving';
  status: 'pending' | 'transferring' | 'completed' | 'error';
  progress: number;
  speed: number;
  timestamp: number;
}

interface TransferState {
  status: 'IDLE' | 'CREATING' | 'PAIRING' | 'CONNECTING' | 'CONNECTED' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR';
  error: string | null;
  roomId: string | null;
  isHost: boolean;
  peersCount: number;
  transfers: TransferItem[];
}

export const useWebRTC = () => {
  const [state, setState] = useState<TransferState>({
    status: 'IDLE',
    error: null,
    roomId: null,
    isHost: false,
    peersCount: 0,
    transfers: []
  });

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  
  // Transfer Refs
  const incomingBufferRef = useRef<ArrayBuffer[]>([]);
  const incomingBytesRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastProgressUpdate = useRef(0);
  const lastSpeedBytes = useRef(0);
  const lastSpeedTime = useRef(0);
  
  const currentReceivingIdRef = useRef<string | null>(null);
  const transferMetaRef = useRef<{ fileName: string | null; fileSize: number | null }>({
    fileName: null,
    fileSize: null
  });

  // Sending Queue
  const sendQueueRef = useRef<File[]>([]);
  const isSendingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, []);

  // --- Core WebRTC Logic ---

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    const handleOpen = () => {
        console.log('🚀 Data Channel OPEN');
        setState(prev => ({ ...prev, status: 'CONNECTED', error: null }));
    };

    if (channel.readyState === 'open') {
        handleOpen();
    } else {
        channel.onopen = handleOpen;
    }

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
        console.log('🧊 Sending ICE candidate');
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

    pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE Connection State:', pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
        console.log('📡 Signaling State:', pc.signalingState);
    };

    pcRef.current = pc;

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
  }, []);

  const initializeSocket = useCallback((roomId: string) => {
    // Prevent duplicate connections
    if (socketRef.current && socketRef.current.connected) {
        // If room ID changed, re-join
        return socketRef.current;
    }

    const socket = io(SIGNALING_URL || undefined, {
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
      const isInitiator = (data && data.initiator && socket.id && data.initiator === socket.id) || state.isHost;
      
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
        
        // Process queued ICE candidates
        while (iceCandidateQueueRef.current.length > 0) {
            const candidate = iceCandidateQueueRef.current.shift();
            if (candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding queued ice candidate", e);
                }
            }
        }
    });

    socket.on('answer', async ({ sdp }) => {
        const pc = pcRef.current;
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            // Process queued ICE candidates
            while (iceCandidateQueueRef.current.length > 0) {
                const candidate = iceCandidateQueueRef.current.shift();
                if (candidate) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error("Error adding queued ice candidate", e);
                    }
                }
            }
        }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
        const pc = pcRef.current;
        if (pc && candidate) {
            if (!pc.remoteDescription) {
                iceCandidateQueueRef.current.push(candidate);
            } else {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
            }
        } else if (candidate) {
            iceCandidateQueueRef.current.push(candidate);
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
                lastSpeedTime.current = Date.now();
                lastSpeedBytes.current = 0;
                
                // Update Ref
                transferMetaRef.current = {
                    fileName: meta.name,
                    fileSize: meta.size
                };
                
                const newTransferId = Math.random().toString(36).substring(7);
                currentReceivingIdRef.current = newTransferId;

                const newTransfer: TransferItem = {
                    id: newTransferId,
                    fileName: meta.name,
                    fileSize: meta.size,
                    type: 'receiving',
                    status: 'transferring',
                    progress: 0,
                    speed: 0,
                    timestamp: Date.now()
                };
                
                setState(prev => ({
                    ...prev,
                    status: 'TRANSFERRING',
                    transfers: [newTransfer, ...prev.transfers]
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
        
        const { fileSize, fileName } = transferMetaRef.current;

        if (fileSize && currentReceivingIdRef.current) {
            updateTransferProgress(currentReceivingIdRef.current, incomingBytesRef.current, fileSize);

            if (incomingBytesRef.current >= fileSize) {
                finalizeDownload(fileName || 'file', currentReceivingIdRef.current);
            }
        }
    }
  };

  const updateTransferProgress = (id: string, current: number, total: number) => {
    const now = Date.now();
    // Throttle UI updates to ~60fps
    if (now - lastProgressUpdate.current > 16 || current >= total) {
        const percent = (current / total) * 100;
        
        // Calculate Instantaneous Speed (every 500ms)
        let speed = 0;
        if (now - lastSpeedTime.current > 500 || current >= total) {
             const bytesDiff = current - lastSpeedBytes.current;
             const timeDiff = (now - lastSpeedTime.current) / 1000;
             speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
             
             lastSpeedBytes.current = current;
             lastSpeedTime.current = now;
        }
        
        setState(prev => ({
            ...prev,
            transfers: prev.transfers.map(t => 
                t.id === id 
                ? { ...t, progress: percent, speed: speed > 0 ? speed : t.speed } 
                : t
            )
        }));
        
        const transfer = stateRef.current.transfers.find(t => t.id === id);
        if (transfer) {
            const action = transfer.type === 'sending' ? 'Sending' : 'Receiving';
            updateProgressNotification(id, `${action} ${transfer.fileName}`, Math.round(percent), `${action}: ${Math.round(percent)}%`);
        }
        
        lastProgressUpdate.current = now;
    }
  };

  const finalizeDownload = (filename: string, transferId: string) => {
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
    
    setState(prev => ({ 
        ...prev, 
        status: 'CONNECTED',
        transfers: prev.transfers.map(t => 
            t.id === transferId 
            ? { ...t, status: 'completed', progress: 100 } 
            : t
        )
    }));
    currentReceivingIdRef.current = null;
    
    clearProgressNotification(transferId);
    notifyTaskCompletion('Transfer Complete', {
        body: `Successfully received ${filename}.`
    });
  };

  // --- Exposed Actions ---

  const sendFile = async (file: File) => {
    sendQueueRef.current.push(file);
    processSendQueue();
  };

  const processSendQueue = async () => {
    if (isSendingRef.current || sendQueueRef.current.length === 0) return;

    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== 'open') {
        setState(prev => ({ ...prev, error: 'Connection not ready' }));
        return;
    }

    isSendingRef.current = true;
    const file = sendQueueRef.current.shift()!;

    const newTransferId = Math.random().toString(36).substring(7);

    const newTransfer: TransferItem = {
        id: newTransferId,
        fileName: file.name,
        fileSize: file.size,
        type: 'sending',
        status: 'transferring',
        progress: 0,
        speed: 0,
        timestamp: Date.now()
    };

    setState(prev => ({
        ...prev,
        status: 'TRANSFERRING',
        transfers: [newTransfer, ...prev.transfers]
    }));

    startTimeRef.current = Date.now();
    lastSpeedTime.current = Date.now();
    lastSpeedBytes.current = 0;

    // Set low threshold to keep pipe full
    channel.bufferedAmountLowThreshold = BUFFER_THRESHOLD / 2;

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
            if (channel.bufferedAmount > BUFFER_THRESHOLD) {
                await new Promise<void>(resolve => {
                    const onLow = () => {
                        channel.removeEventListener('bufferedamountlow', onLow);
                        resolve();
                    };
                    channel.addEventListener('bufferedamountlow', onLow);
                });
            }
            
            channel.send(buffer);
            offset += buffer.byteLength;
            updateTransferProgress(newTransferId, offset, file.size);

            if (offset < file.size) {
                readNextChunk();
            } else {
                setState(prev => ({ 
                    ...prev, 
                    status: 'CONNECTED',
                    transfers: prev.transfers.map(t => 
                        t.id === newTransferId 
                        ? { ...t, status: 'completed', progress: 100 } 
                        : t
                    )
                }));
                isSendingRef.current = false;
                
                clearProgressNotification(newTransferId);
                notifyTaskCompletion('Transfer Complete', {
                    body: `Successfully sent ${file.name}.`
                });
                
                processSendQueue(); // Process next file
            }
        } catch (err) {
            console.error('Send Error:', err);
            setState(prev => ({ 
                ...prev, 
                status: 'CONNECTED', // Go back to connected even on error
                error: 'Transfer interrupted',
                transfers: prev.transfers.map(t => 
                    t.id === newTransferId 
                    ? { ...t, status: 'error' } 
                    : t
                )
            }));
            isSendingRef.current = false;
            processSendQueue(); // Process next file
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
        peersCount: 0,
        transfers: []
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
