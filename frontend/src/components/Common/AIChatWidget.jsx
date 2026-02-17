import React, { useState, useEffect, useRef, useContext } from 'react';
import { X, Send, Bot, User, Loader2, Trash2, Minimize2, Maximize2, Navigation, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api';
import GuidedHighlight from './GuidedHighlight';

// Import du contexte (pas du hook)
import { AINavigationContext } from '../../contexts/AINavigationContext';

// Actions rapides disponibles
const QUICK_ACTIONS = [
  { id: 'creer-ot', label: 'Créer un OT', icon: '📋' },
  { id: 'creer-equipement', label: 'Ajouter équipement', icon: '🔧' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'capteurs', label: 'Capteurs IoT', icon: '📡' },
];

const AIChatWidget = ({ isOpen, onClose, initialContext = null, initialQuestion = null }) => {
  const { preferences } = usePreferences();
  const { toast } = useToast();
  
  // Utiliser le contexte de navigation de manière sécurisée (peut être null)
  const navigationContext = useContext(AINavigationContext);
  const executeAction = navigationContext?.executeAction;
  const navigateTo = navigationContext?.navigateTo;
  const startGuidance = navigationContext?.startGuidance;
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [hasProcessedInitialQuestion, setHasProcessedInitialQuestion] = useState(false);
  const [activeGuide, setActiveGuide] = useState(null); // Guide visuel pas à pas
  
  // États pour la gestion vocale
  const [isRecording, setIsRecording] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // TTS activé par défaut
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  
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
      setHasProcessedInitialQuestion(false);
    }
  }, [isOpen, aiName, aiGender]);

  // Traiter la question initiale du menu contextuel
  useEffect(() => {
    if (isOpen && initialQuestion && !hasProcessedInitialQuestion && messages.length > 0 && !loading) {
      setHasProcessedInitialQuestion(true);
      setShowQuickActions(false);
      
      // Ajouter la question comme message utilisateur
      const userMessage = {
        role: 'user',
        content: initialQuestion,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Envoyer la question à l'IA
      sendMessageToAI(initialQuestion);
    }
  }, [isOpen, initialQuestion, hasProcessedInitialQuestion, messages.length, loading]);

  // Réinitialiser quand on ferme
  useEffect(() => {
    if (!isOpen) {
      setHasProcessedInitialQuestion(false);
    }
  }, [isOpen]);

  // Exécuter une action automatique (CREATE_OT, ADD_TIME_OT, SEARCH, etc.)
  const executeAutoAction = async (actionType, actionData) => {
    try {
      switch (actionType) {
        case 'CREATE_OT':
          // Créer un ordre de travail automatiquement
          const otResponse = await api.workOrders.create({
            titre: actionData.titre,
            description: actionData.description || '',
            type_maintenance: actionData.type_maintenance || 'CORRECTIVE',
            priorite: actionData.priorite || 'NORMALE',
            statut: 'en_attente',
            equipement_nom: actionData.equipement_nom,
            temps_estime: actionData.temps_estime
          });
          
          toast({
            title: '✅ Ordre de travail créé',
            description: `OT "${actionData.titre}" créé avec succès`,
          });
          
          // Ajouter un message de confirmation
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ J'ai créé l'ordre de travail "${actionData.titre}" avec succès ! Numéro: #${otResponse.data?.id?.slice(-4) || 'XXXX'}`,
            timestamp: new Date().toISOString(),
            isSystemAction: true
          }]);
          break;
          
        case 'ADD_TIME_OT':
          // Ajouter du temps à un OT
          toast({
            title: '⏱️ Temps ajouté',
            description: `${actionData.temps} ajouté sur ${actionData.ot_reference}`,
          });
          break;
          
        case 'COMMENT_OT':
          // Ajouter un commentaire
          toast({
            title: '💬 Commentaire ajouté',
            description: `Commentaire ajouté sur ${actionData.ot_reference}`,
          });
          break;
          
        case 'SEARCH':
          // Effectuer une recherche et afficher les résultats
          toast({
            title: 'Recherche en cours',
            description: `Recherche dans ${actionData.type}...`,
          });
          break;
          
        case 'CONFIGURE_AUTOMATION':
          // Parser et appliquer une automatisation
          try {
            const parseRes = await api.post('/automations/parse', { message: actionData.message });
            const automation = parseRes.data?.automation;
            
            if (automation?.understood) {
              // Appliquer directement
              const applyRes = await api.post('/automations/apply', { automation });
              
              toast({
                title: 'Automatisation configuree',
                description: automation.name || 'Configuration reussie',
              });
              
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: applyRes.data?.message || automation.confirmation_message || 'Automatisation mise en place !',
                timestamp: new Date().toISOString(),
                isSystemAction: true
              }]);
            } else if (automation?.needs_clarification) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: automation.clarification_question || 'J\'ai besoin de plus de details pour configurer cette automatisation.',
                timestamp: new Date().toISOString(),
                isSystemAction: true
              }]);
            }
          } catch (autoErr) {
            console.error('Erreur automatisation:', autoErr);
            toast({
              title: 'Erreur automatisation',
              description: 'Impossible de configurer l\'automatisation',
              variant: 'destructive',
            });
          }
          break;
          
        default:
          console.warn('Action non reconnue:', actionType);
      }
    } catch (error) {
      console.error('Erreur action automatique:', error);
      toast({
        title: 'Erreur',
        description: `Impossible d'exécuter l'action: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Exécuter une action rapide
  const handleQuickAction = async (actionId) => {
    setShowQuickActions(false);
    
    const action = QUICK_ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    // Ajouter un message utilisateur simulé
    const userMessage = {
      role: 'user',
      content: `${action.icon} ${action.label}`,
      timestamp: new Date().toISOString(),
      isQuickAction: true
    };
    setMessages(prev => [...prev, userMessage]);

    // Exécuter l'action de navigation (si disponible)
    if (executeAction) {
      try {
        await executeAction(actionId);
        
        const assistantMessage = {
          role: 'assistant',
          content: `Je vous ai dirigé vers "${action.label}". Que puis-je faire d'autre pour vous ?`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Erreur action rapide:', error);
        const errorMessage = {
          role: 'assistant',
          content: `Je n'ai pas pu naviguer vers "${action.label}". Voulez-vous que je vous explique comment y accéder ?`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } else {
      // Navigation non disponible, donner des instructions
      const assistantMessage = {
        role: 'assistant',
        content: `Pour accéder à "${action.label}", utilisez le menu latéral de l'application.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  };

  // Démarrer un guidage étape par étape
  const handleStartGuidance = (topic) => {
    const guidanceSteps = {
      'creer-ot': [
        { route: '/work-orders', message: 'Bienvenue dans le module Ordres de Travail' },
        { highlight: 'button:has-text("Créer"), button:has-text("+ Créer")', message: 'Cliquez sur ce bouton pour créer un nouvel ordre de travail', showHand: true },
        { message: 'Remplissez le formulaire avec les informations de l\'intervention' }
      ],
      'creer-equipement': [
        { route: '/assets', message: 'Bienvenue dans le module Équipements' },
        { highlight: 'button:has-text("Ajouter"), button:has-text("+ Ajouter")', message: 'Cliquez ici pour ajouter un nouvel équipement', showHand: true },
        { message: 'Remplissez les informations de l\'équipement (nom, type, emplacement...)' }
      ]
    };

    if (guidanceSteps[topic] && startGuidance) {
      startGuidance(guidanceSteps[topic]);
      onClose();
    }
  };

  // Parser et exécuter les commandes de navigation dans la réponse de l'IA
  const parseAndExecuteCommands = (responseText) => {
    // Vérifier d'abord les guides pas à pas avec JSON
    const guideStartRegex = /\[\[GUIDE_START:([^\]]+)\]\]\s*(\{[\s\S]*?\})\s*\[\[GUIDE_END\]\]/g;
    let guideMatch = guideStartRegex.exec(responseText);
    
    if (guideMatch) {
      try {
        const guideName = guideMatch[1];
        const guideData = JSON.parse(guideMatch[2]);
        console.log('Guide détecté:', guideName, guideData);
        
        // Activer le guide visuel
        setActiveGuide({
          name: guideName,
          title: guideData.title || 'Guide interactif',
          steps: guideData.steps || []
        });
        
        toast({
          title: '🎯 Guide démarré',
          description: `${guideData.title || 'Suivez les étapes en surbrillance'}`
        });
      } catch (e) {
        console.error('Erreur parsing guide JSON:', e);
      }
    }
    
    // Parser les commandes d'action automatique (CREATE_OT, SEARCH, etc.)
    const actionCommandRegex = /\[\[(CREATE_OT|ADD_TIME_OT|COMMENT_OT|SEARCH|CONFIGURE_AUTOMATION):(\{[\s\S]*?\})\]\]/g;
    let actionMatch;
    
    while ((actionMatch = actionCommandRegex.exec(responseText)) !== null) {
      try {
        const actionType = actionMatch[1];
        const actionData = JSON.parse(actionMatch[2]);
        console.log('Action automatique détectée:', actionType, actionData);
        executeAutoAction(actionType, actionData);
      } catch (e) {
        console.error('Erreur parsing action JSON:', e);
      }
    }
    
    // Parser CONFIGURE_AUTOMATION avec texte libre (pas JSON)
    const autoTextRegex = /\[\[CONFIGURE_AUTOMATION:([^\]]+)\]\]/g;
    let autoTextMatch;
    while ((autoTextMatch = autoTextRegex.exec(responseText)) !== null) {
      const msg = autoTextMatch[1].trim();
      if (!msg.startsWith('{')) {
        console.log('Automation texte libre:', msg);
        executeAutoAction('CONFIGURE_AUTOMATION', { message: msg });
      }
    }
    
    // Regex pour détecter les commandes [[TYPE:action]] ou [[TYPE:selector:message]]
    const commandRegex = /\[\[(NAVIGATE|ACTION|GUIDE|SPOTLIGHT|PULSE|TRAIL|TOOLTIP|CELEBRATE):([^\]]+)\]\]/g;
    let match;
    const commands = [];
    
    while ((match = commandRegex.exec(responseText)) !== null) {
      commands.push({ type: match[1], action: match[2] });
    }
    
    // Retirer toutes les commandes du texte affiché
    let cleanText = responseText
      .replace(guideStartRegex, '')
      .replace(actionCommandRegex, '')
      .replace(commandRegex, '')
      .trim();
    
    // Exécuter les commandes (avec un délai pour laisser le message s'afficher)
    if (commands.length > 0) {
      setTimeout(() => {
        commands.forEach(cmd => {
          console.log('Exécution commande IA:', cmd);
          
          if (cmd.type === 'NAVIGATE' && navigateTo) {
            // Navigation simple vers une page
            const routeMap = {
              'dashboard': 'dashboard',
              'work-orders': 'ordres-de-travail',
              'assets': 'equipements',
              'locations': 'emplacements',
              'inventory': 'inventaire',
              'preventive-maintenance': 'maintenance-preventive',
              'sensors': 'capteurs',
              'meters': 'compteurs',
              'reports': 'rapports',
              'settings': 'parametres',
              'personnalisation': 'personnalisation'
            };
            const destination = routeMap[cmd.action] || cmd.action;
            navigateTo(destination);
            
            toast({
              title: '🧭 Navigation',
              description: `Je vous emmène vers ${cmd.action.replace('-', ' ')}...`
            });
          } 
          else if (cmd.type === 'ACTION' && executeAction) {
            // Action avec surbrillance (naviguer + surligner un bouton)
            executeAction(cmd.action);
            
            toast({
              title: '👆 Action',
              description: `Je vous montre où cliquer...`
            });
          }
          else if (cmd.type === 'GUIDE' && startGuidance) {
            // Démarrer un guide étape par étape (utiliser les guides prédéfinis ou personnalisés)
            const started = startGuidance(cmd.action);
            if (started) {
              onClose(); // Fermer le chat pour mieux voir le guide
              
              toast({
                title: '📖 Guide démarré',
                description: 'Suivez les étapes pour accomplir cette action'
              });
            } else {
              toast({
                title: '⚠️ Guide non trouvé',
                description: `Le guide "${cmd.action}" n'existe pas encore`,
                variant: 'warning'
              });
            }
          }
          // Nouvelles commandes visuelles avancées (P3)
          else if (cmd.type === 'SPOTLIGHT' && navigationContext?.showSpotlight) {
            navigationContext.showSpotlight(cmd.action);
            toast({
              title: '✨ Spotlight',
              description: 'Élément mis en lumière'
            });
          }
          else if (cmd.type === 'PULSE' && navigationContext?.addPulseEffect) {
            navigationContext.addPulseEffect(cmd.action);
            toast({
              title: '💫 Attention',
              description: 'Regardez l\'élément qui pulse'
            });
          }
          else if (cmd.type === 'TRAIL' && navigationContext?.showTrail) {
            const [startSelector, endSelector] = cmd.action.split(':');
            if (startSelector && endSelector) {
              navigationContext.showTrail(startSelector, endSelector);
              toast({
                title: '➡️ Chemin',
                description: 'Suivez la ligne vers l\'élément cible'
              });
            }
          }
          else if (cmd.type === 'TOOLTIP' && navigationContext?.showCustomTooltip) {
            const [selector, ...messageParts] = cmd.action.split(':');
            const message = messageParts.join(':');
            if (selector && message) {
              navigationContext.showCustomTooltip(selector, message);
            }
          }
          else if (cmd.type === 'CELEBRATE' && navigationContext?.celebrate) {
            navigationContext.celebrate();
            toast({
              title: '🎉 Félicitations !',
              description: 'Vous avez réussi !'
            });
          }
        });
      }, 1000); // Délai de 1 seconde pour laisser le message s'afficher
    }
    
    return cleanText;
  };

  // Fonction pour envoyer un message à l'IA
  const sendMessageToAI = async (messageContent) => {
    setLoading(true);

    try {
      // Construire le contexte
      const context = initialContext || `Page actuelle: ${window.location.pathname}`;
      
      const response = await api.ai.chat({
        message: messageContent,
        session_id: sessionId,
        context: context
      });

      // Parser la réponse pour extraire et exécuter les commandes
      const cleanResponse = parseAndExecuteCommands(response.data.response);

      const assistantMessage = {
        role: 'assistant',
        content: cleanResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSessionId(response.data.session_id);
      
      // Synthèse vocale de la réponse (si TTS activé)
      if (isTTSEnabled && cleanResponse) {
        speakText(cleanResponse);
      }
      
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    setShowQuickActions(false);

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput('');
    
    await sendMessageToAI(messageToSend);
  };

  // ========== Fonctions vocales (STT & TTS) ==========
  
  // Démarrer l'enregistrement vocal
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Déterminer le meilleur format supporté
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
      
      console.log('Format audio utilisé:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Données audio reçues:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Arrêter les tracks audio
        stream.getTracks().forEach(track => track.stop());
        
        // Vérifier qu'on a des données
        if (audioChunksRef.current.length === 0) {
          toast({
            title: 'Erreur',
            description: 'Aucune donnée audio enregistrée',
            variant: 'destructive'
          });
          return;
        }
        
        // Créer le blob audio
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Blob audio créé:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        if (audioBlob.size < 1000) {
          toast({
            title: 'Enregistrement trop court',
            description: 'Veuillez parler plus longtemps',
            variant: 'destructive'
          });
          return;
        }
        
        // Envoyer pour transcription
        await transcribeAudio(audioBlob);
      };
      
      // Enregistrer des chunks toutes les 250ms pour avoir des données
      mediaRecorder.start(250);
      setIsRecording(true);
      
      toast({
        title: '🎤 Enregistrement',
        description: 'Parlez maintenant...',
      });
      
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      toast({
        title: 'Erreur',
        description: error.name === 'NotAllowedError' 
          ? 'Accès au microphone refusé. Autorisez l\'accès dans les paramètres du navigateur.'
          : 'Impossible d\'accéder au microphone. Vérifiez les permissions.',
        variant: 'destructive'
      });
    }
  };
  
  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Transcrire l'audio en texte
  const transcribeAudio = async (audioBlob) => {
    setLoading(true);
    try {
      console.log('Envoi audio pour transcription:', audioBlob.size, 'bytes');
      
      const formData = new FormData();
      // Utiliser le bon type de fichier selon le format
      const extension = audioBlob.type.includes('webm') ? 'webm' : 
                       audioBlob.type.includes('mp4') ? 'mp4' : 
                       audioBlob.type.includes('ogg') ? 'ogg' : 'wav';
      formData.append('audio', audioBlob, `recording.${extension}`);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || ''}/api/ai/voice/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('Réponse serveur:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur serveur:', errorText);
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Données transcription:', data);
      
      if (data.success && data.transcription) {
        // Ajouter le message transcrit
        const userMessage = {
          role: 'user',
          content: `🎤 ${data.transcription}`,
          timestamp: new Date().toISOString(),
          isVoice: true
        };
        setMessages(prev => [...prev, userMessage]);
        setShowQuickActions(false);
        
        toast({
          title: '✅ Transcription réussie',
          description: data.transcription.substring(0, 50) + '...',
        });
        
        // Envoyer à l'IA
        await sendMessageToAI(data.transcription);
      } else {
        toast({
          title: 'Erreur transcription',
          description: data.detail || 'Impossible de transcrire l\'audio. Réessayez.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erreur transcription:', error);
      toast({
        title: 'Erreur',
        description: `Erreur lors de la transcription: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Synthèse vocale - Lire la réponse de l'IA
  const speakText = async (text) => {
    if (!isTTSEnabled || !text) return;
    
    try {
      setIsPlayingAudio(true);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || ''}/api/ai/voice/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.replace(/\[\[.*?\]\]/g, '').trim(), // Retirer les commandes
          voice: 'nova' // Voix féminine naturelle
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.audio_base64) {
        // Convertir base64 en audio et jouer
        const audioData = atob(data.audio_base64);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }
        
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        
        audio.onended = () => {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsPlayingAudio(false);
          console.error('Erreur lecture audio');
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('Erreur TTS:', error);
      setIsPlayingAudio(false);
    }
  };
  
  // Arrêter la lecture audio
  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingAudio(false);
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
      setShowQuickActions(true);
      return;
    }

    try {
      await api.ai.clearHistory(sessionId);
      setMessages([]);
      setSessionId(null);
      setShowQuickActions(true);
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
      className={`fixed bottom-4 right-4 transition-all duration-300 ${
        minimized ? 'w-64' : 'w-96'
      }`}
      style={{ zIndex: 9999 }}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
           style={{ maxHeight: minimized ? '48px' : '600px', height: minimized ? '48px' : '550px' }}>
        
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
              {/* Actions rapides */}
              {showQuickActions && messages.length <= 1 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Sparkles size={12} />
                    Actions rapides
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full text-xs font-medium transition-colors"
                      >
                        <span>{action.icon}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
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
                      ? msg.isQuickAction 
                        ? 'bg-purple-500 text-white'
                        : 'bg-blue-600 text-white'
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
              {/* Contrôles TTS */}
              <div className="flex items-center justify-between mb-2 px-1">
                <button
                  onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                    isTTSEnabled 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                  title={isTTSEnabled ? 'Désactiver la voix' : 'Activer la voix'}
                >
                  {isTTSEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{isTTSEnabled ? 'Voix ON' : 'Voix OFF'}</span>
                </button>
                
                {isPlayingAudio && (
                  <button
                    onClick={stopAudio}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700"
                  >
                    <VolumeX size={14} />
                    <span>Arrêter</span>
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                {/* Bouton Microphone */}
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  variant={isRecording ? "destructive" : "outline"}
                  className={`px-3 ${isRecording ? 'animate-pulse bg-red-500 hover:bg-red-600' : ''}`}
                  title={isRecording ? 'Arrêter l\'enregistrement' : 'Parler à Adria'}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </Button>
                
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? '🎤 Enregistrement en cours...' : `Posez votre question à ${aiName}...`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  rows={1}
                  disabled={loading || isRecording}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || isRecording}
                  className="bg-purple-600 hover:bg-purple-700 px-3"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </div>
              
              {/* Indicateur d'enregistrement */}
              {isRecording && (
                <div className="mt-2 flex items-center justify-center gap-2 text-red-600 text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span>Parlez maintenant... Cliquez sur le micro pour terminer</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Composant de guidage visuel pas à pas */}
      {activeGuide && (
        <GuidedHighlight
          guide={activeGuide}
          onComplete={() => {
            setActiveGuide(null);
            toast({
              title: '🎉 Guide terminé !',
              description: 'Vous avez complété toutes les étapes.',
            });
            // Ajouter un message de félicitations
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '🎉 Bravo ! Vous avez terminé le guide. N\'hésitez pas si vous avez d\'autres questions !',
              timestamp: new Date().toISOString()
            }]);
          }}
          onCancel={() => {
            setActiveGuide(null);
            toast({
              title: 'Guide annulé',
              description: 'Vous pouvez le reprendre à tout moment.',
            });
          }}
          onStepChange={(step) => {
            console.log('Étape du guide:', step);
          }}
        />
      )}
    </div>
  );
};

export default AIChatWidget;
