import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '../components/ui/badge';
import { Loader2, History, ArrowRight, Lightbulb } from 'lucide-react';
import { presquAccidentAPI } from '../services/api';

export default function AISimilarIncidents({ titre, description, lieu, service, categorie_incident }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const debounceRef = React.useRef(null);

  const searchSimilar = useCallback(async () => {
    if (!description && !titre) return;
    if (description.length < 15 && titre.length < 5) return;

    setLoading(true);
    try {
      const res = await presquAccidentAPI.aiFindSimilar({
        titre, description, lieu, service, categorie_incident
      });
      if (res.success) {
        setResult(res.data);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [titre, description, lieu, service, categorie_incident]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearched(false);
    setResult(null);

    if (description.length >= 15 || titre.length >= 5) {
      debounceRef.current = setTimeout(searchSimilar, 2000);
    }

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [titre, description, lieu, service, categorie_incident, searchSimilar]);

  if (!searched && !loading) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-purple-600 py-2" data-testid="similar-loading">
        <Loader2 className="h-3 w-3 animate-spin" />
        Recherche d'incidents similaires...
      </div>
    );
  }

  if (!result?.similar_incidents?.length) return null;

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2" data-testid="similar-incidents-panel">
      <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
        <History className="h-4 w-4" />
        Incidents similaires detectes ({result.similar_incidents.length})
      </h4>

      <div className="space-y-2">
        {result.similar_incidents.map((incident, i) => (
          <div key={i} className="bg-white rounded-lg p-2.5 border border-amber-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">
                {incident.numero || 'N/A'} - {incident.titre}
              </span>
              <Badge className="text-[10px] bg-amber-100 text-amber-700">
                {incident.similarity_score}% similaire
              </Badge>
            </div>
            <p className="text-xs text-gray-600">{incident.raison_similarite}</p>
            {incident.lecons_a_retenir && (
              <p className="text-xs text-green-700 mt-1 flex items-start gap-1">
                <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {incident.lecons_a_retenir}
              </p>
            )}
          </div>
        ))}
      </div>

      {result.recommandation && (
        <p className="text-xs text-amber-700 flex items-start gap-1 pt-1 border-t border-amber-200">
          <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
          {result.recommandation}
        </p>
      )}
    </div>
  );
}
