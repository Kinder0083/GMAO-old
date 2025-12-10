import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Camera, Users, X, Lock, Download, FileText, ArrowRightCircle, Mail as MailIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';

const ChatLive = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(null); // { type: 'workorder'|'improvement'|'preventive'|'email', attachment }
  const [transferList, setTransferList] = useState([]);
  const [selectedTransferItem, setSelectedTransferItem] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [selectedEmailUsers, setSelectedEmailUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  
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
      // Note: Le mode REST prendra automatiquement le relais si nécessaire
      // Pas besoin d'afficher un toast d'erreur à l'utilisateur
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
    
    // Polling toutes les 5 secondes si WebSocket déconnecté
    const pollingInterval = setInterval(() => {
      if (!isConnected) {
        loadMessages();
        loadOnlineUsers();
      }
    }, 5000);
    
    return () => clearInterval(pollingInterval);
  }, [isConnected]);

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
        // Ne pas ajouter manuellement - le polling s'en charge
        setNewMessage('');
        setSelectedRecipients([]);
        // Marquer comme lu immédiatement
        await api.chat.markAsRead();
        // Message envoyé avec succès en mode REST, pas besoin de notifier
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

  // Upload de fichiers
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);

    try {
      const formData = new FormData();
      formData.append('message', newMessage.trim() || 'Fichier(s) joint(s)');
      formData.append('recipient_ids', JSON.stringify(selectedRecipients.map(r => r.id)));
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await api.post('/chat/messages-with-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Ne pas ajouter manuellement - le WebSocket/polling s'en charge
      setNewMessage('');
      setSelectedRecipients([]);
      
      // Marquer comme lu immédiatement pour éviter notification de son propre message
      await api.chat.markAsRead();
      
      toast({
        title: 'Fichier(s) envoyé(s)',
        description: `${files.length} fichier(s) partagé(s) avec succès`
      });
    } catch (error) {
      console.error('Erreur upload fichiers:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer les fichiers',
        variant: 'destructive'
      });
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Ouvrir la caméra
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCameraModal(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Erreur accès caméra:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accéder à la caméra',
        variant: 'destructive'
      });
    }
  };

  // Capturer une photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        setCapturedImage(blob);
      }, 'image/jpeg', 0.9);
    }
  };

  // Envoyer la photo capturée
  const sendCapturedPhoto = async () => {
    if (!capturedImage) return;

    setUploadingFiles(true);

    try {
      const formData = new FormData();
      formData.append('message', newMessage.trim() || 'Photo capturée');
      formData.append('recipient_ids', JSON.stringify(selectedRecipients.map(r => r.id)));
      formData.append('files', capturedImage, `photo-${Date.now()}.jpg`);

      const response = await api.post('/chat/messages-with-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Ne pas ajouter manuellement - le WebSocket/polling s'en charge
      setNewMessage('');
      setSelectedRecipients([]);
      closeCameraModal();
      
      // Marquer comme lu immédiatement
      await api.chat.markAsRead();
      
      toast({
        title: 'Photo envoyée',
        description: 'La photo a été partagée avec succès'
      });
    } catch (error) {
      console.error('Erreur envoi photo:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la photo',
        variant: 'destructive'
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  // Fermer la caméra
  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCapturedImage(null);
    setShowCameraModal(false);
  };

  // Menu contextuel clic droit
  const handleFileContextMenu = (e, attachment, messageId) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      attachment,
      messageId
    });
  };

  // Fermer le menu contextuel
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Télécharger un fichier
  const downloadFile = (attachmentId) => {
    const token = localStorage.getItem('token');
    const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
    window.open(`${backendUrl}/api/chat/download/${attachmentId}?token=${token}`, '_blank');
    setContextMenu(null);
  };

  // Ouvrir modal de transfert
  const openTransferModal = async (type, attachment) => {
    setContextMenu(null);
    
    try {
      let list = [];
      
      if (type === 'workorder') {
        const response = await api.get('/bons-travail');
        list = response.data.map(bt => ({
          id: bt._id,
          label: bt.titre?.substring(0, 20) + (bt.titre?.length > 20 ? '...' : ''),
          fullLabel: bt.titre
        }));
      } else if (type === 'improvement') {
        const response = await api.get('/ameliorations');
        list = response.data.map(am => ({
          id: am._id,
          label: am.titre?.substring(0, 20) + (am.titre?.length > 20 ? '...' : ''),
          fullLabel: am.titre
        }));
      } else if (type === 'preventive') {
        const response = await api.get('/maintenances-preventives');
        list = response.data.map(mp => ({
          id: mp._id,
          label: mp.designation?.substring(0, 20) + (mp.designation?.length > 20 ? '...' : ''),
          fullLabel: mp.designation
        }));
      } else if (type === 'email') {
        const response = await api.get('/users');
        list = response.data.map(u => ({
          id: u.id,
          label: `${u.prenom} ${u.nom}`,
          email: u.email
        }));
      }
      
      setTransferList(list);
      setShowTransferModal({ type, attachment });
      setSelectedTransferItem('');
      setSelectedEmailUsers([]);
      setEmailMessage('');
    } catch (error) {
      console.error('Erreur chargement liste:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste',
        variant: 'destructive'
      });
    }
  };

  // Effectuer le transfert
  const executeTransfer = async () => {
    if (!showTransferModal) return;
    
    const { type, attachment } = showTransferModal;
    
    try {
      if (type === 'email') {
        if (selectedEmailUsers.length === 0) {
          toast({
            title: 'Erreur',
            description: 'Sélectionnez au moins un destinataire',
            variant: 'destructive'
          });
          return;
        }
        
        await api.chat.transferByEmail(attachment.id, selectedEmailUsers, emailMessage);
        toast({
          title: 'Envoyé',
          description: `Fichier envoyé par email à ${selectedEmailUsers.length} utilisateur(s)`
        });
      } else {
        if (!selectedTransferItem) {
          toast({
            title: 'Erreur',
            description: 'Sélectionnez un élément',
            variant: 'destructive'
          });
          return;
        }
        
        if (type === 'workorder') {
          await api.chat.transferToWorkOrder(attachment.id, selectedTransferItem);
          toast({
            title: 'Transféré',
            description: 'Fichier ajouté à l\'ordre de travail'
          });
        } else if (type === 'improvement') {
          await api.chat.transferToImprovement(attachment.id, selectedTransferItem);
          toast({
            title: 'Transféré',
            description: 'Fichier ajouté à l\'amélioration'
          });
        } else if (type === 'preventive') {
          await api.chat.transferToPreventive(attachment.id, selectedTransferItem);
          toast({
            title: 'Transféré',
            description: 'Fichier ajouté à la maintenance préventive'
          });
        }
      }
      
      setShowTransferModal(null);
    } catch (error) {
      console.error('Erreur transfert:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de transférer le fichier',
        variant: 'destructive'
      });
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

  // Formater la taille de fichier
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Temps réel activé' : 'Mode REST (actualisation auto)'}
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
                        {message.user_name} a écrit:
                      </div>
                    )}
                    
                    {/* Message texte */}
                    {message.message && (
                      <div className="break-words whitespace-pre-wrap">
                        {message.message}
                      </div>
                    )}
                    
                    {/* Fichiers joints */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.length > 0 && !message.message && !isOwnMessage && (
                          <div className="font-semibold text-sm mb-1">
                            {message.user_name} a envoyé:
                          </div>
                        )}
                        {message.attachments.map(attachment => (
                          <div
                            key={attachment.id}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-opacity-80 ${
                              isOwnMessage ? 'bg-blue-500 border-blue-400' : 'bg-white border-gray-300'
                            }`}
                            onContextMenu={(e) => handleFileContextMenu(e, attachment, message.id)}
                            onClick={() => downloadFile(attachment.id)}
                          >
                            <FileText className={`h-5 w-5 ${isOwnMessage ? 'text-white' : 'text-gray-600'}`} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                                {attachment.original_filename}
                              </div>
                              <div className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                {formatFileSize(attachment.file_size)}
                              </div>
                            </div>
                            <Download className={`h-4 w-4 ${isOwnMessage ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                        ))}
                      </div>
                    )}
                    
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
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              size="icon"
              title="Joindre des fichiers"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              title="Prendre une photo"
              onClick={openCamera}
              disabled={uploadingFiles}
            >
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

      {/* Modal Caméra */}
      <Dialog open={showCameraModal} onOpenChange={(open) => !open && closeCameraModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📷 Capture Photo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!capturedImage ? (
              <div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: '400px' }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div>
                <img
                  src={URL.createObjectURL(capturedImage)}
                  alt="Captured"
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            {!capturedImage ? (
              <>
                <Button variant="outline" onClick={closeCameraModal}>
                  Annuler
                </Button>
                <Button onClick={capturePhoto}>
                  <Camera className="mr-2 h-4 w-4" />
                  Capturer
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCapturedImage(null)}>
                  Reprendre
                </Button>
                <Button onClick={sendCapturedPhoto} disabled={uploadingFiles}>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Transfert */}
      <Dialog open={showTransferModal !== null} onOpenChange={(open) => !open && setShowTransferModal(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              📤 Transférer le fichier
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Fichier : <span className="font-medium">{showTransferModal?.attachment?.original_filename}</span>
            </div>
            
            {showTransferModal?.type === 'email' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Destinataires :</label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {transferList.map(user => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEmailUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmailUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedEmailUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{user.label}</span>
                        <span className="text-xs text-gray-500">({user.email})</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedEmailUsers.length} sélectionné(s)
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Message (optionnel) :</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Ajoutez un message..."
                    className="w-full border rounded-lg p-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Sélectionnez {
                    showTransferModal?.type === 'workorder' ? 'un ordre de travail' :
                    showTransferModal?.type === 'improvement' ? 'une amélioration' :
                    'une maintenance préventive'
                  } :
                </label>
                <select
                  value={selectedTransferItem}
                  onChange={(e) => setSelectedTransferItem(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">-- Sélectionner --</option>
                  {transferList.map(item => (
                    <option key={item.id} value={item.id} title={item.fullLabel}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {transferList.length === 0 && (
                  <div className="text-sm text-gray-500 mt-2">
                    Aucun élément disponible
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(null)}>
              Annuler
            </Button>
            <Button onClick={executeTransfer}>
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              Transférer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu contextuel fichiers */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            onClick={() => downloadFile(contextMenu.attachment.id)}
          >
            <Download className="h-4 w-4" />
            Télécharger
          </button>
          
          {canEdit('workOrders') && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => openTransferModal('workorder', contextMenu.attachment)}
            >
              <ArrowRightCircle className="h-4 w-4" />
              Transférer dans un OT
            </button>
          )}
          
          {canEdit('improvements') && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => openTransferModal('improvement', contextMenu.attachment)}
            >
              <ArrowRightCircle className="h-4 w-4" />
              Transférer dans une amélioration
            </button>
          )}
          
          {canEdit('preventiveMaintenance') && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => openTransferModal('preventive', contextMenu.attachment)}
            >
              <ArrowRightCircle className="h-4 w-4" />
              Transférer dans une maintenance
            </button>
          )}
          
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            onClick={() => openTransferModal('email', contextMenu.attachment)}
          >
            <MailIcon className="h-4 w-4" />
            Transférer par email
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatLive;
