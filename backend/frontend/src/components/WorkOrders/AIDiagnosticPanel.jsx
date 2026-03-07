import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, Wrench, Package, Loader2 } from 'lucide-react';
import { workOrdersAPI } from '../../services/api';

export default function AIDiagnosticPanel({ workOrderId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workOrdersAPI.aiDiagnostic(workOrderId);
      if (res.success) setData(res.diagnostic);
      else setError("Erreur lors de l'analyse");
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur de diagnostic IA");
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={runDiagnostic}
        className="gap-2 text-violet-700 border-violet-200 hover:bg-violet-50"
        data-testid="ai-diagnostic-btn"
      >
        <Sparkles className="h-4 w-4" />
        Diagnostic IA
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 flex items-center gap-3" data-testid="ai-diagnostic-loading">
        <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
        <span className="text-sm text-violet-700">Analyse en cours (historique, equipement, inventaire)...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
        {error}
        <Button variant="link" size="sm" onClick={runDiagnostic} className="ml-2 text-red-700">Reessayer</Button>
      </div>
    );
  }

  const d = data.diagnostic || data;
  const confColor = d.niveau_confiance === 'haute' ? 'text-green-600' : d.niveau_confiance === 'moyenne' ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg overflow-hidden" data-testid="ai-diagnostic-panel">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-violet-800">
          <Sparkles className="h-4 w-4" /> Diagnostic IA
          {d.niveau_confiance && <span className={`text-xs font-normal ${confColor}`}>(confiance {d.niveau_confiance})</span>}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-violet-600" /> : <ChevronDown className="h-4 w-4 text-violet-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Cause probable */}
          {d.cause_probable && (
            <div>
              <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Cause probable</p>
              <p className="text-sm text-gray-800 bg-white rounded p-2">{d.cause_probable}</p>
              {d.causes_secondaires?.length > 0 && (
                <ul className="mt-1 text-xs text-gray-600 list-disc ml-4">
                  {d.causes_secondaires.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Pistes de résolution */}
          {d.pistes_resolution?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1"><Wrench className="h-3 w-3" /> Resolution</p>
              <div className="space-y-1">
                {d.pistes_resolution.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-white rounded p-2">
                    <span className="font-bold text-violet-600 min-w-[20px]">{p.etape}.</span>
                    <div>
                      <span className="text-gray-800">{p.action}</span>
                      {p.duree_estimee && <span className="text-gray-400 ml-2">({p.duree_estimee})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pièces nécessaires */}
          {d.pieces_necessaires?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> Pieces necessaires</p>
              <div className="flex flex-wrap gap-1">
                {d.pieces_necessaires.map((p, i) => (
                  <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${p.en_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.nom} {p.quantite > 1 ? `x${p.quantite}` : ''} {p.en_stock ? '(en stock)' : '(a commander)'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Commentaire expert */}
          {d.commentaire_expert && (
            <p className="text-xs text-gray-700 italic border-l-2 border-violet-300 pl-3 mt-2">{d.commentaire_expert}</p>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={runDiagnostic} className="text-xs text-violet-600">Relancer l'analyse</Button>
          </div>
        </div>
      )}
    </div>
  );
}
