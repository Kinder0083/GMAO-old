/**
 * Panel de visualisation live avec 3 slots de streaming MJPEG temps réel
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
  RefreshCw,
  Minimize
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const LiveStreamSlot = ({ 
  slotIndex, 
  camera, 
  cameras, 
  onSelect, 
  onDeselect 
}) => {
  const imgRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const [streamKey, setStreamKey] = useState(0);

  // URL du stream MJPEG
  const getMjpegUrl = () => {
    if (!camera) return null;
    const token = localStorage.getItem('token');
    return `${API_URL}/api/cameras/${camera.id}/mjpeg?token=${token}&t=${streamKey}`;
  };

  // Démarrer le stream MJPEG
  const startStream = () => {
    if (!camera) return;
    setLoading(true);
    setError(null);
    setStreamKey(Date.now()); // Force refresh
    setIsStreaming(true);
  };

  // Arrêter le stream
  const stopStream = () => {
    setIsStreaming(false);
    setStreamKey(0);
    // Le stream s'arrête automatiquement quand l'img src est vidé
  };

  // Refresh stream
  const refreshStream = () => {
    setStreamKey(Date.now());
  };

  // Gestion du chargement de l'image
  const handleImageLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setLoading(false);
    setError('Impossible de charger le flux vidéo');
  };

  // Cleanup au démontage ou changement de caméra
  useEffect(() => {
    return () => {
      setIsStreaming(false);
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
            {camera && !isStreaming && (
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
            
            {isStreaming && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={refreshStream}
                  title="Rafraîchir"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
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
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
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
          ) : isStreaming ? (
            /* Stream MJPEG via balise img - TEMPS RÉEL */
            <img
              ref={imgRef}
              src={getMjpegUrl()}
              alt={`Live ${camera.name}`}
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
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
          {camera && isStreaming && !loading && !error && (
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
