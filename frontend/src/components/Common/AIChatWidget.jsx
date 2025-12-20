import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api';

const AIChatWidget = ({ isOpen, onClose, initialContext = null }) => {
  const { preferences } = usePreferences();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [minimized, setMinimized] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const aiName = preferences?.ai_assistant_name || 'Adria';
  const aiGender = preferences?.ai_assistant_gender || 'female';

  // Scroll vers le bas automatiquement
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    if (isOpen && inputRef.current && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, minimized]);

  // Message de bienvenue
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = aiGender === 'female' 
        ? `Bonjour ! Je suis ${aiName}, votre assistante GMAO. Comment puis-je vous aider aujourd'hui ?`
        : `Bonjour ! Je suis ${aiName}, votre assistant GMAO. Comment puis-je vous aider aujourd'hui ?`;
      
      setMessages([{
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, aiName, aiGender]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Construire le contexte
      const context = initialContext || `Page actuelle: ${window.location.pathname}`;
      
      const response = await api.ai.chat({
        message: userMessage.content,
        session_id: sessionId,
        context: context
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSessionId(response.data.session_id);
      
    } catch (error) {
      console.error('Erreur chat IA:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: `Désolé, je rencontre des difficultés techniques. ${error.response?.data?.detail || 'Veuillez réessayer.'}`,
        timestamp: new Date().toISOString(),
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Erreur',
        description: 'Impossible de contacter l\'assistant IA',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    try {
      await api.ai.clearHistory(sessionId);
      setMessages([]);
      setSessionId(null);
      toast({
        title: 'Historique effacé',
        description: 'La conversation a été réinitialisée'
      });
    } catch (error) {
      console.error('Erreur suppression historique:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        minimized ? 'w-64' : 'w-96'
      }`}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
           style={{ maxHeight: minimized ? '48px' : '500px' }}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{aiName}</h3>
              {!minimized && (
                <p className="text-xs text-purple-200">
                  {aiGender === 'female' ? 'Assistante' : 'Assistant'} GMAO
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title={minimized ? 'Agrandir' : 'Réduire'}
            >
              {minimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Corps du chat */}
        {!minimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" style={{ maxHeight: '350px' }}>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-purple-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.error
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-white text-gray-800 border border-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Indicateur de chargement */}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">{aiName} réfléchit...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Posez votre question à ${aiName}...`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  rows={1}
                  disabled={loading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="bg-purple-600 hover:bg-purple-700 px-3"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIChatWidget;
