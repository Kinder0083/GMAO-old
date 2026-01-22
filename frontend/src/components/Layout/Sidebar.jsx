/**
 * Composant Sidebar pour la navigation principale
 * Extrait de MainLayout.jsx pour une meilleure modularité
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  iconMap, 
  getIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  LogOut, 
  Settings 
} from './menuConfig';

const Sidebar = ({
  isOpen,
  onToggle,
  menuItems,
  menuCategories,
  user,
  overdueDetails,
  overdueExecutionCount,
  overdueRequestsCount,
  overdueMaintenanceCount,
  surveillanceBadge,
  inventoryStats,
  chatUnreadCount,
  onLogout,
  preferences
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [overdueMenuOpen, setOverdueMenuOpen] = useState(false);
  const overdueMenuRef = useRef(null);

  // Fermer le menu échéances si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overdueMenuRef.current && !overdueMenuRef.current.contains(event.target)) {
        setOverdueMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Grouper les items par catégorie
  const getItemsForCategory = (categoryId) => {
    const category = menuCategories?.find(c => c.id === categoryId);
    if (!category?.items) return [];
    return menuItems.filter(item => category.items.includes(item.id));
  };

  // Items non catégorisés
  const uncategorizedItems = menuCategories?.length > 0
    ? menuItems.filter(item => !menuCategories.some(cat => cat.items?.includes(item.id)))
    : menuItems;

  // Calculer le total des échéances
  const totalOverdue = overdueExecutionCount + overdueRequestsCount + overdueMaintenanceCount;

  // Rendu d'un item de menu
  const renderMenuItem = (item) => {
    const IconComponent = getIcon(item.icon);
    const isActive = location.pathname === item.path;
    
    // Badges spéciaux par module
    let badge = null;
    if (item.id === 'chat-live' && chatUnreadCount > 0) {
      badge = (
        <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
        </span>
      );
    } else if (item.id === 'surveillance-plan' && surveillanceBadge?.echeances_proches > 0) {
      badge = (
        <span className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
          {surveillanceBadge.echeances_proches}
        </span>
      );
    } else if (item.id === 'inventory' && (inventoryStats?.rupture > 0 || inventoryStats?.niveau_bas > 0)) {
      const total = (inventoryStats?.rupture || 0) + (inventoryStats?.niveau_bas || 0);
      badge = (
        <span className={`ml-auto text-white text-xs px-1.5 py-0.5 rounded-full ${inventoryStats?.rupture > 0 ? 'bg-red-500' : 'bg-yellow-500'}`}>
          {total}
        </span>
      );
    }

    // Version condensée (sidebar fermée)
    if (!isOpen) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(item.path)}
                className={`w-full p-3 rounded-lg transition-colors flex items-center justify-center relative ${
                  isActive
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <IconComponent size={20} />
                {badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Version étendue (sidebar ouverte)
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.path)}
        className={`w-full px-4 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
          isActive
            ? 'bg-purple-100 text-purple-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <IconComponent size={18} />
        <span className="flex-1 text-left text-sm">{item.label}</span>
        {badge}
      </button>
    );
  };

  // Rendu d'une catégorie
  const renderCategory = (category) => {
    const categoryItems = getItemsForCategory(category.id);
    if (categoryItems.length === 0) return null;
    
    const isExpanded = expandedCategories[category.id] !== false; // Par défaut ouvert
    const CategoryIcon = category.icon ? getIcon(category.icon) : null;

    if (!isOpen) {
      // Version condensée - juste les icônes des items
      return (
        <div key={category.id} className="space-y-1">
          {categoryItems.map(renderMenuItem)}
        </div>
      );
    }

    return (
      <div key={category.id} className="space-y-1">
        <button
          onClick={() => toggleCategoryExpansion(category.id)}
          className="w-full px-4 py-2 flex items-center justify-between text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            {CategoryIcon && <CategoryIcon size={16} />}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {category.name}
            </span>
          </div>
          <ChevronDown 
            size={16} 
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        {isExpanded && (
          <div className="space-y-0.5 pl-2">
            {categoryItems.map(renderMenuItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header avec logo */}
      <div className={`p-4 border-b border-gray-200 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <div className="flex items-center gap-2">
            <img src="/logo-iris.png" alt="IRIS" className="h-8 w-8" />
            <span className="font-bold text-xl text-purple-700">IRIS</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          title={isOpen ? 'Réduire' : 'Étendre'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Indicateur échéances dépassées */}
      {totalOverdue > 0 && (
        <div className="px-3 py-2 border-b border-gray-200" ref={overdueMenuRef}>
          <button
            onClick={() => setOverdueMenuOpen(!overdueMenuOpen)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors ${
              !isOpen ? 'justify-center' : ''
            }`}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            {isOpen && (
              <>
                <span className="text-sm font-medium text-red-700">
                  {totalOverdue} échéance{totalOverdue > 1 ? 's' : ''} dépassée{totalOverdue > 1 ? 's' : ''}
                </span>
                <ChevronDown size={14} className={`ml-auto text-red-500 transition-transform ${overdueMenuOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          
          {/* Menu déroulant des échéances */}
          {overdueMenuOpen && isOpen && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {Object.entries(overdueDetails).map(([key, detail]) => (
                <button
                  key={key}
                  onClick={() => {
                    navigate(detail.route);
                    setOverdueMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-left"
                >
                  <span className="text-sm text-gray-700">{detail.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                    detail.category === 'execution' ? 'bg-orange-500' :
                    detail.category === 'requests' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {detail.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Catégories */}
        {menuCategories?.length > 0 && menuCategories.map(renderCategory)}
        
        {/* Items non catégorisés */}
        {uncategorizedItems.length > 0 && (
          <div className="space-y-0.5">
            {uncategorizedItems.map(renderMenuItem)}
          </div>
        )}
      </nav>

      {/* Footer avec utilisateur et déconnexion */}
      <div className="p-3 border-t border-gray-200">
        {isOpen ? (
          <div className="space-y-2">
            <div className="px-3 py-2 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.prenom} {user.nom}
              </p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="w-full px-3 py-2 flex items-center gap-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings size={18} />
              <span className="text-sm">Paramètres</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full px-3 py-2 flex items-center gap-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm">Déconnexion</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full p-3 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Settings size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Paramètres</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onLogout}
                    className="w-full p-3 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Déconnexion</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
