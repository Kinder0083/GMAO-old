import React, { useState } from 'react';
import { Button } from '../ui/button';
import { FileText, Sparkles, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { workOrdersAPI } from '../../services/api';

export default function AISummaryPanel({ workOrderId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState(null);

  const runSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workOrdersAPI.aiSummary(workOrderId);
      if (res.success) setData(res.summary);
      else setError("Erreur lors de la generation");
    } catch (e) {
      setError(e?.response?.data?.detail || "Erreur de resume IA");
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={runSummary}
        className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
        data-testid="ai-summary-btn"
      >
        <FileText className="h-4 w-4" />
        Resume IA
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3" data-testid="ai-summary-loading">
        <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
        <span className="text-sm text-emerald-700">Generation du resume de cloture...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
        {error}
        <Button variant="link" size="sm" onClick={runSummary} className="ml-2 text-red-700">Reessayer</Button>
      </div>
    );
  }

  const s = data;
  const eff = s.performance?.efficacite;
  const effColor = eff === 'bonne' ? 'text-green-600' : eff === 'moyenne' ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden" data-testid="ai-summary-panel">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <Sparkles className="h-4 w-4" /> Resume IA
          {eff && <span className={`text-xs font-normal ${effColor}`}>(efficacite {eff})</span>}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-emerald-600" /> : <ChevronDown className="h-4 w-4 text-emerald-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Résumé */}
          {s.resume && (
            <p className="text-sm text-gray-800 bg-white rounded p-2">{s.resume}</p>
          )}

          {/* Performance */}
          {s.performance && (
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                {s.performance.respect_delai ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                Delai {s.performance.respect_delai ? 'respecte' : 'depasse'}
              </span>
              {s.performance.ecart_temps && (
                <span className="text-gray-500">Ecart: {s.performance.ecart_temps}</span>
              )}
            </div>
          )}

          {/* Actions réalisées */}
          {s.actions_realisees?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1">Actions realisees</p>
              <ul className="text-xs text-gray-700 list-disc ml-4 space-y-0.5">
                {s.actions_realisees.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {/* Recommandations */}
          {s.recommandations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1">Recommandations</p>
              <ul className="text-xs text-gray-700 list-disc ml-4 space-y-0.5">
                {s.recommandations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Maintenance préventive suggérée */}
          {s.maintenance_preventive_suggeree?.necessaire && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2">
              <p className="text-xs font-semibold text-amber-700 mb-1">Maintenance preventive suggeree</p>
              <p className="text-xs text-gray-700">{s.maintenance_preventive_suggeree.description}</p>
              {s.maintenance_preventive_suggeree.periodicite_suggeree && (
                <p className="text-xs text-amber-600 mt-1">Periodicite : {s.maintenance_preventive_suggeree.periodicite_suggeree}</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={runSummary} className="text-xs text-emerald-600">Regenerer</Button>
          </div>
        </div>
      )}
    </div>
  );
}
