import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, Brain, AlertTriangle, TrendingDown, TrendingUp, Minus, Wrench, ShieldAlert, Lightbulb, ClipboardList, Check, Mail, Bell } from 'lucide-react';
import { aiMaintenanceAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

const severityColors = {
  CRITIQUE: 'bg-red-100 text-red-800',
  IMPORTANT: 'bg-orange-100 text-orange-800',
  MODERE: 'bg-yellow-100 text-yellow-800',
  MINEUR: 'bg-gray-100 text-gray-700'
};

const urgenceColors = {
  HAUTE: 'bg-red-100 text-red-800',
  MOYENNE: 'bg-orange-100 text-orange-800',
  BASSE: 'bg-green-100 text-green-800'
};

const prioriteColors = {
  HAUTE: 'bg-red-100 text-red-800',
  MOYENNE: 'bg-orange-100 text-orange-800',
  BASSE: 'bg-blue-100 text-blue-800'
};

const TrendIcon = ({ trend }) => {
  if (trend === 'DEGRADATION') return <TrendingDown className="h-4 w-4 text-red-600" />;
  if (trend === 'AMELIORATION') return <TrendingUp className="h-4 w-4 text-green-600" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
};

export default function AINonconformityAnalyzer({ open, onClose }) {
  const { toast } = useToast();
  const [step, setStep] = useState('config');
  const [days, setDays] = useState('90');
  const [analysis, setAnalysis] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [creatingWOs, setCreatingWOs] = useState(false);
  const [createdWOs, setCreatedWOs] = useState([]);
  const [notificationsSent, setNotificationsSent] = useState([]);

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError(null);
    try {
      const result = await aiMaintenanceAPI.analyzeNonconformities(parseInt(days));
      if (result.success) {
        setAnalysis(result.data);
        setStats(result.stats);
        setNotificationsSent(result.notifications_sent || []);
        setStep('results');
      } else {
        setError(result.error);
        setStep('config');
      }
    } catch (err) {
      setError(err.message);
      setStep('config');
    }
  };

  const handleClose = () => {
    const hadCreations = createdWOs.length > 0;
    setStep('config');
    setAnalysis(null);
    setStats(null);
    setError(null);
    setCreatedWOs([]);
    setNotificationsSent([]);
    onClose(hadCreations);
  };

  const handleCreateSingleWO = async (wo) => {
    setCreatingWOs(true);
    try {
      const result = await aiMaintenanceAPI.createWorkOrdersFromAnalysis([wo]);
      if (result.success) {
        setCreatedWOs(prev => [...prev, ...result.work_orders]);
        toast({
          title: 'OT créé',
          description: `OT #${result.work_orders[0]?.numero} "${wo.titre}" créé avec succès`
        });
      }
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingWOs(false);
    }
  };

  const handleCreateAllWOs = async () => {
    const wosToCreate = analysis.work_orders_suggested.filter(
      wo => !createdWOs.some(c => c.titre === wo.titre)
    );
    if (!wosToCreate.length) return;
    
    setCreatingWOs(true);
    try {
      const result = await aiMaintenanceAPI.createWorkOrdersFromAnalysis(wosToCreate);
      if (result.success) {
        setCreatedWOs(prev => [...prev, ...result.work_orders]);
        toast({
          title: 'OT curatifs créés',
          description: `${result.created_count} ordre(s) de travail créé(s) avec succès`
        });
      }
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingWOs(false);
    }
  };

  const isWOCreated = (wo) => createdWOs.some(c => c.titre === wo.titre);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-600" />
            Analyse IA des Non-conformités
          </DialogTitle>
          <DialogDescription>
            L'IA analyse l'historique des checklists pour détecter les patterns et recommander des actions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-2">
          {/* STEP: Config */}
          {step === 'config' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Période d'analyse</label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger data-testid="nc-period-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                    <SelectItem value="180">6 derniers mois</SelectItem>
                    <SelectItem value="365">12 derniers mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}
              <Button onClick={handleAnalyze} className="w-full bg-amber-600 hover:bg-amber-700" data-testid="nc-analyze-btn">
                <Brain className="mr-2 h-4 w-4" /> Lancer l'analyse IA
              </Button>
            </div>
          )}

          {/* STEP: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-amber-600 mb-4" />
              <p className="font-medium">Analyse IA en cours...</p>
              <p className="text-sm text-gray-500 mt-1">Détection des patterns de non-conformité</p>
            </div>
          )}

          {/* STEP: Results */}
          {step === 'results' && analysis && (
            <div className="space-y-5 py-2">
              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Résumé</h3>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={analysis.tendance} />
                    <Badge className={analysis.tendance === 'DEGRADATION' ? 'bg-red-100 text-red-800' : analysis.tendance === 'AMELIORATION' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                      {analysis.tendance || 'STABLE'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{analysis.summary}</p>
                {stats && (
                  <div className="flex gap-4 mt-3 text-xs text-gray-600">
                    <span>{stats.total_executions} exécution(s)</span>
                    <span>{stats.total_items_checked} point(s) vérifiés</span>
                    <span className="text-red-600 font-medium">{stats.total_non_conformities} non-conformité(s)</span>
                  </div>
                )}
              </div>

              {/* Notifications envoyées */}
              {notificationsSent.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="notifications-sent-banner">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-blue-800">
                    <Bell className="h-4 w-4" />
                    Alertes automatiques envoyées
                  </h3>
                  <div className="space-y-1.5">
                    {notificationsSent.map((n, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-blue-700">
                          <strong>{n.service}</strong> — {n.responsable}
                        </span>
                        <div className="flex items-center gap-2">
                          {n.notification_created && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Bell className="h-3 w-3" /> Notification
                            </span>
                          )}
                          {n.email_sent ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Mail className="h-3 w-3" /> Email envoyé
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-600">
                              <Mail className="h-3 w-3" /> Email non envoyé
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {analysis.non_conformities_patterns?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                    Patterns de non-conformité ({analysis.non_conformities_patterns.length})
                  </h3>
                  <div className="space-y-2">
                    {analysis.non_conformities_patterns.map((p, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{p.pattern}</span>
                          <div className="flex gap-1.5">
                            <Badge className={severityColors[p.severity] || 'bg-gray-100'}>{p.severity}</Badge>
                            <Badge variant="outline">{p.occurrences} fois</Badge>
                          </div>
                        </div>
                        {p.cause_probable && <p className="text-xs text-gray-600"><strong>Cause :</strong> {p.cause_probable}</p>}
                        {p.action_recommandee && <p className="text-xs text-blue-700"><strong>Action :</strong> {p.action_recommandee}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Équipements à risque */}
              {analysis.equipements_a_risque?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Equipements à risque ({analysis.equipements_a_risque.length})
                  </h3>
                  <div className="space-y-2">
                    {analysis.equipements_a_risque.map((eq, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="text-sm font-medium">{eq.equipement}</span>
                          <p className="text-xs text-gray-500">{eq.problemes_principaux?.join(', ')}</p>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <Badge className={urgenceColors[eq.urgence] || 'bg-gray-100'}>{eq.urgence}</Badge>
                          <span className="text-sm font-mono text-red-600">{eq.taux_nc}% NC</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    Recommandations ({analysis.recommendations.length})
                  </h3>
                  <div className="space-y-2">
                    {analysis.recommendations.map((r, i) => (
                      <div key={i} className="p-3 border rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{r.titre}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-[10px]">{r.type?.replace(/_/g, ' ')}</Badge>
                            <Badge className={prioriteColors[r.priorite] || 'bg-gray-100'}>{r.priorite}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{r.description}</p>
                        {r.impact_estime && <p className="text-xs text-green-700"><strong>Impact :</strong> {r.impact_estime}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OT suggérés */}
              {analysis.work_orders_suggested?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-600" />
                      Ordres de travail suggérés ({analysis.work_orders_suggested.length})
                    </h3>
                    {analysis.work_orders_suggested.length > 1 && (
                      <Button
                        size="sm"
                        onClick={handleCreateAllWOs}
                        disabled={creatingWOs || analysis.work_orders_suggested.every(isWOCreated)}
                        data-testid="create-all-wo-btn"
                        className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
                      >
                        {creatingWOs ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
                        Créer tous les OT
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {analysis.work_orders_suggested.map((wo, i) => {
                      const created = isWOCreated(wo);
                      const createdData = createdWOs.find(c => c.titre === wo.titre);
                      return (
                        <div key={i} className={`p-3 border rounded-lg ${created ? 'bg-green-50 border-green-200' : ''}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{wo.titre}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge className={wo.priorite === 'URGENTE' ? 'bg-red-100 text-red-800' : wo.priorite === 'HAUTE' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}>
                                {wo.priorite}
                              </Badge>
                              {created ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <Check className="h-3 w-3 mr-1" /> OT #{createdData?.numero}
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCreateSingleWO(wo)}
                                  disabled={creatingWOs}
                                  data-testid={`create-wo-btn-${i}`}
                                  className="text-xs h-7 border-blue-400 text-blue-700 hover:bg-blue-50"
                                >
                                  {creatingWOs ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Wrench className="h-3 w-3 mr-1" /> Créer OT</>}
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{wo.description}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Equipement : {wo.equipement}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No data */}
              {!analysis.non_conformities_patterns?.length && !analysis.recommendations?.length && (
                <div className="py-6 text-center text-gray-500">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">{analysis.summary || 'Aucune donnée suffisante pour l\'analyse.'}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep('config')} className="flex-1">
                  Relancer
                </Button>
                <Button onClick={handleClose} className="flex-1">Fermer</Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
