/**
 * Player de streaming Frigate via proxy backend MJPEG
 * Utilise le streamName complet (avec _hq/_lq) pour le bon flux
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
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateStreamPlayer = ({ 
  streamName,  // Nom COMPLET du stream go2rtc (ex: "Ouest_hq") - UTILISÉ pour le streaming
  displayName, // Nom affiché (ex: "Entrée HQ")
  onClose,
  className = ''
}) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());

  // Construire l'URL du stream MJPEG avec le token d'authentification
  // IMPORTANT: Utilise streamName complet pour obtenir le bon flux (HQ ou LQ)
  const getStreamUrl = () => {
    const token = localStorage.getItem('token');
    return `${API_URL}/api/cameras/frigate/stream/${streamName}?token=${token}&_t=${streamKey}`;
  };

  // Démarrer le streaming
  const startStream = () => {
    setStatus('connecting');
    setError(null);
    setStreamKey(Date.now());
  };

  // Arrêter le streaming
  const stopStream = () => {
    if (imgRef.current) {
      imgRef.current.src = '';
    }
    setStatus('idle');
  };

  // Gestion des événements de l'image
  const handleLoad = () => {
    setStatus('connected');
    setError(null);
  };

  const handleError = (e) => {
    console.error('[FrigatePlayer] Erreur stream:', e);
    setStatus('error');
    setError('Impossible de charger le flux vidéo');
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
    if (streamName) {
      startStream();
    }
    return () => stopStream();
  }, [streamName]);

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
          {/* Stream MJPEG via img tag */}
          {(status === 'connecting' || status === 'connected') && (
            <img
              ref={imgRef}
              src={getStreamUrl()}
              alt={displayName || streamName}
              className="w-full h-full object-contain"
              onLoad={handleLoad}
              onError={handleError}
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
          
          {/* Indicateur de streaming */}
          {status === 'connected' && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>{streamName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
