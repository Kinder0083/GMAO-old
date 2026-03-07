import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, Download, CheckCircle, XCircle, Calendar, Clock, User, TrendingUp, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api';
import { getBackendURL } from '../../utils/config';

function HistoryDialog({ open, onClose, control }) {
  const { toast } = useToast();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && control) {
      loadHistory();
      loadStats();
    }
  }, [open, control]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/surveillance-history/${control.id}`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'historique',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(`/surveillance-history/${control.id}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const downloadFile = (fileId, fileName) => {
    const token = localStorage.getItem('token');
    window.open(`${getBackendURL()}/api/surveillance-history/file/${fileId}?token=${token}`, '_blank');
  };

  const getResultatBadge = (resultat) => {
    if (resultat === 'CONFORME') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Conforme</Badge>;
    } else if (resultat === 'NON_CONFORME') {
      return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Non conforme</Badge>;
    }
    return <Badge variant="outline">Non renseigné</Badge>;
  };

  // Graphique simple avec des barres
  const renderSimpleChart = () => {
    if (!history || history.length === 0) return null;

    const lastSix = history.slice(0, 6).reverse();
    const maxHeight = 80;

    return (
      <div className="flex items-end justify-around h-24 gap-2">
        {lastSix.map((entry, index) => {
          const isConforme = entry.resultat === 'CONFORME';
          const height = isConforme ? maxHeight : maxHeight * 0.5;
          const color = isConforme ? 'bg-green-500' : 'bg-red-500';

          return (
            <div key={entry.id} className="flex flex-col items-center gap-1">
              <div 
                className={`w-8 ${color} rounded-t transition-all hover:opacity-80`}
                style={{ height: `${height}px` }}
                title={new Date(entry.date_realisation).toLocaleDateString()}
              />
              <span className="text-xs text-gray-500">{index + 1}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const checkForAnomalies = () => {
    if (!stats || !control) return null;

    const anomalies = [];

    // Vérifier si délai anormalement long
    if (stats.delai_moyen_jours > 0) {
      const periodiciteJours = getPeriodiciteInDays(control.periodicite);
      if (stats.delai_moyen_jours > periodiciteJours * 1.5) {
        anomalies.push(`Délai entre contrôles plus long que prévu (${Math.round(stats.delai_moyen_jours)} jours vs ${periodiciteJours} attendus)`);
      }
    }

    // Vérifier taux de conformité
    if (stats.taux_conformite < 70 && stats.total > 3) {
      anomalies.push(`Taux de conformité faible : ${stats.taux_conformite.toFixed(1)}%`);
    }

    if (anomalies.length === 0) return null;

    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            Alertes détectées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {anomalies.map((anomaly, index) => (
              <li key={index} className="text-orange-600">• {anomaly}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const getPeriodiciteInDays = (periodicite) => {
    const lower = periodicite.toLowerCase();
    if (lower.includes('jour') || lower.includes('quotidien')) return 1;
    if (lower.includes('semaine') || lower.includes('hebdo')) return 7;
    if (lower.includes('mensuel') || lower === 'mois') return 30;
    if (lower.includes('trimestriel') || lower.includes('3')) return 90;
    if (lower.includes('6')) return 180;
    if (lower.includes('annuel') || lower.includes('an')) return 365;
    return 30;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📊 Historique des contrôles - {control?.classe_type}
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {control?.batiment} • {control?.category}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Statistiques */}
            {stats && (
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Conformes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">{stats.conformes}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Non conformes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">{stats.non_conformes}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Taux conformité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats.taux_conformite.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Graphique d'évolution */}
            {history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Évolution des 6 derniers contrôles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderSimpleChart()}
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Vert = Conforme • Rouge = Non conforme
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Alertes */}
            {checkForAnomalies()}

            {/* Liste des entrées d'historique */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Historique détaillé (18 derniers)</h3>
              
              {loading ? (
                <p className="text-center text-gray-500 py-4">Chargement...</p>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun historique disponible</p>
              ) : (
                history.map((entry, index) => (
                  <Card key={entry.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{history.length - index}</Badge>
                          <span className="font-semibold">
                            {new Date(entry.date_realisation).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        {getResultatBadge(entry.resultat)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{entry.validated_by || 'Non renseigné'}</span>
                        </div>
                        {entry.duree_intervention && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{entry.duree_intervention}</span>
                          </div>
                        )}
                      </div>

                      {entry.commentaires && (
                        <div className="bg-gray-50 p-3 rounded mb-3">
                          <p className="text-sm text-gray-700">{entry.commentaires}</p>
                        </div>
                      )}

                      {entry.fichiers && entry.fichiers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-600">Fichiers joints:</p>
                          <div className="flex flex-wrap gap-2">
                            {entry.fichiers.map((file) => (
                              <Button
                                key={file.id}
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(file.id, file.nom)}
                                className="text-xs"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {file.nom}
                                <Download className="h-3 w-3 ml-1" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default HistoryDialog;
