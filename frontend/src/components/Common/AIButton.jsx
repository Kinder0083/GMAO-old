import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Bot } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';
import AIChatWidget from './AIChatWidget';

const AIButton = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const { preferences } = usePreferences();
  
  const aiName = preferences?.ai_assistant_name || 'Adria';

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setChatOpen(true)}
        className="gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
        title={`Discuter avec ${aiName}`}
      >
        <Bot size={18} />
        <span className="hidden md:inline">{aiName}</span>
      </Button>

      {/* Widget de chat */}
      <AIChatWidget 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)} 
      />
    </>
  );
};

export default AIButton;
