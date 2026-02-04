/**
 * Grille de vignettes des caméras Frigate
 * Affiche les snapshots avec rafraîchissement périodique
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Camera,
  RefreshCw,
  Loader2,
  ImageOff,
  Clock,
  Eye,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateThumbnailGrid = ({ 
  frigateSettings, 
  refreshInterval = 30000, // 30 secondes par défaut
  onSelectForLive 
}) => {
  const [thumbnails, setThumbnails] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Liste des caméras à afficher (depuis le mapping ou les caméras Frigate)
  const getCameraList = useCallback(() => {
    if (frigateSettings?.stream_mapping && Object.keys(frigateSettings.stream_mapping).length > 0) {
      return Object.entries(frigateSettings.stream_mapping).map(([displayName, streamName]) => ({
        displayName,
        cameraName: streamName.replace('_hq', '').replace('_lq', ''), // Extraire le nom de la caméra
        streamName
      }));
    }
    return [];
  }, [frigateSettings]);

  // Charger les thumbnails
  const loadThumbnails = useCallback(async () => {
    if (!frigateSettings?.enabled || !frigateSettings?.connected) return;
    
    const cameras = getCameraList();
    if (cameras.length === 0) return;
    
    setRefreshing(true);
    const token = localStorage.getItem('token');
    const newThumbnails = {};
    
    // Charger les snapshots en parallèle
    await Promise.all(
      cameras.map(async (camera) => {
        try {
          // Utiliser le nom de la caméra Frigate (pas le stream)
          const cameraName = camera.cameraName;
          const response = await fetch(
            `${API_URL}/api/cameras/frigate/thumbnail/${cameraName}?height=200`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.thumbnail) {
              newThumbnails[cameraName] = {
                image: `data:image/jpeg;base64,${data.thumbnail}`,
                timestamp: new Date().toISOString(),
                error: null
              };
            } else {
              newThumbnails[cameraName] = {
                image: null,
                error: data.message || 'Erreur'
              };
            }
          } else {
            newThumbnails[cameraName] = {
              image: null,
              error: 'Non disponible'
            };
          }
        } catch (error) {
          console.error(`Erreur thumbnail ${camera.cameraName}:`, error);
          newThumbnails[camera.cameraName] = {
            image: null,
            error: 'Erreur réseau'
          };
        }
      })
    );
    
    setThumbnails(newThumbnails);
    setLastRefresh(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [frigateSettings, getCameraList]);

  // Charger au montage et rafraîchir périodiquement
  useEffect(() => {
    loadThumbnails();
    
    const interval = setInterval(loadThumbnails, refreshInterval);
    return () => clearInterval(interval);
  }, [loadThumbnails, refreshInterval]);

  // Rafraîchir manuellement
  const handleManualRefresh = () => {
    if (!refreshing) {
      loadThumbnails();
    }
  };

  const cameras = getCameraList();

  if (!frigateSettings?.enabled || !frigateSettings?.connected) {
    return null;
  }

  if (cameras.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Aucune caméra configurée</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header avec bouton refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">Vignettes</h3>
          {lastRefresh && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Grille de vignettes */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {cameras.map((camera) => {
            const thumbnail = thumbnails[camera.cameraName];
            
            return (
              <Card 
                key={camera.streamName}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onSelectForLive?.(camera.streamName)}
                data-testid={`frigate-thumbnail-${camera.cameraName}`}
              >
                <div className="relative aspect-video bg-gray-900">
                  {thumbnail?.image ? (
                    <img
                      src={thumbnail.image}
                      alt={camera.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {thumbnail?.error ? (
                        <div className="text-center text-gray-400">
                          <AlertCircle className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                          <p className="text-xs">{thumbnail.error}</p>
                        </div>
                      ) : (
                        <ImageOff className="w-8 h-8 text-gray-600" />
                      )}
                    </div>
                  )}
                  
                  {/* Overlay au survol */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Voir en live
                    </Badge>
                  </div>
                  
                  {/* Badge rafraîchissement */}
                  {refreshing && (
                    <div className="absolute top-1 right-1">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </div>
                  )}
                </div>
                
                {/* Nom de la caméra */}
                <CardContent className="p-2">
                  <p className="text-xs font-medium truncate text-center">
                    {camera.displayName}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FrigateThumbnailGrid;
