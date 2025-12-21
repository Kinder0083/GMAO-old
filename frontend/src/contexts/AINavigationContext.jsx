import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, MousePointer2, ArrowDown, Target, Hand } from 'lucide-react';

// Exporter le contexte pour permettre une utilisation sécurisée avec useContext
export const AINavigationContext = createContext(null);

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

// Styles d'animation pour le guidage
const HIGHLIGHT_STYLES = {
  default: {
    borderColor: 'rgb(147, 51, 234)', // purple-600
    glowColor: 'rgba(147, 51, 234, 0.5)',
    arrowColor: 'text-purple-500'
  },
  success: {
    borderColor: 'rgb(34, 197, 94)', // green-500
    glowColor: 'rgba(34, 197, 94, 0.5)',
    arrowColor: 'text-green-500'
  },
  warning: {
    borderColor: 'rgb(234, 179, 8)', // yellow-500
    glowColor: 'rgba(234, 179, 8, 0.5)',
    arrowColor: 'text-yellow-500'
  },
  error: {
    borderColor: 'rgb(239, 68, 68)', // red-500
    glowColor: 'rgba(239, 68, 68, 0.5)',
    arrowColor: 'text-red-500'
  }
};

export const AINavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const [isGuiding, setIsGuiding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [guidanceSteps, setGuidanceSteps] = useState([]);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState('');
  const [highlightStyle, setHighlightStyle] = useState('default');
  const [showArrow, setShowArrow] = useState(true);
  const [arrowPosition, setArrowPosition] = useState({ x: 0, y: 0, rotation: 0 });
  const [pulseAnimation, setPulseAnimation] = useState(true);
  const [showHandPointer, setShowHandPointer] = useState(false);
  const overlayRef = useRef(null);
  const animationFrameRef = useRef(null);

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
    setPulseAnimation(true);
  }, []);

  // Arrêter le guidage
  const stopGuidance = useCallback(() => {
    setIsGuiding(false);
    setCurrentStep(0);
    setGuidanceSteps([]);
    setHighlightedElement(null);
    setTooltipContent('');
    setShowArrow(false);
    setShowHandPointer(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Passer à l'étape suivante
  const nextStep = useCallback(() => {
    if (currentStep < guidanceSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      stopGuidance();
    }
  }, [currentStep, guidanceSteps.length, stopGuidance]);

  // Revenir à l'étape précédente
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Calculer la position de la flèche
  const calculateArrowPosition = useCallback((rect, position = 'top') => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const positions = {
      top: { x: centerX - 15, y: rect.top - 50, rotation: 180 },
      bottom: { x: centerX - 15, y: rect.bottom + 20, rotation: 0 },
      left: { x: rect.left - 50, y: centerY - 15, rotation: 90 },
      right: { x: rect.right + 20, y: centerY - 15, rotation: -90 }
    };
    
    return positions[position] || positions.top;
  }, []);

  // Surligner un élément avec style avancé
  const highlightElement = useCallback((selector, message, options = {}) => {
    const {
      style = 'default',
      arrowPosition: arrowPos = 'top',
      showHand = false,
      autoScroll = true
    } = options;

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
      
      setHighlightStyle(style);
      setShowArrow(true);
      setArrowPosition(calculateArrowPosition(rect, arrowPos));
      setShowHandPointer(showHand);
      
      // Position du tooltip
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 60
      });
      setTooltipContent(message);
      
      // Scroll vers l'élément
      if (autoScroll) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return true;
    }
    return false;
  }, [calculateArrowPosition]);

  // Surligner un champ de formulaire spécifiquement
  const highlightFormField = useCallback((fieldSelector, message, fieldLabel = '') => {
    return highlightElement(fieldSelector, message, {
      style: 'default',
      arrowPosition: 'left',
      showHand: true
    });
  }, [highlightElement]);

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
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Ensuite, surligner l'élément (sans cliquer automatiquement)
    if (action.action === 'click' && action.selector) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
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
          // Scroll vers l'élément pour s'assurer qu'il est visible
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Surligner avec effet visuel
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
          setHighlightStyle('default');
          setShowArrow(true);
          setArrowPosition(calculateArrowPosition(rect, 'top'));
          setShowHandPointer(true);
          setTooltipContent(`👆 Cliquez sur "${action.name}"`);
          setTooltipPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 80
          });
          
          // Garder la surbrillance pendant 8 secondes puis la retirer
          setTimeout(() => {
            setHighlightedElement(null);
            setTooltipContent('');
            setShowArrow(false);
            setShowHandPointer(false);
          }, 8000);
          
          return true;
        }
      }
    }

    return true;
  }, [navigate, calculateArrowPosition]);
          setHighlightedElement(null);
          setTooltipContent('');
          setShowArrow(false);
          setShowHandPointer(false);
          return true;
        }
      }
    }

    return true;
  }, [navigate, calculateArrowPosition]);

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
        highlightElement(step.highlight, step.message, {
          style: step.style || 'default',
          arrowPosition: step.arrowPosition || 'top',
          showHand: step.showHand || false
        });
      } else {
        setTooltipContent(step.message);
        setTooltipPosition({ x: window.innerWidth / 2, y: 100 });
        setShowArrow(false);
      }
    };

    executeStep();
  }, [isGuiding, currentStep, guidanceSteps, navigate, highlightElement]);

  const currentStyles = HIGHLIGHT_STYLES[highlightStyle] || HIGHLIGHT_STYLES.default;

  return (
    <AINavigationContext.Provider value={{
      navigateTo,
      startGuidance,
      stopGuidance,
      nextStep,
      prevStep,
      highlightElement,
      highlightFormField,
      clickElement,
      executeAction,
      isGuiding,
      currentStep,
      totalSteps: guidanceSteps.length
    }}>
      {children}
      
      {/* Overlay de surlignage avancé */}
      {highlightedElement && (
        <>
          {/* Fond semi-transparent avec trou animé */}
          <div 
            className="fixed inset-0 z-[9998] pointer-events-none transition-all duration-300"
            style={{
              background: `radial-gradient(ellipse ${Math.max(highlightedElement.rect.width, highlightedElement.rect.height) * 1.5}px ${Math.max(highlightedElement.rect.width, highlightedElement.rect.height) * 1.2}px at ${highlightedElement.rect.left + highlightedElement.rect.width/2}px ${highlightedElement.rect.top + highlightedElement.rect.height/2}px, transparent 0%, rgba(0,0,0,0.6) 100%)`
            }}
          />
          
          {/* Bordure de surlignage avec effet glow pulsant */}
          <div
            className={`fixed z-[9999] pointer-events-none rounded-lg transition-all duration-300 ${pulseAnimation ? 'animate-pulse' : ''}`}
            style={{
              top: highlightedElement.rect.top - 6,
              left: highlightedElement.rect.left - 6,
              width: highlightedElement.rect.width + 12,
              height: highlightedElement.rect.height + 12,
              border: `3px solid ${currentStyles.borderColor}`,
              boxShadow: `0 0 30px ${currentStyles.glowColor}, 0 0 60px ${currentStyles.glowColor}, inset 0 0 20px ${currentStyles.glowColor}`
            }}
          />
          
          {/* Coins décoratifs */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
            const isTop = corner.includes('top');
            const isLeft = corner.includes('left');
            return (
              <div
                key={corner}
                className="fixed z-[9999] pointer-events-none"
                style={{
                  top: isTop ? highlightedElement.rect.top - 12 : highlightedElement.rect.top + highlightedElement.rect.height + 2,
                  left: isLeft ? highlightedElement.rect.left - 12 : highlightedElement.rect.left + highlightedElement.rect.width + 2,
                  width: 10,
                  height: 10,
                  borderTop: isTop ? `3px solid ${currentStyles.borderColor}` : 'none',
                  borderBottom: !isTop ? `3px solid ${currentStyles.borderColor}` : 'none',
                  borderLeft: isLeft ? `3px solid ${currentStyles.borderColor}` : 'none',
                  borderRight: !isLeft ? `3px solid ${currentStyles.borderColor}` : 'none',
                }}
              />
            );
          })}
          
          {/* Flèche animée pointant vers l'élément */}
          {showArrow && (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: arrowPosition.y,
                left: arrowPosition.x,
                transform: `rotate(${arrowPosition.rotation}deg)`
              }}
            >
              <div className="relative">
                <ArrowDown 
                  className={`${currentStyles.arrowColor} animate-bounce drop-shadow-lg`}
                  size={40}
                  strokeWidth={3}
                />
                {/* Cercle pulsant autour de la flèche */}
                <div 
                  className="absolute -inset-2 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: currentStyles.glowColor }}
                />
              </div>
            </div>
          )}
          
          {/* Main pointant (optionnel) */}
          {showHandPointer && (
            <div
              className="fixed z-[9999] pointer-events-none animate-bounce"
              style={{
                top: highlightedElement.rect.top + highlightedElement.rect.height / 2 - 20,
                left: highlightedElement.rect.left - 50
              }}
            >
              <Hand 
                className={`${currentStyles.arrowColor} transform rotate-90`}
                size={40}
                strokeWidth={2}
              />
            </div>
          )}
          
          {/* Cercle cible au centre de l'élément */}
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: highlightedElement.rect.top + highlightedElement.rect.height / 2 - 20,
              left: highlightedElement.rect.left + highlightedElement.rect.width / 2 - 20
            }}
          >
            <Target 
              className={`${currentStyles.arrowColor} opacity-50 animate-spin`}
              size={40}
              style={{ animationDuration: '3s' }}
            />
          </div>
        </>
      )}
      
      {/* Tooltip/Message amélioré */}
      {tooltipContent && (
        <div
          className="fixed z-[10000] bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-3 rounded-xl shadow-2xl max-w-md text-center"
          style={{
            left: Math.min(Math.max(tooltipPosition.x - 150, 10), window.innerWidth - 310),
            top: Math.min(tooltipPosition.y, window.innerHeight - 120),
            transform: 'translateX(0)'
          }}
        >
          {/* Flèche du tooltip */}
          <div 
            className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-600 rotate-45"
          />
          
          <p className="text-sm font-medium relative z-10">{tooltipContent}</p>
          
          {/* Contrôles de guidage */}
          {isGuiding && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-400/50">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="p-1.5 hover:bg-white/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {guidanceSteps.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStep 
                        ? 'bg-white w-4' 
                        : idx < currentStep 
                          ? 'bg-white/70' 
                          : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={nextStep}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {currentStep < guidanceSteps.length - 1 ? (
                    <ChevronRight size={20} />
                  ) : (
                    <span className="text-xs px-2 font-medium">Terminer</span>
                  )}
                </button>
                <button
                  onClick={stopGuidance}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Fermer le guide"
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
