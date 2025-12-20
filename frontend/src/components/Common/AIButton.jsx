import React from 'react';
import { Button } from '../ui/button';
import { Bot } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useAIContextMenu } from '../../contexts/AIContextMenuContext';

const AIButton = () => {
  const { preferences } = usePreferences();
  const { openChat, chatOpen } = useAIContextMenu();
  
  const aiName = preferences?.ai_assistant_name || 'Adria';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openChat()}
      className={`gap-2 ${chatOpen ? 'bg-purple-100 border-purple-300' : 'bg-purple-50 hover:bg-purple-100'} text-purple-700 border-purple-200`}
      title={`Discuter avec ${aiName}`}
    >
      <Bot size={18} />
      <span className="hidden md:inline">{aiName}</span>
    </Button>
  );
};

export default AIButton;
