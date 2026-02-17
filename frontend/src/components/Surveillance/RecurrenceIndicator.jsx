import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { surveillanceAPI } from '../../services/api';

const statusDot = (status) => {
  if (status === 'REALISE') return 'bg-green-500';
  if (status === 'PLANIFIE') return 'bg-blue-500';
  return 'bg-orange-400';
};

const statusLabel = (status) => {
  if (status === 'REALISE') return 'Realise';
  if (status === 'PLANIFIE') return 'Planifie';
  return 'A planifier';
};

const TrendArrow = ({ trend }) => {
  if (!trend || trend.trend === 'none') return null;
  const config = {
    up: { Icon: TrendingUp, color: 'text-green-500', title: `Bonne conformite (${trend.realized}/${trend.total} realises)` },
    stable: { Icon: Minus, color: 'text-amber-500', title: `Conformite moyenne (${trend.realized}/${trend.total} realises)` },
    down: { Icon: TrendingDown, color: 'text-red-500', title: `Conformite faible (${trend.realized}/${trend.total} realises)` },
  };
  const { Icon, color, title } = config[trend.trend] || {};
  if (!Icon) return null;
  return (
    <span title={title} data-testid={`trend-${trend.trend}`} className={`inline-flex items-center ${color}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
};

export default function RecurrenceIndicator({ item, currentYear, onNavigateToYear, trend }) {
  const [open, setOpen] = useState(false);
  const [occurrences, setOccurrences] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const groupeId = item?.groupe_controle_id;

  const loadOccurrences = useCallback(async () => {
    if (!groupeId || occurrences) return;
    setLoading(true);
    try {
      const res = await surveillanceAPI.getOccurrences(groupeId);
      if (res.success && res.total > 1) {
        setOccurrences(res.occurrences);
      } else {
        setOccurrences([]);
      }
    } catch {
      setOccurrences([]);
    } finally {
      setLoading(false);
    }
  }, [groupeId, occurrences]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!open) loadOccurrences();
    setOpen(!open);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!groupeId) return null;

  return (
    <div className="relative inline-flex items-center gap-0.5" ref={ref}>
      <TrendArrow trend={trend} />
      <button
        onClick={handleClick}
        className="p-1 rounded hover:bg-blue-50 transition-colors group"
        title="Voir les occurrences de ce controle"
        data-testid="recurrence-indicator"
      >
        <Link2 className="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-600" />
      </button>

      {open && (
        <div
          className="absolute z-50 left-full ml-1 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px] py-2 px-3"
          data-testid="recurrence-popover"
        >
          <div className="flex items-center justify-between mb-1.5 border-b pb-1">
            <p className="text-xs font-semibold text-gray-700">
              Occurrences ({loading ? '...' : occurrences?.length || 0})
            </p>
            {trend && trend.trend !== 'none' && (
              <span className={`text-[10px] flex items-center gap-1 ${
                trend.trend === 'up' ? 'text-green-600' : trend.trend === 'down' ? 'text-red-600' : 'text-amber-600'
              }`} data-testid="trend-summary">
                {trend.realized}/{trend.total} conformes
              </span>
            )}
          </div>

          {loading && (
            <p className="text-xs text-gray-400 py-2">Chargement...</p>
          )}

          {!loading && occurrences?.length === 0 && (
            <p className="text-xs text-gray-400 py-2">Controle unique (pas de recurrence)</p>
          )}

          {!loading && occurrences?.length > 0 && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {occurrences.map((occ) => {
                const isCurrent = occ.annee === currentYear && occ.id === item.id;
                const date = occ.prochain_controle
                  ? new Date(occ.prochain_controle).toLocaleDateString('fr-FR')
                  : occ.date_realisation
                    ? new Date(occ.date_realisation).toLocaleDateString('fr-FR')
                    : '-';

                return (
                  <button
                    key={occ.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCurrent && onNavigateToYear) {
                        onNavigateToYear(occ.annee, occ.id);
                      }
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 font-semibold text-blue-800'
                        : 'hover:bg-gray-50 text-gray-700 cursor-pointer'
                    }`}
                    data-testid={`occurrence-${occ.annee}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(occ.status)}`} />
                      <span>{occ.annee}</span>
                      <span className="text-gray-400">-</span>
                      <span>{date}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {isCurrent ? 'ici' : statusLabel(occ.status)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
