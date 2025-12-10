import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Camera, Users, X, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const ChatLive = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connexion WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Construire l'URL WebSocket depuis REACT_APP_BACKEND_URL
    const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || window.location.origin;
    
    // Remplacer http(s):// par ws(s)://
    let wsUrl = backendUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    
    // Ajouter le chemin WebSocket
    wsUrl = `${wsUrl}/api/chat/ws/${token}`;
    
    console.log('🔌 Tentative connexion WebSocket:', wsUrl);
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('✅ WebSocket connecté');
      setIsConnected(true);
      setWs(websocket);
      
      // Heartbeat toutes les 30 secondes
      const heartbeatInterval = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, 30000);

      websocket.heartbeatInterval = heartbeatInterval;
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'message_deleted') {
        setMessages(prev => prev.map(msg => 
          msg.id === data.message_id 
            ? { ...msg, is_deleted: true, message: 'Ce message a été supprimé' }
            : msg
        ));
      } else if (data.type === 'user_status') {
        loadOnlineUsers();
      } else if (data.type === 'reaction_update') {
        // TODO: Gérer les réactions (Phase 5-6)
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
      console.error('URL tentée:', wsUrl);
      setIsConnected(false);
      toast({
        title: 'Erreur de connexion',
        description: 'Impossible de se connecter au chat en temps réel. Utilisation du mode REST.',
        variant: 'destructive'
      });
    };

    websocket.onclose = (event) => {
      console.log('🔌 WebSocket déconnecté', event.code, event.reason);
      setIsConnected(false);
      if (websocket.heartbeatInterval) {
        clearInterval(websocket.heartbeatInterval);
      }
    };

    return () => {
      if (websocket.heartbeatInterval) {
        clearInterval(websocket.heartbeatInterval);
      }
      websocket.close();
    };
  }, []);

  // Charger les messages au démarrage
  useEffect(() => {
    loadMessages();
    loadOnlineUsers();
    
    // Marquer comme lu
    api.chat.markAsRead().catch(console.error);
  }, []);

  const loadMessages = async () => {
    try {
      const response = await api.chat.getMessages();
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les messages',
        variant: 'destructive'
      });
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await api.chat.getOnlineUsers();
      setOnlineUsers(response.data.online_users || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      message: newMessage.trim(),
      recipient_ids: selectedRecipients.map(r => r.id),
      reply_to_id: null
    };

    // Si WebSocket connecté, l'utiliser
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        ...messageData
      }));
      setNewMessage('');
      setSelectedRecipients([]);
    } else {
      // Sinon, fallback sur l'API REST
      try {
        const response = await api.chat.createMessage(messageData);
        setMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
        setSelectedRecipients([]);
        
        toast({
          title: 'Message envoyé',
          description: 'Mode REST activé (reconnexion en cours...)'
        });
      } catch (error) {
        console.error('Erreur envoi message:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'envoyer le message',
          variant: 'destructive'
        });
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecipient = (user) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.id === user.id);
      if (exists) {
        return prev.filter(r => r.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const isMessageUnread = (message) => {
    // TODO: Implémenter la logique de message non lu (Phase 8)
    return false;
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Zone principale du chat */}
      <Card className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">💬 Chat Live</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUserSelector(!showUserSelector)}
          >
            <Users className="mr-2 h-4 w-4" />
            Message privé
          </Button>
        </div>

        {/* Sélection destinataires (messages privés) */}
        {selectedRecipients.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-2 flex-wrap">
            <Lock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">À:</span>
            {selectedRecipients.map(recipient => (
              <Badge key={recipient.id} variant="secondary" className="gap-1">
                {recipient.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleRecipient(recipient)}
                />
              </Badge>
            ))}
          </div>
        )}

        {/* Zone des messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.user_id === userId;
            const isPrivate = message.is_private;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Indicateur message privé */}
                  {isPrivate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Lock className="h-3 w-3" />
                      <span>
                        {isOwnMessage 
                          ? `À: ${message.recipient_names.join(', ')}`
                          : 'Message privé'
                        }
                      </span>
                    </div>
                  )}
                  
                  <div
                    className={`rounded-lg p-3 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : isPrivate
                        ? 'bg-gray-100 border border-gray-300'
                        : isMessageUnread(message)
                        ? 'bg-blue-50 border border-blue-200 font-semibold'
                        : 'bg-gray-100'
                    }`}
                  >
                    {/* Auteur */}
                    {!isOwnMessage && (
                      <div className="font-semibold text-sm mb-1">
                        {message.user_name}:
                      </div>
                    )}
                    
                    {/* Message */}
                    <div className="break-words whitespace-pre-wrap">
                      {message.message}
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie */}
        <div className="p-4 border-t">
          <div className="flex items-end gap-2">
            <Button variant="outline" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Camera className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Écrivez votre message..."
                className="resize-none"
              />
            </div>
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Sidebar utilisateurs en ligne */}
      <Card className="w-80 p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Utilisateurs en ligne ({onlineUsers.length})
        </h3>
        
        {showUserSelector && (
          <p className="text-sm text-gray-600 mb-2">
            Sélectionnez des utilisateurs pour un message privé:
          </p>
        )}
        
        <div className="space-y-2">
          {onlineUsers.map(onlineUser => {
            const isSelected = selectedRecipients.find(r => r.id === onlineUser.id);
            const isSelf = onlineUser.id === userId;
            
            return (
              <div
                key={onlineUser.id}
                className={`p-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                  isSelf
                    ? 'bg-blue-50 border border-blue-200'
                    : isSelected
                    ? 'bg-green-50 border border-green-300'
                    : showUserSelector
                    ? 'hover:bg-gray-100 border border-transparent'
                    : 'border border-transparent'
                }`}
                onClick={() => !isSelf && showUserSelector && toggleRecipient(onlineUser)}
              >
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {onlineUser.name} {isSelf && '(Vous)'}
                  </div>
                  <div className="text-xs text-gray-500">{onlineUser.role}</div>
                </div>
                {isSelected && (
                  <Badge variant="secondary" className="text-xs">
                    Sélectionné
                  </Badge>
                )}
              </div>
            );
          })}
          
          {onlineUsers.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucun utilisateur en ligne
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChatLive;
