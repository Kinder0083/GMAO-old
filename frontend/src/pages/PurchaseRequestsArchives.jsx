import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, Search, ShoppingCart, Clock, CheckCircle, XCircle, 
  Package, Users, Archive, RotateCcw, Calendar, Filter, ChevronDown, ChevronRight, Folder
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import axios from 'axios';

// Noms des mois en français
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

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
  
  // État pour les sections dépliées/repliées
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

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
      
      // Initialiser toutes les années comme dépliées par défaut
      const years = {};
      const months = {};
      response.data.forEach(req => {
        const date = new Date(req.archived_at || req.date_creation);
        const year = date.getFullYear();
        const month = date.getMonth();
        years[year] = true;
        months[`${year}-${month}`] = true;
      });
      setExpandedYears(years);
      setExpandedMonths(months);
      
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
      fetchArchivedRequests();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, dateFrom, dateTo, demandeurFilter]);

  // Grouper les demandes par année puis par mois
  const groupedRequests = useMemo(() => {
    const grouped = {};
    
    archivedRequests.forEach(request => {
      const date = new Date(request.archived_at || request.date_creation);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = [];
      }
      grouped[year][month].push(request);
    });
    
    // Trier les années par ordre décroissant
    const sortedYears = Object.keys(grouped).sort((a, b) => b - a);
    
    return { grouped, sortedYears };
  }, [archivedRequests]);

  const toggleYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const toggleMonth = (year, month) => {
    const key = `${year}-${month}`;
    setExpandedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleUnarchive = async (e, requestId, requestNumero) => {
    e.stopPropagation();
    
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent désarchiver les demandes",
        variant: "destructive"
      });
      return;
    }
    
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

  const collapseAll = () => {
    setExpandedYears({});
    setExpandedMonths({});
  };

  const expandAll = () => {
    const years = {};
    const months = {};
    archivedRequests.forEach(req => {
      const date = new Date(req.archived_at || req.date_creation);
      const year = date.getFullYear();
      const month = date.getMonth();
      years[year] = true;
      months[`${year}-${month}`] = true;
    });
    setExpandedYears(years);
    setExpandedMonths(months);
  };

  // Compter les demandes par année et par mois
  const getYearCount = (year) => {
    const yearData = groupedRequests.grouped[year];
    if (!yearData) return 0;
    return Object.values(yearData).reduce((acc, monthData) => acc + monthData.length, 0);
  };

  const getMonthCount = (year, month) => {
    return groupedRequests.grouped[year]?.[month]?.length || 0;
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Tout déplier
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Tout replier
          </Button>
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

      {/* Liste des demandes archivées groupées par année/mois */}
      <div className="space-y-4">
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
          groupedRequests.sortedYears.map((year) => (
            <div key={year} className="border rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Header de l'année */}
              <button
                onClick={() => toggleYear(year)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedYears[year] ? (
                    <ChevronDown className="h-5 w-5 text-amber-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-amber-600" />
                  )}
                  <Folder className="h-5 w-5 text-amber-500" />
                  <span className="text-lg font-bold text-gray-800">{year}</span>
                </div>
                <Badge className="bg-amber-100 text-amber-800">
                  {getYearCount(year)} demande(s)
                </Badge>
              </button>

              {/* Contenu de l'année (mois) */}
              {expandedYears[year] && (
                <div className="border-t">
                  {Object.keys(groupedRequests.grouped[year])
                    .sort((a, b) => b - a) // Trier les mois par ordre décroissant
                    .map((month) => (
                      <div key={`${year}-${month}`} className="border-b last:border-b-0">
                        {/* Header du mois */}
                        <button
                          onClick={() => toggleMonth(year, month)}
                          className="w-full flex items-center justify-between p-3 pl-8 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedMonths[`${year}-${month}`] ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-700">{MONTHS_FR[month]}</span>
                          </div>
                          <Badge variant="outline" className="text-gray-600">
                            {getMonthCount(year, month)} demande(s)
                          </Badge>
                        </button>

                        {/* Liste des demandes du mois */}
                        {expandedMonths[`${year}-${month}`] && (
                          <div className="bg-white">
                            {groupedRequests.grouped[year][month].map((request) => (
                              <div
                                key={request.id}
                                className="p-4 pl-12 border-t hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/purchase-requests/${request.id}`)}
                                data-testid={`archived-request-card-${request.id}`}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                  {/* Colonne 1: Numéro et type */}
                                  <div className="lg:w-1/6">
                                    <div className="font-semibold text-blue-600">{request.numero}</div>
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
                                    <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                                      <Archive className="h-3 w-3 inline mr-1" />
                                      {request.archived_at ? new Date(request.archived_at).toLocaleDateString('fr-FR') : 'N/A'}
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

                                  {/* Colonne 5: Actions (Désarchiver) - visible uniquement pour les admins */}
                                  <div className="lg:w-1/6 flex justify-end items-center">
                                    {isAdmin ? (
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
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">
                                        Lecture seule
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PurchaseRequestsArchives;
