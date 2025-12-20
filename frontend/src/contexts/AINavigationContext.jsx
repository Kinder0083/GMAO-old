import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, MousePointer2 } from 'lucide-react';

const AINavigationContext = createContext(null);

export const useAINavigation = () => {
  const context = useContext(AINavigationContext);
  if (!context) {
    throw new Error('useAINavigation must be used within AINavigationProvider');
  }
  return context;
};

// Mapping des actions vers les sélecteurs et routes
const NAVIGATION_MAP = {
  // Pages principales
  'dashboard': { route: '/dashboard', name: 'Dashboard' },
  'ordres-de-travail': { route: '/work-orders', name: 'Ordres de Travail' },
  'equipements': { route: '/assets', name: 'Équipements' },
  'emplacements': { route: '/locations', name: 'Emplacements' },
  'inventaire': { route: '/inventory', name: 'Inventaire' },
  'maintenance-preventive': { route: '/preventive-maintenance', name: 'Maintenance Préventive' },
  'capteurs': { route: '/sensors', name: 'Capteurs IoT' },
  'compteurs': { route: '/meters', name: 'Compteurs' },
  'rapports': { route: '/reports', name: 'Rapports' },
  'personnalisation': { route: '/personnalisation', name: 'Personnalisation' },
  'parametres': { route: '/settings', name: 'Paramètres' },
  'parametres-speciaux': { route: '/special-settings', name: 'Paramètres Spéciaux' },
  
  // Actions
  'creer-ot': { 
    route: '/work-orders', 
    action: 'click', 
    selector: 'button:has-text("Créer"), button:has-text("+ Créer"), button:has-text("Nouveau")',
    name: 'Créer un Ordre de Travail'
  },
  'creer-equipement': { 
    route: '/assets', 
    action: 'click', 
    selector: 'button:has-text("Ajouter"), button:has-text("+ Ajouter"), button:has-text("Nouveau")',
    name: 'Ajouter un Équipement'
  },
  'creer-emplacement': { 
    route: '/locations', 
    action: 'click', 
    selector: 'button:has-text("Ajouter"), button:has-text("+ Ajouter")',
    name: 'Ajouter un Emplacement'
  },
  'creer-capteur': { 
    route: '/sensors', 
    action: 'click', 
    selector: 'button:has-text("Créer"), button:has-text("+ Créer"), button:has-text("Ajouter")',
    name: 'Créer un Capteur'
  },
  'creer-compteur': { 
    route: '/meters', 
    action: 'click', 
    selector: 'button:has-text("Créer"), button:has-text("+ Créer"), button:has-text("Ajouter")',
    name: 'Créer un Compteur'
  },
};

export const AINavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const [isGuiding, setIsGuiding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [guidanceSteps, setGuidanceSteps] = useState([]);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState('');
  const overlayRef = useRef(null);

  // Naviguer vers une page
  const navigateTo = useCallback((destination) => {
    const navInfo = NAVIGATION_MAP[destination];
    if (navInfo) {
      navigate(navInfo.route);
      return true;
    }
    return false;
  }, [navigate]);

  // Démarrer un guidage étape par étape
  const startGuidance = useCallback((steps) => {
    setGuidanceSteps(steps);
    setCurrentStep(0);
    setIsGuiding(true);
  }, []);

  // Passer à l'étape suivante
  const nextStep = useCallback(() => {
    if (currentStep < guidanceSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      stopGuidance();
    }
  }, [currentStep, guidanceSteps.length]);

  // Revenir à l'étape précédente
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Arrêter le guidage
  const stopGuidance = useCallback(() => {
    setIsGuiding(false);
    setCurrentStep(0);
    setGuidanceSteps([]);
    setHighlightedElement(null);
    setTooltipContent('');
  }, []);

  // Surligner un élément
  const highlightElement = useCallback((selector, message) => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightedElement({
        selector,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        }
      });
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      });
      setTooltipContent(message);
      
      // Scroll vers l'élément
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      return true;
    }
    return false;
  }, []);

  // Cliquer sur un élément
  const clickElement = useCallback((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
      return true;
    }
    return false;
  }, []);

  // Exécuter une action de navigation complète
  const executeAction = useCallback(async (actionKey) => {
    const action = NAVIGATION_MAP[actionKey];
    if (!action) return false;

    // D'abord, naviguer vers la page
    if (action.route) {
      navigate(action.route);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Ensuite, exécuter l'action (clic, etc.)
    if (action.action === 'click' && action.selector) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Essayer plusieurs sélecteurs
      const selectors = action.selector.split(', ');
      for (const sel of selectors) {
        // Convertir le sélecteur has-text en querySelector compatible
        let element;
        if (sel.includes(':has-text(')) {
          const textMatch = sel.match(/:has-text\("([^"]+)"\)/);
          if (textMatch) {
            const searchText = textMatch[1];
            const baseSelector = sel.split(':has-text')[0];
            const elements = document.querySelectorAll(baseSelector || 'button');
            element = Array.from(elements).find(el => 
              el.textContent.includes(searchText)
            );
          }
        } else {
          element = document.querySelector(sel);
        }
        
        if (element) {
          // Surligner d'abord
          const rect = element.getBoundingClientRect();
          setHighlightedElement({
            selector: sel,
            rect: {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height
            }
          });
          setTooltipContent(`Cliquez sur "${action.name}"`);
          setTooltipPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 10
          });
          
          // Attendre un peu puis cliquer
          await new Promise(resolve => setTimeout(resolve, 1500));
          element.click();
          setHighlightedElement(null);
          setTooltipContent('');
          return true;
        }
      }
    }

    return true;
  }, [navigate]);

  // Effet pour exécuter l'étape courante du guidage
  useEffect(() => {
    if (!isGuiding || guidanceSteps.length === 0) return;

    const step = guidanceSteps[currentStep];
    if (!step) return;

    const executeStep = async () => {
      // Navigation si nécessaire
      if (step.route) {
        navigate(step.route);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Surlignage si nécessaire
      if (step.highlight) {
        await new Promise(resolve => setTimeout(resolve, 300));
        highlightElement(step.highlight, step.message);
      } else {
        setTooltipContent(step.message);
        setTooltipPosition({ x: window.innerWidth / 2, y: 100 });
      }
    };

    executeStep();
  }, [isGuiding, currentStep, guidanceSteps, navigate, highlightElement]);

  return (
    <AINavigationContext.Provider value={{
      navigateTo,
      startGuidance,
      stopGuidance,
      nextStep,
      prevStep,
      highlightElement,
      clickElement,
      executeAction,
      isGuiding,
      currentStep,
      totalSteps: guidanceSteps.length
    }}>
      {children}
      
      {/* Overlay de surlignage */}
      {highlightedElement && (
        <>
          {/* Fond semi-transparent avec trou */}
          <div 
            className="fixed inset-0 z-[9998] pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${highlightedElement.rect.left + highlightedElement.rect.width/2}px ${highlightedElement.rect.top + highlightedElement.rect.height/2}px, transparent ${Math.max(highlightedElement.rect.width, highlightedElement.rect.height)}px, rgba(0,0,0,0.5) ${Math.max(highlightedElement.rect.width, highlightedElement.rect.height) + 50}px)`
            }}
          />
          
          {/* Bordure de surlignage */}
          <div
            className="fixed z-[9999] pointer-events-none border-4 border-purple-500 rounded-lg animate-pulse"
            style={{
              top: highlightedElement.rect.top - 4,
              left: highlightedElement.rect.left - 4,
              width: highlightedElement.rect.width + 8,
              height: highlightedElement.rect.height + 8,
              boxShadow: '0 0 20px rgba(147, 51, 234, 0.5)'
            }}
          />
          
          {/* Flèche pointant vers l'élément */}
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: highlightedElement.rect.top - 40,
              left: highlightedElement.rect.left + highlightedElement.rect.width / 2 - 15
            }}
          >
            <MousePointer2 
              className="text-purple-500 animate-bounce" 
              size={30}
              style={{ transform: 'rotate(180deg)' }}
            />
          </div>
        </>
      )}
      
      {/* Tooltip/Message */}
      {tooltipContent && (
        <div
          className="fixed z-[10000] bg-purple-600 text-white px-4 py-2 rounded-lg shadow-xl max-w-md text-center"
          style={{
            left: Math.min(Math.max(tooltipPosition.x - 150, 10), window.innerWidth - 310),
            top: Math.min(tooltipPosition.y, window.innerHeight - 100),
            transform: 'translateX(0)'
          }}
        >
          <p className="text-sm">{tooltipContent}</p>
          
          {/* Contrôles de guidage */}
          {isGuiding && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-purple-400">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="p-1 hover:bg-purple-500 rounded disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="text-xs">
                Étape {currentStep + 1} / {guidanceSteps.length}
              </span>
              
              <div className="flex gap-1">
                <button
                  onClick={nextStep}
                  className="p-1 hover:bg-purple-500 rounded"
                >
                  {currentStep < guidanceSteps.length - 1 ? (
                    <ChevronRight size={20} />
                  ) : (
                    <span className="text-xs px-2">Terminer</span>
                  )}
                </button>
                <button
                  onClick={stopGuidance}
                  className="p-1 hover:bg-purple-500 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AINavigationContext.Provider>
  );
};

export default AINavigationProvider;
