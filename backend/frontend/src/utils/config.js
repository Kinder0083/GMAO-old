/**
 * Configuration universelle de l'URL backend
 * Fonctionne automatiquement en local ET à distance
 * - Si REACT_APP_BACKEND_URL est défini → utilise cette URL
 * - Sinon → utilise window.location.origin (URL actuelle du navigateur)
 * 
 * Exemples :
 * - Accès local : http://192.168.1.124 → API sur http://192.168.1.124/api
 * - Accès distant : http://82.66.41.98 → API sur http://82.66.41.98/api
 * - Nom de domaine : http://mon-domaine.com → API sur http://mon-domaine.com/api
 */
export const getBackendURL = () => {
  return process.env.REACT_APP_BACKEND_URL || window.location.origin;
};

export const BACKEND_URL = getBackendURL();
