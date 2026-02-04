/**
 * Composant de lecture WebRTC pour les streams go2rtc/Frigate
 * Gère la connexion WebRTC directe pour un streaming ultra basse latence
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Video,
  VideoOff,
  Maximize,
  Minimize,
  Loader2,
  Play,
  Square,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertCircle
} from 'lucide-react';

const FrigateWebRTCPlayer = ({ 
  streamName, 
  displayName,
  frigateHost,
  go2rtcPort,
  onClose,
  className = ''
}) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  
  const [status, setStatus] = useState('idle'); // idle, connecting, connected, error
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [stats, setStats] = useState({ fps: 0, resolution: '' });
  
  const containerRef = useRef(null);

  // Construire l'URL WebSocket pour go2rtc
  const getWebSocketUrl = useCallback(() => {
    // Utiliser ws:// pour HTTP, wss:// pour HTTPS (selon le contexte)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${frigateHost}:${go2rtc_port}/api/ws?src=${streamName}`;
  }, [frigateHost, go2rtcPort, streamName]);

  // Nettoyer la connexion
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
    }
  }, []);

  // Démarrer la connexion WebRTC
  const startStream = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    cleanup();

    try {
      // Créer le peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      // Gérer les tracks entrants
      pc.ontrack = (event) => {
        console.log('Track reçu:', event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('connected');
        }
      };

      // Gérer les changements d'état de connexion
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus('error');
          setError('Connexion perdue');
        }
      };

      // Gérer les candidats ICE
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'webrtc/candidate',
            value: event.candidate.candidate
          }));
        }
      };

      // Ajouter les transceivers pour recevoir audio et vidéo
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Créer l'offre SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Se connecter via WebSocket à go2rtc
      const wsUrl = `ws://${frigateHost}:${go2rtcPort}/api/ws?src=${streamName}`;
      console.log('Connexion WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connecté');
        // Envoyer l'offre SDP
        ws.send(JSON.stringify({
          type: 'webrtc/offer',
          value: offer.sdp
        }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        console.log('Message WebSocket:', msg.type);

        if (msg.type === 'webrtc/answer') {
          await pc.setRemoteDescription({
            type: 'answer',
            sdp: msg.value
          });
        } else if (msg.type === 'webrtc/candidate') {
          if (msg.value) {
            await pc.addIceCandidate({
              candidate: msg.value,
              sdpMid: '0'
            });
          }
        }
      };

      ws.onerror = (err) => {
        console.error('Erreur WebSocket:', err);
        setStatus('error');
        setError('Erreur de connexion WebSocket');
      };

      ws.onclose = () => {
        console.log('WebSocket fermé');
        if (status === 'connecting' || status === 'connected') {
          setStatus('error');
          setError('Connexion fermée');
        }
      };

    } catch (err) {
      console.error('Erreur démarrage WebRTC:', err);
      setStatus('error');
      setError(err.message || 'Erreur de connexion');
    }
  }, [frigateHost, go2rtcPort, streamName, cleanup]);

  // Arrêter le stream
  const stopStream = useCallback(() => {
    cleanup();
    setStatus('idle');
    setError(null);
  }, [cleanup]);

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

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Écouter les changements de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup au démontage
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Démarrer automatiquement si on a les infos
  useEffect(() => {
    if (frigateHost && go2rtcPort && streamName) {
      startStream();
    }
  }, [frigateHost, go2rtcPort, streamName]);

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
            
            {/* Status badge */}
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <Square className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <div className={`relative bg-gray-900 ${isFullscreen ? 'h-screen' : 'aspect-video'}`}>
          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
          />
          
          {/* Overlay états */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <Button onClick={startStream}>
                <Play className="w-5 h-5 mr-2" />
                Démarrer le live
              </Button>
            </div>
          )}
          
          {status === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Connexion à {streamName}...</p>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <div className="text-center text-white">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-400 mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={startStream}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          )}
          
          {/* Indicateur WebRTC */}
          {status === 'connected' && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
              WebRTC • {streamName}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateWebRTCPlayer;
