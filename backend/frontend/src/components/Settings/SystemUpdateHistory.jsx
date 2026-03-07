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
                const hasWarnings = update.status === 'success_with_warnings';
                const isPartialFailure = update.status === 'partial_failure';

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
                              className={isSuccess && !hasWarnings ? 'bg-green-600' : hasWarnings ? 'bg-yellow-600' : isPartialFailure ? 'bg-orange-600' : 'bg-red-600'}
                            >
                              {isSuccess && !hasWarnings ? 'Succès' : hasWarnings ? 'Succès avec avertissements' : isPartialFailure ? 'Partiel' : 'Échec'}
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
                          {/* Résumé rapide */}
                          {update.summary && (
                            <div className="flex gap-3 flex-wrap">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                {update.summary.successful_steps} OK
                              </Badge>
                              {update.summary.warning_steps > 0 && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  {update.summary.warning_steps} avertissement(s)
                                </Badge>
                              )}
                              {update.summary.error_steps > 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                  {update.summary.error_steps} erreur(s)
                                </Badge>
                              )}
                              {update.summary.files_changed > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                  {update.summary.files_changed} fichier(s) modifié(s)
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Avertissements */}
                          {update.warnings && update.warnings.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                              <h4 className="font-medium text-yellow-800 mb-2">Avertissements:</h4>
                              {update.warnings.map((w, idx) => (
                                <p key={idx} className="text-sm text-yellow-700">{w}</p>
                              ))}
                            </div>
                          )}

                          {/* Erreurs */}
                          {update.errors && update.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-300 rounded p-3">
                              <h4 className="font-medium text-red-800 mb-2">Erreurs:</h4>
                              {update.errors.map((e, idx) => (
                                <p key={idx} className="text-sm text-red-700">{e}</p>
                              ))}
                            </div>
                          )}

                          {/* Erreur legacy */}
                          {!isSuccess && update.error_message && !update.errors?.length && (
                            <div className="bg-red-100 border border-red-300 rounded p-3">
                              <h4 className="font-medium text-red-800 mb-2">Erreur:</h4>
                              <p className="text-sm text-red-700 font-mono">{update.error_message}</p>
                            </div>
                          )}

                          {/* Journal détaillé */}
                          {update.logs && update.logs.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Journal détaillé:</h4>
                              <div className="bg-gray-900 rounded p-3 max-h-[500px] overflow-y-auto">
                                {update.logs.map((log, idx) => {
                                  // Support ancien format (string) et nouveau (objet structuré)
                                  if (typeof log === 'string') {
                                    return (
                                      <div key={idx} className="text-xs text-gray-300 font-mono mb-1 py-0.5">
                                        {log}
                                      </div>
                                    );
                                  }
                                  
                                  const statusColor = log.status === 'success' 
                                    ? 'text-green-400' 
                                    : log.status === 'warning' 
                                      ? 'text-yellow-400' 
                                      : 'text-red-400';
                                  const statusIcon = log.status === 'success' ? '✓' : log.status === 'warning' ? '⚠' : '✗';
                                  
                                  return (
                                    <div key={idx} className="mb-2 border-b border-gray-800 pb-2 last:border-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold ${statusColor}`}>{statusIcon}</span>
                                        <span className="text-xs text-blue-300 font-mono font-semibold">{log.step}</span>
                                        {log.duration_ms > 0 && (
                                          <span className="text-xs text-gray-500 ml-auto">{log.duration_ms}ms</span>
                                        )}
                                        {log.return_code !== 0 && log.return_code !== undefined && (
                                          <span className="text-xs text-red-400 ml-1">code:{log.return_code}</span>
                                        )}
                                      </div>
                                      {log.command && log.command !== 'N/A (placeholder)' && (
                                        <div className="text-xs text-gray-400 font-mono mt-0.5 pl-5">
                                          $ {log.command}
                                        </div>
                                      )}
                                      {log.stdout && log.status !== 'success' && (
                                        <pre className="text-xs text-gray-400 font-mono mt-0.5 pl-5 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                          {log.stdout.substring(0, 1000)}
                                        </pre>
                                      )}
                                      {log.stderr && (
                                        <pre className={`text-xs font-mono mt-0.5 pl-5 whitespace-pre-wrap max-h-32 overflow-y-auto ${
                                          log.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                          {log.stderr.substring(0, 2000)}
                                        </pre>
                                      )}
                                    </div>
                                  );
                                })}
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
                                  <div key={idx} className="text-xs text-gray-700 font-mono">M {file}</div>
                                ))}
                                {update.files_added?.map((file, idx) => (
                                  <div key={`a-${idx}`} className="text-xs text-green-700 font-mono">A {file}</div>
                                ))}
                                {update.files_deleted?.map((file, idx) => (
                                  <div key={`d-${idx}`} className="text-xs text-red-700 font-mono">D {file}</div>
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
