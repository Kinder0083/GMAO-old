import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Sparkles, MessageCircle, BookOpen, Lightbulb } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useAIContextMenu } from '../../contexts/AIContextMenuContext';

/**
 * ContextualHelpButton - Bouton d'aide contextuelle par page
 * 
 * Affiche un bouton "?" flottant qui propose une aide adaptée à la page actuelle.
 * Au clic, ouvre Adria avec des suggestions contextuelles.
 */

// Configuration de l'aide par page
const PAGE_HELP_CONFIG = {
  '/': {
    title: 'Tableau de bord',
    icon: '📊',
    description: 'Vue d\'ensemble de votre maintenance',
    quickActions: [
      { label: 'Voir les OT urgents', question: 'Montre-moi les ordres de travail urgents' },
      { label: 'Statistiques du jour', question: 'Donne-moi un résumé des statistiques du jour' },
      { label: 'Alertes actives', question: 'Y a-t-il des alertes actives ?' },
    ],
    tips: [
      'Les KPIs en haut montrent l\'état général de votre maintenance',
      'Cliquez sur les graphiques pour voir les détails',
      'Les alertes critiques sont affichées en rouge'
    ]
  },
  '/work-orders': {
    title: 'Ordres de Travail',
    icon: '🔧',
    description: 'Gestion des interventions de maintenance',
    quickActions: [
      { label: 'Créer un OT', question: 'Guide-moi pour créer un ordre de travail' },
      { label: 'OT en retard', question: 'Montre-moi les OT en retard' },
      { label: 'Mes OT assignés', question: 'Quels sont les OT qui me sont assignés ?' },
    ],
    tips: [
      'Utilisez les filtres pour trouver rapidement un OT',
      'Cliquez sur un OT pour voir ses détails et son historique',
      'Vous pouvez créer un OT depuis un modèle pour gagner du temps'
    ]
  },
  '/equipments': {
    title: 'Équipements',
    icon: '⚙️',
    description: 'Inventaire et gestion des équipements',
    quickActions: [
      { label: 'Ajouter un équipement', question: 'Comment ajouter un nouvel équipement ?' },
      { label: 'Équipements en panne', question: 'Quels équipements sont actuellement en panne ?' },
      { label: 'Historique maintenance', question: 'Comment voir l\'historique de maintenance d\'un équipement ?' },
    ],
    tips: [
      'Chaque équipement peut avoir un QR code pour un accès rapide',
      'Associez des documents techniques à vos équipements',
      'Configurez des alertes de maintenance préventive'
    ]
  },
  '/inventory': {
    title: 'Inventaire',
    icon: '📦',
    description: 'Gestion des pièces de rechange',
    quickActions: [
      { label: 'Articles en rupture', question: 'Quels articles sont en rupture de stock ?' },
      { label: 'Faire une sortie', question: 'Comment enregistrer une sortie de stock ?' },
      { label: 'Historique mouvements', question: 'Comment voir l\'historique des mouvements de stock ?' },
    ],
    tips: [
      'Configurez des seuils d\'alerte pour être notifié des niveaux bas',
      'Les articles en rupture apparaissent en rouge',
      'Vous pouvez associer des pièces aux équipements'
    ]
  },
  '/preventive-maintenance': {
    title: 'Maintenance Préventive',
    icon: '🛡️',
    description: 'Planification des maintenances récurrentes',
    quickActions: [
      { label: 'Créer un plan', question: 'Comment créer un plan de maintenance préventive ?' },
      { label: 'Maintenances à venir', question: 'Quelles sont les prochaines maintenances prévues ?' },
      { label: 'Maintenances en retard', question: 'Y a-t-il des maintenances préventives en retard ?' },
    ],
    tips: [
      'Les maintenances préventives génèrent automatiquement des OT',
      'Définissez des fréquences adaptées à chaque équipement',
      'Associez des checklists pour standardiser les interventions'
    ]
  },
  '/sensors': {
    title: 'Capteurs IoT',
    icon: '🌡️',
    description: 'Surveillance en temps réel',
    quickActions: [
      { label: 'Ajouter un capteur', question: 'Comment configurer un nouveau capteur MQTT ?' },
      { label: 'Voir les alertes', question: 'Quels capteurs sont en alerte ?' },
      { label: 'Configurer seuils', question: 'Comment configurer les seuils d\'alerte d\'un capteur ?' },
    ],
    tips: [
      'Les capteurs communiquent via le protocole MQTT',
      'Configurez des actions automatiques lors du dépassement de seuils',
      'Visualisez l\'historique des mesures dans les graphiques'
    ]
  },
  '/locations': {
    title: 'Zones & Emplacements',
    icon: '📍',
    description: 'Organisation spatiale de vos équipements',
    quickActions: [
      { label: 'Créer une zone', question: 'Comment créer une nouvelle zone ?' },
      { label: 'Voir la hiérarchie', question: 'Comment fonctionne la hiérarchie des zones ?' },
      { label: 'Équipements par zone', question: 'Comment voir les équipements d\'une zone ?' },
    ],
    tips: [
      'Les zones peuvent avoir des sous-zones (hiérarchie)',
      'Chaque équipement doit être assigné à une zone',
      'Utilisez des noms explicites pour faciliter la recherche'
    ]
  },
  '/reports': {
    title: 'Rapports',
    icon: '📈',
    description: 'Analyses et statistiques',
    quickActions: [
      { label: 'Rapport mensuel', question: 'Génère un rapport de maintenance mensuel' },
      { label: 'KPIs maintenance', question: 'Quels sont les principaux KPIs de maintenance ?' },
      { label: 'Exporter données', question: 'Comment exporter les données en Excel ?' },
    ],
    tips: [
      'Les rapports peuvent être exportés en PDF ou Excel',
      'Analysez les tendances pour optimiser votre maintenance',
      'Le MTBF et MTTR sont des indicateurs clés'
    ]
  },
  '/people': {
    title: 'Équipe',
    icon: '👥',
    description: 'Gestion des utilisateurs',
    quickActions: [
      { label: 'Ajouter un utilisateur', question: 'Comment ajouter un nouvel utilisateur ?' },
      { label: 'Gérer les rôles', question: 'Comment fonctionnent les rôles et permissions ?' },
      { label: 'Réinitialiser mot de passe', question: 'Comment réinitialiser le mot de passe d\'un utilisateur ?' },
    ],
    tips: [
      'Chaque utilisateur a un rôle qui définit ses permissions',
      'Les techniciens peuvent être assignés aux OT',
      'Invitez des utilisateurs par email'
    ]
  },
  '/chat-live': {
    title: 'Chat Live',
    icon: '💬',
    description: 'Messagerie instantanée',
    quickActions: [
      { label: 'Envoyer un message', question: 'Comment envoyer un message à l\'équipe ?' },
      { label: 'Partager un fichier', question: 'Comment partager un fichier dans le chat ?' },
    ],
    tips: [
      'Le chat permet de communiquer en temps réel avec l\'équipe',
      'Vous pouvez partager des images et documents',
      'Les notifications vous alertent des nouveaux messages'
    ]
  },
  '/settings': {
    title: 'Paramètres',
    icon: '⚙️',
    description: 'Configuration de l\'application',
    quickActions: [
      { label: 'Personnaliser l\'interface', question: 'Comment personnaliser les couleurs de l\'interface ?' },
      { label: 'Configurer les emails', question: 'Comment configurer les notifications email ?' },
    ],
    tips: [
      'Personnalisez les couleurs selon votre charte graphique',
      'Configurez les notifications pour rester informé',
      'Gérez les préférences de votre compte'
    ]
  }
};

// Configuration par défaut
const DEFAULT_CONFIG = {
  title: 'Aide',
  icon: '❓',
  description: 'Comment puis-je vous aider ?',
  quickActions: [
    { label: 'Guide général', question: 'Présente-moi les fonctionnalités principales de GMAO Iris' },
    { label: 'Créer un OT', question: 'Comment créer un ordre de travail ?' },
    { label: 'Contacter le support', question: 'Comment contacter le support technique ?' },
  ],
  tips: [
    'Utilisez Adria pour toute question sur l\'application',
    'La documentation est accessible depuis le menu Manuel',
    'N\'hésitez pas à explorer les différents modules'
  ]
};

const ContextualHelpButton = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(DEFAULT_CONFIG);
  const { openChat, openChatWithContext } = useAIContextMenu();

  // Mettre à jour la config selon la page
  useEffect(() => {
    const path = location.pathname;
    // Trouver la config correspondante
    let config = PAGE_HELP_CONFIG[path];
    
    // Si pas de config exacte, chercher une correspondance partielle
    if (!config) {
      for (const [key, value] of Object.entries(PAGE_HELP_CONFIG)) {
        if (path.startsWith(key) && key !== '/') {
          config = value;
          break;
        }
      }
    }
    
    setCurrentConfig(config || DEFAULT_CONFIG);
  }, [location.pathname]);

  const handleQuickAction = (question) => {
    setIsOpen(false);
    if (onAskQuestion) {
      onAskQuestion(question);
    } else if (onOpenAdria) {
      onOpenAdria(question);
    }
  };

  const handleOpenAdria = () => {
    setIsOpen(false);
    if (onOpenAdria) {
      onOpenAdria();
    }
  };

  return (
    <TooltipProvider>
      {/* Bouton flottant "?" */}
      <div className="fixed bottom-24 right-6 z-[1000]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className={`w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
                isOpen 
                  ? 'bg-blue-700 hover:bg-blue-800 rotate-45' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
              }`}
              data-testid="contextual-help-btn"
            >
              {isOpen ? <X size={24} /> : <HelpCircle size={24} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-gray-900 text-white">
            <p>Aide contextuelle</p>
          </TooltipContent>
        </Tooltip>

        {/* Panneau d'aide contextuelle */}
        {isOpen && (
          <div 
            className="absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
            data-testid="contextual-help-panel"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentConfig.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{currentConfig.title}</h3>
                  <p className="text-blue-100 text-sm">{currentConfig.description}</p>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="p-4 border-b">
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Sparkles size={14} />
                Actions rapides
              </h4>
              <div className="space-y-2">
                {currentConfig.quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.question)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm transition-colors flex items-center gap-2"
                  >
                    <MessageCircle size={14} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conseils */}
            <div className="p-4 border-b bg-gray-50">
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Lightbulb size={14} />
                Conseils
              </h4>
              <ul className="space-y-2">
                {currentConfig.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer - Ouvrir Adria */}
            <div className="p-4">
              <Button
                onClick={handleOpenAdria}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <BookOpen size={16} className="mr-2" />
                Poser une question à Adria
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ContextualHelpButton;
