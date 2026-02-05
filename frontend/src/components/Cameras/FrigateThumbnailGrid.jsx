/**
 * Grille de vignettes des caméras Frigate
 * Affiche UNIQUEMENT les caméras configurées dans stream_mapping
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
  AlertCircle,
  Settings
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateThumbnailGrid = ({ 
  frigateSettings, 
  refreshInterval = 30000,
  onSelectForLive,
  onOpenSettings
}) => {
  const [thumbnails, setThumbnails] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Obtenir la liste des caméras à afficher depuis le stream_mapping
  const getCamerasToDisplay = useCallback(() => {
    if (!frigateSettings?.stream_mapping) return [];
    
    // Extraire les noms de caméras depuis le mapping
    // Le mapping est: { "Nom affiché": "stream_name" }
    // Le nom de caméra Frigate est généralement la première partie du stream (avant _hq/_lq)
    return Object.entries(frigateSettings.stream_mapping).map(([displayName, streamName]) => {
      // Extraire le nom de la caméra (avant _hq, _lq, etc.)
      const cameraName = streamName.replace(/_hq$|_lq$|_sub$/, '');
      return {
        displayName,
        streamName,
        cameraName
      };
    });
  }, [frigateSettings]);

  // Charger les thumbnails pour les caméras configurées
  const loadThumbnails = useCallback(async () => {
    if (!frigateSettings?.enabled || !frigateSettings?.connected) return;
    
    const camerasToDisplay = getCamerasToDisplay();
    if (camerasToDisplay.length === 0) {
      setLoading(false);
      return;
    }
    
    setRefreshing(true);
    const token = localStorage.getItem('token');
    const newThumbnails = {};
    
    // Charger les snapshots en parallèle
    await Promise.all(
      camerasToDisplay.map(async ({ displayName, cameraName }) => {
        try {
          const response = await fetch(
            `${API_URL}/api/cameras/frigate/thumbnail/${cameraName}?height=200`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.thumbnail) {
              newThumbnails[displayName] = {
                image: `data:image/jpeg;base64,${data.thumbnail}`,
                timestamp: new Date().toISOString(),
                error: null,
                cameraName
              };
            } else {
              newThumbnails[displayName] = {
                image: null,
                error: data.message || 'Erreur',
                cameraName
              };
            }
          } else {
            newThumbnails[displayName] = {
              image: null,
              error: `HTTP ${response.status}`,
              cameraName
            };
          }
        } catch (error) {
          console.error(`Erreur thumbnail ${displayName}:`, error);
          newThumbnails[displayName] = {
            image: null,
            error: 'Erreur réseau',
            cameraName
          };
        }
      })
    );
    
    setThumbnails(newThumbnails);
    setLastRefresh(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [frigateSettings, getCamerasToDisplay]);

  // Charger les thumbnails quand les settings changent
  useEffect(() => {
    if (frigateSettings?.enabled && frigateSettings?.connected) {
      loadThumbnails();
      
      const interval = setInterval(loadThumbnails, refreshInterval);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [frigateSettings, loadThumbnails, refreshInterval]);

  // Rafraîchir manuellement
  const handleManualRefresh = () => {
    if (!refreshing) {
      loadThumbnails();
    }
  };

  if (!frigateSettings?.enabled || !frigateSettings?.connected) {
    return null;
  }

  const camerasToDisplay = getCamerasToDisplay();

  // Aucune caméra configurée dans le mapping
  if (camerasToDisplay.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="mb-3">Aucune caméra configurée à afficher</p>
          <p className="text-sm text-gray-400 mb-4">
            Configurez les caméras dans l'onglet "Streams" des paramètres Frigate
          </p>
          {onOpenSettings && (
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Configurer les caméras
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header avec bouton refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">
            Vignettes ({camerasToDisplay.length} caméra{camerasToDisplay.length > 1 ? 's' : ''})
          </h3>
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
          {camerasToDisplay.map(({ displayName, cameraName }) => {
            const thumbnail = thumbnails[displayName];
            
            return (
              <Card 
                key={displayName}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onSelectForLive?.(cameraName, displayName)}
                data-testid={`frigate-thumbnail-${cameraName}`}
              >
                <div className="relative aspect-video bg-gray-900">
                  {thumbnail?.image ? (
                    <img
                      src={thumbnail.image}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {thumbnail?.error ? (
                        <div className="text-center text-gray-400 p-2">
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
                    {displayName}
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
