/**
 * Dialog pour la découverte automatique des caméras ONVIF
 */
import React, { useState } from 'react';
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
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '../../hooks/use-toast';
import {
  Search,
  Loader2,
  Camera,
  Check,
  Plus,
  Wifi,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const OnvifDiscoveryDialog = ({ open, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [addingCamera, setAddingCamera] = useState(null);
  const [addForm, setAddForm] = useState({
    name: '',
    username: '',
    password: '',
    location: ''
  });

  // Lancer la découverte
  const handleDiscover = async () => {
    setScanning(true);
    setDiscovered([]);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/discover/onvif?timeout=15`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erreur découverte');
      
      const data = await response.json();
      setDiscovered(data.cameras || []);
      
      if (data.count === 0) {
        toast({
          title: 'Aucune caméra trouvée',
          description: 'Vérifiez que les caméras sont sur le même réseau',
          variant: 'default'
        });
      } else {
        toast({
          title: `${data.count} caméra(s) trouvée(s)`,
          description: 'Cliquez sur une caméra pour l\'ajouter'
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Échec de la découverte ONVIF',
        variant: 'destructive'
      });
    } finally {
      setScanning(false);
    }
  };

  // Sélectionner une caméra pour l'ajout
  const handleSelectCamera = (camera) => {
    if (camera.already_added) return;
    
    setSelectedCamera(camera);
    setAddingCamera(camera);
    setAddForm({
      name: `Caméra ${camera.ip || 'ONVIF'}`,
      username: 'admin',
      password: '',
      location: ''
    });
  };

  // Ajouter la caméra sélectionnée
  const handleAddCamera = async () => {
    if (!addingCamera || !addForm.name) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/discover/onvif/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          xaddr: addingCamera.xaddr,
          name: addForm.name,
          username: addForm.username,
          password: addForm.password,
          location: addForm.location
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur ajout');
      }
      
      toast({
        title: 'Succès',
        description: `Caméra "${addForm.name}" ajoutée`
      });
      
      // Marquer comme ajoutée
      setDiscovered(prev => prev.map(c => 
        c.xaddr === addingCamera.xaddr ? { ...c, already_added: true } : c
      ));
      
      setAddingCamera(null);
      setSelectedCamera(null);
      
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (discovered.some(c => c.already_added)) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl" data-testid="onvif-discovery-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Découverte ONVIF
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Bouton scan */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDiscover}
              disabled={scanning}
              data-testid="start-discovery-btn"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Recherche en cours...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Scanner le réseau
                </>
              )}
            </Button>
            
            {discovered.length > 0 && (
              <Badge variant="outline">
                {discovered.length} trouvée(s)
              </Badge>
            )}
          </div>
          
          {/* Liste des caméras découvertes */}
          {discovered.length > 0 && (
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-2">
                {discovered.map((camera, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      camera.already_added 
                        ? 'opacity-50 cursor-not-allowed' 
                        : selectedCamera?.xaddr === camera.xaddr 
                          ? 'ring-2 ring-blue-500' 
                          : 'hover:shadow-md'
                    }`}
                    onClick={() => handleSelectCamera(camera)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Camera className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {camera.ip || 'Caméra ONVIF'}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {camera.brand || 'Générique'}
                            </p>
                          </div>
                        </div>
                        
                        {camera.already_added ? (
                          <Badge variant="secondary">
                            <Check className="w-3 h-3 mr-1" />
                            Ajoutée
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600">
                            <Plus className="w-3 h-3 mr-1" />
                            Ajouter
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {/* Formulaire d'ajout */}
          {addingCamera && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Configurer la caméra
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="onvif-name">Nom *</Label>
                    <Input
                      id="onvif-name"
                      value={addForm.name}
                      onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nom de la caméra"
                    />
                  </div>
                  <div>
                    <Label htmlFor="onvif-location">Emplacement</Label>
                    <Input
                      id="onvif-location"
                      value={addForm.location}
                      onChange={(e) => setAddForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Zone, bâtiment..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="onvif-user">Utilisateur</Label>
                    <Input
                      id="onvif-user"
                      value={addForm.username}
                      onChange={(e) => setAddForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <Label htmlFor="onvif-pass">Mot de passe</Label>
                    <Input
                      id="onvif-pass"
                      type="password"
                      value={addForm.password}
                      onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleAddCamera}
                    disabled={!addForm.name}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter cette caméra
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingCamera(null);
                      setSelectedCamera(null);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Message d'aide */}
          {!scanning && discovered.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Cliquez sur "Scanner le réseau" pour découvrir</p>
              <p className="text-sm">les caméras ONVIF sur votre réseau local</p>
            </div>
          )}
          
          {/* Note */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              La découverte ONVIF fonctionne uniquement pour les caméras sur le même réseau local.
              Assurez-vous que le protocole ONVIF est activé sur vos caméras.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnvifDiscoveryDialog;
