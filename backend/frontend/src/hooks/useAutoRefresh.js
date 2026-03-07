import { useEffect, useRef } from 'react';

/**
 * Hook personnalisé pour rafraîchir automatiquement des données toutes les 5 secondes
 * Le rafraîchissement est invisible : il ne provoque de re-render que si les données ont changé
 * @param {Function} refreshFunction - Fonction à appeler pour rafraîchir les données (doit retourner une Promise)
 * @param {Array} dependencies - Tableau de dépendances (comme dans useEffect)
 * @param {number} interval - Intervalle en millisecondes (par défaut 5000ms = 5s)
 */
export const useAutoRefresh = (refreshFunction, dependencies = [], interval = 5000) => {
  const intervalRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Appeler la fonction immédiatement au premier montage
    if (isInitialMount.current) {
      refreshFunction();
      isInitialMount.current = false;
    }

    // Configurer le rafraîchissement automatique silencieux
    intervalRef.current = setInterval(async () => {
      try {
        // Exécuter le rafraîchissement en arrière-plan
        await refreshFunction();
      } catch (error) {
        console.error('Erreur lors du rafraîchissement automatique:', error);
      }
    }, interval);

    // Nettoyer l'intervalle au démontage
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, dependencies);
};

export default useAutoRefresh;
