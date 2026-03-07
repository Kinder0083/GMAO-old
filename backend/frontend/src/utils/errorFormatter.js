/**
 * Formate les erreurs backend (notamment les erreurs de validation Pydantic)
 * en messages lisibles pour l'utilisateur
 * 
 * @param {*} error - L'erreur axios
 * @param {string} defaultMessage - Message par défaut si aucune erreur spécifique
 * @returns {string} Message d'erreur formaté
 */
export function formatErrorMessage(error, defaultMessage = 'Une erreur est survenue') {
  // Si pas d'erreur
  if (!error) return defaultMessage;

  // Si c'est une erreur réseau
  if (error.code === 'ERR_NETWORK') {
    return 'Erreur de connexion au serveur';
  }

  // Si pas de response (erreur réseau ou timeout)
  if (!error.response) {
    return error.message || defaultMessage;
  }

  const data = error.response.data;

  // Si detail est une string simple
  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  // Si detail est un tableau d'erreurs de validation Pydantic
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map(err => {
        // Formater chaque erreur de validation
        if (err.msg && err.loc) {
          const field = err.loc[err.loc.length - 1]; // Dernier élément de loc est le champ
          return `${field}: ${err.msg}`;
        }
        return err.msg || JSON.stringify(err);
      })
      .join(', ');
  }

  // Si detail est un objet (single validation error)
  if (typeof data?.detail === 'object' && data.detail !== null) {
    if (data.detail.msg) {
      return data.detail.msg;
    }
    // Fallback: stringify l'objet
    try {
      return JSON.stringify(data.detail);
    } catch (e) {
      return defaultMessage;
    }
  }

  // Si message direct dans data
  if (data?.message) {
    return data.message;
  }

  // Fallback au status text
  return error.response.statusText || defaultMessage;
}

/**
 * Formate les erreurs de validation pour affichage en liste
 * @param {*} error - L'erreur axios
 * @returns {string[]} Tableau de messages d'erreur
 */
export function formatValidationErrors(error) {
  if (!error?.response?.data?.detail) return [];

  const detail = error.response.data.detail;

  if (Array.isArray(detail)) {
    return detail.map(err => {
      if (err.msg && err.loc) {
        const field = err.loc[err.loc.length - 1];
        return `${field}: ${err.msg}`;
      }
      return err.msg || 'Erreur de validation';
    });
  }

  return [];
}
