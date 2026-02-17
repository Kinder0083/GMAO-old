import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, FileText, Printer, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { presquAccidentAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

export default function AIQHSEReport({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await presquAccidentAPI.aiGenerateReport(365);
      if (result.success) {
        setReport(result.data);
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de generer le rapport", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setReport(null); onClose(); };

  const handlePrint = () => { window.print(); };

  const trendIcon = (t) => {
    if (t === 'HAUSSE') return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (t === 'BAISSE') return <TrendingDown className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const gravColor = (g) => g === 'CRITIQUE' ? 'bg-red-100 text-red-800' : g === 'IMPORTANT' ? 'bg-orange-100 text-orange-800' : g === 'MODERE' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="qhse-report-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Rapport de synthese QHSE
          </DialogTitle>
        </DialogHeader>

        {!report && !loading && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">
              Generez un rapport de synthese structure, pret a etre presente en reunion QHSE.
            </p>
            <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700" data-testid="qhse-report-start-btn">
              <FileText className="h-4 w-4 mr-2" /> Generer le rapport
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-gray-600">Generation du rapport QHSE...</p>
          </div>
        )}

        {report && (
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="space-y-5 print:space-y-4" id="qhse-report-content">

              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-lg font-bold">{report.titre_rapport}</h2>
                <p className="text-xs text-gray-500">Genere le {report.date_generation}</p>
              </div>

              {/* Resume executif */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="qhse-resume">
                <h3 className="font-semibold text-sm text-blue-800 mb-2">Resume executif</h3>
                <p className="text-sm text-blue-700">{report.resume_executif}</p>
              </div>

              {/* Indicateurs cles */}
              {report.indicateurs_cles && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3">Indicateurs cles</h3>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="bg-white p-3 rounded-lg border text-center">
                      <p className="text-2xl font-bold">{report.indicateurs_cles.total_incidents}</p>
                      <p className="text-xs text-gray-500">Total incidents</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border text-center">
                      <p className="text-2xl font-bold text-green-600">{report.indicateurs_cles.taux_traitement_pct}%</p>
                      <p className="text-xs text-gray-500">Taux traitement</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border text-center">
                      <p className="text-2xl font-bold text-red-600">{report.indicateurs_cles.en_retard}</p>
                      <p className="text-xs text-gray-500">En retard</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border text-center flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1">
                        {trendIcon(report.indicateurs_cles.tendance)}
                        <p className="text-sm font-bold">{report.indicateurs_cles.tendance}</p>
                      </div>
                      <p className="text-xs text-gray-500">Tendance</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{report.indicateurs_cles.commentaire_tendance}</p>
                </div>
              )}

              {/* Analyse par service */}
              {report.analyse_par_service?.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3">Analyse par service</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-xs font-semibold text-gray-600">Service</th>
                        <th className="text-center py-2 text-xs font-semibold text-gray-600">Nb</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-600">Severite</th>
                        <th className="text-left py-2 text-xs font-semibold text-gray-600">Problematique</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.analyse_par_service.map((s, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 font-medium">{s.service}</td>
                          <td className="py-2 text-center">{s.nombre}</td>
                          <td className="py-2">{s.severite_dominante}</td>
                          <td className="py-2 text-xs text-gray-600">{s.problematique_principale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Top risques */}
              {report.top_risques?.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg" data-testid="qhse-top-risques">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" /> Top risques
                  </h3>
                  <div className="space-y-2">
                    {report.top_risques.map((r, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border flex items-start gap-3">
                        <span className="text-lg font-bold text-gray-300">#{r.rang}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{r.risque}</span>
                            <Badge className={`text-[10px] ${gravColor(r.gravite)}`}>{r.gravite}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">{r.localisation} | {r.statut_traitement}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan d'action */}
              {report.plan_action_propose?.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg" data-testid="qhse-plan-action">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" /> Plan d'action propose
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-green-200">
                        <th className="text-left py-2 text-xs font-semibold text-green-700">P</th>
                        <th className="text-left py-2 text-xs font-semibold text-green-700">Action</th>
                        <th className="text-left py-2 text-xs font-semibold text-green-700">Service</th>
                        <th className="text-left py-2 text-xs font-semibold text-green-700">Echeance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.plan_action_propose.map((a, i) => (
                        <tr key={i} className="border-b border-green-100">
                          <td className="py-2 font-bold text-green-700">{a.priorite}</td>
                          <td className="py-2">{a.action}</td>
                          <td className="py-2 text-xs">{a.responsable_suggere}</td>
                          <td className="py-2 text-xs">{a.echeance_suggeree}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Conclusion */}
              {report.conclusion && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">Conclusion</h3>
                  <p className="text-sm text-gray-700">{report.conclusion}</p>
                </div>
              )}

              {/* Points de vigilance */}
              {report.points_de_vigilance?.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 text-amber-800">Points de vigilance</h3>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                    {report.points_de_vigilance.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {/* Print button */}
              <div className="text-center pt-3 print:hidden">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" /> Imprimer le rapport
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
