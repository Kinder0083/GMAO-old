/**
 * Composant Header pour l'en-tête de l'application
 * Extrait de MainLayout.jsx pour une meilleure modularité
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, RefreshCw } from 'lucide-react';
import UpdateNotificationBadge from '../Common/UpdateNotificationBadge';
import HelpButton from '../Common/HelpButton';
import AIButton from '../Common/AIButton';
import ContextualHelpButton from '../Common/ContextualHelpButton';
import ManualButton from '../Common/ManualButton';
import AlertNotifications from '../Common/AlertNotifications';
import NotificationsDropdown from '../Common/NotificationsDropdown';

// Mapping des chemins vers les titres de page
const pageTitles = {
  '/dashboard': 'Tableau de bord',
  '/chat-live': 'Chat Live',
  '/intervention-requests': "Demandes d'intervention",
  '/work-orders': 'Ordres de travail',
  '/improvement-requests': "Demandes d'amélioration",
  '/improvements': 'Améliorations',
  '/preventive-maintenance': 'Maintenance préventive',
  '/planning-mprev': 'Planning Maintenance Préventive',
  '/assets': 'Équipements',
  '/inventory': 'Inventaire',
  '/purchase-requests': "Demandes d'achat",
  '/locations': 'Zones',
  '/meters': 'Compteurs',
  '/sensors': 'Capteurs MQTT',
  '/iot-dashboard': 'Dashboard IoT',
  '/mqtt-logs': 'Logs MQTT',
  '/surveillance-plan': 'Plan de Surveillance',
  '/surveillance-rapport': 'Rapport Surveillance',
  '/presqu-accident': "Presqu'accident",
  '/presqu-accident-rapport': 'Rapport Presqu\'accident',
  '/documentations': 'Documentations',
  '/reports': 'Rapports',
  '/people': 'Utilisateurs',
  '/planning': 'Planning',
  '/vendors': 'Fournisseurs',
  '/purchase-history': 'Historique Achat',
  '/import-export': 'Import / Export',
  '/whiteboard': "Tableau d'affichage",
  '/settings': 'Paramètres',
  '/profile': 'Mon Profil'
};

const Header = ({ 
  sidebarOpen, 
  onMenuToggle, 
  isAdmin,
  onRefresh 
}) => {
  const location = useLocation();
  
  // Obtenir le titre de la page actuelle
  const getPageTitle = () => {
    const basePath = '/' + location.pathname.split('/')[1];
    return pageTitles[basePath] || pageTitles[location.pathname] || 'GMAO IRIS';
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Partie gauche - Menu burger (mobile) et titre */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <Menu size={24} />
        </button>
        
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
        </div>
      </div>
      
      {/* Partie droite - Actions et notifications */}
      <div className="flex items-center gap-2">
        {/* Bouton Rafraîchir */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw size={20} />
          </button>
        )}
        
        {/* Notifications d'alertes */}
        <AlertNotifications />
        
        {/* Notifications générales */}
        <NotificationsDropdown />
        
        {/* Badge de mise à jour (admin seulement) */}
        {isAdmin && <UpdateNotificationBadge />}
        
        {/* Aide contextuelle */}
        <ContextualHelpButton />
        
        {/* Manuel d'utilisation */}
        <ManualButton />
        
        {/* Aide générale */}
        <HelpButton />
        
        {/* Assistant IA */}
        <AIButton />
      </div>
    </header>
  );
};

export default Header;
