import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, Calendar, User, Package, MapPin, FileText, 
  Clock, CheckCircle, XCircle, History, AlertCircle
} from 'lucide-react';
import { purchaseRequestsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import PurchaseRequestStatusDialog from '../components/PurchaseRequests/PurchaseRequestStatusDialog';
import AddToInventoryDialog from '../components/PurchaseRequests/AddToInventoryDialog';

const PurchaseRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const response = await purchaseRequestsAPI.getById(id);
      setRequest(response.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la demande',
        variant: 'destructive'
      });
      navigate('/purchase-requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const config = {
      SOUMISE: { 
        label: 'Transmise au N+1', 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
        description: 'En attente de validation par le responsable hiérarchique'
      },
      VALIDEE_N1: { 
        label: 'Validée par N+1', 
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: CheckCircle,
        description: 'Validée par le N+1, en attente d\'approbation du service achat'
      },
      APPROUVEE_ACHAT: { 
        label: 'Approuvée Achat', 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        description: 'Approuvée par le service achat'
      },
      ACHAT_EFFECTUE: { 
        label: 'Achat Effectué', 
        color: 'bg-teal-100 text-teal-800 border-teal-200',
        icon: Package,
        description: 'L\'achat a été réalisé'
      },
      RECEPTIONNEE: { 
        label: 'Réceptionnée', 
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: Package,
        description: 'L\'article a été réceptionné'
      },
      DISTRIBUEE: { 
        label: 'Distribuée', 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        description: 'L\'article a été distribué au destinataire'
      },
      REFUSEE_N1: { 
        label: 'Refusée par N+1', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        description: 'Refusée par le responsable hiérarchique'
      },
      REFUSEE_ACHAT: { 
        label: 'Refusée Achat', 
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: XCircle,
        description: 'Refusée par le service achat'
      }
    };
    return config[status] || config.SOUMISE;
  };

  const canChangeStatus = () => {
    if (!currentUser || !request) return false;
    
    const isAdmin = currentUser.role === 'ADMIN';
    const isN1 = request.responsable_n1_id === currentUser.id;
    
    // N+1 peut valider/refuser si statut = SOUMISE
    if (isN1 && request.status === 'SOUMISE') return true;
    
    // Admin peut gérer tous les statuts sauf déjà terminés
    if (isAdmin && !['DISTRIBUEE', 'REFUSEE_N1', 'REFUSEE_ACHAT'].includes(request.status)) return true;
    
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!request) return null;

  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/purchase-requests')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{request.numero}</h1>
            <p className="text-gray-600">{request.designation}</p>
          </div>
        </div>
        
        {canChangeStatus() && (
          <Button onClick={() => setStatusDialogOpen(true)}>
            Changer le statut
          </Button>
        )}
      </div>

      {/* Statut actuel */}
      <Card className={`border-2 ${statusConfig.color}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${statusConfig.color}`}>
              <StatusIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">{statusConfig.label}</div>
              <div className="text-sm opacity-75">{statusConfig.description}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle>Détails de la demande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Type</div>
                  <div className="font-medium">
                    {request.type === 'PIECE_DETACHEE' && '🔧 Pièce détachée'}
                    {request.type === 'EQUIPEMENT' && '⚙️ Équipement'}
                    {request.type === 'CONSOMMABLE' && '📦 Consommable'}
                    {request.type === 'SERVICE' && '🛠️ Service'}
                    {request.type === 'OUTILLAGE' && '🔨 Outillage'}
                    {request.type === 'FOURNITURE' && '📝 Fourniture'}
                    {request.type === 'AUTRE' && '📋 Autre'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Urgence</div>
                  <div>
                    {request.urgence === 'NORMAL' && <Badge className="bg-gray-100 text-gray-800">Normal</Badge>}
                    {request.urgence === 'URGENT' && <Badge className="bg-orange-100 text-orange-800">⚠️ Urgent</Badge>}
                    {request.urgence === 'TRES_URGENT' && <Badge className="bg-red-100 text-red-800 animate-pulse">🚨 Très urgent</Badge>}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Quantité</div>
                  <div className="font-medium">{request.quantite} {request.unite}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Référence</div>
                  <div className="font-medium">{request.reference || '-'}</div>
                </div>
              </div>

              {request.description && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Description</div>
                  <div className="text-sm bg-gray-50 p-3 rounded">{request.description}</div>
                </div>
              )}

              {request.fournisseur_suggere && (
                <div>
                  <div className="text-sm text-gray-600">Fournisseur suggéré</div>
                  <div className="font-medium">{request.fournisseur_suggere}</div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <div className="text-sm font-semibold text-blue-900 mb-2">Justification</div>
                <div className="text-sm text-blue-800">{request.justification}</div>
              </div>
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique et traçabilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.history && request.history.length > 0 ? (
                  request.history.map((entry, index) => (
                    <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{entry.action}</div>
                        <div className="text-sm text-gray-600">
                          Par {entry.user_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(entry.timestamp).toLocaleString('fr-FR')}
                        </div>
                        {entry.comment && (
                          <div className="text-sm bg-gray-50 p-2 rounded mt-2">
                            💬 {entry.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Aucun historique disponible
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Demandeur */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demandeur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium">{request.demandeur_nom}</div>
                  <div className="text-sm text-gray-600">{request.demandeur_email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responsable N+1 */}
          {request.responsable_n1_nom && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Responsable N+1</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div className="font-medium">{request.responsable_n1_nom}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Destinataire */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Destinataire final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div className="font-medium">{request.destinataire_nom}</div>
              </div>
            </CardContent>
          </Card>

          {/* Dates importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Créée le</div>
                <div className="font-medium">
                  {new Date(request.date_creation).toLocaleDateString('fr-FR')}
                </div>
              </div>

              {request.date_validation_n1 && (
                <div>
                  <div className="text-sm text-gray-600">Validée N+1 le</div>
                  <div className="font-medium">
                    {new Date(request.date_validation_n1).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}

              {request.date_approbation_achat && (
                <div>
                  <div className="text-sm text-gray-600">Approuvée achat le</div>
                  <div className="font-medium">
                    {new Date(request.date_approbation_achat).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}

              {request.date_achat_effectue && (
                <div>
                  <div className="text-sm text-gray-600">Achat effectué le</div>
                  <div className="font-medium">
                    {new Date(request.date_achat_effectue).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}

              {request.date_reception && (
                <div>
                  <div className="text-sm text-gray-600">Réceptionnée le</div>
                  <div className="font-medium">
                    {new Date(request.date_reception).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}

              {request.date_distribution && (
                <div>
                  <div className="text-sm text-gray-600">Distribuée le</div>
                  <div className="font-medium">
                    {new Date(request.date_distribution).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog changement de statut */}
      <PurchaseRequestStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        request={request}
        currentUser={currentUser}
        onSuccess={() => {
          loadRequest();
          setStatusDialogOpen(false);
        }}
      />
    </div>
  );
};

export default PurchaseRequestDetail;
