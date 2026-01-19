import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * GuidedHighlight - Composant de guidage visuel pas à pas
 * 
 * Affiche une surbrillance sur les éléments que l'utilisateur doit cliquer,
 * avec un overlay sombre sur le reste de l'écran.
 */

const GuidedHighlight = ({ 
  guide, 
  onComplete, 
  onCancel,
  onStepChange 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isWaitingForNavigation, setIsWaitingForNavigation] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const steps = guide?.steps || [];
  const currentStepData = steps[currentStep];

  // Trouver et positionner la surbrillance sur l'élément cible
  const updateTargetPosition = useCallback(() => {
    if (!currentStepData?.target) return;

    // Essayer plusieurs sélecteurs séparés par des virgules
    const selectors = currentStepData.target.split(',').map(s => s.trim());
    let element = null;

    for (const selector of selectors) {
      try {
        element = document.querySelector(selector);
        if (element) break;
      } catch (e) {
        console.warn(`Sélecteur invalide: ${selector}`);
      }
    }

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
        element
      });
      setIsVisible(true);
      setIsWaitingForNavigation(false);

      // Scroller vers l'élément si nécessaire
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.warn(`Élément non trouvé pour: ${currentStepData.target}`);
      setTargetRect(null);
      setIsVisible(true);
      
      // Si l'élément n'est pas trouvé, peut-être faut-il naviguer vers une autre page
      // Essayer de détecter la page nécessaire basée sur le sélecteur
      if (currentStepData.target.includes('btn-nouvel-ordre') || 
          currentStepData.target.includes('creer-ot')) {
        // Naviguer vers la page des ordres de travail
        if (!location.pathname.includes('work-orders')) {
          console.log('Navigation automatique vers /work-orders');
          setIsWaitingForNavigation(true);
          navigate('/work-orders');
        }
      }
    }
  }, [currentStepData, location.pathname, navigate]);

  // Réessayer de trouver l'élément après navigation
  useEffect(() => {
    if (isWaitingForNavigation) {
      const timer = setTimeout(() => {
        updateTargetPosition();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isWaitingForNavigation, updateTargetPosition]);

  // Mettre à jour la position quand l'étape change
  useEffect(() => {
    if (guide && steps.length > 0) {
      // Petit délai pour laisser la page se rendre
      const timer = setTimeout(updateTargetPosition, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, guide, updateTargetPosition]);

  // Écouter les clics sur l'élément cible
  useEffect(() => {
    if (!targetRect?.element || !currentStepData?.wait_for_click) return;

    const handleClick = () => {
      // Passer à l'étape suivante après un court délai
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
          onStepChange?.(currentStep + 1);
        } else {
          onComplete?.();
        }
      }, 300);
    };

    targetRect.element.addEventListener('click', handleClick);
    return () => targetRect.element?.removeEventListener('click', handleClick);
  }, [targetRect, currentStepData, currentStep, steps.length, onComplete, onStepChange]);

  // Mettre à jour la position sur scroll/resize
  useEffect(() => {
    const handleUpdate = () => updateTargetPosition();
    window.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      onStepChange?.(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      onStepChange?.(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onCancel?.();
  };

  if (!guide || !isVisible) return null;

  const highlightType = currentStepData?.highlight_type || 'glow';
  const padding = 8;

  return (
    <>
      {/* Overlay sombre avec trou pour l'élément cible */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {targetRect ? (
          <svg className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <mask id="highlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#highlight-mask)"
            />
          </svg>
        ) : (
          <div className="w-full h-full bg-black/75" />
        )}
      </div>

      {/* Surbrillance autour de l'élément cible */}
      {targetRect && (
        <div
          className={`fixed z-[9999] pointer-events-none rounded-lg ${
            highlightType === 'pulse' ? 'animate-pulse-highlight' :
            highlightType === 'glow' ? 'animate-glow-highlight' :
            'animate-spotlight-highlight'
          }`}
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: highlightType === 'spotlight' 
              ? '0 0 0 4px rgba(59, 130, 246, 0.8), 0 0 30px 10px rgba(59, 130, 246, 0.4)'
              : '0 0 0 3px rgba(59, 130, 246, 1), 0 0 20px 5px rgba(59, 130, 246, 0.5)',
            transition: 'all 0.3s ease-out'
          }}
        />
      )}

      {/* Flèche pointant vers l'élément */}
      {targetRect && (
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{
            top: targetRect.top - 50,
            left: targetRect.left + targetRect.width / 2 - 20,
          }}
        >
          <div className="animate-bounce text-blue-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 16l-6-6h12l-6 6z" />
            </svg>
          </div>
        </div>
      )}

      {/* Panneau d'instruction */}
      <div 
        className="fixed z-[10001] bg-white rounded-xl shadow-2xl border-2 border-blue-500 max-w-md"
        style={{
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-semibold">{guide.title || 'Guide interactif'}</span>
          </div>
          <button 
            onClick={handleSkip}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4">
          {/* Progression */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {currentStep + 1}/{steps.length}
            </span>
          </div>

          {/* Instruction */}
          <p className="text-gray-800 text-base leading-relaxed mb-4">
            {currentStepData?.instruction || 'Suivez les instructions...'}
          </p>

          {/* Indication de clic attendu */}
          {currentStepData?.wait_for_click && targetRect && (
            <p className="text-sm text-blue-600 font-medium mb-4 flex items-center gap-2">
              <span className="animate-pulse">👆</span>
              Cliquez sur l'élément en surbrillance pour continuer
            </p>
          )}

          {/* Boutons de navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Précédent
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-500 flex items-center gap-1"
            >
              <SkipForward size={16} />
              Passer
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
            >
              {currentStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 1), 0 0 20px 5px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.8), 0 0 40px 15px rgba(59, 130, 246, 0.3);
          }
        }
        
        @keyframes glow-highlight {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 1), 0 0 15px 5px rgba(59, 130, 246, 0.6);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 1), 0 0 25px 10px rgba(59, 130, 246, 0.4);
          }
        }
        
        @keyframes spotlight-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.8), 0 0 30px 10px rgba(59, 130, 246, 0.4), 0 0 60px 20px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.9), 0 0 40px 15px rgba(59, 130, 246, 0.5), 0 0 80px 30px rgba(59, 130, 246, 0.3);
          }
        }
        
        .animate-pulse-highlight {
          animation: pulse-highlight 1.5s ease-in-out infinite;
        }
        
        .animate-glow-highlight {
          animation: glow-highlight 2s ease-in-out infinite;
        }
        
        .animate-spotlight-highlight {
          animation: spotlight-highlight 2.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default GuidedHighlight;
