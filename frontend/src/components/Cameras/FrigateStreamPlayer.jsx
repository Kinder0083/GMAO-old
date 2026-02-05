/**
 * Player de streaming Frigate via proxy backend
 * Utilise MJPEG ou MSE pour le streaming (pas de WebSocket direct)
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
  Image
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateStreamPlayer = ({ 
  cameraName,  // Nom de la caméra Frigate (ex: "Ouest")
  streamName,  // Nom du stream go2rtc (ex: "Ouest_hq") 
  displayName, // Nom affiché (ex: "Essai 1")
  onClose,
  className = ''
}) => {
  const imgRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(null);
  
  const containerRef = useRef(null);

  // Récupérer une frame depuis le backend (qui proxy vers Frigate avec auth)
  const fetchFrame = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/cameras/frigate/snapshot/${cameraName}?quality=70&_t=${Date.now()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.snapshot && imgRef.current) {
          imgRef.current.src = `data:image/jpeg;base64,${data.snapshot}`;
          setStatus('connected');
          setFrameCount(prev => prev + 1);
          setLastFrameTime(Date.now());
          setError(null);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('[FrigatePlayer] Erreur frame:', err);
      if (status !== 'error') {
        setError(err.message);
      }
    }
  }, [cameraName, status]);

  // Démarrer le streaming (polling de frames)
  const startStream = useCallback(() => {
    setStatus('connecting');
    setError(null);
    setFrameCount(0);
    
    // Récupérer la première frame
    fetchFrame();
    
    // Polling à 10 fps (100ms entre chaque frame)
    intervalRef.current = setInterval(fetchFrame, 100);
  }, [fetchFrame]);

  // Arrêter le streaming
  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('idle');
  }, []);

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

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Démarrer automatiquement
  useEffect(() => {
    if (cameraName) {
      startStream();
    }
    return () => stopStream();
  }, [cameraName]);

  // Calculer FPS approximatif
  const fps = frameCount > 10 ? Math.round(frameCount / ((Date.now() - (lastFrameTime - frameCount * 100)) / 1000)) : 0;

  return (
    <Card 
      ref={containerRef}
      className={`overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''} ${className}`}
      data-testid={`frigate-player-${cameraName}`}
    >
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{displayName || cameraName}</span>
            
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
          {/* Image pour afficher les frames */}
          <img
            ref={imgRef}
            alt={displayName || cameraName}
            className="w-full h-full object-contain"
            style={{ display: status === 'connected' ? 'block' : 'none' }}
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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Connexion à {displayName || cameraName}...</p>
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
              <Image className="w-3 h-3" />
              <span>{cameraName}</span>
              {frameCount > 10 && <span className="text-green-400">~10 fps</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
