/**
 * Grille de vignettes des caméras avec rafraîchissement automatique
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Camera,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  MapPin,
  Loader2,
  ImageOff
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CameraThumbnail = ({ 
  camera, 
  refreshKey,
  onSelectForLive,
  onEdit,
  onDelete,
  onTest,
  isSelected
}) => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Charger le snapshot
  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(false);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/${camera.id}/snapshot`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erreur snapshot');
      
      const data = await response.json();
      
      if (data.success && data.snapshot) {
        setSnapshot(`data:image/jpeg;base64,${data.snapshot}`);
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(`Erreur snapshot ${camera.name}:`, err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [camera.id, camera.name]);

  // Charger au montage et à chaque refreshKey
  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot, refreshKey]);

  return (
    <Card 
      className={`overflow-hidden transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}
      data-testid={`camera-card-${camera.id}`}
    >
      {/* Image/Snapshot */}
      <div className="relative aspect-video bg-gray-900">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <ImageOff className="w-12 h-12 mb-2" />
            <span className="text-sm">Indisponible</span>
          </div>
        ) : snapshot ? (
          <img 
            src={snapshot} 
            alt={camera.name}
            className="w-full h-full object-cover"
          />
        ) : null}
        
        {/* Badge statut */}
        <div className="absolute top-2 left-2">
          <Badge variant={camera.is_online ? "success" : "destructive"} className="text-xs">
            {camera.is_online ? (
              <><Wifi className="w-3 h-3 mr-1" /> En ligne</>
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" /> Hors ligne</>
            )}
          </Badge>
        </div>
        
        {/* Bouton lecture live */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onSelectForLive && onSelectForLive(camera, 0)}
          >
            <Play className="w-4 h-4 mr-1" />
            Live
          </Button>
        </div>
        
        {/* Indicateur sélectionné */}
        {isSelected && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-600">
              <Play className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
        )}
      </div>
      
      {/* Infos */}
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" title={camera.name}>
              {camera.name}
            </h3>
            {camera.location && (
              <p className="text-xs text-gray-500 flex items-center mt-1">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{camera.location}</span>
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1 capitalize">
              {camera.brand || 'Générique'}
            </p>
          </div>
          
          {/* Menu actions */}
          {(onEdit || onDelete || onTest) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onTest && (
                  <DropdownMenuItem onClick={() => onTest(camera.id)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tester connexion
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(camera)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(camera.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CameraGrid = ({
  cameras,
  refreshKey,
  onSelectForLive,
  onEdit,
  onDelete,
  onTest,
  selectedCameras = []
}) => {
  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Camera className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">Aucune caméra configurée</p>
        <p className="text-sm">Ajoutez une caméra ou lancez la découverte ONVIF</p>
      </div>
    );
  }

  // Vérifier si une caméra est sélectionnée pour le live
  const isSelected = (cameraId) => {
    return selectedCameras.some(c => c && c.id === cameraId);
  };

  return (
    <div 
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      data-testid="camera-grid"
    >
      {cameras.map(camera => (
        <CameraThumbnail
          key={camera.id}
          camera={camera}
          refreshKey={refreshKey}
          onSelectForLive={onSelectForLive}
          onEdit={onEdit}
          onDelete={onDelete}
          onTest={onTest}
          isSelected={isSelected(camera.id)}
        />
      ))}
    </div>
  );
};

export default CameraGrid;
