import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Plus, Edit, Trash2, Package, MapPin, Calendar, DollarSign, QrCode, Download, Shield } from 'lucide-react';
import { equipmentsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import EquipmentFormDialog from '../components/Equipment/EquipmentFormDialog';
import DeleteConfirmDialog from '../components/Common/DeleteConfirmDialog';
import api from '../services/api';

const EquipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [equipment, setEquipment] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [isAddingChild, setIsAddingChild] = useState(false);

  useEffect(() => {
    loadEquipment();
    loadChildren();
  }, [id]);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const response = await equipmentsAPI.getById(id);
      setEquipment(response.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'équipement',
        variant: 'destructive'
      });
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async () => {
    try {
      const response = await equipmentsAPI.getChildren(id);
      setChildren(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des sous-équipements:', error);
    }
  };

  const handleAddChild = () => {
    setIsAddingChild(true);
    setSelectedChild(null);
    setFormDialogOpen(true);
  };

  const handleEditChild = (child) => {
    setIsAddingChild(false);
    setSelectedChild(child);
    setFormDialogOpen(true);
  };

  const handleDeleteChild = (child) => {
    setSelectedChild(child);
    setDeleteDialogOpen(true);
  };

  const handleDownloadQR = async () => {
    try {
      const response = await api.get(`/qr/equipment/${id}/label`, { responseType: 'blob' });
      // Vérifier si la réponse est bien une image (pas un JSON d'erreur)
      if (response.data.type && response.data.type.includes('application/json')) {
        const text = await response.data.text();
        const error = JSON.parse(text);
        toast({ title: 'Erreur', description: error.detail || 'Erreur serveur', variant: 'destructive' });
        return;
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `qr_${equipment?.nom || id}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'QR Code téléchargé', description: 'Étiquette QR prête à imprimer' });
    } catch (err) {
      const detail = err?.response?.data?.detail 
        || (err?.response?.data instanceof Blob ? await err.response.data.text().then(t => { try { return JSON.parse(t).detail } catch { return t } }).catch(() => null) : null)
        || 'Impossible de générer le QR code';
      toast({ title: 'Erreur', description: detail, variant: 'destructive' });
    }
  };

  const handlePreviewQR = () => {
    window.open(`/qr/${id}`, '_blank');
  };

  const handleDeleteConfirm = async () => {
    try {
      await equipmentsAPI.delete(selectedChild.id);
      toast({
        title: 'Succès',
        description: 'Sous-équipement supprimé avec succès'
      });
      loadChildren();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le sous-équipement',
        variant: 'destructive'
      });
    }
  };

  const handleFormSuccess = () => {
    loadChildren();
    loadEquipment();
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPERATIONNEL': 'bg-green-100 text-green-700',
      'EN_MAINTENANCE': 'bg-yellow-100 text-yellow-700',
      'HORS_SERVICE': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'OPERATIONNEL': 'Opérationnel',
      'EN_MAINTENANCE': 'En maintenance',
      'HORS_SERVICE': 'Hors service'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!equipment) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/assets')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{equipment.nom}</h1>
            <p className="text-gray-600 mt-1">Détails de l'équipement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {equipment.loto_active && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-red-600 text-white animate-pulse" data-testid="loto-badge-detail">
              <Shield size={16} /> CONSIGNE ({equipment.loto_numero || 'LOTO'})
            </span>
          )}
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(equipment.statut)}`}>
            {getStatusLabel(equipment.statut)}
          </span>
          <Button
            variant="outline"
            onClick={handlePreviewQR}
            className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            data-testid="qr-preview-btn"
          >
            <QrCode size={18} className="mr-2" />
            Aperçu QR
          </Button>
          <Button
            onClick={handleDownloadQR}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="qr-download-btn"
          >
            <Download size={18} className="mr-2" />
            Étiquette QR
          </Button>
        </div>
      </div>

      {/* Informations principales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Package className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600">Catégorie</p>
                <p className="font-semibold">{equipment.categorie}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600">Emplacement</p>
                <p className="font-semibold">{equipment.emplacement?.nom || 'Non défini'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600">Date d'achat</p>
                <p className="font-semibold">{equipment.dateAchat ? new Date(equipment.dateAchat).toLocaleDateString('fr-FR') : 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600">Coût d'achat</p>
                <p className="font-semibold">{equipment.coutAchat ? equipment.coutAchat.toLocaleString('fr-FR') + ' €' : 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600">Numéro de série</p>
                <p className="font-semibold">{equipment.numeroSerie}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600">Année de Fabrication</p>
                <p className="font-semibold">{equipment.anneeFabrication || 'Non spécifiée'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sous-équipements */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sous-équipements ({children.length})</CardTitle>
            <Button
              onClick={handleAddChild}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={20} className="mr-2" />
              Ajouter un sous-équipement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun sous-équipement
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <Card key={child.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">{child.nom}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(child.statut)}`}>
                          {getStatusLabel(child.statut)}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p><strong>Catégorie:</strong> {child.categorie}</p>
                        <p><strong>N° Série:</strong> {child.numeroSerie}</p>
                        {child.hasChildren && (
                          <p className="text-blue-600 font-medium">
                            A des sous-équipements
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/assets/${child.id}`)}
                        >
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditChild(child)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteChild(child)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EquipmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        equipment={selectedChild}
        onSuccess={handleFormSuccess}
        parentId={isAddingChild ? equipment.id : null}
        defaultLocation={isAddingChild ? equipment.emplacement_id : null}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le sous-équipement"
        description={`Êtes-vous sûr de vouloir supprimer ${selectedChild?.nom} ? Cette action est irréversible.`}
      />
    </div>
  );
};

export default EquipmentDetail;
