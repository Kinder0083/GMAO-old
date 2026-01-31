import React, { useEffect, useState } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useGuidedTour } from '../../contexts/GuidedTourContext';
import { useLocation, useNavigate } from 'react-router-dom';

// Définition des étapes de la visite guidée
const tourSteps = {
  // Visite complète (dashboard + navigation)
  dashboard: [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-3">🎉 Bienvenue sur GMAO Iris !</h3>
          <p className="text-gray-600">
            Cette visite guidée va vous présenter les principales fonctionnalités de l'application.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Cliquez sur "Suivant" pour commencer ou "Passer" pour ignorer.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      styles: {
        options: {
          width: 450
        }
      }
    },
    {
      target: '[data-testid="sidebar-nav"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">📍 Menu de navigation</h4>
          <p className="text-gray-600 text-sm">
            Utilisez ce menu pour accéder aux différentes sections de l'application :
            équipements, maintenance, rapports, et plus encore.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-testid="dashboard-stats"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">📊 Tableau de bord</h4>
          <p className="text-gray-600 text-sm">
            Visualisez d'un coup d'œil les statistiques clés : interventions en cours,
            équipements actifs, alertes et performances.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-testid="notifications-btn"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">🔔 Notifications</h4>
          <p className="text-gray-600 text-sm">
            Restez informé des alertes, nouvelles interventions et messages importants.
            Le badge rouge indique le nombre de notifications non lues.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-testid="user-profile-btn"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">👤 Menu utilisateur</h4>
          <p className="text-gray-600 text-sm">
            Accédez à votre profil, vos préférences et déconnectez-vous depuis ce menu.
          </p>
        </div>
      ),
      placement: 'bottom-end',
      disableBeacon: true
    },
    {
      target: '[data-testid="sidebar-assets"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">🔧 Équipements</h4>
          <p className="text-gray-600 text-sm">
            Gérez votre parc d'équipements : ajoutez, modifiez et suivez l'état de chaque machine.
            Organisez-les par bâtiment ou par type.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-testid="sidebar-work-orders"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">🛠️ Ordres de travail</h4>
          <p className="text-gray-600 text-sm">
            Créez et suivez les interventions de maintenance. Assignez des techniciens,
            définissez les priorités et suivez l'avancement.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-testid="sidebar-planning"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">📅 Planning</h4>
          <p className="text-gray-600 text-sm">
            Visualisez le calendrier des interventions planifiées et la charge de travail
            de votre équipe.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-testid="sidebar-chat-live"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">💬 Chat en direct</h4>
          <p className="text-gray-600 text-sm">
            Communiquez avec votre équipe en temps réel. Envoyez des messages,
            des consignes importantes et partagez des informations.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-testid="sidebar-iot-dashboard"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">📡 IoT / Capteurs</h4>
          <p className="text-gray-600 text-sm">
            Surveillez vos capteurs et compteurs connectés en temps réel.
            Configurez des alertes automatiques basées sur les seuils.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-testid="ai-assistant-button"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">🤖 Assistant IA</h4>
          <p className="text-gray-600 text-sm">
            Votre assistant intelligent pour vous aider dans vos tâches quotidiennes.
            Posez des questions, demandez des analyses ou générez des rapports.
          </p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true
    },
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold text-green-600 mb-3">✅ Visite terminée !</h3>
          <p className="text-gray-600 mb-3">
            Vous êtes maintenant prêt à utiliser GMAO Iris.
          </p>
          <p className="text-sm text-gray-500">
            💡 Vous pouvez relancer cette visite à tout moment depuis 
            <strong> Paramètres → Visite guidée</strong>.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      styles: {
        options: {
          width: 400
        }
      }
    }
  ],
  
  // Visite spécifique pour la page équipements
  equipements: [
    {
      target: '[data-testid="equipment-filters"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">🔍 Filtres</h4>
          <p className="text-gray-600 text-sm">
            Filtrez vos équipements par bâtiment, type, état ou recherchez par nom.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-testid="add-equipment-btn"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">➕ Ajouter un équipement</h4>
          <p className="text-gray-600 text-sm">
            Cliquez ici pour ajouter un nouvel équipement à votre inventaire.
          </p>
        </div>
      ),
      placement: 'left',
      disableBeacon: true
    }
  ],

  // Visite spécifique pour les interventions
  interventions: [
    {
      target: '[data-testid="intervention-filters"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">🔍 Filtres d'interventions</h4>
          <p className="text-gray-600 text-sm">
            Filtrez par statut, priorité, technicien assigné ou période.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-testid="create-intervention-btn"]',
      content: (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">➕ Nouvelle intervention</h4>
          <p className="text-gray-600 text-sm">
            Créez une nouvelle intervention en décrivant le problème et en assignant un technicien.
          </p>
        </div>
      ),
      placement: 'left',
      disableBeacon: true
    }
  ]
};

// Styles personnalisés pour le tour
const tourStyles = {
  options: {
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    primaryColor: '#3b82f6',
    textColor: '#374151',
    width: 380,
    zIndex: 10000
  },
  tooltip: {
    borderRadius: 12,
    padding: 20
  },
  tooltipContainer: {
    textAlign: 'left'
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 600
  },
  tooltipContent: {
    padding: '10px 0'
  },
  buttonNext: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    color: '#fff',
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500
  },
  buttonBack: {
    color: '#6b7280',
    marginRight: 10,
    fontSize: 14
  },
  buttonSkip: {
    color: '#9ca3af',
    fontSize: 13
  },
  buttonClose: {
    display: 'none'
  },
  spotlight: {
    borderRadius: 8
  }
};

// Texte français pour les boutons
const locale = {
  back: 'Précédent',
  close: 'Fermer',
  last: 'Terminer',
  next: 'Suivant',
  open: 'Ouvrir',
  skip: 'Passer la visite'
};

const GuidedTour = () => {
  const { 
    isRunning, 
    currentPage, 
    stepIndex, 
    stopTour, 
    completeTour, 
    setStepIndex 
  } = useGuidedTour();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [steps, setSteps] = useState([]);

  // Déterminer les étapes en fonction de la page actuelle
  useEffect(() => {
    if (currentPage && tourSteps[currentPage]) {
      setSteps(tourSteps[currentPage]);
    } else {
      // Par défaut, utiliser la visite du dashboard
      setSteps(tourSteps.dashboard);
    }
  }, [currentPage]);

  // Gérer les événements du tour
  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    // Si l'utilisateur clique sur "Passer" ou ferme le tour
    if (action === ACTIONS.SKIP || action === ACTIONS.CLOSE) {
      completeTour();
      return;
    }

    // Si le tour est terminé ou ignoré
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      completeTour();
      return;
    }

    // Mettre à jour l'index de l'étape
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  if (!isRunning || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={isRunning}
      scrollToFirstStep
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      steps={steps}
      styles={tourStyles}
      locale={locale}
      disableOverlayClose
      spotlightClicks={false}
      floaterProps={{
        disableAnimation: false
      }}
    />
  );
};

export default GuidedTour;
