import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Plus, Search, ShoppingCart, Clock, CheckCircle, XCircle, 
  Package, Users, FileText, Archive, BookOpen, ChevronDown
} from 'lucide-react';
import PurchaseRequestFormDialog from '../components/PurchaseRequests/PurchaseRequestFormDialog';
import { useToast } from '../hooks/use-toast';
import { usePurchaseRequests } from '../hooks/usePurchaseRequests';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import axios from 'axios';

// Liste des statuts disponibles
const STATUS_OPTIONS = [
  { value: 'SOUMISE', label: 'Transmise au N+1', color: 'bg-blue-100 text-blue-800', icon: Clock },
  { value: 'VALIDEE_N1', label: 'Validée par N+1', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  { value: 'APPROUVEE_ACHAT', label: 'Approuvée Achat', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'ACHAT_EFFECTUE', label: 'Achat Effectué', color: 'bg-teal-100 text-teal-800', icon: ShoppingCart },
  { value: 'RECEPTIONNEE', label: 'Réceptionnée', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  { value: 'DISTRIBUEE', label: 'Distribuée', color: 'bg-emerald-100 text-emerald-800', icon: Users },
  { value: 'REFUSEE_N1', label: 'Refusée par N+1', color: 'bg-red-100 text-red-800', icon: XCircle },
  { value: 'REFUSEE_ACHAT', label: 'Refusée Achat', color: 'bg-orange-100 text-orange-800', icon: XCircle }
];

// Composant Dropdown pour le statut
const StatusDropdown = ({ currentStatus, requestId, onStatusChange, canEdit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentConfig = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0];
  const Icon = currentConfig.icon;

  const handleStatusClick = (e) => {
    e.stopPropagation();
    if (canEdit) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelectStatus = async (e, newStatus) => {
    e.stopPropagation();
    if (newStatus !== currentStatus) {
      await onStatusChange(requestId, newStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleStatusClick}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium transition-all ${currentConfig.color} ${
          canEdit ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-default'
        }`}
        title={canEdit ? "Cliquez pour modifier le statut" : "Vous n'avez pas la permission de modifier le statut"}
        data-testid={`status-badge-${requestId}`}
      >
        <Icon className="h-3 w-3" />
        {currentConfig.label}
        {canEdit && <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && canEdit && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b">
            Modifier le statut
          </div>
          {STATUS_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === currentStatus;
            return (
              <button
                key={option.value}
                onClick={(e) => handleSelectStatus(e, option.value)}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-gray-100' : ''
                }`}
                data-testid={`status-option-${option.value}`}
              >
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${option.color}`}>
                  <OptionIcon className="h-3 w-3" />
                  {option.label}
                </span>
                {isSelected && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PurchaseRequests = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Récupérer l'utilisateur depuis localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'ADMIN';
  
  // Vérifier la permission "achat" - edit permet de modifier les statuts
  const hasAchatPermission = isAdmin || user?.permissions?.achat?.edit === true;
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Utiliser le hook temps réel
  const { 
    purchaseRequests: requests, 
    loading, 
    refresh: refreshRequests 
  } = usePurchaseRequests({ status: statusFilter });

  // Fonction pour modifier le statut d'une demande
  const handleStatusChange = async (requestId, newStatus) => {
    try {
      setUpdatingStatusId(requestId);
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${backendUrl}/api/purchase-requests/${requestId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const statusLabel = STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus;
      
      toast({
        title: "Statut modifié",
        description: `Le statut a été changé en "${statusLabel}"`,
      });
      
      refreshRequests();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Impossible de modifier le statut",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleArchive = async (e, requestId, requestNumero) => {
    e.stopPropagation();
    
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent archiver les demandes",
        variant: "destructive"
      });
      return;
    }

    try {
      setArchivingId(requestId);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${backendUrl}/api/purchase-requests/${requestId}/archive`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "Demande archivée",
        description: `La demande ${requestNumero} a été archivée avec succès`,
      });
      
      refreshRequests();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Impossible d'archiver la demande",
        variant: "destructive"
      });
    } finally {
      setArchivingId(null);
    }
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      NORMAL: { label: 'Normal', color: 'bg-gray-100 text-gray-800' },
      URGENT: { label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
      TRES_URGENT: { label: 'Très urgent', color: 'bg-red-100 text-red-800 animate-pulse' }
    };

    const config = urgencyConfig[urgency] || urgencyConfig.NORMAL;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      PIECE_DETACHEE: { label: 'Pièce détachée', icon: '🔧' },
      EQUIPEMENT: { label: 'Équipement', icon: '⚙️' },
      CONSOMMABLE: { label: 'Consommable', icon: '📦' },
      SERVICE: { label: 'Service', icon: '🛠️' },
      OUTILLAGE: { label: 'Outillage', icon: '🔨' },
      FOURNITURE: { label: 'Fourniture', icon: '📝' },
      AUTRE: { label: 'Autre', icon: '📋' }
    };

    const config = typeConfig[type] || typeConfig.AUTRE;

    return (
      <span className="text-sm text-gray-600">
        {config.icon} {config.label}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.demandeur_nom?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    total: requests.length,
    enAttente: requests.filter(r => r.status === 'SOUMISE' || r.status === 'VALIDEE_N1').length,
    approuvees: requests.filter(r => ['APPROUVEE_ACHAT', 'ACHAT_EFFECTUE', 'RECEPTIONNEE', 'DISTRIBUEE'].includes(r.status)).length,
    refusees: requests.filter(r => r.status === 'REFUSEE_N1' || r.status === 'REFUSEE_ACHAT').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Demandes d'Achat</h1>
          <p className="text-gray-600">
            Gérez vos demandes d'achat et leur suivi
            {hasAchatPermission && (
              <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Permission Achat active
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Bouton Archives - visible uniquement pour les admins */}
          {isAdmin && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/purchase-requests/archives')}
              className="gap-2"
              data-testid="archives-btn"
            >
              <Archive className="h-4 w-4" />
              Archives
            </Button>
          )}
          <Button onClick={() => setFormDialogOpen(true)} className="gap-2" data-testid="new-request-btn">
            <Plus className="h-4 w-4" />
            Nouvelle Demande
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-blue-600">{stats.enAttente}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approuvées</p>
                <p className="text-2xl font-bold text-green-600">{stats.approuvees}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Refusées</p>
                <p className="text-2xl font-bold text-red-600">{stats.refusees}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par numéro, article, demandeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="SOUMISE">Transmise au N+1</SelectItem>
                <SelectItem value="VALIDEE_N1">Validée par N+1</SelectItem>
                <SelectItem value="APPROUVEE_ACHAT">Approuvée Achat</SelectItem>
                <SelectItem value="ACHAT_EFFECTUE">Achat Effectué</SelectItem>
                <SelectItem value="RECEPTIONNEE">Réceptionnée</SelectItem>
                <SelectItem value="DISTRIBUEE">Distribuée</SelectItem>
                <SelectItem value="REFUSEE_N1">Refusée N+1</SelectItem>
                <SelectItem value="REFUSEE_ACHAT">Refusée Achat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      <div className="grid gap-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Aucune demande d'achat</p>
              <Button 
                variant="link" 
                onClick={() => setFormDialogOpen(true)}
                className="mt-2"
              >
                Créer votre première demande
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card 
              key={request.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/purchase-requests/${request.id}`)}
              data-testid={`purchase-request-card-${request.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Colonne 1: Numéro et type */}
                  <div className="lg:w-1/6">
                    <div className="font-semibold text-lg">{request.numero}</div>
                    <div className="mt-1">{getTypeBadge(request.type)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(request.date_creation).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {/* Colonne 2: Article */}
                  <div className="lg:w-2/6">
                    <div className="text-sm text-gray-500">
                      Réf: {request.reference || 'N/A'}
                    </div>
                    <div className="font-medium mt-1">{request.designation}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Quantité: {request.quantite} {request.unite}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Demandeur: {request.demandeur_nom}
                    </div>
                  </div>

                  {/* Colonne 3: Destinataire et urgence */}
                  <div className="lg:w-1/6">
                    <div className="text-sm text-gray-600">
                      <Users className="h-4 w-4 inline mr-1" />
                      {request.destinataire_nom}
                    </div>
                    <div className="mt-2">
                      {getUrgencyBadge(request.urgence)}
                    </div>
                  </div>

                  {/* Colonne 4: Statut cliquable */}
                  <div className="lg:w-1/6 flex justify-center">
                    {updatingStatusId === request.id ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <span className="text-sm">Mise à jour...</span>
                      </div>
                    ) : (
                      <StatusDropdown
                        currentStatus={request.status}
                        requestId={request.id}
                        onStatusChange={handleStatusChange}
                        canEdit={hasAchatPermission}
                      />
                    )}
                  </div>

                  {/* Colonne 5: Actions (Archivage) */}
                  <div className="lg:w-1/6 flex justify-end items-center">
                    <button
                      onClick={(e) => handleArchive(e, request.id, request.numero)}
                      disabled={!isAdmin || archivingId === request.id}
                      className={`p-2 rounded-lg transition-colors ${
                        isAdmin 
                          ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 cursor-pointer' 
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={isAdmin ? "Archiver cette demande" : "Seuls les administrateurs peuvent archiver"}
                      data-testid={`archive-btn-${request.id}`}
                    >
                      {archivingId === request.id ? (
                        <div className="animate-spin h-5 w-5 border-2 border-amber-600 border-t-transparent rounded-full" />
                      ) : (
                        <BookOpen className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de création */}
      <PurchaseRequestFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={() => {
          refreshRequests();
          setFormDialogOpen(false);
        }}
      />
    </div>
  );
};

export default PurchaseRequests;
