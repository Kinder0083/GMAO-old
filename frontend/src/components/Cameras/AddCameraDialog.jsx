/**
 * Dialog pour ajouter ou modifier une caméra
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Camera,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BRANDS = [
  { value: 'hikvision', label: 'Hikvision' },
  { value: 'dahua', label: 'Dahua' },
  { value: 'axis', label: 'Axis' },
  { value: 'vivotek', label: 'Vivotek' },
  { value: 'hanwha', label: 'Hanwha (Samsung)' },
  { value: 'onvif', label: 'ONVIF Générique' },
  { value: 'generic', label: 'Autre / Générique' },
];

const AddCameraDialog = ({ open, onOpenChange, camera, onSuccess }) => {
  const { toast } = useToast();
  const isEditing = !!camera;
  
  const [formData, setFormData] = useState({
    name: '',
    rtsp_url: '',
    username: '',
    password: '',
    brand: 'generic',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Initialiser le formulaire
  useEffect(() => {
    if (camera) {
      setFormData({
        name: camera.name || '',
        rtsp_url: camera.rtsp_url || '',
        username: camera.username || '',
        password: '', // Ne pas afficher le mot de passe existant
        brand: camera.brand || 'generic',
        location: camera.location || ''
      });
    } else {
      setFormData({
        name: '',
        rtsp_url: '',
        username: '',
        password: '',
        brand: 'generic',
        location: ''
      });
    }
    setTestResult(null);
  }, [camera, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  // Tester la connexion
  const handleTest = async () => {
    if (!formData.rtsp_url) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une URL RTSP',
        variant: 'destructive'
      });
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        rtsp_url: formData.rtsp_url,
        username: formData.username || '',
        password: formData.password || ''
      });
      
      const response = await fetch(`${API_URL}/api/cameras/test-url?${params}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setTestResult({ success: false, message: errorData.detail || 'Erreur serveur' });
        return;
      }
      
      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: 'Connexion réussie',
          description: `Résolution: ${result.resolution}`
        });
      } else {
        toast({
          title: 'Connexion échouée',
          description: result.message || 'Impossible de se connecter à la caméra',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erreur test caméra:', error);
      setTestResult({ success: false, message: 'Erreur de connexion au serveur' });
    } finally {
      setTesting(false);
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.rtsp_url) {
      toast({
        title: 'Erreur',
        description: 'Nom et URL RTSP requis',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const url = isEditing 
        ? `${API_URL}/api/cameras/${camera.id}`
        : `${API_URL}/api/cameras`;
      
      const body = { ...formData };
      // Ne pas envoyer le mot de passe vide en édition
      if (isEditing && !body.password) {
        delete body.password;
      }
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur serveur');
      }
      
      toast({
        title: 'Succès',
        description: isEditing ? 'Caméra modifiée' : 'Caméra ajoutée'
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="add-camera-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {isEditing ? 'Modifier la caméra' : 'Ajouter une caméra'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Caméra Atelier 1"
              required
              data-testid="camera-name-input"
            />
          </div>
          
          {/* URL RTSP */}
          <div>
            <Label htmlFor="rtsp_url">URL RTSP *</Label>
            <Input
              id="rtsp_url"
              value={formData.rtsp_url}
              onChange={(e) => handleChange('rtsp_url', e.target.value)}
              placeholder="rtsp://192.168.1.50:554/Streaming/Channels/101"
              required
              data-testid="camera-rtsp-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ex: rtsp://IP:554/stream (le chemin varie selon la marque)
            </p>
          </div>
          
          {/* Authentification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="username">Utilisateur</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="admin"
                data-testid="camera-username-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder={isEditing ? '(inchangé)' : ''}
                  data-testid="camera-password-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Marque */}
          <div>
            <Label htmlFor="brand">Marque</Label>
            <Select
              value={formData.brand}
              onValueChange={(v) => handleChange('brand', v)}
            >
              <SelectTrigger data-testid="camera-brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRANDS.map(brand => (
                  <SelectItem key={brand.value} value={brand.value}>
                    {brand.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Emplacement */}
          <div>
            <Label htmlFor="location">Emplacement</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Atelier principal, Zone de stockage..."
              data-testid="camera-location-input"
            />
          </div>
          
          {/* Bouton test */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !formData.rtsp_url}
              data-testid="test-camera-btn"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Tester la connexion
            </Button>
            
            {testResult && (
              <span className={`flex items-center text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.success ? (
                  <><Check className="w-4 h-4 mr-1" /> OK ({testResult.resolution})</>
                ) : (
                  <><X className="w-4 h-4 mr-1" /> {testResult.message}</>
                )}
              </span>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} data-testid="save-camera-btn">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCameraDialog;
