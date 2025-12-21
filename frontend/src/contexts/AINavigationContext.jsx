import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, MousePointer2, ArrowDown, Target, Hand, Sparkles, Zap, Eye } from 'lucide-react';

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
  
  // Actions - Utiliser des sélecteurs spécifiques pour éviter les erreurs
  'creer-ot': { 
    route: '/work-orders', 
    action: 'click', 
    selector: '#btn-nouvel-ordre, [data-action="creer-ot"], button.bg-blue-600:has-text("Nouvel ordre")',
    name: 'Nouvel ordre de travail'
  },
  'creer-equipement': { 
    route: '/assets', 
    action: 'click', 
    selector: '#btn-nouvel-equipement, [data-action="creer-equipement"], button.bg-blue-600:has-text("Nouvel équipement")',
    name: 'Nouvel équipement'
  },
  'creer-emplacement': { 
    route: '/locations', 
    action: 'click', 
    selector: '#btn-nouvel-emplacement, [data-action="creer-emplacement"], button.bg-blue-600:has-text("Ajouter")',
    name: 'Ajouter un Emplacement'
  },
  'creer-capteur': { 
    route: '/sensors', 
    action: 'click', 
    selector: '#btn-nouveau-capteur, [data-action="creer-capteur"], button.bg-blue-600:has-text("Créer")',
    name: 'Créer un Capteur'
  },
  'creer-compteur': { 
    route: '/meters', 
    action: 'click', 
    selector: '#btn-nouveau-compteur, [data-action="creer-compteur"], button.bg-blue-600:has-text("Créer")',
    name: 'Créer un Compteur'
  },
};

// Styles d'animation pour le guidage
const HIGHLIGHT_STYLES = {
  default: {
    borderColor: 'rgb(147, 51, 234)', // purple-600
    glowColor: 'rgba(147, 51, 234, 0.5)',
    arrowColor: 'text-purple-500',
    bgGradient: 'from-purple-500 to-purple-700'
  },
  success: {
    borderColor: 'rgb(34, 197, 94)', // green-500
    glowColor: 'rgba(34, 197, 94, 0.5)',
    arrowColor: 'text-green-500',
    bgGradient: 'from-green-500 to-green-700'
  },
  warning: {
    borderColor: 'rgb(234, 179, 8)', // yellow-500
    glowColor: 'rgba(234, 179, 8, 0.5)',
    arrowColor: 'text-yellow-500',
    bgGradient: 'from-yellow-500 to-yellow-700'
  },
  error: {
    borderColor: 'rgb(239, 68, 68)', // red-500
    glowColor: 'rgba(239, 68, 68, 0.5)',
    arrowColor: 'text-red-500',
    bgGradient: 'from-red-500 to-red-700'
  },
  info: {
    borderColor: 'rgb(59, 130, 246)', // blue-500
    glowColor: 'rgba(59, 130, 246, 0.5)',
    arrowColor: 'text-blue-500',
    bgGradient: 'from-blue-500 to-blue-700'
  }
};

// Guides prédéfinis pour les tutoriels avancés
const PREDEFINED_GUIDES = {
  'explorer-dashboard': [
    { route: '/dashboard', message: '📊 Bienvenue sur le Tableau de Bord GMAO Iris !', delay: 500 },
    { highlight: '.dashboard-stats, .stats-grid, [data-testid="stats"]', message: '📈 Ces cartes affichent les statistiques clés en temps réel', arrowPosition: 'bottom' },
    { highlight: '.recent-work-orders, [data-testid="recent-ot"]', message: '📋 Ici vous voyez les derniers ordres de travail', arrowPosition: 'left' },
    { message: '✅ Vous pouvez maintenant explorer le tableau de bord !' }
  ],
  'configurer-alertes': [
    { route: '/sensors', message: '🔔 Configuration des alertes capteurs', delay: 500 },
    { highlight: 'button:has-text("Paramètres"), button:has-text("Config")', message: '⚙️ Accédez aux paramètres du capteur', showHand: true },
    { message: '📝 Définissez les seuils min/max pour déclencher des alertes' }
  ],
  'creer-ot': [
    { route: '/work-orders', message: '📋 Création d\'un Ordre de Travail', delay: 500 },
    { highlight: 'button:has-text("Nouvel"), button:has-text("Créer"), button.bg-blue-600', message: '👆 Cliquez sur ce bouton pour commencer', showHand: true, arrowPosition: 'top' },
    { message: '✍️ Remplissez le formulaire : Titre, Équipement, Priorité, Description' },
    { message: '💾 Cliquez sur Enregistrer pour créer l\'OT' }
  ],
  'creer-equipement': [
    { route: '/assets', message: '🔧 Ajout d\'un nouvel Équipement', delay: 500 },
    { highlight: 'button:has-text("Nouvel"), button:has-text("Ajouter"), button.bg-blue-600', message: '👆 Cliquez ici pour ajouter un équipement', showHand: true },
    { message: '📝 Informations requises : Nom, Type, Emplacement' },
    { message: '📎 Vous pouvez ajouter des documents et photos' }
  ]
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
  
  // États pour les effets visuels avancés (P3)
  const [spotlightElement, setSpotlightElement] = useState(null);
  const [pulseElements, setPulseElements] = useState([]);
  const [trailPath, setTrailPath] = useState(null);
  const [customTooltips, setCustomTooltips] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rippleEffects, setRippleEffects] = useState([]);
  
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
    
    // Positions de la flèche et rotations pour que la flèche pointe vers l'élément
    const positions = {
      top: { x: centerX - 15, y: rect.top - 50, rotation: 0 },      // Flèche au-dessus, pointe vers le bas
      bottom: { x: centerX - 15, y: rect.bottom + 20, rotation: 180 }, // Flèche en-dessous, pointe vers le haut
      left: { x: rect.left - 50, y: centerY - 15, rotation: 90 },   // Flèche à gauche, pointe vers la droite
      right: { x: rect.right + 20, y: centerY - 15, rotation: -90 }  // Flèche à droite, pointe vers la gauche
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

  // ==================== Effets Visuels Avancés (P3) ====================

  // Effet Spotlight - met en lumière un élément avec assombrissement du reste
  const showSpotlight = useCallback((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setSpotlightElement({
        selector,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        }
      });
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Auto-hide après 5 secondes
      setTimeout(() => setSpotlightElement(null), 5000);
      return true;
    }
    return false;
  }, []);

  // Effet Pulse - ajoute une pulsation à un élément
  const addPulseEffect = useCallback((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const id = `pulse-${Date.now()}`;
      
      setPulseElements(prev => [...prev, {
        id,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        }
      }]);
      
      // Auto-remove après 4 secondes
      setTimeout(() => {
        setPulseElements(prev => prev.filter(p => p.id !== id));
      }, 4000);
      
      return true;
    }
    return false;
  }, []);

  // Effet Trail - trace un chemin entre deux éléments
  const showTrail = useCallback((startSelector, endSelector) => {
    const startEl = document.querySelector(startSelector);
    const endEl = document.querySelector(endSelector);
    
    if (startEl && endEl) {
      const startRect = startEl.getBoundingClientRect();
      const endRect = endEl.getBoundingClientRect();
      
      setTrailPath({
        start: {
          x: startRect.left + startRect.width / 2 + window.scrollX,
          y: startRect.top + startRect.height / 2 + window.scrollY
        },
        end: {
          x: endRect.left + endRect.width / 2 + window.scrollX,
          y: endRect.top + endRect.height / 2 + window.scrollY
        }
      });
      
      // Auto-hide après 5 secondes
      setTimeout(() => setTrailPath(null), 5000);
      return true;
    }
    return false;
  }, []);

  // Afficher un tooltip personnalisé
  const showCustomTooltip = useCallback((selector, message) => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const id = `tooltip-${Date.now()}`;
      
      setCustomTooltips(prev => [...prev, {
        id,
        message,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY - 10
        }
      }]);
      
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Auto-hide après 6 secondes
      setTimeout(() => {
        setCustomTooltips(prev => prev.filter(t => t.id !== id));
      }, 6000);
      
      return true;
    }
    return false;
  }, []);

  // Effet de célébration (confettis)
  const celebrate = useCallback(() => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  }, []);

  // Ajouter un effet ripple
  const addRipple = useCallback((x, y) => {
    const id = `ripple-${Date.now()}`;
    setRippleEffects(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRippleEffects(prev => prev.filter(r => r.id !== id));
    }, 1000);
  }, []);

  // Nettoyer tous les effets visuels
  const clearAllEffects = useCallback(() => {
    setSpotlightElement(null);
    setPulseElements([]);
    setTrailPath(null);
    setCustomTooltips([]);
    setShowCelebration(false);
    setRippleEffects([]);
    setHighlightedElement(null);
    setTooltipContent('');
    setShowArrow(false);
    setShowHandPointer(false);
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Ensuite, surligner l'élément (sans cliquer automatiquement)
    if (action.action === 'click' && action.selector) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Essayer plusieurs sélecteurs dans l'ordre
      const selectors = action.selector.split(', ');
      let element = null;
      
      for (const sel of selectors) {
        // D'abord essayer le sélecteur direct (ID ou data-attribute)
        if (sel.startsWith('#') || sel.startsWith('[data-')) {
          element = document.querySelector(sel);
          if (element) {
            console.log('Élément trouvé avec sélecteur:', sel);
            break;
          }
        }
        
        // Si c'est un sélecteur :has-text() - chercher le bouton par son texte
        if (sel.includes(':has-text(')) {
          const textMatch = sel.match(/:has-text\("([^"]+)"\)/);
          if (textMatch) {
            const searchText = textMatch[1];
            const baseSelector = sel.split(':has-text')[0] || 'button';
            
            // Chercher dans le contenu principal, pas dans le header ou la sidebar
            const mainContent = document.querySelector('main, [role="main"], .main-content') || document.body;
            const elements = mainContent.querySelectorAll(baseSelector);
            
            // Trouver le bouton qui contient EXACTEMENT ce texte (pas juste partiellement)
            element = Array.from(elements).find(el => {
              const text = el.textContent.trim();
              return text === searchText || text.includes(searchText);
            });
            
            if (element) {
              console.log('Élément trouvé avec texte:', searchText);
              break;
            }
          }
        } else if (!sel.startsWith('#') && !sel.startsWith('[data-')) {
          // Sélecteur CSS standard
          element = document.querySelector(sel);
          if (element) {
            console.log('Élément trouvé avec CSS:', sel);
            break;
          }
        }
      }
      
      if (element) {
        // Scroll vers l'élément pour s'assurer qu'il est visible
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Surligner avec effet visuel
        const rect = element.getBoundingClientRect();
        setHighlightedElement({
          selector: action.selector,
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
      } else {
        console.log('Élément non trouvé pour action:', actionKey);
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
