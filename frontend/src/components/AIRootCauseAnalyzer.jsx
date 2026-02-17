import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Brain, AlertTriangle, ArrowRight, CheckCircle, Shield } from 'lucide-react';
import { presquAccidentAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

export default function AIRootCauseAnalyzer({ item, open, onClose, onApplyEvaluation }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await presquAccidentAPI.aiAnalyzeRootCauses(item.id);
      if (result.success) {
        setAnalysis(result.data);
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible d'analyser", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAnalysis(null);
    onClose();
  };

  const priorityColor = (p) => p === 'HAUTE' ? 'bg-red-100 text-red-800' : p === 'MOYENNE' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  const sevColor = (s) => s === 'CRITIQUE' ? 'bg-red-100 text-red-800' : s === 'IMPORTANT' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="rca-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Analyse IA des causes racines
          </DialogTitle>
        </DialogHeader>

        {!analysis && !loading && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">{item?.titre}</p>
              <p className="text-sm text-gray-500 mt-1">{item?.description?.substring(0, 120)}...</p>
            </div>
            <p className="text-sm text-gray-600">
              L'IA va analyser cet incident avec les methodes <strong>5 Pourquoi</strong> et <strong>Ishikawa</strong>,
              en tenant compte de l'historique des incidents.
            </p>
            <Button onClick={handleAnalyze} className="bg-purple-600 hover:bg-purple-700" data-testid="rca-start-btn">
              <Brain className="h-4 w-4 mr-2" /> Lancer l'analyse
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-purple-600" />
            <p className="text-sm text-gray-600">Analyse en cours... (5 Pourquoi + Ishikawa)</p>
          </div>
        )}

        {analysis && (
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="space-y-5">

              {/* Cause racine principale */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="rca-main-cause">
                <h3 className="font-semibold text-sm text-red-800 flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" /> Cause racine principale
                </h3>
                <p className="text-sm text-red-700">{analysis.cause_racine_principale}</p>
                {analysis.causes_secondaires?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600 font-medium">Causes secondaires :</p>
                    <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                      {analysis.causes_secondaires.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* 5 Pourquoi */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-sm mb-3">Analyse 5 Pourquoi</h3>
                <div className="space-y-2">
                  {analysis.analyse_5_pourquoi?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {item.niveau}
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-gray-700">{item.pourquoi}</p>
                        <p className="text-gray-600 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 flex-shrink-0" /> {item.reponse}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ishikawa */}
              {analysis.diagramme_ishikawa?.causes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3">Diagramme Ishikawa (6M)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(analysis.diagramme_ishikawa.causes).map(([category, causes]) => (
                      <div key={category} className="border rounded-lg p-3 bg-white">
                        <p className="text-xs font-semibold text-gray-700 mb-1.5">{category}</p>
                        <ul className="space-y-1">
                          {(causes || []).map((c, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                              <span className="text-purple-400 mt-0.5">-</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions preventives */}
              <div className="p-4 bg-gray-50 rounded-lg" data-testid="rca-actions">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" /> Actions preventives recommandees
                </h3>
                <div className="space-y-2">
                  {analysis.actions_preventives?.map((a, i) => (
                    <div key={i} className="flex items-start justify-between bg-white p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.action}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className={`text-[10px] ${priorityColor(a.priorite)}`}>{a.priorite}</Badge>
                          <span className="text-xs text-gray-500">{a.type}</span>
                          <span className="text-xs text-gray-500">{a.delai_recommande}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluation risque */}
              {analysis.evaluation_risque && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="rca-evaluation">
                  <h3 className="font-semibold text-sm text-blue-800 mb-2">Evaluation du risque suggeree par l'IA</h3>
                  <div className="flex gap-4 mb-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-700">{analysis.evaluation_risque.severite_recommandee}</p>
                      <p className="text-xs text-blue-600">Severite</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-700">{analysis.evaluation_risque.recurrence_estimee}</p>
                      <p className="text-xs text-blue-600">Recurrence</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-700">
                        {(parseInt(analysis.evaluation_risque.severite_recommandee) || 0) * (parseInt(analysis.evaluation_risque.recurrence_estimee) || 0)}
                      </p>
                      <p className="text-xs text-blue-600">Score</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700">{analysis.evaluation_risque.justification}</p>
                  {onApplyEvaluation && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-blue-300 text-blue-700"
                      data-testid="rca-apply-eval-btn"
                      onClick={() => onApplyEvaluation(
                        analysis.evaluation_risque.severite_recommandee,
                        analysis.evaluation_risque.recurrence_estimee
                      )}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Appliquer cette evaluation
                    </Button>
                  )}
                </div>
              )}

              {/* Historique */}
              {analysis.incidents_similaires_identifies && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">Patterns historiques identifies</h3>
                  <p className="text-sm text-gray-600">{analysis.incidents_similaires_identifies}</p>
                </div>
              )}

              {analysis.recommandations_generales && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-sm text-green-800 mb-2">Recommandations generales</h3>
                  <p className="text-sm text-green-700">{analysis.recommandations_generales}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
