import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGuidedTour } from '../../contexts/GuidedTourContext';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

// Définition des étapes de la visite guidée
const tourSteps = [
  {
    target: 'body',
    title: '🎉 Bienvenue sur GMAO Iris !',
    content: 'Cette visite guidée va vous présenter les principales fonctionnalités de l\'application.',
    subContent: 'Cliquez sur "Suivant" pour commencer ou "Passer" pour ignorer.',
    placement: 'center',
    isIntro: true
  },
  {
    target: '[data-testid="sidebar-nav"]',
    title: '📍 Menu de navigation',
    content: 'Utilisez ce menu pour accéder aux différentes sections de l\'application : équipements, maintenance, rapports, et plus encore.',
    placement: 'right'
  },
  {
    target: '[data-testid="dashboard-stats"]',
    title: '📊 Tableau de bord',
    content: 'Visualisez d\'un coup d\'œil les statistiques clés : interventions en cours, équipements actifs, alertes et performances.',
    placement: 'bottom'
  },
  {
    target: '[data-testid="notifications-btn"]',
    title: '🔔 Notifications',
    content: 'Restez informé des alertes, nouvelles interventions et messages importants. Le badge rouge indique le nombre de notifications non lues.',
    placement: 'bottom'
  },
  {
    target: '[data-testid="user-profile-btn"]',
    title: '👤 Menu utilisateur',
    content: 'Accédez à votre profil, vos préférences et déconnectez-vous depuis ce menu.',
    placement: 'bottom-end'
  },
  {
    target: '[data-testid="sidebar-assets"]',
    title: '🔧 Équipements',
    content: 'Gérez votre parc d\'équipements : ajoutez, modifiez et suivez l\'état de chaque machine. Organisez-les par bâtiment ou par type.',
    placement: 'right'
  },
  {
    target: '[data-testid="sidebar-work-orders"]',
    title: '🛠️ Ordres de travail',
    content: 'Créez et suivez les interventions de maintenance. Assignez des techniciens, définissez les priorités et suivez l\'avancement.',
    placement: 'right'
  },
  {
    target: '[data-testid="sidebar-planning"]',
    title: '📅 Planning',
    content: 'Visualisez le calendrier des interventions planifiées et la charge de travail de votre équipe.',
    placement: 'right'
  },
  {
    target: '[data-testid="sidebar-chat-live"]',
    title: '💬 Chat en direct',
    content: 'Communiquez avec votre équipe en temps réel. Envoyez des messages, des consignes importantes et partagez des informations.',
    placement: 'right'
  },
  {
    target: '[data-testid="ai-assistant-button"]',
    title: '🤖 Assistant IA',
    content: 'Votre assistant intelligent pour vous aider dans vos tâches quotidiennes. Posez des questions, demandez des analyses ou générez des rapports.',
    placement: 'bottom'
  },
  {
    target: 'body',
    title: '✅ Visite terminée !',
    content: 'Vous êtes maintenant prêt à utiliser GMAO Iris.',
    subContent: '💡 Vous pouvez relancer cette visite à tout moment depuis Paramètres → Visite guidée.',
    placement: 'center',
    isOutro: true
  }
];

// Composant Tooltip personnalisé
const TourTooltip = ({ step, currentIndex, totalSteps, onNext, onPrev, onSkip, onClose, targetRect }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const calculatePosition = () => {
      if (!targetRect || step.placement === 'center') {
        // Centrer au milieu de l'écran
        setPosition({
          top: window.innerHeight / 2 - 150,
          left: window.innerWidth / 2 - 200
        });
        return;
      }

      const tooltipWidth = 400;
      const tooltipHeight = 200;
      const margin = 16;

      let top = 0;
      let left = 0;

      switch (step.placement) {
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
          left = targetRect.right + margin;
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
          left = targetRect.left - tooltipWidth - margin;
          break;
        case 'bottom':
          top = targetRect.bottom + margin;
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom-end':
          top = targetRect.bottom + margin;
          left = targetRect.right - tooltipWidth;
          break;
        case 'top':
          top = targetRect.top - tooltipHeight - margin;
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
          break;
        default:
          top = targetRect.bottom + margin;
          left = targetRect.left;
      }

      // Ajuster si le tooltip sort de l'écran
      if (left < margin) left = margin;
      if (left + tooltipWidth > window.innerWidth - margin) {
        left = window.innerWidth - tooltipWidth - margin;
      }
      if (top < margin) top = margin;
      if (top + tooltipHeight > window.innerHeight - margin) {
        top = window.innerHeight - tooltipHeight - margin;
      }

      setPosition({ top, left });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [targetRect, step.placement]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  return (
    <div
      className="fixed z-[10001] bg-white rounded-xl shadow-2xl border border-gray-200 w-[400px] animate-fadeIn"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">{step.title}</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <p className="text-gray-600 text-sm leading-relaxed">{step.content}</p>
        {step.subContent && (
          <p className="text-gray-500 text-xs mt-3 italic">{step.subContent}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {totalSteps}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-blue-600' : i < currentIndex ? 'bg-blue-300' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {!isFirst && !step.isIntro && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <ChevronLeft size={16} />
              Précédent
            </button>
          )}

          {!isLast && (
            <button
              onClick={onSkip}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Passer
            </button>
          )}

          <button
            onClick={isLast ? onClose : onNext}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {isLast ? 'Terminer' : 'Suivant'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant Overlay avec spotlight
const TourOverlay = ({ targetRect, onClick }) => {
  if (!targetRect) {
    return (
      <div 
        className="fixed inset-0 bg-black/50 z-[10000] transition-opacity"
        onClick={onClick}
      />
    );
  }

  const padding = 8;
  const spotlightRect = {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2
  };

  return (
    <div className="fixed inset-0 z-[10000]" onClick={onClick}>
      {/* Top */}
      <div 
        className="absolute bg-black/50 left-0 right-0 top-0"
        style={{ height: Math.max(0, spotlightRect.top) }}
      />
      {/* Bottom */}
      <div 
        className="absolute bg-black/50 left-0 right-0 bottom-0"
        style={{ top: spotlightRect.top + spotlightRect.height }}
      />
      {/* Left */}
      <div 
        className="absolute bg-black/50"
        style={{ 
          top: spotlightRect.top, 
          left: 0, 
          width: Math.max(0, spotlightRect.left),
          height: spotlightRect.height
        }}
      />
      {/* Right */}
      <div 
        className="absolute bg-black/50"
        style={{ 
          top: spotlightRect.top, 
          left: spotlightRect.left + spotlightRect.width,
          right: 0,
          height: spotlightRect.height
        }}
      />
      {/* Spotlight border */}
      <div 
        className="absolute border-2 border-blue-400 rounded-lg pointer-events-none"
        style={{ 
          top: spotlightRect.top, 
          left: spotlightRect.left,
          width: spotlightRect.width,
          height: spotlightRect.height,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
        }}
      />
    </div>
  );
};

const GuidedTour = () => {
  const { 
    isRunning, 
    stepIndex, 
    stopTour, 
    completeTour, 
    setStepIndex 
  } = useGuidedTour();

  const [targetRect, setTargetRect] = useState(null);
  const currentStep = tourSteps[stepIndex];

  // Trouver l'élément cible et calculer sa position
  const updateTargetRect = useCallback(() => {
    if (!currentStep || currentStep.placement === 'center') {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentStep.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom
      });
      
      // Scroll vers l'élément si nécessaire
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isRunning) {
      // Petit délai pour laisser le temps au DOM de se mettre à jour
      const timer = setTimeout(updateTargetRect, 100);
      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect);
      };
    }
  }, [isRunning, stepIndex, updateTargetRect]);

  const handleNext = () => {
    if (stepIndex < tourSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const handleClose = () => {
    completeTour();
  };

  if (!isRunning || !currentStep) {
    return null;
  }

  return createPortal(
    <>
      <TourOverlay targetRect={targetRect} onClick={() => {}} />
      <TourTooltip
        step={currentStep}
        currentIndex={stepIndex}
        totalSteps={tourSteps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        onClose={handleClose}
      />
      {/* CSS pour l'animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>,
    document.body
  );
};

export default GuidedTour;
