import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Plus, Search, ShoppingCart, Clock, CheckCircle, XCircle, 
  Package, Truck, Users, FileText 
} from 'lucide-react';
import PurchaseRequestFormDialog from '../components/PurchaseRequests/PurchaseRequestFormDialog';
import { useToast } from '../hooks/use-toast';
import { usePurchaseRequests } from '../hooks/usePurchaseRequests';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const PurchaseRequests = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  // Utiliser le hook temps réel
  const { 
    purchaseRequests: requests, 
    loading, 
    refresh: refreshRequests 
  } = usePurchaseRequests({ status: statusFilter });

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
          <p className="text-gray-600">Gérez vos demandes d'achat et leur suivi</p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Demande
        </Button>
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
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Colonne 1: Numéro et type */}
                  <div className="lg:w-1/5">
                    <div className="font-semibold text-lg">{request.numero}</div>
                    <div className="mt-1">{getTypeBadge(request.type)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(request.date_creation).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {/* Colonne 2: Article */}
                  <div className="lg:w-2/5">
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
                  <div className="lg:w-1/5">
                    <div className="text-sm text-gray-600">
                      <Users className="h-4 w-4 inline mr-1" />
                      {request.destinataire_nom}
                    </div>
                    <div className="mt-2">
                      {getUrgencyBadge(request.urgence)}
                    </div>
                  </div>

                  {/* Colonne 4: Statut */}
                  <div className="lg:w-1/5 text-right">
                    {getStatusBadge(request.status)}
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
          loadRequests();
          setFormDialogOpen(false);
        }}
      />
    </div>
  );
};

export default PurchaseRequests;
