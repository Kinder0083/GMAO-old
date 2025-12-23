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
  WifiOff
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
  
  // Refs pour les canvas
  const container1Ref = useRef(null);
  const container2Ref = useRef(null);
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  
  // Dimensions actuelles des canvas
  const canvasDimensions1Ref = useRef({ width: 800, height: 600 });
  const canvasDimensions2Ref = useRef({ width: 800, height: 600 });
  
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
  const [canvasSizes, setCanvasSizes] = useState({ board_1: { w: 0, h: 0 }, board_2: { w: 0, h: 0 } });

  // Générer un ID unique
  const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // ==================== Normalisation des coordonnées ====================
  // APPROCHE PAR POURCENTAGES: Chaque coordonnée est stockée en pourcentage (0-1)
  // X = pourcentage de la largeur, Y = pourcentage de la hauteur
  // Un point à (0.5, 0.5) sera TOUJOURS au centre, peu importe la taille de l'écran
  
  // Convertir les coordonnées du canvas vers des pourcentages (0-1)
  const normalizeCoordinates = useCallback((objects, canvasWidth, canvasHeight) => {
    return objects.map(obj => {
      const normalized = JSON.parse(JSON.stringify(obj)); // Deep clone
      
      // Positions en pourcentage
      if (normalized.left !== undefined) normalized.left = normalized.left / canvasWidth;
      if (normalized.top !== undefined) normalized.top = normalized.top / canvasHeight;
      
      // Tailles en pourcentage (largeur relative à la largeur du canvas, hauteur relative à la hauteur)
      if (normalized.width !== undefined) normalized.width = normalized.width / canvasWidth;
      if (normalized.height !== undefined) normalized.height = normalized.height / canvasHeight;
      if (normalized.radius !== undefined) normalized.radius = normalized.radius / canvasWidth; // Utiliser la largeur pour les cercles
      if (normalized.rx !== undefined) normalized.rx = normalized.rx / canvasWidth;
      if (normalized.ry !== undefined) normalized.ry = normalized.ry / canvasHeight;
      if (normalized.fontSize !== undefined) normalized.fontSize = normalized.fontSize / canvasHeight;
      if (normalized.strokeWidth !== undefined) normalized.strokeWidth = normalized.strokeWidth / canvasWidth;
      
      // Pour les paths (dessins libres) - alterner X et Y
      if (normalized.path && Array.isArray(normalized.path)) {
        normalized.path = normalized.path.map(cmd => {
          if (!Array.isArray(cmd)) return cmd;
          return cmd.map((val, idx) => {
            if (idx === 0) return val; // Commande (M, L, Q, C, etc.)
            if (typeof val !== 'number') return val;
            // Indices impairs = X (largeur), indices pairs = Y (hauteur)
            return idx % 2 === 1 ? val / canvasWidth : val / canvasHeight;
          });
        });
      }
      
      // Pour les lignes
      if (normalized.x1 !== undefined) normalized.x1 = normalized.x1 / canvasWidth;
      if (normalized.y1 !== undefined) normalized.y1 = normalized.y1 / canvasHeight;
      if (normalized.x2 !== undefined) normalized.x2 = normalized.x2 / canvasWidth;
      if (normalized.y2 !== undefined) normalized.y2 = normalized.y2 / canvasHeight;
      
      // Pour les groupes
      if (normalized.objects && Array.isArray(normalized.objects)) {
        normalized.objects = normalizeCoordinates(normalized.objects, canvasWidth, canvasHeight);
      }
      
      return normalized;
    });
  }, []);
  
  // Convertir les pourcentages vers les coordonnées du canvas (pour affichage)
  const denormalizeCoordinates = useCallback((objects, canvasWidth, canvasHeight) => {
    return objects.map(obj => {
      const denormalized = JSON.parse(JSON.stringify(obj)); // Deep clone
      
      // Positions en pixels
      if (denormalized.left !== undefined) denormalized.left = denormalized.left * canvasWidth;
      if (denormalized.top !== undefined) denormalized.top = denormalized.top * canvasHeight;
      
      // Tailles en pixels
      if (denormalized.width !== undefined) denormalized.width = denormalized.width * canvasWidth;
      if (denormalized.height !== undefined) denormalized.height = denormalized.height * canvasHeight;
      if (denormalized.radius !== undefined) denormalized.radius = denormalized.radius * canvasWidth;
      if (denormalized.rx !== undefined) denormalized.rx = denormalized.rx * canvasWidth;
      if (denormalized.ry !== undefined) denormalized.ry = denormalized.ry * canvasHeight;
      if (denormalized.fontSize !== undefined) denormalized.fontSize = denormalized.fontSize * canvasHeight;
      if (denormalized.strokeWidth !== undefined) denormalized.strokeWidth = denormalized.strokeWidth * canvasWidth;
      
      // Pour les paths (dessins libres) - alterner X et Y
      if (denormalized.path && Array.isArray(denormalized.path)) {
        denormalized.path = denormalized.path.map(cmd => {
          if (!Array.isArray(cmd)) return cmd;
          return cmd.map((val, idx) => {
            if (idx === 0) return val; // Commande (M, L, Q, C, etc.)
            if (typeof val !== 'number') return val;
            // Indices impairs = X (largeur), indices pairs = Y (hauteur)
            return idx % 2 === 1 ? val * canvasWidth : val * canvasHeight;
          });
        });
      }
      
      // Pour les lignes
      if (denormalized.x1 !== undefined) denormalized.x1 = denormalized.x1 * canvasWidth;
      if (denormalized.y1 !== undefined) denormalized.y1 = denormalized.y1 * canvasHeight;
      if (denormalized.x2 !== undefined) denormalized.x2 = denormalized.x2 * canvasWidth;
      if (denormalized.y2 !== undefined) denormalized.y2 = denormalized.y2 * canvasHeight;
      
      // Pour les groupes
      if (denormalized.objects && Array.isArray(denormalized.objects)) {
        denormalized.objects = denormalizeCoordinates(denormalized.objects, canvasWidth, canvasHeight);
      }
      
      return denormalized;
    });
  }, []);

  // ==================== WebSocket ====================
  
  const handleWebSocketMessage = useCallback((boardId, message) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
    
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
          // Dénormaliser les coordonnées avant d'ajouter
          const denormalized = denormalizeCoordinates([message.object], dimensions.width, dimensions.height)[0];
          fabric.util.enlivenObjects([denormalized]).then((objects) => {
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
          const denormalized = denormalizeCoordinates([message.object], dimensions.width, dimensions.height)[0];
          fabric.util.enlivenObjects([denormalized]).then((objects) => {
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
          console.log(`[WS] Réception suppression objet ${message.object_id}`);
          isReceivingRemoteRef.current = true;
          const objToRemove = canvas.getObjects().find(o => o.id === message.object_id);
          if (objToRemove) {
            objToRemove._fromRemote = true; // Marquer comme venant de l'extérieur
            canvas.remove(objToRemove);
            canvas.renderAll();
            console.log(`[WS] Objet ${message.object_id} supprimé avec succès`);
          } else {
            console.log(`[WS] Objet ${message.object_id} non trouvé sur le canvas (peut-être déjà supprimé)`);
          }
          isReceivingRemoteRef.current = false;
        }
        break;
      
      case 'sync_response':
        // DÉSACTIVÉ: Le chargement initial se fait via HTTP (loadBoard)
        // Ce cas ne devrait plus être atteint car on n'envoie plus sync_request
        console.log(`[WS] sync_response reçu mais ignoré - utiliser HTTP pour charger`);
        break;
      
      case 'heartbeat_ack':
        // Réponse au heartbeat, connexion toujours active
        break;
      
      default:
        break;
    }
  }, [toast, denormalizeCoordinates]);
  
  // Référence pour les intervalles de heartbeat
  const heartbeatInterval1Ref = useRef(null);
  const heartbeatInterval2Ref = useRef(null);
  const reconnectTimeout1Ref = useRef(null);
  const reconnectTimeout2Ref = useRef(null);
  
  const connectWebSocket = useCallback((boardId) => {
    const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
    const heartbeatIntervalRef = boardId === 'board_1' ? heartbeatInterval1Ref : heartbeatInterval2Ref;
    const reconnectTimeoutRef = boardId === 'board_1' ? reconnectTimeout1Ref : reconnectTimeout2Ref;
    
    // Nettoyer les anciens timers
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    
    const userId = user?.id || 'anonymous';
    const userName = `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Anonyme';
    const wsUrl = `${WS_URL}/ws/whiteboard/${boardId}?user_id=${userId}&user_name=${encodeURIComponent(userName)}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        setWsConnected(prev => ({ ...prev, [boardId]: true }));
        console.log(`[WS] Connecté à ${boardId}`);
        
        // NE PAS demander de sync - les données sont chargées via HTTP (loadBoard)
        // Le WebSocket sert uniquement pour les mises à jour temps réel
        
        // Démarrer le heartbeat toutes les 30 secondes pour maintenir la connexion
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000);
      };
      
      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        setWsConnected(prev => ({ ...prev, [boardId]: false }));
        wsRef.current = null;
        console.log(`[WS] Déconnecté de ${boardId}`);
        
        // Nettoyer le heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // NE PAS tenter de reconnexion automatique - cela cause des problèmes de duplication
        // L'utilisateur peut rafraîchir la page si nécessaire
      };
      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error(`[WS] Erreur sur ${boardId}:`, error);
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
      console.log(`WebSocket ${boardId} non supporté`);
    }
  }, [user, handleWebSocketMessage]);
  
  const wsConnectionAttemptedRef = useRef(false);
  
  useEffect(() => {
    let timeout;
    
    // Capturer les valeurs actuelles des refs pour le cleanup
    const currentWs1 = ws1Ref.current;
    const currentWs2 = ws2Ref.current;
    const currentHeartbeat1 = heartbeatInterval1Ref.current;
    const currentHeartbeat2 = heartbeatInterval2Ref.current;
    const currentReconnect1 = reconnectTimeout1Ref.current;
    const currentReconnect2 = reconnectTimeout2Ref.current;
    
    if (canvasReady && user?.id && !wsConnectionAttemptedRef.current) {
      wsConnectionAttemptedRef.current = true;
      timeout = setTimeout(() => {
        connectWebSocket('board_1');
        connectWebSocket('board_2');
      }, 1000);
    }
    
    return () => {
      // Nettoyer les timers et fermer les connexions
      if (timeout) clearTimeout(timeout);
      
      // Fermer les WebSockets
      if (currentWs1) currentWs1.close();
      if (currentWs2) currentWs2.close();
      
      // Nettoyer les heartbeats
      if (currentHeartbeat1) clearInterval(currentHeartbeat1);
      if (currentHeartbeat2) clearInterval(currentHeartbeat2);
      
      // Nettoyer les reconnexions
      if (currentReconnect1) clearTimeout(currentReconnect1);
      if (currentReconnect2) clearTimeout(currentReconnect2);
    };
  }, [canvasReady, user?.id, connectWebSocket]);

  // ==================== Sauvegarde ====================

  const saveBoard = useCallback(async (boardId) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
    if (!canvas || !token || isLoadingDataRef.current) return;
    
    setIsSaving(true);
    
    try {
      const rawObjects = canvas.toJSON(['id']).objects || [];
      // Normaliser les coordonnées avant sauvegarde
      const normalizedObjects = normalizeCoordinates(rawObjects, dimensions.width, dimensions.height);
      
      const response = await fetch(`${API_URL}/board/${boardId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          objects: normalizedObjects,
          user_id: user?.id,
          user_name: `${user?.prenom || ''} ${user?.nom || ''}`.trim()
        })
      });
      
      if (response.ok) {
        console.log(`Tableau ${boardId} sauvegardé`);
      }
    } catch (error) {
      console.error(`Erreur sauvegarde ${boardId}:`, error);
    } finally {
      setIsSaving(false);
    }
  }, [token, user, normalizeCoordinates]);

  const debouncedSave = useCallback((boardId) => {
    if (isLoadingDataRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveBoard(boardId);
    }, 1500);
  }, [saveBoard]);

  const loadBoard = useCallback(async (boardId) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
    if (!canvas || !token) return;
    
    // Éviter les chargements multiples simultanés
    if (isLoadingDataRef.current) return;
    isLoadingDataRef.current = true;
    
    try {
      const response = await fetch(`${API_URL}/board/${boardId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const serverObjects = data.objects || [];
        
        // Obtenir les objets actuels du canvas
        const currentObjects = canvas.getObjects();
        const currentIds = new Set(currentObjects.map(o => o.id).filter(Boolean));
        const serverIds = new Set(serverObjects.map(o => o.id).filter(Boolean));
        
        // Trouver les différences
        const toAdd = serverObjects.filter(o => o.id && !currentIds.has(o.id));
        const toRemove = currentObjects.filter(o => o.id && !serverIds.has(o.id));
        
        // Si le canvas est vide et on a des données serveur, charger tout
        if (currentObjects.length === 0 && serverObjects.length > 0) {
          canvas.backgroundColor = '#FFFFFF';
          const denormalizedObjects = denormalizeCoordinates(serverObjects, dimensions.width, dimensions.height);
          
          await canvas.loadFromJSON({
            version: '6.0.0',
            objects: denormalizedObjects,
            background: '#FFFFFF'
          });
          canvas.renderAll();
          console.log(`Tableau ${boardId} chargé avec ${serverObjects.length} objets`);
        } else {
          // Sinon, faire des mises à jour incrémentales
          let hasChanges = false;
          
          // Supprimer les objets qui n'existent plus sur le serveur
          for (const obj of toRemove) {
            canvas.remove(obj);
            hasChanges = true;
            console.log(`[Sync] Objet ${obj.id} supprimé (n'existe plus sur serveur)`);
          }
          
          // Ajouter les nouveaux objets du serveur
          if (toAdd.length > 0) {
            const denormalized = denormalizeCoordinates(toAdd, dimensions.width, dimensions.height);
            const enlivened = await fabric.util.enlivenObjects(denormalized);
            for (let i = 0; i < enlivened.length; i++) {
              enlivened[i].id = toAdd[i].id;
              enlivened[i]._fromRemote = true;
              canvas.add(enlivened[i]);
              hasChanges = true;
              console.log(`[Sync] Objet ${toAdd[i].id} ajouté depuis serveur`);
            }
          }
          
          if (hasChanges) {
            canvas.renderAll();
          }
        }
        
        setIsConnected(prev => ({ ...prev, [boardId]: true }));
      }
    } catch (error) {
      console.error(`Erreur chargement ${boardId}:`, error);
    } finally {
      isLoadingDataRef.current = false;
    }
  }, [token, denormalizeCoordinates]);

  // ==================== Polling de secours (comme Chat Live) ====================
  // Si WebSocket déconnecté, recharger les données toutes les 5 secondes
  
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      // Si au moins un WebSocket est déconnecté, recharger ce board
      if (!wsConnected.board_1 && canvas1Ref.current && !isLoadingDataRef.current) {
        console.log('[Polling] Rechargement board_1...');
        loadBoard('board_1');
      }
      if (!wsConnected.board_2 && canvas2Ref.current && !isLoadingDataRef.current) {
        console.log('[Polling] Rechargement board_2...');
        loadBoard('board_2');
      }
    }, 5000);
    
    return () => clearInterval(pollingInterval);
  }, [wsConnected.board_1, wsConnected.board_2, loadBoard]);

  // ==================== Initialisation Canvas ====================

  const initCanvas = useCallback((containerEl, boardId) => {
    if (!containerEl) return null;
    
    // Prendre EXACTEMENT les dimensions du conteneur
    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    
    // Stocker les dimensions
    if (boardId === 'board_1') {
      canvasDimensions1Ref.current = { width, height };
    } else {
      canvasDimensions2Ref.current = { width, height };
    }
    
    setCanvasSizes(prev => ({ ...prev, [boardId]: { w: width, h: height } }));
    
    const canvasEl = document.createElement('canvas');
    canvasEl.id = `canvas-${boardId}`;
    containerEl.innerHTML = '';
    containerEl.appendChild(canvasEl);
    
    const fabricCanvas = new fabric.Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#FFFFFF',
      isDrawingMode: false,
      selection: true,
    });
    
    // Événements avec sauvegarde normalisée
    const setupSaveHandler = () => {
      const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
        if (canvas && !isLoadingDataRef.current) {
          const rawObjects = canvas.toJSON(['id']).objects || [];
          const normalizedObjects = normalizeCoordinates(rawObjects, dimensions.width, dimensions.height);
          const tkn = localStorage.getItem('token');
          const usr = JSON.parse(localStorage.getItem('user') || '{}');
          
          fetch(`${API_URL}/board/${boardId}/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tkn}`
            },
            body: JSON.stringify({
              objects: normalizedObjects,
              user_id: usr?.id,
              user_name: `${usr?.prenom || ''} ${usr?.nom || ''}`.trim()
            })
          }).then(() => console.log(`Tableau ${boardId} sauvegardé`));
        }
      }, 1500);
    };
    
    fabricCanvas.on('object:added', (e) => {
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const obj = e.target;
        if (!obj.id) {
          obj.id = generateId();
        }
        
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Envoyer via WebSocket - le backend sauvegarde automatiquement
          const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
          const normalized = normalizeCoordinates([obj.toJSON(['id'])], dimensions.width, dimensions.height)[0];
          wsRef.current.send(JSON.stringify({
            type: 'object_added',
            object: normalized,
            object_id: obj.id
          }));
          // PAS de setupSaveHandler() - le backend sauvegarde via WebSocket
        } else {
          // Fallback HTTP si WebSocket déconnecté
          setupSaveHandler();
        }
      }
    });
    
    fabricCanvas.on('object:modified', (e) => {
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const obj = e.target;
        
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Envoyer via WebSocket - le backend sauvegarde automatiquement
          const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
          const normalized = normalizeCoordinates([obj.toJSON(['id'])], dimensions.width, dimensions.height)[0];
          wsRef.current.send(JSON.stringify({
            type: 'object_modified',
            object: normalized,
            object_id: obj.id
          }));
          // PAS de setupSaveHandler() - le backend sauvegarde via WebSocket
        } else {
          // Fallback HTTP si WebSocket déconnecté
          setupSaveHandler();
        }
      }
    });
    
    fabricCanvas.on('object:removed', (e) => {
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const obj = e.target;
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && obj.id) {
          // Envoyer via WebSocket - le backend supprime automatiquement
          console.log(`[WS] Envoi suppression objet ${obj.id} vers ${boardId}`);
          wsRef.current.send(JSON.stringify({
            type: 'object_removed',
            object_id: obj.id
          }));
          // PAS de setupSaveHandler() - le backend supprime via WebSocket
        } else if (obj.id) {
          // Fallback HTTP si WebSocket déconnecté
          setupSaveHandler();
        }
      }
    });
    
    fabricCanvas.on('path:created', (e) => {
      if (e.path && !isLoadingDataRef.current && !isReceivingRemoteRef.current) {
        const path = e.path;
        path.id = generateId();
        
        const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
          const normalized = normalizeCoordinates([path.toJSON(['id'])], dimensions.width, dimensions.height)[0];
          wsRef.current.send(JSON.stringify({
            type: 'object_added',
            object: normalized,
            object_id: path.id
          }));
        }
        
        setupSaveHandler();
      }
    });
    
    return fabricCanvas;
  }, [normalizeCoordinates]);

  // Initialisation
  useEffect(() => {
    let mounted = true;
    
    const initializeCanvases = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!mounted) return;
      
      if (container1Ref.current && !canvas1Ref.current) {
        canvas1Ref.current = initCanvas(container1Ref.current, 'board_1');
      }
      if (container2Ref.current && !canvas2Ref.current) {
        canvas2Ref.current = initCanvas(container2Ref.current, 'board_2');
      }
      
      if (canvas1Ref.current && canvas2Ref.current) {
        setCanvasReady(true);
        
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
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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

  // Redimensionnement
  useEffect(() => {
    const handleResize = async () => {
      for (const { canvas, container, boardId, dimensionsRef } of [
        { canvas: canvas1Ref.current, container: container1Ref.current, boardId: 'board_1', dimensionsRef: canvasDimensions1Ref },
        { canvas: canvas2Ref.current, container: container2Ref.current, boardId: 'board_2', dimensionsRef: canvasDimensions2Ref }
      ]) {
        if (!canvas || !container) continue;
        
        const oldDimensions = { ...dimensionsRef.current };
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        if (newWidth === oldDimensions.width && newHeight === oldDimensions.height) continue;
        
        // Sauvegarder les objets avec anciennes dimensions
        const rawObjects = canvas.toJSON(['id']).objects || [];
        const normalizedObjects = normalizeCoordinates(rawObjects, oldDimensions.width, oldDimensions.height);
        
        // Mettre à jour les dimensions
        dimensionsRef.current = { width: newWidth, height: newHeight };
        setCanvasSizes(prev => ({ ...prev, [boardId]: { w: newWidth, h: newHeight } }));
        
        // Redimensionner le canvas
        canvas.setDimensions({ width: newWidth, height: newHeight });
        
        // Recharger les objets avec nouvelles dimensions
        if (normalizedObjects.length > 0) {
          const denormalizedObjects = denormalizeCoordinates(normalizedObjects, newWidth, newHeight);
          canvas.clear();
          canvas.backgroundColor = '#FFFFFF';
          await canvas.loadFromJSON({
            version: '6.0.0',
            objects: denormalizedObjects,
            background: '#FFFFFF'
          });
        }
        
        canvas.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasReady, normalizeCoordinates, denormalizeCoordinates]);

  // Gestionnaire clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        
        const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
        if (!canvas) return;
        
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isEditing) return;
        
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          activeObjects.forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [activeBoard]);

  // Outils
  const setTool = (tool, color = null) => {
    setActiveTool(tool);
    
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
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
  
  const updateBrushColor = useCallback((newColor) => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (canvas && canvas.freeDrawingBrush && ['pencil', 'highlighter'].includes(activeTool)) {
      canvas.freeDrawingBrush.color = activeTool === 'highlighter' ? newColor + '80' : newColor;
    }
  }, [activeBoard, activeTool]);
  
  const updateBrushSize = useCallback((newSize) => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (canvas && canvas.freeDrawingBrush) {
      const multiplier = activeTool === 'highlighter' ? 3 : activeTool === 'eraser' ? 2 : 1;
      canvas.freeDrawingBrush.width = newSize * multiplier;
    }
  }, [activeBoard, activeTool]);

  // Ajout d'éléments
  const addText = () => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const text = new fabric.IText('Texte', {
      id: generateId(),
      left: canvas.width / 2 - 30,
      top: canvas.height / 2 - 15,
      fontSize: 24,
      fill: activeColor,
      fontFamily: 'Arial',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addShape = (shapeType) => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    let shape;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
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

  const addStickyNote = () => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const colors = ['#FFEB3B', '#FF9800', '#4CAF50', '#2196F3', '#E91E63'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const rect = new fabric.Rect({
      width: 120,
      height: 120,
      fill: randomColor,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 5, offsetX: 3, offsetY: 3 }),
    });
    
    const text = new fabric.IText('Note...', {
      left: 10,
      top: 10,
      fontSize: 14,
      fill: '#000000',
    });
    
    const group = new fabric.Group([rect, text], {
      id: generateId(),
      left: canvas.width / 2 - 60,
      top: canvas.height / 2 - 60,
    });
    
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

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
          
          const maxSize = Math.min(canvas.width, canvas.height) * 0.4;
          if (img.width > maxSize || img.height > maxSize) {
            const scale = maxSize / Math.max(img.width, img.height);
            img.scale(scale);
          }
          
          img.set({
            id: generateId(),
            left: canvas.width / 2 - img.getScaledWidth() / 2,
            top: canvas.height / 2 - img.getScaledHeight() / 2,
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

  const deleteSelected = () => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const handleGoBack = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setIsSaving(true);
    try {
      const tkn = localStorage.getItem('token');
      const usr = JSON.parse(localStorage.getItem('user') || '{}');
      
      await Promise.all(['board_1', 'board_2'].map(async (boardId) => {
        const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
        const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
        if (!canvas) return;
        
        const rawObjects = canvas.toJSON(['id']).objects || [];
        const normalizedObjects = normalizeCoordinates(rawObjects, dimensions.width, dimensions.height);
        
        await fetch(`${API_URL}/board/${boardId}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tkn}`
          },
          body: JSON.stringify({
            objects: normalizedObjects,
            user_id: usr?.id,
            user_name: `${usr?.prenom || ''} ${usr?.nom || ''}`.trim()
          })
        });
      }));
      
      toast({
        title: '✅ Sauvegarde effectuée',
        description: 'Vos dessins ont été sauvegardés'
      });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
    
    navigate('/dashboard');
  }, [navigate, toast, normalizeCoordinates]);

  // Permissions
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

  if (!canViewWhiteboard) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Redirection...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden h-full">
      {/* Barre de contrôle */}
      <div className="absolute top-2 left-2 z-50 flex gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleGoBack}
          className="bg-white shadow-md hover:bg-gray-100 h-8 w-8"
          title="Retour au Dashboard"
        >
          <ChevronLeft size={18} />
        </Button>
        
        <Button
          variant={showToolbar ? "default" : "outline"}
          size="icon"
          onClick={() => setShowToolbar(!showToolbar)}
          className={`shadow-md h-8 w-8 ${showToolbar ? 'bg-purple-600 hover:bg-purple-700' : 'bg-white hover:bg-gray-100'}`}
          title="Palette d'outils"
        >
          <Palette size={18} />
        </Button>
      </div>
      
      {/* Indicateurs */}
      <div className="absolute top-2 right-2 z-50 flex flex-wrap gap-1 justify-end">
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-md text-xs">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected.board_1 ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>T1</span>
          <span className="text-gray-400">{canvasSizes.board_1.w}×{canvasSizes.board_1.h}px</span>
          {wsConnected.board_1 ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} className="text-gray-400" />}
        </div>
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-md text-xs">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected.board_2 ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>T2</span>
          <span className="text-gray-400">{canvasSizes.board_2.w}×{canvasSizes.board_2.h}px</span>
          {wsConnected.board_2 ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} className="text-gray-400" />}
        </div>
      </div>
      
      {/* Palette d'outils */}
      {showToolbar && (
        <div className="absolute top-12 left-2 z-50 bg-white rounded-xl shadow-2xl p-3 w-56 max-h-[calc(100vh-60px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">Outils</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowToolbar(false)} className="h-6 w-6">
              <X size={14} />
            </Button>
          </div>
          
          {/* Sélection du tableau actif */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">Tableau actif</label>
            <div className="flex gap-1">
              <Button
                variant={activeBoard === 'board_1' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveBoard('board_1')}
                className="flex-1 h-7 text-xs"
              >
                Tableau 1
              </Button>
              <Button
                variant={activeBoard === 'board_2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveBoard('board_2')}
                className="flex-1 h-7 text-xs"
              >
                Tableau 2
              </Button>
            </div>
          </div>
          
          {/* Outils de base */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">Outils</label>
            <div className="grid grid-cols-4 gap-1">
              <Button variant={activeTool === 'select' ? 'default' : 'outline'} size="icon" onClick={() => setTool('select')} title="Sélection" className="h-8 w-8">
                <MousePointer2 size={16} />
              </Button>
              <Button variant={activeTool === 'pencil' ? 'default' : 'outline'} size="icon" onClick={() => setTool('pencil')} title="Crayon" className="h-8 w-8">
                <Pencil size={16} />
              </Button>
              <Button variant={activeTool === 'highlighter' ? 'default' : 'outline'} size="icon" onClick={() => setTool('highlighter')} title="Surligneur" className="h-8 w-8">
                <Highlighter size={16} />
              </Button>
              <Button variant={activeTool === 'eraser' ? 'default' : 'outline'} size="icon" onClick={() => setTool('eraser')} title="Gomme" className="h-8 w-8">
                <Eraser size={16} />
              </Button>
            </div>
          </div>
          
          {/* Formes et éléments */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">Formes & Éléments</label>
            <div className="grid grid-cols-4 gap-1">
              <Button variant="outline" size="icon" onClick={addText} title="Texte" className="h-8 w-8">
                <Type size={16} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => addShape('rect')} title="Rectangle" className="h-8 w-8">
                <Square size={16} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => addShape('circle')} title="Cercle" className="h-8 w-8">
                <Circle size={16} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => addShape('arrow')} title="Flèche" className="h-8 w-8">
                <ArrowRight size={16} />
              </Button>
              <Button variant="outline" size="icon" onClick={addImage} title="Image" className="h-8 w-8">
                <ImageIcon size={16} />
              </Button>
              <Button variant="outline" size="icon" onClick={addStickyNote} title="Post-it" className="h-8 w-8">
                <StickyNote size={16} />
              </Button>
              <Button variant="outline" size="icon" onClick={deleteSelected} title="Supprimer" className="h-8 w-8">
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
          
          {/* Couleurs */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">Couleur</label>
            <div className="flex flex-wrap gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    setActiveColor(color);
                    updateBrushColor(color);
                  }}
                  className={`w-5 h-5 rounded-full border-2 ${activeColor === color ? 'border-purple-500 ring-1 ring-purple-300' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          {/* Taille du trait */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">Taille: {strokeWidth}px</label>
            <div className="flex gap-1">
              {STROKE_SIZES.slice(0, 5).map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setStrokeWidth(size);
                    updateBrushSize(size);
                  }}
                  className={`flex-1 h-6 rounded flex items-center justify-center ${strokeWidth === size ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-100 border border-gray-300'}`}
                >
                  <div className="rounded-full bg-black" style={{ width: Math.min(size, 12), height: Math.min(size, 12) }} />
                </button>
              ))}
            </div>
          </div>
          
          {/* Undo/Redo */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Historique</label>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={(undoStack[activeBoard]?.length || 0) < 2} className="flex-1 h-7 text-xs">
                <Undo2 size={14} className="mr-1" /> Annuler
              </Button>
              <Button variant="outline" size="sm" onClick={handleRedo} disabled={(redoStack[activeBoard]?.length || 0) === 0} className="flex-1 h-7 text-xs">
                <Redo2 size={14} className="mr-1" /> Rétablir
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Zone des tableaux - REMPLIT TOUT L'ESPACE */}
      {/* En mode mobile (flex-col): chaque tableau prend exactement 50% de la hauteur disponible */}
      {/* En mode desktop (flex-row): chaque tableau prend 50% de la largeur et 100% hauteur */}
      <div 
        className="flex flex-col sm:flex-row gap-2 p-2 pt-12 overflow-hidden"
        style={{ height: 'calc(100vh - 8px)' }}
      >
        {/* Tableau 1 */}
        <div 
          ref={container1Ref}
          className={`rounded-lg border-4 ${activeBoard === 'board_1' ? 'border-purple-500' : 'border-gray-300'} shadow-lg relative bg-white cursor-crosshair overflow-hidden flex-1 h-[calc((100vh-64px)/2)] sm:h-auto`}
          onClick={() => setActiveBoard('board_1')}
        >
          <div className="absolute top-1 left-1 bg-white/80 px-2 py-0.5 rounded text-xs font-medium text-gray-600 z-10 pointer-events-none">
            Tableau 1
          </div>
        </div>
        
        {/* Tableau 2 */}
        <div 
          ref={container2Ref}
          className={`rounded-lg border-4 ${activeBoard === 'board_2' ? 'border-purple-500' : 'border-gray-300'} shadow-lg relative bg-white cursor-crosshair overflow-hidden flex-1 h-[calc((100vh-64px)/2)] sm:h-auto`}
          onClick={() => setActiveBoard('board_2')}
        >
          <div className="absolute top-1 left-1 bg-white/80 px-2 py-0.5 rounded text-xs font-medium text-gray-600 z-10 pointer-events-none">
            Tableau 2
          </div>
        </div>
      </div>
      
      {/* Indicateur de sauvegarde */}
      {isSaving && (
        <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
          Sauvegarde...
        </div>
      )}
    </div>
  );
};

export default WhiteboardPage;
