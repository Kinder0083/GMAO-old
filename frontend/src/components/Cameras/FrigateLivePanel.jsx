/**
 * Panel de visualisation live Frigate avec 3 slots WebRTC
 * Utilise go2rtc pour un streaming ultra basse latence
 */
import React, { useState, useEffect } from 'react';
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
  Loader2,
  Play,
  Square,
  Server,
  Wifi,
  WifiOff,
  Settings,
  AlertTriangle
} from 'lucide-react';
import FrigateWebRTCPlayer from './FrigateWebRTCPlayer';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateLivePanel = ({ onOpenSettings }) => {
  const [frigateSettings, setFrigateSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStreams, setSelectedStreams] = useState([null, null, null]);
  const [availableStreams, setAvailableStreams] = useState([]);

  // Charger les paramètres Frigate
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/cameras/frigate/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setFrigateSettings(data);
          
          // Charger les streams si connecté
          if (data.enabled && data.connected) {
            const streamsRes = await fetch(`${API_URL}/api/cameras/frigate/streams`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (streamsRes.ok) {
              const streamsData = await streamsRes.json();
              setAvailableStreams(streamsData.streams || []);
            }
          }
        }
      } catch (error) {
        console.error('Erreur chargement paramètres Frigate:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Sélectionner un stream pour un slot
  const handleSelectStream = (slotIndex, streamName) => {
    setSelectedStreams(prev => {
      const newSelection = [...prev];
      newSelection[slotIndex] = streamName === '__none__' ? null : streamName;
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

  // Obtenir le nom d'affichage depuis le mapping
  const getDisplayName = (streamName) => {
    if (!frigateSettings?.stream_mapping) return streamName;
    
    // Chercher dans le mapping inversé
    const entry = Object.entries(frigateSettings.stream_mapping).find(
      ([_, stream]) => stream === streamName
    );
    
    return entry ? entry[0] : streamName;
  };

  // Obtenir les streams du mapping ou tous les streams disponibles
  const getStreamOptions = () => {
    if (frigateSettings?.stream_mapping && Object.keys(frigateSettings.stream_mapping).length > 0) {
      // Utiliser les streams du mapping
      return Object.entries(frigateSettings.stream_mapping).map(([displayName, streamName]) => ({
        displayName,
        streamName
      }));
    }
    // Utiliser tous les streams disponibles
    return availableStreams.map(s => ({
      displayName: s.name,
      streamName: s.name
    }));
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

  // Si Frigate non configuré
  if (!frigateSettings?.enabled) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Server className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Frigate non configuré
          </h3>
          <p className="text-gray-500 mb-4">
            Configurez votre serveur Frigate pour utiliser le streaming WebRTC temps réel.
          </p>
          <Button onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Configurer Frigate
          </Button>
        </div>
      </Card>
    );
  }

  // Si Frigate configuré mais non connecté
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

  const streamOptions = getStreamOptions();

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
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </Button>
      </div>

      {/* Pas de streams configurés */}
      {streamOptions.length === 0 && (
        <Card className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
            <p className="text-gray-600 mb-3">
              Aucun stream go2rtc détecté ou configuré.
            </p>
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              Configurer les streams
            </Button>
          </div>
        </Card>
      )}

      {/* Grille des 3 slots live */}
      {streamOptions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((slotIndex) => (
            <LiveSlot
              key={slotIndex}
              slotIndex={slotIndex}
              selectedStream={selectedStreams[slotIndex]}
              streamOptions={streamOptions}
              frigateSettings={frigateSettings}
              onSelectStream={handleSelectStream}
              onDeselectStream={handleDeselectStream}
              getDisplayName={getDisplayName}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Composant pour un slot live
const LiveSlot = ({
  slotIndex,
  selectedStream,
  streamOptions,
  frigateSettings,
  onSelectStream,
  onDeselectStream,
  getDisplayName
}) => {
  // Si un stream est sélectionné, afficher le player WebRTC
  if (selectedStream) {
    return (
      <FrigateWebRTCPlayer
        streamName={selectedStream}
        displayName={getDisplayName(selectedStream)}
        frigateHost={frigateSettings.host}
        go2rtcPort={frigateSettings.go2rtc_port}
        onClose={() => onDeselectStream(slotIndex)}
      />
    );
  }

  // Sinon, afficher le sélecteur
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
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sélectionner une caméra" />
            </SelectTrigger>
            <SelectContent>
              {streamOptions.map((option) => (
                <SelectItem key={option.streamName} value={option.streamName}>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    {option.displayName}
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
