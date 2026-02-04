/**
 * Dialog pour les paramètres de connexion Frigate NVR
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import {
  Settings,
  Loader2,
  Server,
  Wifi,
  WifiOff,
  Video,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Play,
  Plus,
  Trash2,
  Eye
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FrigateSettingsDialog = ({ open, onOpenChange, onSettingsChange }) => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  const [settings, setSettings] = useState({
    enabled: false,
    host: '',
    api_port: 5000,
    go2rtc_port: 1984,
    stream_mapping: {}
  });
  
  // Liste des streams disponibles depuis Frigate
  const [availableStreams, setAvailableStreams] = useState([]);
  const [availableCameras, setAvailableCameras] = useState([]);
  
  // Pour ajouter un mapping
  const [newMappingName, setNewMappingName] = useState('');
  const [newMappingStream, setNewMappingStream] = useState('');

  // Charger les paramètres
  useEffect(() => {
    if (!open) return;
    
    const loadSettings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/cameras/frigate/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings({
            enabled: data.enabled || false,
            host: data.host || '',
            api_port: data.api_port || 5000,
            go2rtc_port: data.go2rtc_port || 1984,
            stream_mapping: data.stream_mapping || {}
          });
          
          // Si connecté, charger les streams
          if (data.connected) {
            await loadStreams();
          }
        }
      } catch (error) {
        console.error('Erreur chargement paramètres Frigate:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [open]);

  // Charger les streams disponibles
  const loadStreams = async () => {
    try {
      const token = localStorage.getItem('token');
      const [streamsRes, camerasRes] = await Promise.all([
        fetch(`${API_URL}/api/cameras/frigate/streams`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/cameras/frigate/cameras`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (streamsRes.ok) {
        const data = await streamsRes.json();
        setAvailableStreams(data.streams || []);
      }
      
      if (camerasRes.ok) {
        const data = await camerasRes.json();
        setAvailableCameras(data.cameras || []);
      }
    } catch (error) {
      console.error('Erreur chargement streams:', error);
    }
  };

  // Tester la connexion
  const handleTest = async () => {
    if (!settings.host) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer l\'adresse IP de Frigate',
        variant: 'destructive'
      });
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        host: settings.host,
        api_port: settings.api_port.toString(),
        go2rtc_port: settings.go2rtc_port.toString()
      });
      
      console.log('[FRIGATE] Test connexion:', settings.host, settings.api_port, settings.go2rtc_port);
      console.log('[FRIGATE] URL:', `${API_URL}/api/cameras/frigate/test?${params}`);
      
      const response = await fetch(`${API_URL}/api/cameras/frigate/test?${params}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[FRIGATE] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FRIGATE] Erreur HTTP:', response.status, errorText);
        setTestResult({
          success: false,
          message: `Erreur HTTP ${response.status}: ${errorText}`
        });
        toast({
          title: 'Erreur serveur',
          description: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
          variant: 'destructive'
        });
        return;
      }
      
      const result = await response.json();
      console.log('[FRIGATE] Résultat:', result);
      setTestResult(result);
      
      if (result.success) {
        setAvailableStreams(result.streams || []);
        setAvailableCameras(result.cameras || []);
        
        toast({
          title: 'Connexion réussie',
          description: `Frigate ${result.version} - ${result.streams?.length || 0} streams disponibles`
        });
      } else {
        toast({
          title: 'Échec de connexion',
          description: result.message || 'Erreur inconnue',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[FRIGATE] Exception:', error);
      setTestResult({
        success: false,
        message: `Erreur réseau: ${error.message}`
      });
      toast({
        title: 'Erreur réseau',
        description: `Impossible de contacter le serveur: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  // Sauvegarder les paramètres
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/frigate/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error('Erreur sauvegarde');
      
      const savedSettings = await response.json();
      
      toast({
        title: 'Succès',
        description: 'Paramètres Frigate enregistrés'
      });
      
      if (onSettingsChange) {
        onSettingsChange(savedSettings);
      }
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Ajouter un mapping de stream
  const addStreamMapping = () => {
    if (!newMappingName || !newMappingStream) return;
    
    setSettings(prev => ({
      ...prev,
      stream_mapping: {
        ...prev.stream_mapping,
        [newMappingName]: newMappingStream
      }
    }));
    
    setNewMappingName('');
    setNewMappingStream('');
  };

  // Supprimer un mapping
  const removeStreamMapping = (name) => {
    setSettings(prev => {
      const newMapping = { ...prev.stream_mapping };
      delete newMapping[name];
      return { ...prev, stream_mapping: newMapping };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="frigate-settings-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Paramètres Frigate NVR
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs defaultValue="connection" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connection">Connexion</TabsTrigger>
              <TabsTrigger value="streams">Streams</TabsTrigger>
            </TabsList>
            
            {/* Onglet Connexion */}
            <TabsContent value="connection" className="space-y-4 mt-4">
              {/* Activer/Désactiver */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-blue-500" />
                      <div>
                        <Label>Activer l'intégration Frigate</Label>
                        <p className="text-xs text-gray-500">
                          Utiliser Frigate pour le streaming temps réel
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Paramètres de connexion */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Serveur Frigate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="frigate-host">Adresse IP / Hostname</Label>
                      <Input
                        id="frigate-host"
                        placeholder="192.168.1.50"
                        value={settings.host}
                        onChange={(e) => setSettings(prev => ({ ...prev, host: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="frigate-api-port">Port API Frigate</Label>
                      <Input
                        id="frigate-api-port"
                        type="number"
                        min={1}
                        max={65535}
                        value={settings.api_port}
                        onChange={(e) => setSettings(prev => ({ ...prev, api_port: parseInt(e.target.value) }))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Défaut: 5000</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="frigate-go2rtc-port">Port go2rtc (WebRTC)</Label>
                      <Input
                        id="frigate-go2rtc-port"
                        type="number"
                        min={1}
                        max={65535}
                        value={settings.go2rtc_port}
                        onChange={(e) => setSettings(prev => ({ ...prev, go2rtc_port: parseInt(e.target.value) }))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Défaut: 1984</p>
                    </div>
                  </div>
                  
                  {/* Bouton Test */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleTest}
                    disabled={testing || !settings.host}
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Tester la connexion
                  </Button>
                  
                  {/* Résultat du test */}
                  {testResult && (
                    <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-start gap-2">
                        {testResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className={`block ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {testResult.success ? `Frigate ${testResult.version}` : 'Échec de connexion'}
                          </span>
                          {!testResult.success && testResult.message && (
                            <p className="text-sm text-red-600 mt-1 break-words">
                              {testResult.message}
                            </p>
                          )}
                          {!testResult.success && testResult.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-red-500 cursor-pointer hover:underline">
                                Détails techniques
                              </summary>
                              <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                                {JSON.stringify(testResult.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                      {testResult.success && testResult.go2rtc_available && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                          <Wifi className="w-4 h-4" />
                          go2rtc disponible pour WebRTC
                        </div>
                      )}
                      {testResult.success && !testResult.go2rtc_available && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-yellow-600">
                          <WifiOff className="w-4 h-4" />
                          go2rtc non disponible (WebRTC désactivé)
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Onglet Streams */}
            <TabsContent value="streams" className="space-y-4 mt-4">
              {/* Streams disponibles */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Streams go2rtc disponibles
                    {availableStreams.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{availableStreams.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availableStreams.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {settings.host ? 'Testez la connexion pour voir les streams' : 'Configurez d\'abord la connexion'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableStreams.map((stream) => (
                        <div
                          key={stream.name}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                        >
                          <Video className={`w-4 h-4 ${stream.active ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className="text-sm font-mono truncate">{stream.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Mapping des streams */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Configuration des caméras à afficher
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Associez un nom de caméra (affiché dans GMAO) à un stream go2rtc
                  </p>
                  
                  {/* Liste des mappings existants */}
                  {Object.entries(settings.stream_mapping).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(settings.stream_mapping).map(([name, stream]) => (
                        <div key={name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="flex-1 font-medium">{name}</span>
                          <span className="text-gray-400">→</span>
                          <span className="flex-1 font-mono text-sm text-blue-600">{stream}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStreamMapping(name)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Ajouter un mapping */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Nom affiché</Label>
                      <Input
                        placeholder="Ex: Entrée"
                        value={newMappingName}
                        onChange={(e) => setNewMappingName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Stream go2rtc</Label>
                      <select
                        className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                        value={newMappingStream}
                        onChange={(e) => setNewMappingStream(e.target.value)}
                      >
                        <option value="">Sélectionner...</option>
                        {availableStreams.map((stream) => (
                          <option key={stream.name} value={stream.name}>
                            {stream.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={addStreamMapping}
                      disabled={!newMappingName || !newMappingStream}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Caméras Frigate détectées */}
                  {availableCameras.length > 0 && (
                    <div className="pt-4 border-t">
                      <Label className="text-xs text-gray-500">Caméras configurées dans Frigate:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableCameras.map((cam) => (
                          <Badge key={cam.name} variant="outline">
                            {cam.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FrigateSettingsDialog;
