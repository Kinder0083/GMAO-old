/**
 * Utilitaires de gestion des dates avec timezone
 * Centralise les fonctions de conversion timezone pour l'application
 */

/**
 * Applique un décalage timezone à un timestamp ISO UTC
 * @param {string} isoTimestamp - Timestamp ISO (ex: "2026-02-14T10:30:00Z")
 * @param {number} timezoneOffset - Décalage en heures (ex: 1 pour GMT+1, -5 pour EST)
 * @returns {Date} - Objet Date avec le décalage appliqué
 */
export const applyTimezoneOffset = (isoTimestamp, timezoneOffset = 0) => {
  if (!isoTimestamp) return new Date();
  
  let ts = String(isoTimestamp);
  
  // Force UTC parsing: append Z if no timezone indicator present
  if (!ts.endsWith('Z') && !ts.includes('+') && !/\d{2}:\d{2}:\d{2}-/.test(ts)) {
    ts += 'Z';
  }
  
  const utcDate = new Date(ts);
  return new Date(utcDate.getTime() + (timezoneOffset * 60 * 60 * 1000));
};

/**
 * Formate un timestamp ISO UTC avec décalage timezone en chaîne lisible
 * @param {string} isoTimestamp - Timestamp ISO (ex: "2026-02-14T10:30:00Z")
 * @param {number} timezoneOffset - Décalage en heures
 * @param {object} options - Options de formatage Intl.DateTimeFormat (ex: { hour: '2-digit', minute: '2-digit' })
 * @param {string} locale - Locale pour le formatage (défaut: 'fr-FR')
 * @returns {string} - Date formatée selon les options
 */
export const formatLocalDate = (isoTimestamp, timezoneOffset = 0, options = {}, locale = 'fr-FR') => {
  if (!isoTimestamp) return '-';
  
  const localDate = applyTimezoneOffset(isoTimestamp, timezoneOffset);
  
  // On utilise timeZone: 'UTC' car on a déjà appliqué le décalage manuellement
  const defaultOpts = { timeZone: 'UTC', ...options };
  
  return localDate.toLocaleString(locale, defaultOpts);
};

/**
 * Formate un timestamp pour affichage dans un graphique (heure:minute)
 * @param {string} isoTimestamp - Timestamp ISO
 * @param {number} timezoneOffset - Décalage en heures
 * @returns {string} - Heure formatée "HH:MM"
 */
export const formatChartTime = (isoTimestamp, timezoneOffset = 0) => {
  return formatLocalDate(isoTimestamp, timezoneOffset, { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Formate un timestamp pour affichage complet (date + heure)
 * @param {string} isoTimestamp - Timestamp ISO
 * @param {number} timezoneOffset - Décalage en heures
 * @returns {string} - Date/heure formatée "DD/MM/YYYY HH:MM:SS"
 */
export const formatFullDateTime = (isoTimestamp, timezoneOffset = 0) => {
  return formatLocalDate(isoTimestamp, timezoneOffset, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
