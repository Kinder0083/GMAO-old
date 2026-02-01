/**
 * MainLayout - Composant principal de mise en page
 * Refactorisé pour utiliser des composants modulaires (Header, Sidebar)
 */
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  MapPin,
  Wrench,
  BarChart3,
  Users,
  ShoppingCart,
  ShoppingBag,
  Calendar,
  Database,
  FileText,
  Gauge,
  MessageSquare,
  Lightbulb,
  Sparkles,
  Eye,
  AlertTriangle,
  FolderOpen,
  Terminal,
  Mail,
  Activity,
  Presentation
} from 'lucide-react';
import { TooltipProvider } from '../ui/tooltip';
import FirstLoginPasswordDialog from '../Common/FirstLoginPasswordDialog';
import RecentUpdatePopup from '../Common/RecentUpdatePopup';
import InactivityHandler from '../Common/InactivityHandler';
import TokenValidator from '../Common/TokenValidator';
import ContextualHelpButton from '../Common/ContextualHelpButton';
import ConsignePopup from '../Common/ConsignePopup';
import Header from './Header';
import Sidebar from './Sidebar';
import { iconMap } from './menuConfig';
import { usePermissions } from '../../hooks/usePermissions';
import { getBackendURL } from '../../utils/config';
import { usePreferences } from '../../contexts/PreferencesContext';

const MainLayout = () => {
  const { preferences } = usePreferences();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [firstLoginDialogOpen, setFirstLoginDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ nom: 'Utilisateur', role: 'VIEWER', firstLogin: false, id: '' });
  const [workOrdersCount, setWorkOrdersCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueDetails, setOverdueDetails] = useState({});
  const [overdueMenuOpen, setOverdueMenuOpen] = useState(false);
  const [overdueExecutionCount, setOverdueExecutionCount] = useState(0);
  const [overdueRequestsCount, setOverdueRequestsCount] = useState(0);
  const [overdueMaintenanceCount, setOverdueMaintenanceCount] = useState(0);
  const [surveillanceBadge, setSurveillanceBadge] = useState({ echeances_proches: 0, pourcentage_realisation: 0 });
  const [inventoryStats, setInventoryStats] = useState({ rupture: 0, niveau_bas: 0 });
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const { canView, isAdmin } = usePermissions();

  // Gérer le comportement auto-collapse de la sidebar
  useEffect(() => {
    if (preferences?.sidebar_behavior === 'auto_collapse') {
      setSidebarOpen(false);
    } else if (preferences?.sidebar_behavior === 'always_open') {
      setSidebarOpen(true);
    }
  }, [location.pathname, preferences?.sidebar_behavior]);

  // Gérer le clic en dehors de la sidebar en mode auto-collapse
  useEffect(() => {
    if (preferences?.sidebar_behavior !== 'auto_collapse' || !sidebarOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('main-sidebar');
      const toggleButton = document.getElementById('sidebar-toggle');
      
      if (sidebar && !sidebar.contains(event.target) && toggleButton && !toggleButton.contains(event.target)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [preferences?.sidebar_behavior, sidebarOpen]);

  useEffect(() => {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        setUser({
          nom: `${parsedUser.prenom || ''} ${parsedUser.nom || ''}`.trim() || 'Utilisateur',
          role: parsedUser.role || 'VIEWER',
          firstLogin: parsedUser.firstLogin || false,
          id: parsedUser.id
        });
        
        if (parsedUser.firstLogin === true) {
          setFirstLoginDialogOpen(true);
        }

        loadWorkOrdersCount(parsedUser.id);
        loadOverdueCount();
        loadSurveillanceBadgeStats();
        loadInventoryStats();
        
        const intervalId = setInterval(() => {
          loadWorkOrdersCount(parsedUser.id);
          loadOverdueCount();
          loadSurveillanceBadgeStats();
          loadInventoryStats();
        }, 60000);
        
        const handleWorkOrderChange = () => {
          loadWorkOrdersCount(parsedUser.id);
          loadOverdueCount();
        };
        
        const handleSurveillanceChange = () => {
          loadSurveillanceBadgeStats();
        };
        
        const handleInventoryChange = () => {
          loadInventoryStats();
        };
        
        window.addEventListener('workOrderCreated', handleWorkOrderChange);
        window.addEventListener('workOrderUpdated', handleWorkOrderChange);
        window.addEventListener('workOrderDeleted', handleWorkOrderChange);
        window.addEventListener('improvementCreated', handleWorkOrderChange);
        window.addEventListener('improvementUpdated', handleWorkOrderChange);
        window.addEventListener('improvementDeleted', handleWorkOrderChange);
        window.addEventListener('surveillanceItemCreated', handleSurveillanceChange);
        window.addEventListener('surveillanceItemUpdated', handleSurveillanceChange);
        window.addEventListener('surveillanceItemDeleted', handleSurveillanceChange);
        window.addEventListener('inventoryItemCreated', handleInventoryChange);
        window.addEventListener('inventoryItemUpdated', handleInventoryChange);
        window.addEventListener('inventoryItemDeleted', handleInventoryChange);
        
        return () => {
          clearInterval(intervalId);
          window.removeEventListener('workOrderCreated', handleWorkOrderChange);
          window.removeEventListener('workOrderUpdated', handleWorkOrderChange);
          window.removeEventListener('workOrderDeleted', handleWorkOrderChange);
          window.removeEventListener('improvementCreated', handleWorkOrderChange);
          window.removeEventListener('improvementUpdated', handleWorkOrderChange);
          window.removeEventListener('improvementDeleted', handleWorkOrderChange);
          window.removeEventListener('surveillanceItemCreated', handleSurveillanceChange);
          window.removeEventListener('surveillanceItemUpdated', handleSurveillanceChange);
          window.removeEventListener('surveillanceItemDeleted', handleSurveillanceChange);
          window.removeEventListener('inventoryItemCreated', handleInventoryChange);
          window.removeEventListener('inventoryItemUpdated', handleInventoryChange);
          window.removeEventListener('inventoryItemDeleted', handleInventoryChange);
        };
      } catch (error) {
        console.error('Erreur lors du parsing des infos utilisateur:', error);
      }
    }
  }, []);

  // Fermer le menu des échéances quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overdueMenuOpen && !event.target.closest('.relative')) {
        setOverdueMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [overdueMenuOpen]);

  const loadWorkOrdersCount = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/work-orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const assignedOrders = data.filter(order => {
          const isAssigned = order.assigne_a_id === userId || 
                           (order.assigneA && order.assigneA.id === userId);
          const isOpen = order.statut === 'OUVERT';
          return isAssigned && isOpen;
        });
        setWorkOrdersCount(assignedOrders.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ordres de travail:', error);
    }
  };

  const loadOverdueCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const userInfo = localStorage.getItem('user');
      const permissions = userInfo ? JSON.parse(userInfo).permissions : {};
      
      const canViewModule = (module) => {
        return permissions[module]?.view === true;
      };
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      let total = 0;
      let executionCount = 0;
      let requestsCount = 0;
      let maintenanceCount = 0;
      const details = {};
      
      // 1. Ordres de travail en retard (ORANGE)
      if (canViewModule('workOrders')) {
        try {
          const woResponse = await fetch(`${backend_url}/api/work-orders`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (woResponse.ok) {
            const workOrders = await woResponse.json();
            const overdueWO = workOrders.filter(wo => {
              if (!wo.dateLimite || wo.statut === 'TERMINE' || wo.statut === 'ANNULE') return false;
              const dueDate = new Date(wo.dateLimite);
              return dueDate < today;
            });
            if (overdueWO.length > 0) {
              details.workOrders = {
                count: overdueWO.length,
                label: 'Ordres de travail',
                route: '/work-orders',
                category: 'execution'
              };
              executionCount += overdueWO.length;
              total += overdueWO.length;
            }
          }
        } catch (err) {
          console.error('Erreur work orders:', err);
        }
      }
      
      // 2. Améliorations en retard (ORANGE)
      if (canViewModule('improvements')) {
        try {
          const impResponse = await fetch(`${backend_url}/api/improvements`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (impResponse.ok) {
            const improvements = await impResponse.json();
            const overdueImp = improvements.filter(imp => {
              if (!imp.dateLimite || imp.statut === 'TERMINE' || imp.statut === 'ANNULE') return false;
              const dueDate = new Date(imp.dateLimite);
              return dueDate < today;
            });
            if (overdueImp.length > 0) {
              details.improvements = {
                count: overdueImp.length,
                label: 'Améliorations',
                route: '/improvements',
                category: 'execution'
              };
              executionCount += overdueImp.length;
              total += overdueImp.length;
            }
          }
        } catch (err) {
          console.error('Erreur improvements:', err);
        }
      }
      
      // 3. Demandes d'intervention en retard (JAUNE)
      if (canViewModule('interventionRequests')) {
        try {
          const irResponse = await fetch(`${backend_url}/api/intervention-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (irResponse.ok) {
            const interventionRequests = await irResponse.json();
            const overdueIR = interventionRequests.filter(ir => {
              if (!ir.date_limite_desiree || ir.statut === 'TERMINE' || ir.statut === 'ANNULE') return false;
              const dueDate = new Date(ir.date_limite_desiree);
              return dueDate < today;
            });
            if (overdueIR.length > 0) {
              details.interventionRequests = {
                count: overdueIR.length,
                label: "Demandes d'intervention",
                route: '/intervention-requests',
                category: 'requests'
              };
              requestsCount += overdueIR.length;
              total += overdueIR.length;
            }
          }
        } catch (err) {
          console.error('Erreur intervention requests:', err);
        }
      }
      
      // 4. Demandes d'amélioration en retard (JAUNE)
      if (canViewModule('improvementRequests')) {
        try {
          const imprResponse = await fetch(`${backend_url}/api/improvement-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (imprResponse.ok) {
            const improvementRequests = await imprResponse.json();
            const overdueIMPR = improvementRequests.filter(impr => {
              if (!impr.date_limite_desiree || impr.statut === 'TERMINE' || impr.statut === 'ANNULE') return false;
              const dueDate = new Date(impr.date_limite_desiree);
              return dueDate < today;
            });
            if (overdueIMPR.length > 0) {
              details.improvementRequests = {
                count: overdueIMPR.length,
                label: "Demandes d'amélioration",
                route: '/improvement-requests',
                category: 'requests'
              };
              requestsCount += overdueIMPR.length;
              total += overdueIMPR.length;
            }
          }
        } catch (err) {
          console.error('Erreur improvement requests:', err);
        }
      }
      
      // 5. Maintenances préventives (BLEU)
      if (canViewModule('preventiveMaintenance')) {
        try {
          const pmResponse = await fetch(`${backend_url}/api/preventive-maintenance`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (pmResponse.ok) {
            const pms = await pmResponse.json();
            const overduePM = pms.filter(pm => {
              if (!pm.prochaineMaintenance || pm.statut !== 'ACTIF') return false;
              const nextDate = new Date(pm.prochaineMaintenance);
              return nextDate < today;
            });
            if (overduePM.length > 0) {
              details.preventiveMaintenance = {
                count: overduePM.length,
                label: 'Maintenances préventives',
                route: '/preventive-maintenance',
                category: 'maintenance'
              };
              maintenanceCount += overduePM.length;
              total += overduePM.length;
            }
          }
        } catch (err) {
          console.error('Erreur preventive maintenance:', err);
        }
      }
      
      setOverdueCount(total);
      setOverdueExecutionCount(executionCount);
      setOverdueRequestsCount(requestsCount);
      setOverdueMaintenanceCount(maintenanceCount);
      setOverdueDetails(details);
    } catch (error) {
      console.error('Erreur lors du chargement des échéances:', error);
    }
  };

  const loadSurveillanceBadgeStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/surveillance/badge-stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSurveillanceBadge(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats de surveillance:', error);
    }
  };

  const loadInventoryStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/inventory/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventoryStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats inventaire:', error);
    }
  };

  const loadChatUnreadCount = async () => {
    if (!canView('chatLive')) return;
    
    if (location.pathname === '/chat-live') {
      setChatUnreadCount(0);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/chat/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de messages non lus:', error);
    }
  };

  useEffect(() => {
    loadChatUnreadCount();
    const interval = setInterval(loadChatUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [canView, location.pathname]);

  // Toggle expansion d'une catégorie
  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Récupérer les catégories depuis les préférences
  const menuCategories = preferences?.menu_categories || [];

  // Liste par défaut des menus
  const defaultMenuItems = [
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Tableau de bord', path: '/dashboard', module: 'dashboard', visible: true, order: 0 },
    { id: 'service-dashboard', icon: 'Presentation', label: 'Dashboard Service', path: '/service-dashboard', module: 'serviceDashboard', visible: true, order: 0.3 },
    { id: 'chat-live', icon: 'Mail', label: 'Chat Live', path: '/chat-live', module: 'chatLive', visible: true, order: 0.5 },
    { id: 'intervention-requests', icon: 'MessageSquare', label: 'Demandes d\'inter.', path: '/intervention-requests', module: 'interventionRequests', visible: true, order: 1 },
    { id: 'work-orders', icon: 'ClipboardList', label: 'Ordres de travail', path: '/work-orders', module: 'workOrders', visible: true, order: 2 },
    { id: 'improvement-requests', icon: 'Lightbulb', label: 'Demandes d\'amél.', path: '/improvement-requests', module: 'improvementRequests', visible: true, order: 3 },
    { id: 'improvements', icon: 'Sparkles', label: 'Améliorations', path: '/improvements', module: 'improvements', visible: true, order: 4 },
    { id: 'preventive-maintenance', icon: 'Calendar', label: 'Maintenance prev.', path: '/preventive-maintenance', module: 'preventiveMaintenance', visible: true, order: 5 },
    { id: 'planning-mprev', icon: 'Calendar', label: 'Planning M.Prev.', path: '/planning-mprev', module: 'planningMprev', visible: true, order: 6 },
    { id: 'assets', icon: 'Wrench', label: 'Équipements', path: '/assets', module: 'assets', visible: true, order: 7 },
    { id: 'inventory', icon: 'Package', label: 'Inventaire', path: '/inventory', module: 'inventory', visible: true, order: 8 },
    { id: 'purchase-requests', icon: 'ShoppingCart', label: 'Demandes d\'Achat', path: '/purchase-requests', module: 'purchaseRequests', visible: true, order: 8.5 },
    { id: 'locations', icon: 'MapPin', label: 'Zones', path: '/locations', module: 'locations', visible: true, order: 9 },
    { id: 'meters', icon: 'Gauge', label: 'Compteurs', path: '/meters', module: 'meters', visible: true, order: 10 },
    { id: 'sensors', icon: 'Activity', label: 'Capteurs MQTT', path: '/sensors', module: 'sensors', visible: isAdmin(), order: 11 },
    { id: 'iot-dashboard', icon: 'BarChart3', label: 'Dashboard IoT', path: '/iot-dashboard', module: 'sensors', visible: isAdmin(), order: 12 },
    { id: 'mqtt-logs', icon: 'Terminal', label: 'Logs MQTT', path: '/mqtt-logs', module: 'sensors', visible: isAdmin(), order: 13 },
    { id: 'surveillance-plan', icon: 'Eye', label: 'Plan de Surveillance', path: '/surveillance-plan', module: 'surveillance', visible: true, order: 11 },
    { id: 'surveillance-rapport', icon: 'FileText', label: 'Rapport Surveillance', path: '/surveillance-rapport', module: 'surveillanceRapport', visible: true, order: 12 },
    { id: 'weekly-reports', icon: 'FileText', label: 'Rapports Hebdo.', path: '/weekly-reports', module: 'reports', visible: true, order: 12.5 },
    { id: 'presqu-accident', icon: 'AlertTriangle', label: 'Presqu\'accident', path: '/presqu-accident', module: 'presquaccident', visible: true, order: 13 },
    { id: 'presqu-accident-rapport', icon: 'FileText', label: 'Rapport P.accident', path: '/presqu-accident-rapport', module: 'presquaccidentRapport', visible: true, order: 14 },
    { id: 'documentations', icon: 'FolderOpen', label: 'Documentations', path: '/documentations', module: 'documentations', visible: true, order: 15 },
    { id: 'reports', icon: 'BarChart3', label: 'Rapports', path: '/reports', module: 'reports', visible: true, order: 16 },
    { id: 'team-management', icon: 'UserCog', label: 'Gestion d\'équipe', path: '/team-management', module: 'timeTracking', visible: true, order: 16.5 },
    { id: 'people', icon: 'Users', label: 'Utilisateurs', path: '/people', module: 'people', visible: true, order: 17 },
    { id: 'planning', icon: 'Calendar', label: 'Planning', path: '/planning', module: 'planning', visible: true, order: 18 },
    { id: 'vendors', icon: 'ShoppingCart', label: 'Fournisseurs', path: '/vendors', module: 'vendors', visible: true, order: 19 },
    { id: 'purchase-history', icon: 'ShoppingBag', label: 'Historique Achat', path: '/purchase-history', module: 'purchaseHistory', visible: true, order: 20 },
    { id: 'import-export', icon: 'Database', label: 'Import / Export', path: '/import-export', module: 'importExport', visible: true, order: 21 },
    { id: 'whiteboard', icon: 'PresentationIcon', label: 'Tableau d\'affichage', path: '/whiteboard', module: 'whiteboard', visible: true, order: 22 }
  ];

  // Utiliser les préférences ou la liste par défaut
  const userMenuItems = preferences?.menu_items && preferences.menu_items.length > 0 
    ? preferences.menu_items 
    : defaultMenuItems;

  // Trier par ordre et filtrer par visibilité et permissions
  const menuItems = userMenuItems
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .filter(item => {
      if (item.visible === false) return false;
      if (item.module && !canView(item.module)) return false;
      return true;
    })
    .map(item => ({
      ...item,
      icon: iconMap[item.icon] || LayoutDashboard,
      label: item.label ? item.label.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() : item.label
    }));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper pour obtenir les styles de boutons sidebar
  const getSidebarButtonStyle = (isActive = false) => ({
    backgroundColor: isActive ? (preferences?.primary_color || '#2563eb') : 'transparent',
    color: preferences?.sidebar_icon_color || '#ffffff'
  });

  const handleSidebarButtonHover = (e, isActive) => {
    if (!isActive) {
      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
    }
  };

  const handleSidebarButtonLeave = (e, isActive) => {
    if (!isActive) {
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
        isAdmin={isAdmin()}
        workOrdersCount={workOrdersCount}
        chatUnreadCount={chatUnreadCount}
        canViewChatLive={canView('chatLive')}
        overdueCount={overdueCount}
        overdueDetails={overdueDetails}
        overdueExecutionCount={overdueExecutionCount}
        overdueRequestsCount={overdueRequestsCount}
        overdueMaintenanceCount={overdueMaintenanceCount}
        overdueMenuOpen={overdueMenuOpen}
        setOverdueMenuOpen={setOverdueMenuOpen}
        surveillanceBadge={surveillanceBadge}
        inventoryStats={inventoryStats}
      />

      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        menuItems={menuItems}
        menuCategories={menuCategories}
        expandedCategories={expandedCategories}
        toggleCategoryExpansion={toggleCategoryExpansion}
        user={user}
        onLogout={handleLogout}
        preferences={preferences}
        getSidebarButtonStyle={getSidebarButtonStyle}
        handleSidebarButtonHover={handleSidebarButtonHover}
        handleSidebarButtonLeave={handleSidebarButtonLeave}
      />

      {/* Main Content */}
      <div
        className="transition-all duration-300"
        style={{
          marginLeft: preferences?.sidebar_position === 'right' ? 0 : (sidebarOpen ? `${preferences?.sidebar_width || 256}px` : '80px'),
          marginRight: preferences?.sidebar_position === 'right' ? (sidebarOpen ? `${preferences?.sidebar_width || 256}px` : '80px') : 0
        }}
      >
        <div className="p-6 pt-20">
          <Outlet />
        </div>
      </div>
      
      {/* Popups et modaux */}
      <FirstLoginPasswordDialog 
        open={firstLoginDialogOpen}
        onOpenChange={setFirstLoginDialogOpen}
        userId={user.id}
        onSuccess={() => {
          setUser(prev => ({ ...prev, firstLogin: false }));
          setFirstLoginDialogOpen(false);
        }}
      />
      
      <RecentUpdatePopup />
      <TokenValidator />
      <InactivityHandler />
      <ContextualHelpButton />
      <ConsignePopup />
    </div>
    </TooltipProvider>
  );
};

export default MainLayout;
