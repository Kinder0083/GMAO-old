/**
 * Player de streaming Frigate via WebRTC/MSE/MJPEG
 * Essaie dans l'ordre : WebRTC → MSE → MJPEG (polling)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Video,
  Maximize,
  Minimize,
  Loader2,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateStreamPlayer = ({ 
  streamName,
  displayName,
  go2rtcHost,
  go2rtcPort = 1984,
  onClose,
  className = ''
}) => {
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const mjpegIntervalRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionType, setConnectionType] = useState('');
  const [useVideoElement, setUseVideoElement] = useState(true);

  const isH264 = streamName?.includes('_h264') || streamName?.includes('_H264');

  // Cleanup
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (mjpegIntervalRef.current) {
      clearInterval(mjpegIntervalRef.current);
      mjpegIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
  }, []);

  // WebRTC connection
  const connectWebRTC = useCallback(() => {
    return new Promise((resolve) => {
      if (!go2rtcHost || !streamName) {
        resolve(false);
        return;
      }
      
      const timeout = setTimeout(() => {
        console.log('[WebRTC] Timeout');
        resolve(false);
      }, 5000);
      
      try {
        const wsUrl = `ws://${go2rtcHost}:${go2rtcPort}/api/ws?src=${streamName}`;
        console.log('[WebRTC] Connexion:', wsUrl);
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;
        
        pc.ontrack = (event) => {
          console.log('[WebRTC] Track reçu:', event.track.kind);
          clearTimeout(timeout);
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            videoRef.current.play().catch(e => console.log('[WebRTC] Play:', e));
            setUseVideoElement(true);
            setConnectionType('WebRTC');
            resolve(true);
          }
        };
        
        pc.oniceconnectionstatechange = () => {
          console.log('[WebRTC] ICE:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            clearTimeout(timeout);
            resolve(false);
          }
        };
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        ws.onopen = async () => {
          console.log('[WebRTC] WS ouvert');
          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('audio', { direction: 'recvonly' });
          
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: 'webrtc/offer', value: offer.sdp }));
        };
        
        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'webrtc/answer') {
            await pc.setRemoteDescription({ type: 'answer', sdp: msg.value });
          } else if (msg.type === 'webrtc/candidate' && msg.value) {
            await pc.addIceCandidate({ candidate: msg.value, sdpMid: '0' });
          }
        };
        
        pc.onicecandidate = (event) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'webrtc/candidate', value: event.candidate.candidate }));
          }
        };
      } catch (e) {
        console.error('[WebRTC] Erreur:', e);
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }, [go2rtcHost, go2rtcPort, streamName]);

  // MSE connection (stream.mp4)
  const connectMSE = useCallback(() => {
    return new Promise((resolve) => {
      if (!go2rtcHost || !streamName || !videoRef.current) {
        resolve(false);
        return;
      }
      
      const timeout = setTimeout(() => {
        console.log('[MSE] Timeout');
        resolve(false);
      }, 5000);
      
      try {
        const url = `http://${go2rtcHost}:${go2rtcPort}/api/stream.mp4?src=${streamName}`;
        console.log('[MSE] Connexion:', url);
        
        const video = videoRef.current;
        
        video.oncanplay = () => {
          clearTimeout(timeout);
          setUseVideoElement(true);
          setConnectionType('MSE');
          resolve(true);
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        video.src = url;
        video.play().catch(() => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch (e) {
        console.error('[MSE] Erreur:', e);
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }, [go2rtcHost, go2rtcPort, streamName]);

  // MJPEG polling via backend proxy (fallback ultime)
  const connectMJPEG = useCallback(() => {
    if (!streamName) return false;
    
    console.log('[MJPEG] Démarrage polling');
    setUseVideoElement(false);
    setConnectionType('MJPEG');
    
    // Utiliser le proxy backend MJPEG
    const token = localStorage.getItem('token');
    const baseUrl = `${API_URL}/api/cameras/frigate/stream/${streamName}?token=${token}`;
    
    if (imgRef.current) {
      imgRef.current.src = `${baseUrl}&_t=${Date.now()}`;
    }
    
    return true;
  }, [streamName]);

  // Démarrer le streaming
  const startStream = useCallback(async () => {
    cleanup();
    setStatus('connecting');
    setError(null);
    
    // Pour les flux H264, essayer WebRTC puis MSE
    if (isH264) {
      console.log('[Stream] Flux H264 détecté, essai WebRTC...');
      const webrtcOk = await connectWebRTC();
      if (webrtcOk) {
        setStatus('connected');
        return;
      }
      
      console.log('[Stream] WebRTC échoué, essai MSE...');
      const mseOk = await connectMSE();
      if (mseOk) {
        setStatus('connected');
        return;
      }
    }
    
    // Fallback MJPEG pour tous les flux (H265 inclus)
    console.log('[Stream] Fallback MJPEG...');
    const mjpegOk = connectMJPEG();
    if (mjpegOk) {
      setStatus('connected');
      return;
    }
    
    setError('Impossible de se connecter au flux');
    setStatus('error');
  }, [cleanup, isH264, connectWebRTC, connectMSE, connectMJPEG]);

  // Arrêter
  const stopStream = useCallback(() => {
    cleanup();
    setStatus('idle');
    setConnectionType('');
    setUseVideoElement(true);
  }, [cleanup]);

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (streamName && go2rtcHost) {
      startStream();
    }
    return () => cleanup();
  }, [streamName, go2rtcHost]);

  return (
    <Card 
      ref={containerRef}
      className={`overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''} ${className}`}
      data-testid={`frigate-player-${streamName}`}
    >
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isH264 ? (
              <Zap className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{displayName || streamName}</span>
            
            {status === 'connected' && (
              <Badge variant="default" className="bg-green-500 text-xs">Live</Badge>
            )}
            {status === 'connecting' && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Connexion...
              </Badge>
            )}
            {status === 'error' && (
              <Badge variant="destructive" className="text-xs">Erreur</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {status === 'connected' && useVideoElement && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            )}
            {status === 'connected' && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { stopStream(); onClose(); }}>
                <Square className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <div className={`relative bg-gray-900 ${isFullscreen ? 'h-screen' : 'aspect-video'}`}>
          {/* Video pour WebRTC/MSE */}
          <video
            ref={videoRef}
            autoPlay
            muted={isMuted}
            playsInline
            className={`w-full h-full object-contain ${useVideoElement ? '' : 'hidden'}`}
          />
          
          {/* Image pour MJPEG fallback */}
          <img
            ref={imgRef}
            alt={displayName || streamName}
            className={`w-full h-full object-contain ${useVideoElement ? 'hidden' : ''}`}
            onLoad={() => setStatus('connected')}
            onError={() => {
              if (!useVideoElement) {
                setError('Erreur chargement MJPEG');
                setStatus('error');
              }
            }}
          />
          
          {/* Overlays */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <Button onClick={startStream}>
                <Play className="w-5 h-5 mr-2" />
                Démarrer le live
              </Button>
            </div>
          )}
          
          {status === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/60">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Connexion...</p>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <div className="text-center text-white p-4">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-400 mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={startStream}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          )}
          
          {/* Status bar */}
          {status === 'connected' && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>{streamName}</span>
              {connectionType && (
                <span className={connectionType === 'WebRTC' ? 'text-green-400' : connectionType === 'MSE' ? 'text-blue-400' : 'text-yellow-400'}>
                  {connectionType}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
