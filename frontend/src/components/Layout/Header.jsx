/**
 * Composant Header pour l'en-tête de l'application
 * Extrait de MainLayout.jsx pour une meilleure modularité
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Package,
  Eye,
  Mail,
  Settings,
  Camera,
  Sparkles
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import UpdateNotificationBadge from '../Common/UpdateNotificationBadge';
import HelpButton from '../Common/HelpButton';
import HeaderClock from '../Common/HeaderClock';
import AIButton from '../Common/AIButton';
import ManualButton from '../Common/ManualButton';
import AlertNotifications from '../Common/AlertNotifications';
import NotificationsDropdown from '../Common/NotificationsDropdown';
import LOTOHeaderIcon from '../Common/LOTOHeaderIcon';
import CameraAlertIcon from '../Common/CameraAlertIcon';
import BackupStatusIcon from '../Common/BackupStatusIcon';
import ChangelogPanel from '../Common/ChangelogPanel';
import OfflineIndicator from '../Common/OfflineIndicator';
import MESAlertIcon from './MESAlertIcon';
import api from '../../services/api';

const Header = ({
  sidebarOpen,
  onSidebarToggle,
  user,
  isAdmin,
  bellCounts,
  chatUnreadCount,
  canViewChatLive,
  overdueCount,
  overdueDetails,
  overdueExecutionCount,
  overdueRequestsCount,
  overdueMaintenanceCount,
  overdueMenuOpen,
  setOverdueMenuOpen,
  surveillanceBadge,
  inventoryStats
}) => {
  const navigate = useNavigate();
  const [bellMenuOpen, setBellMenuOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasNewRelease, setHasNewRelease] = useState(false);

  const checkNewReleases = useCallback(async () => {
    try {
      const res = await api.get('/releases');
      const { latest_version, last_seen_version } = res.data;
      setHasNewRelease(latest_version && latest_version !== last_seen_version);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    checkNewReleases();
  }, [checkNewReleases]);

  const handleChangelogOpen = () => {
    setChangelogOpen(true);
    setHasNewRelease(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              id="sidebar-toggle"
              onClick={onSidebarToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="sidebar-toggle-btn"
            >
              {/* Mobile : hamburger/X — Desktop : chevrons */}
              <span className="md:hidden">
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
              </span>
              <span className="hidden md:inline">
                {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
            <p className="font-medium">{sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="hidden md:inline font-semibold text-gray-800 text-lg">FSAO Iris</span>
        </div>
        
        {/* Boutons Manuel, IA et Aide */}
        <div className="flex items-center gap-2">
          {/* Masqué sur mobile — visible sur desktop */}
          <span className="hidden md:contents">
            <ManualButton />
            <AIButton />
          </span>
          <HelpButton />
          <span className="hidden md:flex items-center gap-2">
            <HeaderClock />
            <OfflineIndicator />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-4">
        {/* Icônes secondaires : masquées sur mobile */}
        <span className="hidden md:contents">
          <BackupStatusIcon />
          <CameraAlertIcon />
          <MESAlertIcon />
        </span>

        {/* Icône Chat Live avec badge messages non lus */}
        {canViewChatLive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/chat-live')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                data-testid="chat-live-btn"
              >
                <Mail className="w-5 h-5 text-gray-600" />
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
              <p className="font-medium mb-2">Chat Live</p>
              <p className="text-xs text-gray-300 mb-3">
                {chatUnreadCount > 0 
                  ? `${chatUnreadCount} message${chatUnreadCount > 1 ? 's' : ''} non lu${chatUnreadCount > 1 ? 's' : ''}`
                  : 'Aucun nouveau message'}
              </p>
              <div className="border-t border-gray-700 pt-2">
                <p className="text-xs text-gray-400 font-medium mb-1">Fonctionnalités</p>
                <div className="text-xs text-gray-400 ml-2 space-y-0.5">
                  <p>💬 Messagerie instantanée équipe</p>
                  <p>📎 Partage de fichiers et images</p>
                  <p>🔔 Notifications en temps réel</p>
                  <p>👥 Conversations privées ou groupe</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Icône rappel échéances avec 3 badges */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setOverdueMenuOpen(!overdueMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                data-testid="overdue-calendar-btn"
              >
                <img src="/rappel-calendrier.jpg" alt="Rappel" className="w-6 h-6 object-contain" />
                
                {/* Badge ORANGE - Coin supérieur droit - Work Orders + Improvements */}
                {overdueExecutionCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {overdueExecutionCount > 9 ? '9+' : overdueExecutionCount}
                  </span>
                )}
                
                {/* Badge JAUNE - Coin supérieur gauche - Demandes d'inter. + Demandes d'amél. */}
                {overdueRequestsCount > 0 && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {overdueRequestsCount > 9 ? '9+' : overdueRequestsCount}
                  </span>
                )}
                
                {/* Badge BLEU - Coin inférieur gauche - Maintenances préventives */}
                {overdueMaintenanceCount > 0 && (
                  <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {overdueMaintenanceCount > 9 ? '9+' : overdueMaintenanceCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
              <p className="font-medium mb-2">Échéances dépassées</p>
              <p className="text-xs text-gray-300 mb-3">Tâches en retard par catégorie</p>
              <div className="border-t border-gray-700 pt-2">
                <p className="text-xs text-gray-400 font-medium mb-1">Badges couleur</p>
                <div className="text-xs text-gray-400 ml-2 space-y-0.5">
                  <p>🟠 Orange - OT + Améliorations en retard</p>
                  <p>🟡 Jaune - Demandes d'intervention/amélioration</p>
                  <p>🔵 Bleu - Maintenances préventives</p>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-2 mt-2">
                <p className="text-xs text-gray-400 font-medium mb-1">Actions rapides</p>
                <div className="text-xs text-gray-400 ml-2 space-y-0.5">
                  <p>📋 Accès direct aux tâches en retard</p>
                  <p>⏰ Filtrage par type d'échéance</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Menu déroulant des échéances */}
          {overdueMenuOpen && overdueCount > 0 && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Échéances dépassées</h3>
                <p className="text-xs text-gray-500 mt-1">{overdueCount} élément{overdueCount > 1 ? 's' : ''} en retard</p>
              </div>
              <div className="py-2 max-h-80 overflow-y-auto">
                {Object.entries(overdueDetails).map(([key, detail]) => {
                  const categoryColors = {
                    execution: { dot: 'bg-orange-500', text: 'text-orange-500', hover: 'group-hover:text-orange-600' },
                    requests: { dot: 'bg-yellow-500', text: 'text-yellow-600', hover: 'group-hover:text-yellow-700' },
                    maintenance: { dot: 'bg-blue-500', text: 'text-blue-500', hover: 'group-hover:text-blue-600' }
                  };
                  const colors = categoryColors[detail.category] || categoryColors.execution;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        navigate(detail.route, { state: { filterOverdue: true } });
                        setOverdueMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 ${colors.dot} rounded-full`}></div>
                        <span className={`text-sm text-gray-700 ${colors.hover} font-medium`}>
                          {detail.label}
                        </span>
                      </div>
                      <span className={`text-sm font-semibold ${colors.text}`}>
                        {detail.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Message si aucune échéance */}
          {overdueMenuOpen && overdueCount === 0 && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">Aucune échéance dépassée</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Badge de mise à jour (Admin uniquement) — masqué sur mobile */}
        {isAdmin && <span className="hidden md:contents"><UpdateNotificationBadge /></span>}
        
        {/* Badge Plan de Surveillance — masqué sur mobile */}
        <span className="hidden md:contents">
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              onClick={() => navigate('/surveillance-plan', { state: { showOverdueOnly: true } })}
              data-testid="surveillance-plan-btn"
            >
              <Eye size={20} className="text-gray-600" />
              {surveillanceBadge.echeances_proches > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {surveillanceBadge.echeances_proches > 9 ? '9+' : surveillanceBadge.echeances_proches}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
            <p className="font-semibold mb-2">Plan de Surveillance</p>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Échéances proches:</span>
                <span className="font-bold text-orange-400">{surveillanceBadge.echeances_proches}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Taux de réalisation:</span>
                <span className={`font-bold ${surveillanceBadge.pourcentage_realisation >= 75 ? 'text-green-400' : surveillanceBadge.pourcentage_realisation >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                  {surveillanceBadge.pourcentage_realisation}%
                </span>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-2">
              <p className="text-xs text-gray-400 font-medium mb-1">Contrôles qualité</p>
              <div className="text-xs text-gray-400 ml-2 space-y-0.5">
                <p>📊 Suivi des paramètres critiques</p>
                <p>📈 Historique des mesures</p>
                <p>⚠️ Alertes seuils dépassés</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">Cliquez pour voir les contrôles en retard</p>
          </TooltipContent>
        </Tooltip>
        </span>{/* fin hidden md:contents surveillance */}
        
        {/* Badge Inventaire — masqué sur mobile */}
        <span className="hidden md:contents">
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              onClick={() => navigate('/inventory', { state: { filterAlert: true } })}
              data-testid="inventory-alert-btn"
            >
              <Package size={20} className="text-gray-600" />
              {(inventoryStats.rupture + inventoryStats.niveau_bas) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {(inventoryStats.rupture + inventoryStats.niveau_bas) > 9 ? '9+' : (inventoryStats.rupture + inventoryStats.niveau_bas)}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
            <p className="font-semibold mb-2">Alertes Inventaire</p>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">En rupture:</span>
                <span className="font-bold text-red-400">{inventoryStats.rupture}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Niveau bas:</span>
                <span className="font-bold text-orange-400">{inventoryStats.niveau_bas}</span>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-2">
              <p className="text-xs text-gray-400 font-medium mb-1">Gestion des stocks</p>
              <div className="text-xs text-gray-400 ml-2 space-y-0.5">
                <p>📦 Suivi des quantités en stock</p>
                <p>🔔 Alertes seuil minimum</p>
                <p>📋 Historique des mouvements</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">Cliquez pour voir les articles en alerte</p>
          </TooltipContent>
        </Tooltip>
        </span>{/* fin hidden md:contents inventaire */}
        
        {/* Alertes MQTT — masqué sur mobile */}
        <span className="hidden md:contents"><AlertNotifications /></span>
        
        {/* Consignations LOTO */}
        <LOTOHeaderIcon />
        
        {/* Notifications utilisateur */}
        <NotificationsDropdown />
        
        {/* Bouton "Quoi de neuf ?" */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleChangelogOpen}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              data-testid="whatsnew-btn"
            >
              <Sparkles size={20} className="text-gray-600" />
              {hasNewRelease && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-emerald-500 rounded-full text-white text-[9px] font-bold leading-none shadow-md">
                  NEW
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
            <p className="font-medium">Quoi de neuf ?</p>
          </TooltipContent>
        </Tooltip>

        {/* Cloche avec 3 badges et menu déroulant */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setBellMenuOpen(!bellMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                data-testid="bell-btn"
              >
                <Bell size={20} className="text-gray-600" />
                
                {/* Badge ROUGE - Coin supérieur droit - OT en attente */}
                {bellCounts.work_orders > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                    {bellCounts.work_orders > 9 ? '9+' : bellCounts.work_orders}
                  </span>
                )}
                
                {/* Badge VIOLET - Coin supérieur gauche - Améliorations en attente */}
                {bellCounts.improvements > 0 && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                    {bellCounts.improvements > 9 ? '9+' : bellCounts.improvements}
                  </span>
                )}
                
                {/* Badge VERT - Coin inférieur gauche - Maintenances préventives échues */}
                {bellCounts.preventive > 0 && (
                  <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                    {bellCounts.preventive > 9 ? '9+' : bellCounts.preventive}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
              <p className="font-medium">Notifications activité</p>
            </TooltipContent>
          </Tooltip>

          {/* Menu déroulant de la cloche */}
          {bellMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Notifications activité</h3>
                <p className="text-xs text-gray-500 mt-1">Accès rapide par catégorie</p>
              </div>
              <div className="py-2">
                {/* OT en attente */}
                <button
                  onClick={() => {
                    navigate('/work-orders', { state: { filterStatus: 'EN_ATTENTE' } });
                    setBellMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-700 group-hover:text-red-600 font-medium">
                      Ordres de travail en attente
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-500">
                    {bellCounts.work_orders}
                  </span>
                </button>

                {/* Améliorations en attente */}
                <button
                  onClick={() => {
                    navigate('/improvements', { state: { filterStatus: 'EN_ATTENTE' } });
                    setBellMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-700 group-hover:text-purple-600 font-medium">
                      Améliorations en attente
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-purple-500">
                    {bellCounts.improvements}
                  </span>
                </button>

                {/* Maintenances préventives échues */}
                <button
                  onClick={() => {
                    navigate('/preventive-maintenance', { state: { filterOverdue: true } });
                    setBellMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>
                    <span className="text-sm text-gray-700 group-hover:text-green-600 font-medium">
                      Maintenance préventive échue
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {bellCounts.preventive}
                  </span>
                </button>
              </div>
              <div className="p-2 border-t border-gray-100">
                <div className="px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                  <span className="text-red-400 font-bold">●</span> Rouge — OT
                  <span className="text-purple-400 font-bold ml-1">●</span> Violet — Améliorations
                  <span className="text-green-400 font-bold ml-1">●</span> Vert — Préventif
                </div>
              </div>
            </div>
          )}

          {/* Aucune notification */}
          {bellMenuOpen && bellCounts.work_orders === 0 && bellCounts.improvements === 0 && bellCounts.preventive === 0 && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">Aucune notification en attente</p>
              </div>
            </div>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-2 md:px-3 py-2 transition-colors cursor-pointer"
              data-testid="user-profile-btn"
            >
              {/* Nom et rôle : masqués sur mobile */}
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-gray-800">{user.nom}</div>
                <div className="text-xs text-gray-500">{user.role}</div>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-xs md:text-sm">
                  {user.nom.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
            <p className="font-medium mb-2">Mon Profil</p>
            <p className="text-xs text-gray-300 mb-3">Paramètres du compte</p>
            <div className="border-t border-gray-700 pt-2">
              <p className="text-xs text-gray-400 font-medium mb-1">Options disponibles</p>
              <div className="text-xs text-gray-400 ml-2 space-y-0.5">
                <p>👤 Modifier mes informations</p>
                <p>🔐 Changer mon mot de passe</p>
                <p>🎨 Préférences d'affichage</p>
                <p>🚪 Déconnexion</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Panneau latéral "Quoi de neuf ?" */}
      <ChangelogPanel open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  );
};

export default Header;
