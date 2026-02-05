/**
 * Panel de visualisation live Frigate avec 3 slots
 * Utilise le streamName COMPLET (avec _hq/_lq) pour le streaming
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
  AlertTriangle
} from 'lucide-react';
import FrigateStreamPlayer from './FrigateStreamPlayer';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const FrigateLivePanel = ({ onOpenSettings }) => {
  const [frigateSettings, setFrigateSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  // Stocke les sélections sous forme {displayName, streamName}
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
  // Retourne: [{displayName: "Entrée HQ", streamName: "Entree_hq"}, ...]
  const getConfiguredStreams = useCallback(() => {
    if (!frigateSettings?.stream_mapping) return [];
    
    return Object.entries(frigateSettings.stream_mapping).map(([displayName, streamName]) => ({
      displayName,
      streamName  // Garder le nom COMPLET (avec _hq/_lq)
    }));
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

  const configuredStreams = getConfiguredStreams();

  // Pas de streams configurés dans le mapping
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
            ({configuredStreams.length} flux configuré{configuredStreams.length > 1 ? 's' : ''})
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </Button>
      </div>

      {/* Grille des 3 slots live */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((slotIndex) => (
          <LiveSlot
            key={slotIndex}
            slotIndex={slotIndex}
            selectedStream={selectedStreams[slotIndex]}
            configuredStreams={configuredStreams}
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
  onSelectStream,
  onDeselectStream
}) => {
  // Si un stream est sélectionné, afficher le player avec le streamName COMPLET
  if (selectedStream) {
    return (
      <FrigateStreamPlayer
        streamName={selectedStream.streamName}  // Nom complet avec _hq/_lq
        displayName={selectedStream.displayName}
        onClose={() => onDeselectStream(slotIndex)}
      />
    );
  }

  // Sinon, afficher le sélecteur avec les streams configurés
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
              <SelectValue placeholder="Sélectionner un flux" />
            </SelectTrigger>
            <SelectContent>
              {configuredStreams.map(({ displayName, streamName }) => (
                <SelectItem key={streamName} value={streamName}>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    {displayName}
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
