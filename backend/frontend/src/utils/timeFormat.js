/**
 * Convertit un temps décimal (heures) en format "Xh Ymin"
 * @param {number} decimalHours - Temps en heures décimales (ex: 2.5)
 * @returns {string} - Temps formaté (ex: "2h 30min")
 */
export const formatTimeToHoursMinutes = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) {
    return '0h';
  }
  
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}min`;
};
