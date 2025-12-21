import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import {
  Pencil,
  Eraser,
  Type,
  Square,
  Circle,
  ArrowRight,
  ImageIcon,
  StickyNote,
  Undo2,
  Redo2,
  Palette,
  ChevronLeft,
  X,
  MousePointer2,
  Highlighter,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API_URL = `${BACKEND_URL}/api/whiteboard`;

// Construire l'URL WebSocket
const getWebSocketUrl = () => {
  const url = new URL(BACKEND_URL || window.location.origin);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}`;
};
const WS_URL = getWebSocketUrl();

// DIMENSIONS FIXES du canvas (identiques sur tous les écrans)
// Ces dimensions représentent la "zone de travail" logique
// Ratio 4:3 pour mieux s'adapter aux différentes tailles d'écran
const CANVAS_FIXED_WIDTH = 1200;
const CANVAS_FIXED_HEIGHT = 900;

// Couleurs disponibles
const COLORS = [
  '#000000', '#FF0000', '#0000FF', '#008000', '#FFA500',
  '#800080', '#FFFF00', '#00FFFF', '#FF00FF', '#FFFFFF',
];

// Tailles de trait
const STROKE_SIZES = [2, 4, 6, 8, 12, 16, 24];

const WhiteboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Récupérer l'utilisateur depuis localStorage (une seule fois)
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [token] = useState(() => localStorage.getItem('token'));
  
  // Vérifier les permissions
  const canViewWhiteboard = user?.permissions?.whiteboard?.view ?? false;
  const [hasCheckedPermission, setHasCheckedPermission] = useState(false);
  
  // Refs pour les canvas et leurs wrappers
  const container1Ref = useRef(null);
  const container2Ref = useRef(null);
  const wrapper1Ref = useRef(null);
  const wrapper2Ref = useRef(null);
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  
  // Refs pour WebSocket
  const ws1Ref = useRef(null);
  const ws2Ref = useRef(null);
  const wsReconnectTimeoutRef = useRef(null);
  
  // Refs pour éviter les problèmes de closure
  const saveTimeoutRef = useRef(null);
  const initialLoadDoneRef = useRef(false);
  const isLoadingDataRef = useRef(false);
  const isReceivingRemoteRef = useRef(false);
  
  // États
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [activeColor, setActiveColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [activeBoard, setActiveBoard] = useState('board_1');
  const [connectedUsers, setConnectedUsers] = useState({ board_1: [], board_2: [] });
  const [undoStack, setUndoStack] = useState({ board_1: [], board_2: [] });
  const [redoStack, setRedoStack] = useState({ board_1: [], board_2: [] });
  const [isConnected, setIsConnected] = useState({ board_1: false, board_2: false });
  const [wsConnected, setWsConnected] = useState({ board_1: false, board_2: false });
  const [canvasReady, setCanvasReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // États pour le scale CSS (PAS le zoom Fabric.js)
  const [scaleFactors, setScaleFactors] = useState({ board_1: 1, board_2: 1 });

  // Générer un ID unique
  const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // ==================== Calcul du scale CSS ====================
  
  // Calculer le scale optimal pour adapter le canvas fixe au conteneur
  // en utilisant TOUTE la place disponible
  const calculateOptimalScale = useCallback((containerWidth, containerHeight) => {
    const padding = 40; // Marge autour du canvas (pour le label "Tableau X")
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;
    
    // Calculer le scale pour chaque dimension
    const scaleX = availableWidth / CANVAS_FIXED_WIDTH;
    const scaleY = availableHeight / CANVAS_FIXED_HEIGHT;
    
    // Prendre le plus petit ratio pour que le canvas tienne entièrement
    // mais permettre d'aller jusqu'à 100% maximum
    return Math.min(scaleX, scaleY, 1);
  }, []);

  // Appliquer le scale CSS au wrapper du canvas
  const applyScale = useCallback((boardId, scale) => {
    const wrapper = boardId === 'board_1' ? wrapper1Ref.current : wrapper2Ref.current;
    if (wrapper) {
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top left';
    }
    setScaleFactors(prev => ({ ...prev, [boardId]: scale }));
  }, []);

  // ==================== WebSocket ====================
  
  // Gérer les messages WebSocket (défini en premier car utilisé par connectWebSocket)
  const handleWebSocketMessage = useCallback((boardId, message) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    
    switch (message.type) {
      case 'users_list':
        setConnectedUsers(prev => ({
          ...prev,
          [boardId]: message.users || []
        }));
        break;
      
      case 'user_joined':
        toast({
          title: '👋 Nouvel utilisateur',
          description: `${message.user_name} a rejoint le tableau`
        });
        break;
      
      case 'user_left':
        toast({
          title: '👋 Départ',
          description: `${message.user_name} a quitté le tableau`
        });
        break;
      
      case 'object_added':
        if (canvas && message.object) {
          isReceivingRemoteRef.current = true;
          fabric.util.enlivenObjects([message.object]).then((objects) => {
            objects.forEach(obj => {
              obj.id = message.object_id;
              obj._fromRemote = true;
              canvas.add(obj);
            });
            canvas.renderAll();
            isReceivingRemoteRef.current = false;
          });
        }
        break;
      
      case 'object_modified':
        if (canvas && message.object && message.object_id) {
          isReceivingRemoteRef.current = true;
          const existingObj = canvas.getObjects().find(o => o.id === message.object_id);
          if (existingObj) {
            canvas.remove(existingObj);
          }
          fabric.util.enlivenObjects([message.object]).then((objects) => {
            objects.forEach(obj => {
              obj.id = message.object_id;
              obj._fromRemote = true;
              canvas.add(obj);
            });
            canvas.renderAll();
            isReceivingRemoteRef.current = false;
          });
        }
        break;
      
      case 'object_removed':
        if (canvas && message.object_id) {
          isReceivingRemoteRef.current = true;
          const objToRemove = canvas.getObjects().find(o => o.id === message.object_id);
          if (objToRemove) {
            canvas.remove(objToRemove);
            canvas.renderAll();
          }
          isReceivingRemoteRef.current = false;
        }
        break;
      
      case 'sync_response':
        // Synchronisation initiale reçue
        if (canvas && message.board && message.board.objects) {
          isLoadingDataRef.current = true;
          canvas.loadFromJSON({
            version: '6.0.0',
            objects: message.board.objects,
            background: '#FFFFFF'
          }).then(() => {
            canvas.renderAll();
            isLoadingDataRef.current = false;
          });
        }
        break;
      
      default:
        break;
    }
  }, [toast]);
  
  // Connecter au WebSocket
  const connectWebSocket = useCallback((boardId) => {
    const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
    
    // Fermer la connexion existante si elle existe
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    
    const userId = user?.id || 'anonymous';
    const userName = `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Anonyme';
    const wsUrl = `${WS_URL}/ws/whiteboard/${boardId}?user_id=${userId}&user_name=${encodeURIComponent(userName)}`;
    
    console.log(`Tentative connexion WebSocket à ${boardId}...`);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Timeout pour la connexion
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log(`WebSocket ${boardId} timeout - utilisation de l'API REST uniquement`);
          ws.close();
        }
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket ${boardId} connecté`);
        setWsConnected(prev => ({ ...prev, [boardId]: true }));
        
        // Demander la synchronisation initiale
        ws.send(JSON.stringify({ type: 'sync_request' }));
      };
      
      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket ${boardId} déconnecté`);
        setWsConnected(prev => ({ ...prev, [boardId]: false }));
        wsRef.current = null;
      };
      
      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket ${boardId} non disponible - utilisation de l'API REST`);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(boardId, message);
        } catch (e) {
          console.error('Erreur parsing message WS:', e);
        }
      };
    } catch (error) {
      console.log(`WebSocket ${boardId} non supporté - utilisation de l'API REST`);
    }
  }, [user, handleWebSocketMessage]);
  
  // Ref pour éviter les connexions multiples
  const wsConnectionAttemptedRef = useRef(false);
  
  // Effet pour connecter les WebSockets - UNE SEULE FOIS
  useEffect(() => {
    let timeout;
    const reconnectTimeout = wsReconnectTimeoutRef.current;
    const ws1 = ws1Ref.current;
    const ws2 = ws2Ref.current;
    
    if (canvasReady && user?.id && !wsConnectionAttemptedRef.current) {
      wsConnectionAttemptedRef.current = true;
      timeout = setTimeout(() => {
        connectWebSocket('board_1');
        connectWebSocket('board_2');
      }, 1000);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws1) ws1.close();
      if (ws2) ws2.close();
    };
  }, [canvasReady, user?.id, connectWebSocket]);

  // ==================== Fin WebSocket ====================

  // Sauvegarder un tableau via API REST
  const saveBoard = useCallback(async (boardId) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas || !token || isLoadingDataRef.current) return;
    
    setIsSaving(true);
    
    try {
      const objects = canvas.toJSON(['id']).objects || [];
      
      const response = await fetch(`${API_URL}/board/${boardId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          objects,
          user_id: user?.id,
          user_name: `${user?.prenom || ''} ${user?.nom || ''}`.trim()
        })
      });
      
      if (response.ok) {
        console.log(`Tableau ${boardId} sauvegardé avec ${objects.length} objets`);
      }
    } catch (error) {
      console.error(`Erreur sauvegarde ${boardId}:`, error);
    } finally {
      setIsSaving(false);
    }
  }, [token, user]);

  // Sauvegarde avec debounce
  const debouncedSave = useCallback((boardId) => {
    if (isLoadingDataRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveBoard(boardId);
    }, 1500);
  }, [saveBoard]);

  // Charger un tableau depuis l'API
  const loadBoard = useCallback(async (boardId) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas || !token) return;
    
    isLoadingDataRef.current = true;
    
    try {
      const response = await fetch(`${API_URL}/board/${boardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.objects && data.objects.length > 0) {
          canvas.clear();
          canvas.backgroundColor = '#FFFFFF';
          
          const canvasData = {
            version: '6.0.0',
            objects: data.objects,
            background: '#FFFFFF'
          };
          
          await canvas.loadFromJSON(canvasData);
          canvas.renderAll();
          console.log(`Tableau ${boardId} chargé avec ${data.objects.length} objets`);
        }
        
        setIsConnected(prev => ({ ...prev, [boardId]: true }));
      }
    } catch (error) {
      console.error(`Erreur chargement ${boardId}:`, error);
    } finally {
      isLoadingDataRef.current = false;
    }
  }, [token]);

  // Initialiser un canvas Fabric.js avec DIMENSIONS FIXES (sans zoom)
  const initCanvas = useCallback((containerEl, wrapperEl, boardId) => {
    if (!containerEl || !wrapperEl) return null;
    
    // Créer l'élément canvas HTML
    const canvasEl = document.createElement('canvas');
    canvasEl.id = `canvas-${boardId}`;
    canvasEl.width = CANVAS_FIXED_WIDTH;
    canvasEl.height = CANVAS_FIXED_HEIGHT;
    
    // Vider le wrapper et ajouter le canvas
    wrapperEl.innerHTML = '';
    wrapperEl.appendChild(canvasEl);
    
    // Créer le canvas Fabric.js avec les dimensions FIXES
    const fabricCanvas = new fabric.Canvas(canvasEl, {
      width: CANVAS_FIXED_WIDTH,
      height: CANVAS_FIXED_HEIGHT,
      backgroundColor: '#FFFFFF',
      isDrawingMode: false,
      selection: true,
    });
    
    // Calculer et appliquer le scale CSS initial
    const containerWidth = containerEl.clientWidth || 800;
    const containerHeight = containerEl.clientHeight || 400;
    const optimalScale = calculateOptimalScale(containerWidth, containerHeight);
    
    // Appliquer le scale via CSS (pas via Fabric.js zoom)
    wrapperEl.style.transform = `scale(${optimalScale})`;
    wrapperEl.style.transformOrigin = 'top left';
    wrapperEl.style.width = `${CANVAS_FIXED_WIDTH}px`;
    wrapperEl.style.height = `${CANVAS_FIXED_HEIGHT}px`;
    
    setScaleFactors(prev => ({ ...prev, [boardId]: optimalScale }));
    
    // Événements
    fabricCanvas.on('object:added', (e) => {
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const obj = e.target;
        if (!obj.id) {
          obj.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Envoyer via WebSocket pour temps réel
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'object_added',
            object: obj.toJSON(['id']),
            object_id: obj.id
          }));
        }
        
        // Sauvegarder via REST après un délai
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
          if (canvas && !isLoadingDataRef.current) {
            const objects = canvas.toJSON(['id']).objects || [];
            const tkn = localStorage.getItem('token');
            const usr = JSON.parse(localStorage.getItem('user') || '{}');
            
            fetch(`${API_URL}/board/${boardId}/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tkn}`
              },
              body: JSON.stringify({
                objects,
                user_id: usr?.id,
                user_name: `${usr?.prenom || ''} ${usr?.nom || ''}`.trim()
              })
            }).then(() => console.log(`Tableau ${boardId} sauvegardé`));
          }
        }, 1500);
      }
    });
    
    fabricCanvas.on('object:modified', (e) => {
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const obj = e.target;
        
        // Envoyer via WebSocket pour temps réel
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'object_modified',
            object: obj.toJSON(['id']),
            object_id: obj.id
          }));
        }
        
        // Sauvegarder via REST après un délai
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
          if (canvas && !isLoadingDataRef.current) {
            const objects = canvas.toJSON(['id']).objects || [];
            const tkn = localStorage.getItem('token');
            const usr = JSON.parse(localStorage.getItem('user') || '{}');
            
            fetch(`${API_URL}/board/${boardId}/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tkn}`
              },
              body: JSON.stringify({
                objects,
                user_id: usr?.id,
                user_name: `${usr?.prenom || ''} ${usr?.nom || ''}`.trim()
              })
            }).then(() => console.log(`Tableau ${boardId} sauvegardé`));
          }
        }, 1500);
      }
    });
    
    fabricCanvas.on('object:removed', (e) => {
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const obj = e.target;
        
        // Envoyer via WebSocket pour temps réel
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && obj.id) {
          wsRef.current.send(JSON.stringify({
            type: 'object_removed',
            object_id: obj.id
          }));
        }
      }
    });
    
    fabricCanvas.on('path:created', (e) => {
      if (e.path && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const path = e.path;
        path.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Envoyer via WebSocket pour temps réel
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'object_added',
            object: path.toJSON(['id']),
            object_id: path.id
          }));
        }
        
        // Sauvegarder via REST après un délai
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
          if (canvas && !isLoadingDataRef.current) {
            const objects = canvas.toJSON(['id']).objects || [];
            const tkn = localStorage.getItem('token');
            const usr = JSON.parse(localStorage.getItem('user') || '{}');
            
            fetch(`${API_URL}/board/${boardId}/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tkn}`
              },
              body: JSON.stringify({
                objects,
                user_id: usr?.id,
                user_name: `${usr?.prenom || ''} ${usr?.nom || ''}`.trim()
              })
            }).then(() => console.log(`Tableau ${boardId} sauvegardé`));
          }
        }, 1500);
      }
    });
    
    return fabricCanvas;
  }, [calculateOptimalScale]);

  // Initialisation des canvas - UNE SEULE FOIS
  useEffect(() => {
    let mounted = true;
    
    const initializeCanvases = async () => {
      // Attendre que les containers soient prêts
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!mounted) return;
      
      if (container1Ref.current && wrapper1Ref.current && !canvas1Ref.current) {
        canvas1Ref.current = initCanvas(container1Ref.current, wrapper1Ref.current, 'board_1');
      }
      if (container2Ref.current && wrapper2Ref.current && !canvas2Ref.current) {
        canvas2Ref.current = initCanvas(container2Ref.current, wrapper2Ref.current, 'board_2');
      }
      
      if (canvas1Ref.current && canvas2Ref.current) {
        setCanvasReady(true);
        
        // Charger les données SEULEMENT si pas déjà fait
        if (!initialLoadDoneRef.current && token) {
          initialLoadDoneRef.current = true;
          isLoadingDataRef.current = true;
          
          try {
            await Promise.all([
              loadBoard('board_1'),
              loadBoard('board_2')
            ]);
            
            toast({
              title: '✅ Tableaux chargés',
              description: 'Vos dessins ont été restaurés'
            });
          } catch (err) {
            console.error('Erreur chargement:', err);
          } finally {
            isLoadingDataRef.current = false;
          }
        }
      }
    };
    
    initializeCanvases();
    
    return () => {
      mounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (canvas1Ref.current) {
        canvas1Ref.current.dispose();
        canvas1Ref.current = null;
      }
      if (canvas2Ref.current) {
        canvas2Ref.current.dispose();
        canvas2Ref.current = null;
      }
    };
  }, [initCanvas, loadBoard, token, toast]);

  // Redimensionner/Ajuster le scale des canvas lors du resize
  useEffect(() => {
    const handleResize = () => {
      [
        { container: container1Ref.current, wrapper: wrapper1Ref.current, boardId: 'board_1' },
        { container: container2Ref.current, wrapper: wrapper2Ref.current, boardId: 'board_2' }
      ].forEach(({ container, wrapper, boardId }) => {
        if (!container || !wrapper) return;
        
        // Calculer le nouveau scale optimal
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const optimalScale = calculateOptimalScale(containerWidth, containerHeight);
        
        // Appliquer le scale via CSS
        wrapper.style.transform = `scale(${optimalScale})`;
        setScaleFactors(prev => ({ ...prev, [boardId]: optimalScale }));
      });
    };
    
    window.addEventListener('resize', handleResize);
    // Appliquer le scale initial après un court délai
    const initialResizeTimeout = setTimeout(handleResize, 500);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialResizeTimeout);
    };
  }, [canvasReady, calculateOptimalScale]);

  // Gestionnaire de clavier pour supprimer avec la touche Suppr/Delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Touche Suppr (Delete) ou Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Ne pas supprimer si on est dans un champ de texte éditable
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        // Vérifier si on est en mode édition de texte Fabric.js
        const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
        if (!canvas) return;
        
        // Si un objet texte est en cours d'édition, ne pas supprimer l'objet
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isEditing) {
          return;
        }
        
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          activeObjects.forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
          console.log('Objet(s) supprimé(s) via touche Delete');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [activeBoard]);

  // ==================== Fonctions de scale manuel ====================
  
  const handleScaleUp = (boardId) => {
    const wrapper = boardId === 'board_1' ? wrapper1Ref.current : wrapper2Ref.current;
    if (!wrapper) return;
    
    const currentScale = scaleFactors[boardId] || 1;
    const newScale = Math.min(currentScale * 1.2, 2); // Max 200%
    wrapper.style.transform = `scale(${newScale})`;
    setScaleFactors(prev => ({ ...prev, [boardId]: newScale }));
  };
  
  const handleScaleDown = (boardId) => {
    const wrapper = boardId === 'board_1' ? wrapper1Ref.current : wrapper2Ref.current;
    if (!wrapper) return;
    
    const currentScale = scaleFactors[boardId] || 1;
    const newScale = Math.max(currentScale / 1.2, 0.1); // Min 10%
    wrapper.style.transform = `scale(${newScale})`;
    setScaleFactors(prev => ({ ...prev, [boardId]: newScale }));
  };
  
  const handleScaleFit = (boardId) => {
    const container = boardId === 'board_1' ? container1Ref.current : container2Ref.current;
    const wrapper = boardId === 'board_1' ? wrapper1Ref.current : wrapper2Ref.current;
    if (!container || !wrapper) return;
    
    const optimalScale = calculateOptimalScale(container.clientWidth, container.clientHeight);
    wrapper.style.transform = `scale(${optimalScale})`;
    setScaleFactors(prev => ({ ...prev, [boardId]: optimalScale }));
  };

  // Changer d'outil
  const setTool = (tool, color = null) => {
    setActiveTool(tool);
    
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    // Utiliser la couleur passée en paramètre ou activeColor
    const brushColor = color || activeColor;
    
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    switch (tool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;
      
      case 'highlighter':
        canvas.isDrawingMode = true;
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = brushColor + '80';
        canvas.freeDrawingBrush.width = strokeWidth * 3;
        break;
      
      case 'eraser':
        canvas.isDrawingMode = true;
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = '#FFFFFF';
        canvas.freeDrawingBrush.width = strokeWidth * 2;
        break;
      
      case 'select':
        canvas.selection = true;
        break;
      
      default:
        break;
    }
  };
  
  // Mettre à jour le pinceau quand la couleur change
  const updateBrushColor = useCallback((newColor) => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (canvas && canvas.freeDrawingBrush && ['pencil', 'highlighter'].includes(activeTool)) {
      if (activeTool === 'highlighter') {
        canvas.freeDrawingBrush.color = newColor + '80';
      } else {
        canvas.freeDrawingBrush.color = newColor;
      }
    }
  }, [activeBoard, activeTool]);
  
  // Mettre à jour le pinceau quand la taille change
  const updateBrushSize = useCallback((newSize) => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (canvas && canvas.freeDrawingBrush) {
      if (activeTool === 'highlighter') {
        canvas.freeDrawingBrush.width = newSize * 3;
      } else if (activeTool === 'eraser') {
        canvas.freeDrawingBrush.width = newSize * 2;
      } else {
        canvas.freeDrawingBrush.width = newSize;
      }
    }
  }, [activeBoard, activeTool]);

  // Ajouter du texte - position basée sur les dimensions FIXES
  const addText = () => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const text = new fabric.IText('Texte', {
      id: generateId(),
      left: CANVAS_FIXED_WIDTH / 2 - 30,
      top: CANVAS_FIXED_HEIGHT / 2 - 15,
      fontSize: 24,
      fill: activeColor,
      fontFamily: 'Arial',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // Ajouter une forme - position basée sur les dimensions FIXES
  const addShape = (shapeType) => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    let shape;
    const centerX = CANVAS_FIXED_WIDTH / 2;
    const centerY = CANVAS_FIXED_HEIGHT / 2;
    
    switch (shapeType) {
      case 'rect':
        shape = new fabric.Rect({
          id: generateId(),
          left: centerX - 50,
          top: centerY - 30,
          width: 100,
          height: 60,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: Math.max(strokeWidth, 2),
        });
        break;
      
      case 'circle':
        shape = new fabric.Circle({
          id: generateId(),
          left: centerX - 40,
          top: centerY - 40,
          radius: 40,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: Math.max(strokeWidth, 2),
        });
        break;
      
      case 'arrow':
        shape = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
          id: generateId(),
          stroke: activeColor,
          strokeWidth: strokeWidth,
        });
        break;
      
      default:
        return;
    }
    
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  // Ajouter un post-it - position basée sur les dimensions FIXES
  const addStickyNote = () => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const colors = ['#FFEB3B', '#FF9800', '#4CAF50', '#2196F3', '#E91E63'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const rect = new fabric.Rect({
      width: 150,
      height: 150,
      fill: randomColor,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 5, offsetX: 3, offsetY: 3 }),
    });
    
    const text = new fabric.IText('Note...', {
      left: 10,
      top: 10,
      fontSize: 16,
      fill: '#000000',
    });
    
    const group = new fabric.Group([rect, text], {
      id: generateId(),
      left: CANVAS_FIXED_WIDTH / 2 - 75,
      top: CANVAS_FIXED_HEIGHT / 2 - 75,
    });
    
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

  // Ajouter une image
  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
          if (!canvas) return;
          
          const maxSize = 300;
          if (img.width > maxSize || img.height > maxSize) {
            const scale = maxSize / Math.max(img.width, img.height);
            img.scale(scale);
          }
          
          img.set({
            id: generateId(),
            left: CANVAS_FIXED_WIDTH / 2 - img.getScaledWidth() / 2,
            top: CANVAS_FIXED_HEIGHT / 2 - img.getScaledHeight() / 2,
          });
          
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Undo
  const handleUndo = () => {
    const stack = undoStack[activeBoard] || [];
    if (stack.length < 2) return;
    
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const currentState = stack[stack.length - 1];
    const previousState = stack[stack.length - 2];
    
    setRedoStack(prev => ({
      ...prev,
      [activeBoard]: [...(prev[activeBoard] || []), currentState]
    }));
    
    setUndoStack(prev => ({
      ...prev,
      [activeBoard]: prev[activeBoard].slice(0, -1)
    }));
    
    isLoadingDataRef.current = true;
    canvas.loadFromJSON(previousState).then(() => {
      canvas.renderAll();
      isLoadingDataRef.current = false;
    });
  };

  // Redo
  const handleRedo = () => {
    const stack = redoStack[activeBoard] || [];
    if (stack.length === 0) return;
    
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const nextState = stack[stack.length - 1];
    
    setUndoStack(prev => ({
      ...prev,
      [activeBoard]: [...(prev[activeBoard] || []), nextState]
    }));
    
    setRedoStack(prev => ({
      ...prev,
      [activeBoard]: prev[activeBoard].slice(0, -1)
    }));
    
    isLoadingDataRef.current = true;
    canvas.loadFromJSON(nextState).then(() => {
      canvas.renderAll();
      isLoadingDataRef.current = false;
    });
  };

  // Supprimer l'objet sélectionné
  const deleteSelected = () => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  // Fonction pour retourner au dashboard
  const handleGoBack = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setIsSaving(true);
    try {
      // Sauvegarder les deux tableaux
      const tkn = localStorage.getItem('token');
      const usr = JSON.parse(localStorage.getItem('user') || '{}');
      
      const savePromises = ['board_1', 'board_2'].map(async (boardId) => {
        const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
        if (!canvas) return;
        
        const objects = canvas.toJSON(['id']).objects || [];
        
        await fetch(`${API_URL}/board/${boardId}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tkn}`
          },
          body: JSON.stringify({
            objects,
            user_id: usr?.id,
            user_name: `${usr?.prenom || ''} ${usr?.nom || ''}`.trim()
          })
        });
      });
      
      await Promise.all(savePromises);
      
      toast({
        title: '✅ Sauvegarde effectuée',
        description: 'Vos dessins ont été sauvegardés'
      });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
    
    navigate('/dashboard');
  }, [navigate, toast]);

  // Vérifier les permissions (une seule fois au montage)
  useEffect(() => {
    if (!hasCheckedPermission) {
      setHasCheckedPermission(true);
      if (!canViewWhiteboard) {
        toast({
          title: '⛔ Accès refusé',
          description: 'Vous n\'avez pas la permission d\'accéder au Tableau d\'affichage',
          variant: 'destructive'
        });
        navigate('/dashboard');
      }
    }
  }, [hasCheckedPermission, canViewWhiteboard, toast, navigate]);

  // Si pas de permission, afficher un message de chargement pendant la redirection
  if (!canViewWhiteboard) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Redirection...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden">
      {/* Barre de contrôle minimale */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleGoBack}
          className="bg-white shadow-md hover:bg-gray-100"
          title="Retour au Dashboard"
        >
          <ChevronLeft size={20} />
        </Button>
        
        <Button
          variant={showToolbar ? "default" : "outline"}
          size="icon"
          onClick={() => setShowToolbar(!showToolbar)}
          className={`shadow-md ${showToolbar ? 'bg-purple-600 hover:bg-purple-700' : 'bg-white hover:bg-gray-100'}`}
          title="Palette d'outils"
        >
          <Palette size={20} />
        </Button>
      </div>
      
      {/* Indicateurs de connexion + Dimensions - compact */}
      <div className="absolute top-2 right-2 z-50 flex flex-wrap gap-1 justify-end">
        {/* Info dimensions fixes */}
        <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full shadow-md text-xs text-green-700 font-medium">
          🔒 {CANVAS_FIXED_WIDTH}×{CANVAS_FIXED_HEIGHT}
        </div>
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-md text-xs">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected.board_1 ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="hidden sm:inline">T1</span>
          <span className="text-gray-500">({Math.round(scaleFactors.board_1 * 100)}%)</span>
          {wsConnected.board_1 ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-gray-400" />}
        </div>
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-md text-xs">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected.board_2 ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="hidden sm:inline">T2</span>
          <span className="text-gray-500">({Math.round(scaleFactors.board_2 * 100)}%)</span>
          {wsConnected.board_2 ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-gray-400" />}
        </div>
      </div>
      
      {/* Palette d'outils */}
      {showToolbar && (
        <div className="absolute top-16 left-4 z-50 bg-white rounded-xl shadow-2xl p-4 w-64 max-h-[calc(100vh-100px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Outils</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowToolbar(false)}>
              <X size={18} />
            </Button>
          </div>
          
          {/* Sélection du tableau actif */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Tableau actif</label>
            <div className="flex gap-2">
              <Button
                variant={activeBoard === 'board_1' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveBoard('board_1')}
                className="flex-1"
              >
                Tableau 1
              </Button>
              <Button
                variant={activeBoard === 'board_2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveBoard('board_2')}
                className="flex-1"
              >
                Tableau 2
              </Button>
            </div>
          </div>
          
          {/* Contrôles de zoom/scale */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Affichage ({Math.round(scaleFactors[activeBoard] * 100)}%)</label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleScaleDown(activeBoard)} title="Réduire" className="flex-1">
                <ZoomOut size={16} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleScaleFit(activeBoard)} title="Ajuster à l'écran" className="flex-1">
                <Maximize2 size={16} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleScaleUp(activeBoard)} title="Agrandir" className="flex-1">
                <ZoomIn size={16} />
              </Button>
            </div>
          </div>
          
          {/* Outils de base */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Outils</label>
            <div className="grid grid-cols-4 gap-2">
              <Button variant={activeTool === 'select' ? 'default' : 'outline'} size="icon" onClick={() => setTool('select')} title="Sélection">
                <MousePointer2 size={18} />
              </Button>
              <Button variant={activeTool === 'pencil' ? 'default' : 'outline'} size="icon" onClick={() => setTool('pencil')} title="Crayon">
                <Pencil size={18} />
              </Button>
              <Button variant={activeTool === 'highlighter' ? 'default' : 'outline'} size="icon" onClick={() => setTool('highlighter')} title="Surligneur">
                <Highlighter size={18} />
              </Button>
              <Button variant={activeTool === 'eraser' ? 'default' : 'outline'} size="icon" onClick={() => setTool('eraser')} title="Gomme">
                <Eraser size={18} />
              </Button>
            </div>
          </div>
          
          {/* Formes et éléments */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Formes & Éléments</label>
            <div className="grid grid-cols-4 gap-2">
              <Button variant="outline" size="icon" onClick={addText} title="Texte">
                <Type size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => addShape('rect')} title="Rectangle">
                <Square size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => addShape('circle')} title="Cercle">
                <Circle size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => addShape('arrow')} title="Flèche">
                <ArrowRight size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={addImage} title="Image">
                <ImageIcon size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={addStickyNote} title="Post-it">
                <StickyNote size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={deleteSelected} title="Supprimer">
                <Trash2 size={18} />
              </Button>
            </div>
          </div>
          
          {/* Couleurs */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Couleur</label>
            <div className="flex flex-wrap gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    setActiveColor(color);
                    updateBrushColor(color);
                  }}
                  className={`w-6 h-6 rounded-full border-2 ${activeColor === color ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          {/* Taille du trait */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Taille: {strokeWidth}px</label>
            <div className="flex gap-1">
              {STROKE_SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setStrokeWidth(size);
                    updateBrushSize(size);
                  }}
                  className={`flex-1 h-8 rounded flex items-center justify-center ${strokeWidth === size ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-100 border border-gray-300'}`}
                >
                  <div className="rounded-full bg-black" style={{ width: Math.min(size, 16), height: Math.min(size, 16) }} />
                </button>
              ))}
            </div>
          </div>
          
          {/* Undo/Redo */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Historique</label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={(undoStack[activeBoard]?.length || 0) < 2} className="flex-1">
                <Undo2 size={16} className="mr-1" /> Annuler
              </Button>
              <Button variant="outline" size="sm" onClick={handleRedo} disabled={(redoStack[activeBoard]?.length || 0) === 0} className="flex-1">
                <Redo2 size={16} className="mr-1" /> Rétablir
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Zone des tableaux - utilise tout l'espace disponible */}
      <div className="flex-1 flex flex-col sm:flex-row gap-2 p-2 pt-14 min-h-0">
        {/* Tableau 1 */}
        <div 
          ref={container1Ref}
          className={`flex-1 bg-gray-200 rounded-lg border-4 ${activeBoard === 'board_1' ? 'border-purple-500' : 'border-gray-300'} shadow-lg overflow-auto relative min-h-0`}
          onClick={() => setActiveBoard('board_1')}
        >
          <div className="absolute top-1 left-1 bg-gray-100/90 px-2 py-0.5 rounded text-xs font-medium text-gray-600 z-10 pointer-events-none">
            Tableau 1
          </div>
          {/* Wrapper pour le scale CSS - contient le canvas de taille fixe */}
          <div 
            ref={wrapper1Ref}
            className="bg-white cursor-crosshair"
            style={{ 
              width: CANVAS_FIXED_WIDTH, 
              height: CANVAS_FIXED_HEIGHT,
              transformOrigin: 'top left'
            }}
          />
        </div>
        
        {/* Tableau 2 */}
        <div 
          ref={container2Ref}
          className={`flex-1 bg-gray-200 rounded-lg border-4 ${activeBoard === 'board_2' ? 'border-purple-500' : 'border-gray-300'} shadow-lg overflow-auto relative min-h-0`}
          onClick={() => setActiveBoard('board_2')}
        >
          <div className="absolute top-1 left-1 bg-gray-100/90 px-2 py-0.5 rounded text-xs font-medium text-gray-600 z-10 pointer-events-none">
            Tableau 2
          </div>
          {/* Wrapper pour le scale CSS - contient le canvas de taille fixe */}
          <div 
            ref={wrapper2Ref}
            className="bg-white cursor-crosshair"
            style={{ 
              width: CANVAS_FIXED_WIDTH, 
              height: CANVAS_FIXED_HEIGHT,
              transformOrigin: 'top left'
            }}
          />
        </div>
      </div>
      
      {/* Indicateur de sauvegarde */}
      {isSaving && (
        <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          Sauvegarde en cours...
        </div>
      )}
    </div>
  );
};

export default WhiteboardPage;
