/**
 * Panel de visualisation live Frigate avec 3 slots
 * Utilise MSE (H264) pour les streams transcodés, fallback MJPEG pour les autres
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
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
  Loader2,
  Server,
  Wifi,
  WifiOff,
  Settings,
  AlertTriangle,
  Zap
} from 'lucide-react';
import FrigateStreamPlayer from './FrigateStreamPlayer';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateLivePanel = ({ onOpenSettings }) => {
  const [frigateSettings, setFrigateSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStreams, setSelectedStreams] = useState([null, null, null]);

  // Charger les paramètres Frigate
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/cameras/frigate/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setFrigateSettings(data);
        }
      } catch (error) {
        console.error('Erreur chargement Frigate:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Obtenir la liste des streams configurés depuis le stream_mapping
  const getConfiguredStreams = useCallback(() => {
    if (!frigateSettings?.stream_mapping) return [];
    
    return Object.entries(frigateSettings.stream_mapping).map(([displayName, streamName]) => {
      const isH264 = streamName.includes('_h264') || streamName.includes('_H264');
      return {
        displayName,
        streamName,
        isH264 // Indique si c'est un stream transcodé (fluide)
      };
    });
  }, [frigateSettings]);

  // Sélectionner un stream pour un slot
  const handleSelectStream = (slotIndex, streamName) => {
    if (streamName === '__none__') {
      handleDeselectStream(slotIndex);
      return;
    }
    
    const streams = getConfiguredStreams();
    const selected = streams.find(s => s.streamName === streamName);
    
    setSelectedStreams(prev => {
      const newSelection = [...prev];
      newSelection[slotIndex] = selected || null;
      return newSelection;
    });
  };

  // Désélectionner un stream
  const handleDeselectStream = (slotIndex) => {
    setSelectedStreams(prev => {
      const newSelection = [...prev];
      newSelection[slotIndex] = null;
      return newSelection;
    });
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  if (!frigateSettings?.enabled) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Server className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Frigate non configuré
          </h3>
          <p className="text-gray-500 mb-4">
            Configurez votre serveur Frigate pour utiliser le streaming.
          </p>
          <Button onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Configurer Frigate
          </Button>
        </div>
      </Card>
    );
  }

  if (!frigateSettings?.connected) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <WifiOff className="w-12 h-12 mx-auto mb-4 text-orange-400" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Connexion à Frigate impossible
          </h3>
          <p className="text-gray-500 mb-4">
            Vérifiez que Frigate est accessible sur {frigateSettings.host}:{frigateSettings.api_port}
          </p>
          <Button onClick={onOpenSettings} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Vérifier les paramètres
          </Button>
        </div>
      </Card>
    );
  }

  const configuredStreams = getConfiguredStreams();

  if (configuredStreams.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
          <p className="text-gray-600 mb-2">
            Aucun flux configuré à afficher
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Ajoutez des flux dans l'onglet "Streams" des paramètres Frigate
          </p>
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Configurer les flux
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">
            <Wifi className="w-3 h-3 mr-1" />
            Frigate connecté
          </Badge>
          {frigateSettings.frigate_version && (
            <span className="text-sm text-gray-500">v{frigateSettings.frigate_version}</span>
          )}
          <span className="text-sm text-gray-400">
            ({configuredStreams.length} flux)
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </Button>
      </div>

      {/* Info sur les types de streams */}
      <div className="text-xs text-gray-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-green-500" />
          <span>_h264 = Streaming fluide</span>
        </span>
        <span className="flex items-center gap-1">
          <Video className="w-3 h-3 text-blue-500" />
          <span>Autres = Polling images</span>
        </span>
      </div>

      {/* Grille des 3 slots live */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((slotIndex) => (
          <LiveSlot
            key={slotIndex}
            slotIndex={slotIndex}
            selectedStream={selectedStreams[slotIndex]}
            configuredStreams={configuredStreams}
            frigateSettings={frigateSettings}
            onSelectStream={handleSelectStream}
            onDeselectStream={handleDeselectStream}
          />
        ))}
      </div>
    </div>
  );
};

// Composant pour un slot live
const LiveSlot = ({
  slotIndex,
  selectedStream,
  configuredStreams,
  frigateSettings,
  onSelectStream,
  onDeselectStream
}) => {
  if (selectedStream) {
    return (
      <FrigateStreamPlayer
        streamName={selectedStream.streamName}
        displayName={selectedStream.displayName}
        onClose={() => onDeselectStream(slotIndex)}
      />
    );
  }

  return (
    <Card className="overflow-hidden" data-testid={`frigate-slot-${slotIndex}`}>
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Slot {slotIndex + 1}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center p-4">
          <VideoOff className="w-8 h-8 text-gray-400 mb-3" />
          <Select
            value=""
            onValueChange={(value) => onSelectStream(slotIndex, value)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Sélectionner un flux" />
            </SelectTrigger>
            <SelectContent>
              {configuredStreams.map(({ displayName, streamName, isH264 }) => (
                <SelectItem key={streamName} value={streamName}>
                  <div className="flex items-center gap-2">
                    {isH264 ? (
                      <Zap className="w-4 h-4 text-green-500" />
                    ) : (
                      <Video className="w-4 h-4 text-blue-500" />
                    )}
                    <span>{displayName}</span>
                    {isH264 && (
                      <span className="text-xs text-green-600">(fluide)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default FrigateLivePanel;
