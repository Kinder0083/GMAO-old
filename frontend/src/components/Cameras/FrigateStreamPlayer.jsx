/**
 * Player de streaming Frigate via WebRTC (même méthode que Home Assistant)
 * Utilise HTTP POST vers /api/go2rtc/webrtc au lieu de WebSocket
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
  go2rtcPort = 1984,
  onClose,
  className = ''
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const pcRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionType, setConnectionType] = useState('');

  const isH264 = streamName?.includes('_h264') || streamName?.includes('_H264');
  
  // go2rtc API est sur le port 1984
  const GO2RTC_PORT = 1984;

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[Cleanup] Nettoyage...');
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
  }, []);

  // WebRTC via HTTP POST (méthode Home Assistant / Frigate)
  const connectWebRTC = useCallback(async () => {
    if (!go2rtcHost || !streamName) {
      console.log('[WebRTC] Pas de host ou streamName');
      return false;
    }
    
    console.log('[WebRTC] 🔌 Connexion HTTP POST pour:', streamName);
    
    try {
      // Créer la connexion RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;
      
      // Recevoir les tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] 📺 Track reçu:', event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('connected');
          setConnectionType('WebRTC');
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] 🧊 ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setError('Connexion WebRTC perdue');
          setStatus('error');
        }
      };
      
      // Ajouter les transceivers pour recevoir audio et vidéo
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      
      // Créer l'offre SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Attendre que les ICE candidates soient collectés
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              resolve();
            }
          };
          // Timeout de sécurité
          setTimeout(resolve, 2000);
        }
      });
      
      // Envoyer l'offre via HTTP POST (méthode Home Assistant)
      const url = `http://${go2rtcHost}:${GO2RTC_PORT}/api/go2rtc/webrtc?src=${streamName}`;
      console.log('[WebRTC] 📤 POST vers:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offer',
          sdp: pc.localDescription.sdp
        })
      });
      
      if (!response.ok) {
        console.log('[WebRTC] ❌ Erreur HTTP:', response.status);
        return false;
      }
      
      const answer = await response.json();
      console.log('[WebRTC] 📨 Answer reçue');
      
      // Appliquer la réponse
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answer.sdp
      });
      
      console.log('[WebRTC] ✅ Connexion établie!');
      return true;
      
    } catch (e) {
      console.error('[WebRTC] ❌ Erreur:', e);
      return false;
    }
  }, [go2rtcHost, streamName]);

  // Fallback: MSE via stream.mp4
  const connectMSE = useCallback(async () => {
    if (!go2rtcHost || !streamName || !videoRef.current) {
      return false;
    }
    
    console.log('[MSE] 🔌 Tentative MSE...');
    
    return new Promise((resolve) => {
      const url = `http://${go2rtcHost}:${GO2RTC_PORT}/api/stream.mp4?src=${streamName}`;
      console.log('[MSE] URL:', url);
      
      const video = videoRef.current;
      const timeout = setTimeout(() => {
        console.log('[MSE] ⏱️ Timeout');
        resolve(false);
      }, 5000);
      
      video.oncanplay = () => {
        clearTimeout(timeout);
        console.log('[MSE] ✅ CanPlay!');
        setConnectionType('MSE');
        setStatus('connected');
        resolve(true);
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        console.log('[MSE] ❌ Erreur');
        resolve(false);
      };
      
      video.src = url;
      video.play().catch(() => {});
    });
  }, [go2rtcHost, streamName]);

  // Démarrer le streaming
  const startStream = useCallback(async () => {
    cleanup();
    setStatus('connecting');
    setError(null);
    
    console.log('[Stream] 🚀 Démarrage pour:', streamName);
    
    // Essayer WebRTC d'abord (méthode Home Assistant)
    const webrtcOk = await connectWebRTC();
    if (webrtcOk) {
      console.log('[Stream] ✅ WebRTC OK!');
      // Démarrer la lecture
      if (videoRef.current) {
        videoRef.current.play().catch(e => console.log('[Stream] Play:', e));
      }
      return;
    }
    
    // Fallback MSE
    console.log('[Stream] WebRTC échoué, essai MSE...');
    const mseOk = await connectMSE();
    if (mseOk) {
      console.log('[Stream] ✅ MSE OK!');
      return;
    }
    
    setError('Impossible de se connecter au flux');
    setStatus('error');
  }, [cleanup, streamName, connectWebRTC, connectMSE]);

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
          {/* Video pour WebRTC/MSE */}
          <video
            ref={videoRef}
            autoPlay
            muted={isMuted}
            playsInline
            className="w-full h-full object-contain"
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
                <p className="text-sm">Connexion WebRTC...</p>
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
