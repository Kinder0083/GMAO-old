/**
 * Player de streaming Frigate via WebRTC (proxy backend)
 * Le backend fait le proxy vers go2rtc pour éviter les problèmes CORS/nginx
 * Fallback MJPEG via backend proxy si WebRTC échoue
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
  const mjpegIntervalRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionType, setConnectionType] = useState('');

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[Cleanup] Nettoyage...');
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
    // Arrêter le flux MJPEG en vidant le src de l'image
    if (imgRef.current) {
      imgRef.current.src = '';
    }
  }, []);

  // WebRTC via proxy backend
  const connectWebRTC = useCallback(async () => {
    if (!streamName) return false;
    
    console.log('[WebRTC] Connexion via proxy backend pour:', streamName);
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;
      
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
      
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Attendre ICE candidates
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve();
          };
          setTimeout(resolve, 2000);
        }
      });
      
      // Envoyer via PROXY BACKEND
      const token = localStorage.getItem('token');
      const url = `${API_URL}/api/cameras/frigate/webrtc/${streamName}/offer`;
      console.log('[WebRTC] POST vers proxy:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp })
      });
      
      if (!response.ok) {
        console.log('[WebRTC] Erreur HTTP:', response.status);
        pc.close();
        pcRef.current = null;
        return false;
      }
      
      const answer = await response.json();
      console.log('[WebRTC] Answer reçue, type:', answer.type);
      
      await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
      console.log('[WebRTC] Connexion établie!');
      return true;
      
    } catch (e) {
      console.error('[WebRTC] Erreur:', e);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      return false;
    }
  }, [streamName]);

  // MJPEG CONTINU via backend proxy (flux streaming réel, pas polling)
  const connectMJPEG = useCallback(() => {
    if (!streamName) return false;
    
    console.log('[MJPEG] Démarrage flux CONTINU via backend proxy pour:', streamName);
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[MJPEG] Token non trouvé');
      return false;
    }
    
    // Utiliser l'endpoint /stream/ qui renvoie un flux MJPEG continu (multipart/x-mixed-replace)
    // C'est un vrai stream, pas du polling d'images individuelles
    const streamUrl = `${API_URL}/api/cameras/frigate/stream/${streamName}?token=${encodeURIComponent(token)}`;
    console.log('[MJPEG] URL flux continu:', streamUrl);
    
    if (imgRef.current) {
      imgRef.current.src = streamUrl;
      imgRef.current.onerror = () => {
        console.log('[MJPEG] Erreur flux - tentative reconnexion...');
        // Tentative de reconnexion après 2 secondes
        setTimeout(() => {
          if (imgRef.current) {
            imgRef.current.src = streamUrl + '&_retry=' + Date.now();
          }
        }, 2000);
      };
    }
    
    setStatus('connected');
    setConnectionType('MJPEG Live');
    return true;
  }, [streamName]);

  // Démarrer le streaming
  const startStream = useCallback(async () => {
    cleanup();
    setStatus('connecting');
    setError(null);
    
    console.log('[Stream] Démarrage pour:', streamName);
    
    // Essayer WebRTC via proxy backend (pour tous les streams)
    const webrtcOk = await connectWebRTC();
    if (webrtcOk) {
      console.log('[Stream] WebRTC OK!');
      if (videoRef.current) {
        videoRef.current.play().catch(e => console.log('[Stream] Play:', e));
      }
      return;
    }
    
    // Fallback: MJPEG via backend proxy
    console.log('[Stream] WebRTC échoué, fallback MJPEG via backend...');
    const mjpegOk = connectMJPEG();
    if (mjpegOk) {
      console.log('[Stream] MJPEG OK!');
      return;
    }
    
    setError('Impossible de se connecter au flux vidéo');
    setStatus('error');
  }, [cleanup, streamName, connectWebRTC, connectMJPEG]);

  // Arrêter
  const stopStream = useCallback(() => {
    cleanup();
    setStatus('idle');
    setConnectionType('');
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

  const isWebRTC = connectionType === 'WebRTC';
  const isMJPEG = connectionType === 'MJPEG';

  return (
    <Card 
      ref={containerRef}
      className={`overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''} ${className}`}
      data-testid={`frigate-player-${streamName}`}
    >
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
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
            {status === 'connected' && isWebRTC && (
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
          {/* Video pour WebRTC */}
          <video
            ref={videoRef}
            autoPlay
            muted={isMuted}
            playsInline
            className={`w-full h-full object-contain ${isMJPEG ? 'hidden' : ''}`}
          />
          
          {/* Image pour MJPEG fallback */}
          {isMJPEG && (
            <img
              ref={imgRef}
              alt={displayName || streamName}
              className="w-full h-full object-contain"
            />
          )}
          
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
              <span className="text-green-400">{connectionType}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
