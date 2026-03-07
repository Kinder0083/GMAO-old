import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const GuidedTourContext = createContext();

// Clé de stockage local pour l'état de la visite
const TOUR_STORAGE_KEY = 'gmao_guided_tour_completed';
const TOUR_VERSION = '1.0'; // Incrémenter pour forcer une nouvelle visite après mise à jour majeure

export const GuidedTourProvider = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

  // Vérifier si l'utilisateur a déjà fait la visite
  useEffect(() => {
    const tourData = localStorage.getItem(TOUR_STORAGE_KEY);
    if (tourData) {
      try {
        const { completed, version } = JSON.parse(tourData);
        // Si la version a changé, relancer la visite
        if (version !== TOUR_VERSION) {
          setHasCompletedTour(false);
        } else {
          setHasCompletedTour(completed);
        }
      } catch {
        setHasCompletedTour(false);
      }
    } else {
      setHasCompletedTour(false);
    }
  }, []);

  // Démarrer la visite automatiquement pour les nouveaux utilisateurs
  useEffect(() => {
    if (!hasCompletedTour && !isRunning) {
      // Attendre que la page soit chargée
      const timer = setTimeout(() => {
        const currentPath = window.location.pathname;
        // Ne démarrer automatiquement que sur le dashboard
        if (currentPath === '/' || currentPath === '/dashboard') {
          startTour('dashboard');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, isRunning]);

  const startTour = useCallback((page = null) => {
    setCurrentPage(page);
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsRunning(false);
    setCurrentPage(null);
    setStepIndex(0);
  }, []);

  const completeTour = useCallback(() => {
    setIsRunning(false);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
      completed: true,
      version: TOUR_VERSION,
      completedAt: new Date().toISOString()
    }));
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(false);
  }, []);

  const goToStep = useCallback((index) => {
    setStepIndex(index);
  }, []);

  return (
    <GuidedTourContext.Provider value={{
      isRunning,
      currentPage,
      stepIndex,
      hasCompletedTour,
      startTour,
      stopTour,
      completeTour,
      resetTour,
      goToStep,
      setStepIndex
    }}>
      {children}
    </GuidedTourContext.Provider>
  );
};

export const useGuidedTour = () => {
  const context = useContext(GuidedTourContext);
  if (!context) {
    throw new Error('useGuidedTour must be used within a GuidedTourProvider');
  }
  return context;
};

export default GuidedTourContext;
