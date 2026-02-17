import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Brain, TrendingUp, TrendingDown, Minus, MapPin, AlertTriangle, ShieldAlert, Lightbulb, Bell, Mail } from 'lucide-react';
import { presquAccidentAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

export default function AIPATrendAnalyzer({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await presquAccidentAPI.aiAnalyzeTrends(365);
      if (result.success) {
        setAnalysis(result.data);
        setNotifications(result.notifications_sent || []);
        setStats(result.stats);
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible d'analyser", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setAnalysis(null); setNotifications([]); setStats(null); onClose(); };

  const TrendIcon = ({ trend }) => {
    if (trend === 'DEGRADATION') return <TrendingDown className="h-4 w-4 text-red-600" />;
    if (trend === 'AMELIORATION') return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const trendColor = (t) => t === 'DEGRADATION' ? 'bg-red-100 text-red-800' : t === 'AMELIORATION' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700';
  const sevColor = (s) => s === 'CRITIQUE' ? 'bg-red-100 text-red-800' : s === 'IMPORTANT' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
  const riskColor = (r) => r === 'ELEVE' ? 'bg-red-100 text-red-800' : r === 'MOYEN' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  const probColor = (p) => p === 'HAUTE' ? 'bg-red-100 text-red-800' : p === 'MOYENNE' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="pa-trend-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Analyse IA des tendances Presqu'accidents
          </DialogTitle>
        </DialogHeader>

        {!analysis && !loading && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">
              L'IA va analyser l'ensemble des presqu'accidents pour detecter les tendances,
              zones a risque, et predire les risques futurs.
            </p>
            <Button onClick={handleAnalyze} className="bg-purple-600 hover:bg-purple-700" data-testid="pa-trend-start-btn">
              <Brain className="h-4 w-4 mr-2" /> Lancer l'analyse des tendances
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-purple-600" />
            <p className="text-sm text-gray-600">Analyse IA en cours...</p>
          </div>
        )}

        {analysis && (
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="space-y-4">

              {/* Summary + Trend */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Resume</h3>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={analysis.tendance_globale} />
                    <Badge className={trendColor(analysis.tendance_globale)}>{analysis.tendance_globale}</Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{analysis.summary}</p>
                {stats && <p className="text-xs text-gray-500 mt-2">{stats.total_incidents} incident(s) analyses</p>}
              </div>

              {/* Notifications */}
              {notifications.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg" data-testid="pa-trend-notifications">
                  <h3 className="font-semibold text-xs mb-1.5 flex items-center gap-1.5 text-blue-800">
                    <Bell className="h-3.5 w-3.5" /> Alertes envoyees
                  </h3>
                  {notifications.map((n, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-blue-700">
                      <span><strong>{n.service}</strong> — {n.responsable}</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {n.email_sent ? 'Envoye' : 'Non envoye'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Patterns recurrents */}
              {analysis.patterns_recurrents?.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg" data-testid="pa-trend-patterns">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" /> Patterns recurrents
                  </h3>
                  <div className="space-y-2">
                    {analysis.patterns_recurrents.map((p, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{p.pattern}</span>
                          <Badge className={`text-[10px] ${sevColor(p.severity)}`}>{p.severity}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {p.occurrences} occurrence(s) | Lieux: {p.lieux_concernes?.join(', ')} | Services: {p.services_concernes?.join(', ')}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Cause: {p.cause_probable}</p>
                        <p className="text-xs text-green-700 mt-1 flex items-start gap-1">
                          <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" /> {p.recommandation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zones a risque */}
              {analysis.zones_a_risque?.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" /> Zones a risque
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {analysis.zones_a_risque.map((z, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{z.zone}</span>
                          <Badge className={`text-[10px] ${riskColor(z.niveau_risque)}`}>{z.niveau_risque}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">{z.nombre_incidents} incident(s) | {z.types_incidents?.join(', ')}</p>
                        <p className="text-xs text-gray-600 mt-1">{z.recommandation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions */}
              {analysis.predictions?.length > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg" data-testid="pa-trend-predictions">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-4 w-4" /> Predictions de risques
                  </h3>
                  <div className="space-y-2">
                    {analysis.predictions.map((p, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border border-orange-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{p.risque}</span>
                          <Badge className={`text-[10px] ${probColor(p.probabilite)}`}>{p.probabilite}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">Zone: {p.zone_concernee}</p>
                        <p className="text-xs text-gray-600">{p.justification}</p>
                        <p className="text-xs text-green-700 mt-1 flex items-start gap-1">
                          <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" /> {p.action_preventive}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facteurs */}
              {analysis.facteurs_analyse && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3">Analyse des facteurs contributifs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(analysis.facteurs_analyse).map(([key, val]) => (
                      <div key={key} className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold capitalize">{key}</span>
                          <span className="text-lg font-bold text-gray-700">{val.count}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{val.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommandations prioritaires */}
              {analysis.recommandations_prioritaires?.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-800">
                    <Lightbulb className="h-4 w-4" /> Recommandations prioritaires
                  </h3>
                  <div className="space-y-2">
                    {analysis.recommandations_prioritaires.map((r, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border border-green-100">
                        <p className="text-sm font-medium">{r.action}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <Badge className={`text-[10px] ${r.priorite === 'HAUTE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            P{r.priorite === 'HAUTE' ? '1' : r.priorite === 'MOYENNE' ? '2' : '3'}
                          </Badge>
                          <span>{r.service_concerne}</span>
                          <span>{r.impact_attendu}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
