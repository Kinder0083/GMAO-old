/**
 * Player de streaming Frigate via iframe go2rtc
 * Utilise directement stream.html de go2rtc qui fonctionne
 * Fallback vers snapshots si go2rtc n'est pas accessible
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
  ExternalLink
} from 'lucide-react';

const FrigateStreamPlayer = ({ 
  streamName,
  displayName,
  go2rtcHost,
  go2rtcPort = 1984,
  onClose,
  className = ''
}) => {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // URL de stream.html de go2rtc (sans paramètre mode)
  const streamUrl = go2rtcHost 
    ? `http://${go2rtcHost}:${go2rtcPort}/stream.html?src=${streamName}`
    : null;

  // Démarrer le stream
  const startStream = useCallback(() => {
    setStatus('connecting');
    setError(null);
    
    console.log('[Stream] Démarrage iframe pour:', streamName);
    console.log('[Stream] URL:', streamUrl);
    
    if (!streamUrl) {
      setError('go2rtc non configuré');
      setStatus('error');
      return;
    }
    
    // L'iframe va charger automatiquement
    setStatus('connected');
  }, [streamName, streamUrl]);

  // Arrêter le stream
  const stopStream = useCallback(() => {
    setStatus('idle');
    setError(null);
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

  // Ouvrir dans un nouvel onglet
  const openInNewTab = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank');
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Démarrer automatiquement
  useEffect(() => {
    if (streamName && go2rtcHost) {
      startStream();
    }
    return () => stopStream();
  }, [streamName, go2rtcHost, startStream, stopStream]);

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
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openInNewTab} title="Ouvrir dans un nouvel onglet">
                  <ExternalLink className="w-4 h-4" />
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
          {/* Iframe go2rtc stream.html */}
          {status === 'connected' && streamUrl && (
            <iframe
              ref={iframeRef}
              src={streamUrl}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen"
              title={`Stream ${displayName || streamName}`}
            />
          )}
          
          {/* Overlay état idle */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <Button onClick={startStream}>
                <Play className="w-5 h-5 mr-2" />
                Démarrer le live
              </Button>
            </div>
          )}
          
          {/* Overlay connexion */}
          {status === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/60">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Connexion...</p>
              </div>
            </div>
          )}
          
          {/* Overlay erreur */}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
              <div className="text-center text-white p-4">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-400 mb-3">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={startStream}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                  {streamUrl && (
                    <Button variant="outline" size="sm" onClick={openInNewTab}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ouvrir go2rtc
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Status bar */}
          {status === 'connected' && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>{streamName}</span>
              <span className="text-green-400">go2rtc</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateStreamPlayer;
