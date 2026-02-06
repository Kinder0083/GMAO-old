/**
 * Player de streaming Frigate via WebRTC/MSE/MJPEG
 * Avec polling MJPEG manuel qui fonctionne à coup sûr
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
  streamName,
  displayName,
  go2rtcHost,
  go2rtcPort = 1984,  // Ignoré - on utilise toujours 1984 pour l'API go2rtc
  onClose,
  className = ''
}) => {
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const pollingRef = useRef(null);
  
  // IMPORTANT: go2rtc API est TOUJOURS sur le port 1984
  const GO2RTC_API_PORT = 1984;
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionType, setConnectionType] = useState('');
  const [useVideoElement, setUseVideoElement] = useState(true);

  const isH264 = streamName?.includes('_h264') || streamName?.includes('_H264');

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[Cleanup] Nettoyage...');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
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
        console.log('[WebRTC] Pas de host ou streamName');
        resolve(false);
        return;
      }
      
      const timeout = setTimeout(() => {
        console.log('[WebRTC] ⏱️ Timeout après 5s');
        resolve(false);
      }, 5000);
      
      try {
        const wsUrl = `ws://${go2rtcHost}:${GO2RTC_API_PORT}/api/ws?src=${streamName}`;
        console.log('[WebRTC] 🔌 Connexion:', wsUrl);
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;
        
        let resolved = false;
        
        pc.ontrack = (event) => {
          console.log('[WebRTC] 📺 Track reçu:', event.track.kind);
          if (!resolved && videoRef.current && event.streams[0]) {
            resolved = true;
            clearTimeout(timeout);
            videoRef.current.srcObject = event.streams[0];
            videoRef.current.play().catch(e => console.log('[WebRTC] Play error:', e));
            setUseVideoElement(true);
            setConnectionType('WebRTC');
            setStatus('connected');
            resolve(true);
          }
        };
        
        pc.oniceconnectionstatechange = () => {
          console.log('[WebRTC] 🧊 ICE state:', pc.iceConnectionState);
          if (!resolved && (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected')) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        };
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onerror = (e) => {
          console.log('[WebRTC] ❌ WS Error:', e);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        };
        
        ws.onclose = () => {
          console.log('[WebRTC] 🔒 WS Fermé');
        };
        
        ws.onopen = async () => {
          console.log('[WebRTC] ✅ WS Ouvert, envoi offer...');
          try {
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });
            
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'webrtc/offer', value: offer.sdp }));
            console.log('[WebRTC] 📤 Offer envoyée');
          } catch (e) {
            console.log('[WebRTC] ❌ Erreur offer:', e);
          }
        };
        
        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log('[WebRTC] 📨 Message:', msg.type);
            
            if (msg.type === 'webrtc/answer') {
              await pc.setRemoteDescription({ type: 'answer', sdp: msg.value });
              console.log('[WebRTC] ✅ Answer appliquée');
            } else if (msg.type === 'webrtc/candidate' && msg.value) {
              await pc.addIceCandidate({ candidate: msg.value, sdpMid: '0' });
            }
          } catch (e) {
            console.log('[WebRTC] ❌ Erreur message:', e);
          }
        };
        
        pc.onicecandidate = (event) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'webrtc/candidate', value: event.candidate.candidate }));
          }
        };
      } catch (e) {
        console.error('[WebRTC] ❌ Erreur globale:', e);
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }, [go2rtcHost, go2rtcPort, streamName]);

  // MSE connection (stream.mp4)
  const connectMSE = useCallback(() => {
    return new Promise((resolve) => {
      if (!go2rtcHost || !streamName || !videoRef.current) {
        console.log('[MSE] Pas de host, streamName ou videoRef');
        resolve(false);
        return;
      }
      
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.log('[MSE] ⏱️ Timeout après 5s');
          resolved = true;
          resolve(false);
        }
      }, 5000);
      
      try {
        const url = `http://${go2rtcHost}:${go2rtcPort}/api/stream.mp4?src=${streamName}`;
        console.log('[MSE] 🔌 Connexion:', url);
        
        const video = videoRef.current;
        
        const onCanPlay = () => {
          if (!resolved) {
            console.log('[MSE] ✅ CanPlay!');
            resolved = true;
            clearTimeout(timeout);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            setUseVideoElement(true);
            setConnectionType('MSE');
            setStatus('connected');
            resolve(true);
          }
        };
        
        const onError = (e) => {
          if (!resolved) {
            console.log('[MSE] ❌ Erreur:', e);
            resolved = true;
            clearTimeout(timeout);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            resolve(false);
          }
        };
        
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('error', onError);
        
        video.src = url;
        video.play().catch(e => {
          console.log('[MSE] ❌ Play error:', e);
        });
      } catch (e) {
        console.error('[MSE] ❌ Erreur globale:', e);
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }, [go2rtcHost, go2rtcPort, streamName]);

  // MJPEG polling manuel via go2rtc frame.jpeg
  const connectMJPEG = useCallback(() => {
    if (!go2rtcHost || !streamName) {
      console.log('[MJPEG] Pas de host ou streamName');
      return false;
    }
    
    console.log('[MJPEG] 🔌 Démarrage polling pour:', streamName);
    setUseVideoElement(false);
    setConnectionType('MJPEG');
    
    // Fonction pour charger une frame
    const loadFrame = () => {
      if (!imgRef.current) return;
      
      const url = `http://${go2rtcHost}:${go2rtcPort}/api/frame.jpeg?src=${streamName}&_t=${Date.now()}`;
      
      // Créer une nouvelle image pour éviter le cache
      const newImg = new Image();
      newImg.onload = () => {
        if (imgRef.current) {
          imgRef.current.src = newImg.src;
        }
      };
      newImg.onerror = () => {
        console.log('[MJPEG] ❌ Erreur frame');
      };
      newImg.src = url;
    };
    
    // Charger la première frame immédiatement
    loadFrame();
    
    // Puis toutes les 100ms (~10fps)
    pollingRef.current = setInterval(loadFrame, 100);
    
    setStatus('connected');
    return true;
  }, [go2rtcHost, go2rtcPort, streamName]);

  // Démarrer le streaming
  const startStream = useCallback(async () => {
    cleanup();
    setStatus('connecting');
    setError(null);
    
    console.log('[Stream] 🚀 Démarrage pour:', streamName, 'H264:', isH264);
    
    // Pour les flux H264, essayer WebRTC puis MSE
    if (isH264) {
      console.log('[Stream] Essai WebRTC pour flux H264...');
      const webrtcOk = await connectWebRTC();
      if (webrtcOk) {
        console.log('[Stream] ✅ WebRTC OK!');
        return;
      }
      
      console.log('[Stream] WebRTC échoué, essai MSE...');
      const mseOk = await connectMSE();
      if (mseOk) {
        console.log('[Stream] ✅ MSE OK!');
        return;
      }
      console.log('[Stream] MSE échoué aussi');
    }
    
    // Fallback MJPEG pour tous
    console.log('[Stream] Fallback MJPEG...');
    const mjpegOk = connectMJPEG();
    if (mjpegOk) {
      console.log('[Stream] ✅ MJPEG OK!');
      return;
    }
    
    setError('Impossible de se connecter');
    setStatus('error');
  }, [cleanup, isH264, streamName, connectWebRTC, connectMSE, connectMJPEG]);

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
          
          {/* Image pour MJPEG polling */}
          <img
            ref={imgRef}
            alt={displayName || streamName}
            className={`w-full h-full object-contain ${useVideoElement ? 'hidden' : ''}`}
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
              <span className={
                connectionType === 'WebRTC' ? 'text-green-400' : 
                connectionType === 'MSE' ? 'text-blue-400' : 
                'text-yellow-400'
              }>
                {connectionType}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
