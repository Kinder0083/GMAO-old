/**
 * Composant Sidebar pour la navigation principale
 * Extrait de MainLayout.jsx pour une meilleure modularité
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  Settings,
  Shield,
  Radio,
  RefreshCw,
  FileText,
  Terminal,
  Palette,
  Folder
} from 'lucide-react';
import { iconMap } from './menuConfig';
import api from '../../services/api';

const Sidebar = ({
  sidebarOpen,
  menuItems,
  menuCategories,
  expandedCategories,
  toggleCategoryExpansion,
  user,
  onLogout,
  preferences,
  getSidebarButtonStyle,
  handleSidebarButtonHover,
  handleSidebarButtonLeave
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newMenuIds, setNewMenuIds] = useState([]);

  // Charger les badges "Nouveau"
  useEffect(() => {
    const loadBadges = async () => {
      try {
        const response = await api.get('/menu-badges');
        setNewMenuIds(response.data.new_menu_ids || []);
      } catch (e) {
        // Silently fail
      }
    };
    loadBadges();
  }, []);

  // Dismiss badge quand on clique sur un menu "Nouveau"
  const handleMenuClick = (item) => {
    if (newMenuIds.includes(item.id)) {
      setNewMenuIds(prev => prev.filter(id => id !== item.id));
      if (newMenuIds.length <= 1) {
        api.post('/menu-badges/dismiss').catch(() => {});
      }
    }
    navigate(item.path);
  };

  // Grouper les menus par catégorie
  const getMenusByCategory = (categoryId) => {
    return menuItems.filter(item => item.category_id === categoryId);
  };

  // Menus sans catégorie
  const uncategorizedMenus = menuItems.filter(item => !item.category_id);

  // Vérifier si une catégorie contient le menu actif
  const categoryHasActiveMenu = (categoryId) => {
    return menuItems.some(item => item.category_id === categoryId && location.pathname === item.path);
  };

  return (
    <div
      id="main-sidebar"
      data-testid="sidebar-nav"
      className="fixed top-16 bottom-0 text-white transition-all duration-300 z-20"
      style={{
        backgroundColor: preferences?.sidebar_bg_color || '#1f2937',
        width: sidebarOpen ? `${preferences?.sidebar_width || 256}px` : '80px',
        left: preferences?.sidebar_position === 'right' ? 'auto' : 0,
        right: preferences?.sidebar_position === 'right' ? 0 : 'auto'
      }}
    >
      <div className="p-4 space-y-1 h-full overflow-y-auto">
        {/* Rendu des catégories avec sous-menus */}
        {menuCategories
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(category => {
            const categoryMenus = getMenusByCategory(category.id);
            if (categoryMenus.length === 0) return null;
            
            const CategoryIcon = iconMap[category.icon] || Folder;
            const isExpanded = expandedCategories[category.id] !== false;
            const hasActiveMenu = categoryHasActiveMenu(category.id);

            return (
              <div key={category.id} className="mb-1">
                {/* Header de catégorie */}
                <button
                  onClick={() => toggleCategoryExpansion(category.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    !sidebarOpen ? 'justify-center px-2' : ''
                  }`}
                  style={{
                    backgroundColor: hasActiveMenu ? 'rgba(255,255,255,0.05)' : 'transparent',
                    color: preferences?.sidebar_icon_color || '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = hasActiveMenu ? 'rgba(255,255,255,0.05)' : 'transparent';
                  }}
                  title={!sidebarOpen ? category.name : ''}
                >
                  <CategoryIcon size={18} className="flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="text-sm font-semibold flex-1 text-left">{category.name}</span>
                      <ChevronDown 
                        size={16} 
                        className={`flex-shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} 
                      />
                    </>
                  )}
                </button>
                
                {/* Sous-menus de la catégorie */}
                {(isExpanded || !sidebarOpen) && (
                  <div className={sidebarOpen ? 'ml-3 border-l border-white/10 pl-2 space-y-1 mt-1' : 'space-y-1 mt-1'}>
                    {categoryMenus
                      .filter(item => !item.adminOnly || user.role === 'ADMIN')
                      .map((item, index) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <button
                            key={index}
                            onClick={() => navigate(item.path)}
                            data-testid={`sidebar-${item.id}`}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                              !sidebarOpen ? 'justify-center px-2' : ''
                            }`}
                            style={{
                              backgroundColor: isActive ? (preferences?.primary_color || '#2563eb') : 'transparent',
                              color: preferences?.sidebar_icon_color || '#ffffff'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                            title={!sidebarOpen ? item.label : ''}
                          >
                            <Icon size={18} className="flex-shrink-0" />
                            {sidebarOpen && <span className="text-sm">{item.label}</span>}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        
        {/* Menus sans catégorie */}
        {uncategorizedMenus
          .filter(item => !item.adminOnly || user.role === 'ADMIN')
          .map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={`uncategorized-${index}`}
                onClick={() => navigate(item.path)}
                data-testid={`sidebar-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  !sidebarOpen ? 'justify-center px-2' : ''
                }`}
                style={{
                  backgroundColor: isActive ? (preferences?.primary_color || '#2563eb') : 'transparent',
                  color: preferences?.sidebar_icon_color || '#ffffff'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        
        {/* Section paramètres et admin */}
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
            style={getSidebarButtonStyle(location.pathname === '/settings')}
            onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/settings')}
            onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/settings')}
            title={!sidebarOpen ? 'Paramètres' : ''}
          >
            <Settings size={20} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Paramètres</span>}
          </button>
          {user.role === 'ADMIN' && (
            <>
              <button
                onClick={() => navigate('/special-settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                style={getSidebarButtonStyle(location.pathname === '/special-settings')}
                onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/special-settings')}
                onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/special-settings')}
                title={!sidebarOpen ? 'Paramètres Spéciaux' : ''}
              >
                <Shield size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">Paramètres Spéciaux</span>}
              </button>
              <button
                onClick={() => navigate('/mqtt-pubsub')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                style={getSidebarButtonStyle(location.pathname === '/mqtt-pubsub')}
                onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/mqtt-pubsub')}
                onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/mqtt-pubsub')}
                title={!sidebarOpen ? 'P/L MQTT' : ''}
              >
                <Radio size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">P/L MQTT</span>}
              </button>
              <button
                onClick={() => navigate('/updates')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                style={getSidebarButtonStyle(location.pathname === '/updates')}
                onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/updates')}
                onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/updates')}
                title={!sidebarOpen ? 'Mise à jour' : ''}
              >
                <RefreshCw size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">Mise à jour</span>}
              </button>
              <button
                onClick={() => navigate('/journal')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                style={getSidebarButtonStyle(location.pathname === '/journal')}
                onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/journal')}
                onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/journal')}
                title={!sidebarOpen ? 'Journal' : ''}
              >
                <FileText size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">Journal</span>}
              </button>
              <button
                onClick={() => navigate('/ssh')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                style={getSidebarButtonStyle(location.pathname === '/ssh')}
                onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/ssh')}
                onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/ssh')}
                title={!sidebarOpen ? 'SSH' : ''}
              >
                <Terminal size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">SSH</span>}
              </button>
            </>
          )}
          
          {/* Personnalisation */}
          <button
            onClick={() => navigate('/personnalisation')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
            style={getSidebarButtonStyle(location.pathname === '/personnalisation')}
            onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/personnalisation')}
            onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/personnalisation')}
            title={!sidebarOpen ? 'Personnalisation' : ''}
          >
            <Palette size={20} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Personnalisation</span>}
          </button>
          
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
            style={{ backgroundColor: 'transparent', color: preferences?.sidebar_icon_color || '#ffffff' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            title={!sidebarOpen ? 'Déconnexion' : ''}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
