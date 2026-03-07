import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook pour appliquer des filtres depuis location.state (deep-linking depuis le header).
 * 
 * @param {Object} handlers - Mapping clé → fonction de traitement.
 *   Chaque clé correspond à une propriété de location.state.
 *   La fonction reçoit la valeur de cette propriété en argument.
 * 
 * Exemples d'utilisation :
 * 
 * // Simple : activer un booléen
 * useLocationStateFilter({
 *   filterOverdue: () => setFilterOverdue(true)
 * });
 * 
 * // Avec valeur et effets secondaires
 * useLocationStateFilter({
 *   filterStatus: (value) => {
 *     setFilterStatus(value);
 *     setDateFilter('all');
 *   },
 *   filterOverdue: () => {
 *     setFilterStatus('ALL');
 *     setFilterOverdue(true);
 *   }
 * });
 */
export function useLocationStateFilter(handlers) {
  const location = useLocation();

  useEffect(() => {
    if (!location.state) return;

    for (const [key, handler] of Object.entries(handlers)) {
      if (location.state[key] !== undefined && location.state[key] !== false) {
        handler(location.state[key]);
      }
    }
  }, [location.state]);
}
