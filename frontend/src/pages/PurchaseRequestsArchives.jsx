import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, Search, ShoppingCart, Clock, CheckCircle, XCircle, 
  Package, Users, Archive, RotateCcw, Calendar, Filter
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import axios from 'axios';

const PurchaseRequestsArchives = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [demandeurFilter, setDemandeurFilter] = useState('');
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unarchivingId, setUnarchivingId] = useState(null);

  // Récupérer l'utilisateur depuis localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'ADMIN';
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Charger les demandes archivées - accessible à tous les utilisateurs
  const fetchArchivedRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (demandeurFilter) params.append('demandeur', demandeurFilter);
      
      const response = await axios.get(
        `${backendUrl}/api/purchase-requests/archived/list?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setArchivedRequests(response.data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les archives",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedRequests();
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAdmin) {
        fetchArchivedRequests();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, dateFrom, dateTo, demandeurFilter]);

  const handleUnarchive = async (e, requestId, requestNumero) => {
    e.stopPropagation();
    
    try {
      setUnarchivingId(requestId);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${backendUrl}/api/purchase-requests/${requestId}/unarchive`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "Demande désarchivée",
        description: `La demande ${requestNumero} a été restaurée`,
      });
      
      // Retirer de la liste locale
      setArchivedRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Impossible de désarchiver la demande",
        variant: "destructive"
      });
    } finally {
      setUnarchivingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      SOUMISE: { label: 'Transmise au N+1', color: 'bg-blue-100 text-blue-800', icon: Clock },
      VALIDEE_N1: { label: 'Validée par N+1', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      APPROUVEE_ACHAT: { label: 'Approuvée Achat', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      ACHAT_EFFECTUE: { label: 'Achat Effectué', color: 'bg-teal-100 text-teal-800', icon: ShoppingCart },
      RECEPTIONNEE: { label: 'Réceptionnée', color: 'bg-indigo-100 text-indigo-800', icon: Package },
      DISTRIBUEE: { label: 'Distribuée', color: 'bg-emerald-100 text-emerald-800', icon: Users },
      REFUSEE_N1: { label: 'Refusée par N+1', color: 'bg-red-100 text-red-800', icon: XCircle },
      REFUSEE_ACHAT: { label: 'Refusée Achat', color: 'bg-orange-100 text-orange-800', icon: XCircle }
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      NORMAL: { label: 'Normal', color: 'bg-gray-100 text-gray-800' },
      URGENT: { label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
      TRES_URGENT: { label: 'Très urgent', color: 'bg-red-100 text-red-800' }
    };

    const config = urgencyConfig[urgency] || urgencyConfig.NORMAL;
    return <Badge className={config.color}>{config.label}</Badge>;
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
    return <span className="text-sm text-gray-600">{config.icon} {config.label}</span>;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setDemandeurFilter('');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/purchase-requests')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Archive className="h-6 w-6 text-amber-600" />
              Archives des Demandes d'Achat
            </h1>
            <p className="text-gray-600">{archivedRequests.length} demande(s) archivée(s)</p>
          </div>
        </div>
      </div>

      {/* Filtres de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Ligne 1: Recherche globale */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numéro, article, référence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>

            {/* Ligne 2: Filtres avancés */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                Filtres:
              </div>
              
              {/* Filtre par statut */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
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

              {/* Filtre par demandeur */}
              <Input
                placeholder="Demandeur..."
                value={demandeurFilter}
                onChange={(e) => setDemandeurFilter(e.target.value)}
                className="w-full sm:w-[180px]"
              />

              {/* Filtre par date */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px]"
                  placeholder="Du"
                />
                <span className="text-gray-400">→</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[140px]"
                  placeholder="Au"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes archivées */}
      <div className="grid gap-4">
        {archivedRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Aucune demande archivée</p>
              <p className="text-sm text-gray-500 mt-2">
                Les demandes archivées apparaîtront ici
              </p>
            </CardContent>
          </Card>
        ) : (
          archivedRequests.map((request) => (
            <Card 
              key={request.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-amber-400"
              onClick={() => navigate(`/purchase-requests/${request.id}`)}
              data-testid={`archived-request-card-${request.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Colonne 1: Numéro et type */}
                  <div className="lg:w-1/6">
                    <div className="font-semibold text-lg">{request.numero}</div>
                    <div className="mt-1">{getTypeBadge(request.type)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Créé le: {new Date(request.date_creation).toLocaleDateString('fr-FR')}
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

                  {/* Colonne 3: Info archivage */}
                  <div className="lg:w-1/6">
                    <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      <Archive className="h-3 w-3 inline mr-1" />
                      Archivé le {request.archived_at ? new Date(request.archived_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Par: {request.archived_by_name || 'N/A'}
                    </div>
                    <div className="mt-2">
                      {getUrgencyBadge(request.urgence)}
                    </div>
                  </div>

                  {/* Colonne 4: Statut */}
                  <div className="lg:w-1/6 text-center">
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Colonne 5: Actions (Désarchiver) */}
                  <div className="lg:w-1/6 flex justify-end items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleUnarchive(e, request.id, request.numero)}
                      disabled={unarchivingId === request.id}
                      className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                      data-testid={`unarchive-btn-${request.id}`}
                    >
                      {unarchivingId === request.id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Restaurer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PurchaseRequestsArchives;
