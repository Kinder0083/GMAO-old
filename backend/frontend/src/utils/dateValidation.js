/**
 * Valide qu'une date n'est pas dans le passé (sauf pour les admins)
 * @param {string} dateString - La date à valider (format ISO)
 * @param {object} user - L'utilisateur actuel
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateDateNotPast = (dateString, user) => {
  // Les admins peuvent tout faire
  if (user?.role === 'ADMIN') {
    return { valid: true, message: '' };
  }

  if (!dateString) {
    return { valid: true, message: '' };
  }

  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return {
      valid: false,
      message: 'Tricheur ! Seul l\'administrateur a le droit de remonter le temps !'
    };
  }

  return { valid: true, message: '' };
};
