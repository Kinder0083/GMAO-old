/**
 * Player de streaming Frigate via WebRTC (proxy backend)
 * Le backend fait le proxy vers go2rtc pour éviter les problèmes CORS/nginx
 * Fallback MJPEG via backend proxy si WebRTC échoue
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
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
  const hlsRef = useRef(null);
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
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
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

  // WebRTC DIRECT vers go2rtc (comme Home Assistant)
  // Le navigateur se connecte directement à go2rtc sur le port 1984
  const connectWebRTC = useCallback(async () => {
    if (!streamName) return false;
    
    // Construire l'URL go2rtc directe
    const go2rtcUrl = go2rtcHost 
      ? `http://${go2rtcHost}:${go2rtcPort}/api/webrtc?src=${streamName}`
      : null;
    
    if (!go2rtcUrl) {
      console.log('[WebRTC] go2rtcHost non configuré, WebRTC direct impossible');
      return false;
    }
    
    console.log('[WebRTC] Connexion DIRECTE vers go2rtc:', go2rtcUrl);
    
    return new Promise(async (resolve) => {
      let resolved = false;
      let iceTimeout = null;
      
      const resolveOnce = (value, reason) => {
        if (!resolved) {
          resolved = true;
          if (iceTimeout) clearTimeout(iceTimeout);
          console.log('[WebRTC] Résolu avec:', value, reason);
          resolve(value);
        }
      };
      
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        });
        pcRef.current = pc;
        
        // Recevoir les tracks média
        pc.ontrack = (event) => {
          console.log('[WebRTC] Track reçu:', event.track.kind, 'streams:', event.streams.length);
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            console.log('[WebRTC] Video stream attaché!');
          }
        };
        
        pc.oniceconnectionstatechange = () => {
          console.log('[WebRTC] ICE state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('[WebRTC] ✅ Connexion média établie!');
            setStatus('connected');
            setConnectionType('WebRTC');
            resolveOnce(true, 'ICE connected');
          }
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('[WebRTC] ❌ ICE failed/disconnected - fallback nécessaire');
            pc.close();
            pcRef.current = null;
            resolveOnce(false, 'ICE failed');
          }
        };
        
        pc.onconnectionstatechange = () => {
          console.log('[WebRTC] Connection state:', pc.connectionState);
          if (pc.connectionState === 'failed') {
            pc.close();
            pcRef.current = null;
            resolveOnce(false, 'Connection failed');
          }
        };
        
        // Ajouter les transceivers pour recevoir audio et vidéo
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
        
        // Créer l'offre SDP
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log('[WebRTC] Offre SDP créée, envoi vers go2rtc...');
        
        // Envoyer l'offre à go2rtc
        const response = await fetch(go2rtcUrl, {
          method: 'POST',
          body: offer.sdp,
          headers: { 'Content-Type': 'application/sdp' }
        });
        
        console.log('[WebRTC] Réponse HTTP:', response.status, response.headers.get('content-type'));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('[WebRTC] Erreur HTTP:', response.status, errorText);
          pc.close();
          pcRef.current = null;
          resolveOnce(false, 'HTTP error');
          return;
        }
        
        // go2rtc retourne le SDP answer en texte brut
        const answerSdp = await response.text();
        console.log('[WebRTC] Answer SDP reçue de go2rtc (' + answerSdp.length + ' chars)');
        
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp
        });
        
        console.log('[WebRTC] Remote description set! Attente ICE...');
        
        // Timeout de 8 secondes pour ICE
        iceTimeout = setTimeout(() => {
          if (!resolved) {
            console.log('[WebRTC] ⏱️ Timeout ICE après 8s');
            if (pcRef.current) {
              pcRef.current.close();
              pcRef.current = null;
            }
            resolveOnce(false, 'ICE timeout');
          }
        }, 8000);
        
      } catch (e) {
        console.error('[WebRTC] Erreur:', e.name, e.message);
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        resolveOnce(false, 'Exception: ' + e.message);
      }
    });
  }, [streamName, go2rtcHost, go2rtcPort]);

  // MJPEG Stream continu via go2rtc
  // Utilise le vrai endpoint MJPEG qui stream en continu
  const connectMJPEG = useCallback(() => {
    if (!streamName) return false;
    
    console.log('[MJPEG] Démarrage stream MJPEG pour:', streamName);
    
    // Si go2rtcHost est disponible, utiliser le stream MJPEG direct de go2rtc
    if (go2rtcHost) {
      const mjpegUrl = `http://${go2rtcHost}:${go2rtcPort}/api/stream.mjpeg?src=${streamName}`;
      console.log('[MJPEG] URL directe go2rtc:', mjpegUrl);
      
      if (imgRef.current) {
        imgRef.current.src = mjpegUrl;
        imgRef.current.onload = () => {
          console.log('[MJPEG] Première frame chargée!');
        };
        imgRef.current.onerror = (e) => {
          console.log('[MJPEG] Erreur chargement:', e);
          // Fallback au polling si le stream MJPEG direct échoue
          fallbackToPolling();
        };
        setStatus('connected');
        setConnectionType('MJPEG');
        return true;
      }
    }
    
    // Sinon, fallback au polling via backend
    return fallbackToPolling();
  }, [streamName, go2rtcHost, go2rtcPort]);

  // Polling de frames via backend (dernier recours)
  const fallbackToPolling = useCallback(() => {
    console.log('[Polling] Démarrage polling pour:', streamName);
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[Polling] Token non trouvé');
      return false;
    }
    
    // Extraire le nom de la caméra (sans _hq/_lq) pour l'API Frigate
    let cameraName = streamName;
    if (streamName.endsWith('_hq') || streamName.endsWith('_lq')) {
      cameraName = streamName.replace(/_hq$|_lq$/, '');
    }
    // Mapping spécial pour Tapo
    if (cameraName === 'Tapo') {
      cameraName = 'Salon_Tapo';
    }
    
    console.log('[Polling] Camera name:', cameraName);
    
    let frameCount = 0;
    let errorCount = 0;
    
    const fetchFrame = async () => {
      try {
        const frameUrl = `${API_URL}/api/cameras/frigate/thumbnail/${cameraName}?height=720&_t=${Date.now()}`;
        
        const response = await fetch(frameUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail && imgRef.current) {
            imgRef.current.src = `data:image/jpeg;base64,${data.thumbnail}`;
            frameCount++;
            errorCount = 0;
            if (frameCount === 1) {
              console.log('[Polling] Première frame reçue!');
            }
          }
        } else {
          errorCount++;
          if (errorCount > 5) {
            console.log('[Polling] Trop d\'erreurs, arrêt');
          }
        }
      } catch (err) {
        errorCount++;
        console.log('[Polling] Erreur frame:', err.message);
      }
    };
    
    // Première frame immédiatement
    fetchFrame();
    
    // Polling (~5 fps)
    mjpegIntervalRef.current = setInterval(fetchFrame, 200);
    
    setStatus('connected');
    setConnectionType('Polling');
    return true;
  }, [streamName]);

  // HLS Fallback via go2rtc
  const connectHLS = useCallback(async () => {
    if (!streamName || !go2rtcHost) return false;
    
    console.log('[HLS] Démarrage HLS pour:', streamName);
    
    try {
      // URL HLS via go2rtc directement (port 1984)
      const hlsUrl = `http://${go2rtcHost}:${go2rtcPort}/api/stream.m3u8?src=${streamName}`;
      console.log('[HLS] URL:', hlsUrl);
      
      if (!videoRef.current) return false;
      
      // Vérifier si HLS.js est supporté
      if (Hls.isSupported()) {
        console.log('[HLS] Utilisation de hls.js');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30
        });
        hlsRef.current = hls;
        
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[HLS] Manifest parsed, démarrage lecture');
          videoRef.current.play().catch(e => console.log('[HLS] Play error:', e));
          setStatus('connected');
          setConnectionType('HLS');
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.log('[HLS] Erreur:', data.type, data.details);
          if (data.fatal) {
            console.log('[HLS] Erreur fatale, arrêt');
            hls.destroy();
            hlsRef.current = null;
            return false;
          }
        });
        
        return true;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari supporte HLS nativement
        console.log('[HLS] Utilisation HLS natif (Safari)');
        videoRef.current.src = hlsUrl;
        videoRef.current.play().catch(e => console.log('[HLS] Play error:', e));
        setStatus('connected');
        setConnectionType('HLS');
        return true;
      } else {
        console.log('[HLS] HLS non supporté par ce navigateur');
        return false;
      }
    } catch (e) {
      console.error('[HLS] Erreur:', e);
      return false;
    }
  }, [streamName, go2rtcHost, go2rtcPort]);

  // Démarrer le streaming
  const startStream = useCallback(async () => {
    cleanup();
    setStatus('connecting');
    setError(null);
    
    console.log('[Stream] ====================================');
    console.log('[Stream] Démarrage pour:', streamName);
    console.log('[Stream] go2rtcHost:', go2rtcHost, 'go2rtcPort:', go2rtcPort);
    
    // Vérifier si go2rtc est accessible directement
    if (go2rtcHost) {
      // 1. Essayer WebRTC DIRECT vers go2rtc (meilleure qualité, basse latence)
      console.log('[Stream] 1️⃣ Tentative WebRTC direct...');
      const webrtcOk = await connectWebRTC();
      if (webrtcOk) {
        console.log('[Stream] ✅ WebRTC connecté avec succès!');
        if (videoRef.current) {
          videoRef.current.play().catch(e => console.log('[Stream] Play:', e));
        }
        return;
      }
      console.log('[Stream] ❌ WebRTC échoué, passage au fallback HLS...');
      
      // 2. Fallback: HLS (fluide, mais latence plus élevée)
      console.log('[Stream] 2️⃣ Tentative HLS...');
      const hlsOk = await connectHLS();
      if (hlsOk) {
        console.log('[Stream] ✅ HLS connecté!');
        return;
      }
      console.log('[Stream] ❌ HLS échoué, passage au MJPEG...');
      
      // 3. Fallback: MJPEG stream direct
      console.log('[Stream] 3️⃣ Tentative MJPEG direct...');
      const mjpegOk = connectMJPEG();
      if (mjpegOk) {
        console.log('[Stream] ✅ MJPEG connecté!');
        return;
      }
      console.log('[Stream] ❌ MJPEG échoué');
    }
    
    // 4. Dernier recours: Polling via backend
    console.log('[Stream] 4️⃣ Fallback au polling via backend...');
    const pollingOk = fallbackToPolling();
    if (pollingOk) {
      console.log('[Stream] ✅ Polling démarré!');
      return;
    }
    
    console.log('[Stream] ❌ Tous les modes ont échoué');
    setError('Impossible de se connecter au flux vidéo');
    setStatus('error');
  }, [cleanup, streamName, go2rtcHost, go2rtcPort, connectWebRTC, connectHLS, connectMJPEG, fallbackToPolling]);

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

  // Démarrer le stream quand les props changent
  useEffect(() => {
    console.log('[useEffect] streamName changed to:', streamName);
    if (streamName && go2rtcHost) {
      startStream();
    }
    return () => {
      console.log('[useEffect] Cleanup for:', streamName);
      cleanup();
    };
  }, [streamName, go2rtcHost, go2rtcPort, startStream, cleanup]);

  const isWebRTC = connectionType === 'WebRTC';
  const isHLS = connectionType === 'HLS';
  const isMJPEG = connectionType === 'MJPEG' || connectionType === 'Polling';
  const useVideoElement = isWebRTC || isHLS;

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
          {/* Video pour WebRTC et HLS */}
          <video
            ref={videoRef}
            autoPlay
            muted={isMuted}
            playsInline
            className={`w-full h-full object-contain ${isMJPEG ? 'hidden' : ''}`}
          />
          
          {/* Image pour MJPEG et Polling fallback */}
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
