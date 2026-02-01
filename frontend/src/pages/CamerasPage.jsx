/**
 * Page de gestion et visualisation des caméras RTSP/ONVIF
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { usePermissions } from '../hooks/usePermissions';
import {
  Camera,
  Plus,
  Settings,
  RefreshCw,
  Search,
  Video,
  VideoOff,
  Grid3X3,
  Wifi,
  WifiOff,
  Loader2,
  Bell
} from 'lucide-react';

import CameraGrid from '../components/Cameras/CameraGrid';
import LiveStreamPanel from '../components/Cameras/LiveStreamPanel';
import CameraAlertsPanel from '../components/Cameras/CameraAlertsPanel';
import AddCameraDialog from '../components/Cameras/AddCameraDialog';
import OnvifDiscoveryDialog from '../components/Cameras/OnvifDiscoveryDialog';
import CameraSettingsDialog from '../components/Cameras/CameraSettingsDialog';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CamerasPage = () => {
  const { toast } = useToast();
  const { canView, canEdit, isAdmin } = usePermissions();
  
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, active_streams: 0 });
  const [selectedCameras, setSelectedCameras] = useState([null, null, null]); // 3 slots pour le live
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [discoveryDialogOpen, setDiscoveryDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);

  // Charger les caméras
  const loadCameras = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erreur chargement caméras');
      
      const data = await response.json();
      setCameras(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les caméras',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Charger les stats
  const loadStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadCameras(), loadStats()]);
      setLoading(false);
    };
    loadData();
  }, [loadCameras, loadStats, refreshKey]);

  // Rafraîchir les vignettes toutes les 30 secondes (uniquement si on est sur l'onglet grille)
  const [activeTab, setActiveTab] = useState('grid');
  
  useEffect(() => {
    // Ne rafraîchir automatiquement que si on est sur l'onglet vignettes
    if (activeTab !== 'grid') return;
    
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // Sélectionner une caméra pour le live
  const handleSelectForLive = (camera, slotIndex) => {
    setSelectedCameras(prev => {
      const newSelection = [...prev];
      newSelection[slotIndex] = camera;
      return newSelection;
    });
  };

  // Désélectionner une caméra
  const handleDeselectLive = (slotIndex) => {
    setSelectedCameras(prev => {
      const newSelection = [...prev];
      newSelection[slotIndex] = null;
      return newSelection;
    });
  };

  // Mettre à jour une caméra dans la liste (après modification des alertes)
  const handleCameraUpdate = (updatedCamera) => {
    setCameras(prev => prev.map(c => 
      c.id === updatedCamera.id ? updatedCamera : c
    ));
  };

  // Compteur des alertes configurées
  const alertsConfiguredCount = cameras.filter(c => c.alert_enabled).length;

  // Supprimer une caméra
  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Supprimer cette caméra ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/${cameraId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erreur suppression');
      
      toast({ title: 'Succès', description: 'Caméra supprimée' });
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la caméra',
        variant: 'destructive'
      });
    }
  };

  // Tester une caméra
  const handleTestCamera = async (cameraId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/${cameraId}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Connexion réussie',
          description: `Résolution: ${result.resolution}`
        });
      } else {
        toast({
          title: 'Connexion échouée',
          description: result.message,
          variant: 'destructive'
        });
      }
      
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Test de connexion échoué',
        variant: 'destructive'
      });
    }
  };

  // Vérifier les permissions
  const canManage = isAdmin() || canEdit('cameras');
  const canViewCameras = isAdmin() || canView('cameras');

  if (!canViewCameras) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <VideoOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700">Accès refusé</h2>
          <p className="text-gray-500 mt-2">Vous n'avez pas la permission de visualiser les caméras</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cameras-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Camera className="w-7 h-7" />
            Caméras
          </h1>
          <p className="text-gray-500 mt-1">
            Surveillance vidéo RTSP/ONVIF
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(k => k + 1)}
            data-testid="refresh-cameras-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscoveryDialogOpen(true)}
                data-testid="discover-onvif-btn"
              >
                <Search className="w-4 h-4 mr-2" />
                Découvrir ONVIF
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsDialogOpen(true)}
                data-testid="camera-settings-btn"
              >
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </Button>
              
              <Button
                onClick={() => {
                  setEditingCamera(null);
                  setAddDialogOpen(true);
                }}
                data-testid="add-camera-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Grid3X3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">En ligne</p>
                <p className="text-2xl font-bold text-green-600">{stats.online}</p>
              </div>
              <Wifi className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Hors ligne</p>
                <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
              </div>
              <WifiOff className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Streams actifs</p>
                <p className="text-2xl font-bold text-purple-600">{stats.active_streams}/3</p>
              </div>
              <Video className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="grid" data-testid="tab-grid">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Vignettes
            </TabsTrigger>
            <TabsTrigger value="live" data-testid="tab-live">
              <Video className="w-4 h-4 mr-2" />
              Live ({selectedCameras.filter(c => c).length}/3)
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              <Bell className="w-4 h-4 mr-2" />
              Alertes ({alertsConfiguredCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="mt-4">
            <CameraGrid
              cameras={cameras}
              refreshKey={refreshKey}
              onSelectForLive={handleSelectForLive}
              onEdit={canManage ? (camera) => {
                setEditingCamera(camera);
                setAddDialogOpen(true);
              } : null}
              onDelete={canManage ? handleDeleteCamera : null}
              onTest={canManage ? handleTestCamera : null}
              selectedCameras={selectedCameras}
            />
          </TabsContent>
          
          <TabsContent value="live" className="mt-4">
            <LiveStreamPanel
              cameras={cameras}
              selectedCameras={selectedCameras}
              onSelect={handleSelectForLive}
              onDeselect={handleDeselectLive}
            />
          </TabsContent>
          
          <TabsContent value="alerts" className="mt-4">
            <CameraAlertsPanel
              cameras={cameras}
              onCameraUpdate={handleCameraUpdate}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <AddCameraDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        camera={editingCamera}
        onSuccess={() => {
          setAddDialogOpen(false);
          setEditingCamera(null);
          setRefreshKey(k => k + 1);
        }}
      />
      
      <OnvifDiscoveryDialog
        open={discoveryDialogOpen}
        onOpenChange={setDiscoveryDialogOpen}
        onSuccess={() => {
          setDiscoveryDialogOpen(false);
          setRefreshKey(k => k + 1);
        }}
      />
      
      <CameraSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  );
};

export default CamerasPage;
