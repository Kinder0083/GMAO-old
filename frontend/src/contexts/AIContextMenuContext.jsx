import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { usePreferences } from './PreferencesContext';
import AIChatWidget from '../components/Common/AIChatWidget';

const AIContextMenuContext = createContext(null);

export const useAIContextMenu = () => {
  const context = useContext(AIContextMenuContext);
  if (!context) {
    throw new Error('useAIContextMenu must be used within AIContextMenuProvider');
  }
  return context;
};

export const AIContextMenuProvider = ({ children }) => {
  const { preferences } = usePreferences();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedContext, setSelectedContext] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const aiName = preferences?.ai_assistant_name || 'Adria';

  // Gestionnaire de clic droit
  const handleContextMenu = useCallback((e) => {
    // Ignorer si c'est sur un input, textarea ou élément éditable
    const target = e.target;
    const isEditable = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable ||
                       target.closest('input, textarea, [contenteditable="true"]');
    
    if (isEditable) return;

    e.preventDefault();
    
    // Récupérer le contexte de l'élément cliqué
    const contextElement = target.closest('[data-ai-context]');
    const contextInfo = contextElement?.dataset?.aiContext || null;
    
    // Récupérer des informations supplémentaires sur l'élément
    let elementInfo = '';
    
    // Vérifier si c'est un élément de liste (tableau, carte, etc.)
    const row = target.closest('tr, [data-row], .card, [data-item]');
    if (row) {
      const itemName = row.querySelector('[data-name], .item-name, h3, h4, .title')?.textContent;
      const itemId = row.dataset?.id || row.dataset?.itemId;
      if (itemName) {
        elementInfo = `Élément: ${itemName}`;
        if (itemId) elementInfo += ` (ID: ${itemId})`;
      }
    }
    
    // Récupérer le titre de la page ou section
    const pageTitle = document.querySelector('h1, .page-title')?.textContent;
    const sectionTitle = target.closest('section, .section, [data-section]')?.querySelector('h2, h3, .section-title')?.textContent;
    
    let fullContext = `Page: ${window.location.pathname}`;
    if (pageTitle) fullContext += ` - ${pageTitle}`;
    if (sectionTitle) fullContext += ` | Section: ${sectionTitle}`;
    if (elementInfo) fullContext += ` | ${elementInfo}`;
    if (contextInfo) fullContext += ` | ${contextInfo}`;
    
    setSelectedContext(fullContext);
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuVisible(true);
  }, []);

  // Fermer le menu au clic ailleurs
  useEffect(() => {
    const handleClick = () => setMenuVisible(false);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuVisible(false);
    };
    
    if (menuVisible) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuVisible]);

  // Attacher le gestionnaire de clic droit au document
  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [handleContextMenu]);

  const openChatWithContext = () => {
    setMenuVisible(false);
    setChatOpen(true);
  };

  const openChat = (context = null) => {
    if (context) setSelectedContext(context);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setSelectedContext(null);
  };

  return (
    <AIContextMenuContext.Provider value={{ openChat, closeChat, chatOpen }}>
      {children}
      
      {/* Menu contextuel */}
      {menuVisible && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
          style={{
            left: Math.min(menuPosition.x, window.innerWidth - 220),
            top: Math.min(menuPosition.y, window.innerHeight - 100)
          }}
        >
          <button
            onClick={openChatWithContext}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-purple-50 transition-colors"
          >
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Discuter avec {aiName}</p>
              <p className="text-xs text-gray-500">Poser une question sur cet élément</p>
            </div>
          </button>
        </div>
      )}

      {/* Widget de chat */}
      <AIChatWidget 
        isOpen={chatOpen} 
        onClose={closeChat}
        initialContext={selectedContext}
      />
    </AIContextMenuContext.Provider>
  );
};

export default AIContextMenuProvider;
