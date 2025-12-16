import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { systemUpdateHistoryAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  GitBranch,
  Database,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';

const SystemUpdateHistory = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyResponse, statsResponse] = await Promise.all([
        systemUpdateHistoryAPI.getHistory({ limit: 20 }),
        systemUpdateHistoryAPI.getStats()
      ]);
      
      setHistory(historyResponse.data.data || []);
      setStats(statsResponse.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Erreur lors du chargement de l\'historique'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-600">Chargement de l'historique...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total des mises à jour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.total_updates}</div>
                <GitBranch className="text-gray-400" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Réussies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-600">{stats.successful_updates}</div>
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Échouées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-red-600">{stats.failed_updates}</div>
                <XCircle className="text-red-600" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Taux de succès</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-600">{stats.success_rate}%</div>
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste de l'historique */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historique des Mises à Jour</CardTitle>
              <CardDescription>Traçabilité complète des mises à jour système</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw size={16} className="mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Aucune mise à jour enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((update) => {
                const isExpanded = expandedId === update.id;
                const isSuccess = update.success;

                return (
                  <div
                    key={update.id}
                    className={`border rounded-lg overflow-hidden ${
                      isSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {/* En-tête de la mise à jour */}
                    <div
                      className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                      onClick={() => toggleExpanded(update.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {isSuccess ? (
                              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                            ) : (
                              <XCircle className="text-red-600 flex-shrink-0" size={20} />
                            )}
                            <h3 className="font-semibold text-gray-900">
                              Mise à jour: {update.version_before} → {update.version_after}
                            </h3>
                            <Badge
                              variant={isSuccess ? 'default' : 'destructive'}
                              className={isSuccess ? 'bg-green-600' : 'bg-red-600'}
                            >
                              {isSuccess ? 'Succès' : 'Échec'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {formatDate(update.started_at)}
                            </span>
                            {update.duration_seconds && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                Durée: {formatDuration(update.duration_seconds)}
                              </span>
                            )}
                            {update.backup_created && (
                              <span className="flex items-center gap-1">
                                <Database size={14} />
                                Backup créé
                              </span>
                            )}
                            {update.total_files_changed > 0 && (
                              <span className="text-gray-500">
                                {update.total_files_changed} fichier(s) modifié(s)
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="text-gray-400 flex-shrink-0" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-400 flex-shrink-0" size={20} />
                        )}
                      </div>
                    </div>

                    {/* Détails de la mise à jour (dépliable) */}
                    {isExpanded && (
                      <div className="p-4 border-t bg-white">
                        <div className="space-y-4">
                          {/* Message de mise à jour */}
                          {update.update_message && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Message:</h4>
                              <p className="text-sm text-gray-600">{update.update_message}</p>
                            </div>
                          )}

                          {/* Erreur si échec */}
                          {!isSuccess && update.error_message && (
                            <div className="bg-red-100 border border-red-300 rounded p-3">
                              <h4 className="font-medium text-red-800 mb-2">Erreur:</h4>
                              <p className="text-sm text-red-700 font-mono">{update.error_message}</p>
                            </div>
                          )}

                          {/* Logs */}
                          {update.logs && update.logs.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Logs:</h4>
                              <div className="bg-gray-100 rounded p-3 max-h-60 overflow-y-auto">
                                {update.logs.map((log, idx) => (
                                  <div key={idx} className="text-xs text-gray-700 font-mono mb-1">
                                    {log}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fichiers modifiés */}
                          {update.files_modified && update.files_modified.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">
                                Fichiers modifiés ({update.files_modified.length}):
                              </h4>
                              <div className="bg-gray-100 rounded p-3 max-h-40 overflow-y-auto">
                                {update.files_modified.map((file, idx) => (
                                  <div key={idx} className="text-xs text-gray-700 font-mono">
                                    {file}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Informations supplémentaires */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {update.backup_path && (
                              <div>
                                <span className="font-medium text-gray-700">Chemin du backup:</span>
                                <p className="text-gray-600 text-xs font-mono mt-1">
                                  {update.backup_path}
                                </p>
                              </div>
                            )}
                            {update.git_commit_hash && (
                              <div>
                                <span className="font-medium text-gray-700">Commit Git:</span>
                                <p className="text-gray-600 text-xs font-mono mt-1">
                                  {update.git_commit_hash}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">Déclenché par:</span>
                              <p className="text-gray-600 mt-1">
                                {update.triggered_by === 'automatic' ? 'Automatique' : 
                                 update.triggered_by === 'manual' ? 'Manuel' : 'Administrateur'}
                              </p>
                            </div>
                            {update.triggered_by_user_name && (
                              <div>
                                <span className="font-medium text-gray-700">Utilisateur:</span>
                                <p className="text-gray-600 mt-1">{update.triggered_by_user_name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemUpdateHistory;
