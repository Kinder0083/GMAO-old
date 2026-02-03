/**
 * Panel de visualisation live avec 3 slots de streaming
 */
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Video,
  VideoOff,
  Maximize,
  X,
  Loader2,
  Play,
  Square,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LiveStreamSlot = ({ 
  slotIndex, 
  camera, 
  cameras, 
  onSelect, 
  onDeselect 
}) => {
  const videoRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Démarrer le stream
  const startStream = async () => {
    if (!camera) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/${camera.id}/stream/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStreamUrl(`${API_URL}${data.stream_url}`);
      } else {
        setError(data.message || 'Impossible de démarrer le stream');
      }
    } catch (err) {
      setError('Erreur de connexion au stream');
      console.error('Erreur stream:', err);
    } finally {
      setLoading(false);
    }
  };

  // Arrêter le stream
  const stopStream = async () => {
    if (!camera) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/cameras/${camera.id}/stream/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Erreur arrêt stream:', err);
    }
    
    setStreamUrl(null);
    setError(null);
  };

  // Charger HLS.js dynamiquement
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    
    let hls = null;
    
    const loadHls = async () => {
      try {
        const Hls = (await import('hls.js')).default;
        
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 0,
            // Options pour réduire la latence et forcer le temps réel
            liveSyncDurationCount: 1,        // Nombre de segments à garder
            liveMaxLatencyDurationCount: 3,  // Max latence en segments
            liveDurationInfinity: true,      // Stream infini
            maxBufferLength: 2,              // Buffer max 2 secondes
            maxMaxBufferLength: 4,           // Buffer max absolu
            startLevel: -1,                  // Auto qualité
            debug: false
          });
          
          hls.loadSource(streamUrl);
          hls.attachMedia(videoRef.current);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            // Forcer la lecture à la fin du buffer (live edge)
            if (videoRef.current) {
              videoRef.current.currentTime = videoRef.current.duration || 0;
              videoRef.current.play().catch(e => console.log('Autoplay blocked:', e));
            }
          });
          
          // Sync périodique pour rester au live edge
          const syncInterval = setInterval(() => {
            if (videoRef.current && hls.liveSyncPosition) {
              const currentTime = videoRef.current.currentTime;
              const liveEdge = hls.liveSyncPosition;
              // Si plus de 3 secondes de retard, sauter au live
              if (liveEdge - currentTime > 3) {
                videoRef.current.currentTime = liveEdge;
              }
            }
          }, 2000);
          
          // Cleanup de l'interval
          hls._syncInterval = syncInterval;
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setError('Erreur de lecture du flux');
              clearInterval(syncInterval);
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari natif HLS
          videoRef.current.src = streamUrl;
          videoRef.current.play().catch(e => console.log('Autoplay blocked:', e));
        }
      } catch (err) {
        console.error('Erreur HLS:', err);
        setError('Lecteur vidéo non disponible');
      }
    };
    
    loadHls();
    
    return () => {
      if (hls) {
        if (hls._syncInterval) {
          clearInterval(hls._syncInterval);
        }
        hls.destroy();
      }
    };
  }, [streamUrl]);

  // Cleanup au démontage ou changement de caméra
  useEffect(() => {
    return () => {
      if (camera) {
        stopStream();
      }
    };
  }, [camera?.id]);

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

  return (
    <Card 
      ref={containerRef}
      className={`overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
      data-testid={`live-slot-${slotIndex}`}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Select
              value={camera?.id || ''}
              onValueChange={(value) => {
                if (value === '__none__') {
                  onDeselect(slotIndex);
                } else {
                  const selected = cameras.find(c => c.id === value);
                  if (selected) onSelect(selected, slotIndex);
                }
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Sélectionner une caméra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Aucune --</SelectItem>
                {cameras.map(cam => (
                  <SelectItem key={cam.id} value={cam.id}>
                    {cam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-1">
            {camera && !streamUrl && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={startStream}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            )}
            
            {streamUrl && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={stopStream}
                >
                  <Square className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={toggleFullscreen}
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className={`aspect-video bg-gray-900 relative ${isFullscreen ? 'h-[calc(100vh-60px)]' : ''}`}>
          {!camera ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <Video className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-sm">Slot {slotIndex + 1}</span>
              <span className="text-xs mt-1">Sélectionnez une caméra</span>
            </div>
          ) : loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <VideoOff className="w-12 h-12 mb-2 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-3"
                onClick={startStream}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : streamUrl ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              muted
              playsInline
              controls={isFullscreen}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <Video className="w-12 h-12 mb-2" />
              <span className="text-sm">{camera.name}</span>
              <Button 
                size="sm" 
                className="mt-3 bg-blue-600 hover:bg-blue-700"
                onClick={startStream}
              >
                <Play className="w-4 h-4 mr-2" />
                Démarrer le live
              </Button>
            </div>
          )}
          
          {/* Badge caméra */}
          {camera && streamUrl && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-600 animate-pulse">
                ● LIVE
              </Badge>
            </div>
          )}
          
          {/* Bouton fermer en fullscreen */}
          {isFullscreen && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const LiveStreamPanel = ({
  cameras,
  selectedCameras,
  onSelect,
  onDeselect
}) => {
  return (
    <div className="space-y-4" data-testid="live-stream-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Video className="w-5 h-5" />
          Visualisation Live
        </h3>
        <Badge variant="outline">
          {selectedCameras.filter(c => c).length}/3 actifs
        </Badge>
      </div>
      
      <p className="text-sm text-gray-500">
        Sélectionnez jusqu'à 3 caméras pour les visualiser en direct simultanément.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(index => (
          <LiveStreamSlot
            key={index}
            slotIndex={index}
            camera={selectedCameras[index]}
            cameras={cameras}
            onSelect={onSelect}
            onDeselect={onDeselect}
          />
        ))}
      </div>
    </div>
  );
};

export default LiveStreamPanel;
