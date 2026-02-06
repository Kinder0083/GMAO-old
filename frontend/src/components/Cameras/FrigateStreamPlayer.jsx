/**
 * Player de streaming Frigate via WebRTC/MSE direct go2rtc
 * Se connecte directement à go2rtc depuis le navigateur (pas de proxy backend)
 * Utilise le script video-stream.js de go2rtc pour WebRTC automatique
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

const FrigateStreamPlayer = ({ 
  streamName,  // Nom du stream go2rtc (ex: "Ouest_hq_h264" ou "Ouest_hq")
  displayName, // Nom affiché
  go2rtcHost,  // Host go2rtc (ex: "192.168.1.120")
  go2rtcPort = 1984,
  onClose,
  className = ''
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionType, setConnectionType] = useState('');

  const isH264 = streamName?.includes('_h264') || streamName?.includes('_H264');

  // Nettoyer les connexions
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
  }, []);

  // Connecter via WebRTC
  const connectWebRTC = useCallback(async () => {
    if (!go2rtcHost || !streamName) return false;
    
    try {
      const wsUrl = `ws://${go2rtcHost}:${go2rtcPort}/api/ws?src=${streamName}`;
      console.log('[WebRTC] Connexion:', wsUrl);
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;
      
      // Recevoir les tracks vidéo/audio
      pc.ontrack = (event) => {
        console.log('[WebRTC] Track reçu:', event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('connected');
          setConnectionType('WebRTC');
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setError('Connexion WebRTC perdue');
          setStatus('error');
        }
      };
      
      // WebSocket pour signaling
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = async () => {
        console.log('[WebRTC] WebSocket connecté');
        
        // Ajouter transceiver pour recevoir vidéo et audio
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Envoyer l'offre
        ws.send(JSON.stringify({
          type: 'webrtc/offer',
          value: offer.sdp
        }));
      };
      
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'webrtc/answer') {
          console.log('[WebRTC] Answer reçue');
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: msg.value
          }));
        } else if (msg.type === 'webrtc/candidate') {
          if (msg.value) {
            await pc.addIceCandidate(new RTCIceCandidate({
              candidate: msg.value,
              sdpMid: '0'
            }));
          }
        }
      };
      
      ws.onerror = (e) => {
        console.error('[WebRTC] WebSocket erreur:', e);
      };
      
      ws.onclose = () => {
        console.log('[WebRTC] WebSocket fermé');
      };
      
      // Envoyer les ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'webrtc/candidate',
            value: event.candidate.candidate
          }));
        }
      };
      
      return true;
    } catch (e) {
      console.error('[WebRTC] Erreur:', e);
      return false;
    }
  }, [go2rtcHost, go2rtcPort, streamName]);

  // Fallback MSE (stream.mp4)
  const connectMSE = useCallback(() => {
    if (!go2rtcHost || !streamName || !videoRef.current) return false;
    
    try {
      const url = `http://${go2rtcHost}:${go2rtcPort}/api/stream.mp4?src=${streamName}`;
      console.log('[MSE] Connexion:', url);
      
      videoRef.current.src = url;
      videoRef.current.play().then(() => {
        setStatus('connected');
        setConnectionType('MSE');
      }).catch(e => {
        console.error('[MSE] Play error:', e);
        return false;
      });
      
      return true;
    } catch (e) {
      console.error('[MSE] Erreur:', e);
      return false;
    }
  }, [go2rtcHost, go2rtcPort, streamName]);

  // Démarrer le streaming (essaie WebRTC puis MSE)
  const startStream = useCallback(async () => {
    cleanup();
    setStatus('connecting');
    setError(null);
    
    // Essayer WebRTC d'abord
    const webrtcSuccess = await connectWebRTC();
    
    if (!webrtcSuccess) {
      console.log('[Stream] WebRTC échoué, essai MSE...');
      const mseSuccess = connectMSE();
      
      if (!mseSuccess) {
        setError('Impossible de se connecter au flux');
        setStatus('error');
      }
    }
  }, [cleanup, connectWebRTC, connectMSE]);

  // Arrêter le streaming
  const stopStream = useCallback(() => {
    cleanup();
    setStatus('idle');
    setConnectionType('');
  }, [cleanup]);

  // Gestion vidéo events
  const handleCanPlay = () => {
    if (status === 'connecting') {
      setStatus('connected');
    }
  };

  const handleError = (e) => {
    console.error('[Video] Erreur:', e);
    if (status !== 'connected') {
      setStatus('error');
      setError('Erreur de lecture vidéo');
    }
  };

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

  // Écouter fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-start quand streamName change
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
            {status === 'connected' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </>
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
          {/* Video element pour WebRTC ou MSE */}
          <video
            ref={videoRef}
            autoPlay
            muted={isMuted}
            playsInline
            className="w-full h-full object-contain"
            onCanPlay={handleCanPlay}
            onError={handleError}
          />
          
          {/* Overlay - idle */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <Button onClick={startStream}>
                <Play className="w-5 h-5 mr-2" />
                Démarrer le live
              </Button>
            </div>
          )}
          
          {/* Overlay - connecting */}
          {status === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/60">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Connexion à {displayName || streamName}...</p>
                <p className="text-xs text-gray-400 mt-1">WebRTC / MSE</p>
              </div>
            </div>
          )}
          
          {/* Overlay - error */}
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
          
          {/* Indicateur de streaming */}
          {status === 'connected' && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>{streamName}</span>
              {connectionType && <span className="text-green-400">{connectionType}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
