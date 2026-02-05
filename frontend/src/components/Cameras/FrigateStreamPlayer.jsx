/**
 * Player de streaming Frigate via MSE (Media Source Extensions)
 * Utilise les streams H264 transcodés par go2rtc pour un rendu fluide
 */
import React, { useState, useEffect, useRef } from 'react';
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
  Volume2,
  VolumeX
} from 'lucide-react';

const FrigateStreamPlayer = ({ 
  streamName,  // Nom du stream go2rtc (ex: "Ouest_hq_h264")
  displayName, // Nom affiché (ex: "Entrée HQ")
  go2rtcHost,  // Host go2rtc (ex: "192.168.1.120")
  go2rtcPort = 1984, // Port go2rtc
  onClose,
  className = ''
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [streamKey, setStreamKey] = useState(Date.now());

  // Construire l'URL du stream MSE (MP4 via go2rtc)
  const getStreamUrl = () => {
    return `http://${go2rtcHost}:${go2rtcPort}/api/stream.mp4?src=${streamName}`;
  };

  // Démarrer le streaming
  const startStream = () => {
    setStatus('connecting');
    setError(null);
    setStreamKey(Date.now());
  };

  // Arrêter le streaming
  const stopStream = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setStatus('idle');
  };

  // Gestion des événements vidéo
  const handleCanPlay = () => {
    setStatus('connected');
    setError(null);
    // Auto-play
    if (videoRef.current) {
      videoRef.current.play().catch(e => {
        console.log('[FrigatePlayer] Autoplay bloqué, clic requis');
      });
    }
  };

  const handleError = (e) => {
    console.error('[FrigatePlayer] Erreur stream:', e);
    setStatus('error');
    setError('Impossible de charger le flux vidéo. Vérifiez que le stream H264 existe.');
  };

  const handleWaiting = () => {
    // Le player attend des données (buffering)
  };

  const handlePlaying = () => {
    setStatus('connected');
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

  // Écouter les changements de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Démarrer automatiquement quand streamName change
  useEffect(() => {
    if (streamName && go2rtcHost) {
      startStream();
    }
    return () => stopStream();
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
          {/* Video player MSE */}
          {(status === 'connecting' || status === 'connected') && go2rtcHost && (
            <video
              ref={videoRef}
              key={streamKey}
              src={getStreamUrl()}
              autoPlay
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain"
              onCanPlay={handleCanPlay}
              onError={handleError}
              onWaiting={handleWaiting}
              onPlaying={handlePlaying}
            />
          )}
          
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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/60 pointer-events-none">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Connexion à {displayName || streamName}...</p>
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
              <span className="text-green-400">H264</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
