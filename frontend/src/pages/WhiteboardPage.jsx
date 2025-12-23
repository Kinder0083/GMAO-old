import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, Rect, Circle as FabricCircle, IText, FabricObject } from 'fabric';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import {
  Pencil,
  Eraser,
  Type,
  Square,
  Circle,
  ChevronLeft,
  X,
  MousePointer2,
  Trash2,
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
  
  // Récupérer l'utilisateur depuis localStorage
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [token] = useState(() => localStorage.getItem('token'));
  
  // Vérifier les permissions
  const canViewWhiteboard = user?.permissions?.whiteboard?.view ?? false;
  const [hasCheckedPermission, setHasCheckedPermission] = useState(false);
  
  // Refs pour les containers DOM
  const container1Ref = useRef(null);
  const container2Ref = useRef(null);
  
  // States pour les canvas Fabric.js
  const [canvas1, setCanvas1] = useState(null);
  const [canvas2, setCanvas2] = useState(null);
  
  // Dimensions actuelles des canvas (pour le système de pourcentage)
  const canvasDimensions1Ref = useRef({ width: 800, height: 600 });
  const canvasDimensions2Ref = useRef({ width: 800, height: 600 });
  
  // Refs pour WebSocket
  const ws1Ref = useRef(null);
  const ws2Ref = useRef(null);
  
  // Refs pour éviter les boucles infinies
  const isApplyingRemoteChangeRef = useRef(false);
  
  // États
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [activeColor, setActiveColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [activeBoard, setActiveBoard] = useState('board_1');
  const [connectedUsers, setConnectedUsers] = useState({ board_1: [], board_2: [] });
  const [wsConnected, setWsConnected] = useState({ board_1: false, board_2: false });

  // ==================== SYSTÈME DE POURCENTAGES ====================
  
  // Convertir coordonnées canvas → pourcentages (pour envoi au backend)
  const normalizeCoordinates = useCallback((obj, canvasWidth, canvasHeight) => {
    const normalized = {};
    
    if (obj.left !== undefined) normalized.left = obj.left / canvasWidth;
    if (obj.top !== undefined) normalized.top = obj.top / canvasHeight;
    if (obj.width !== undefined) normalized.width = obj.width / canvasWidth;
    if (obj.height !== undefined) normalized.height = obj.height / canvasHeight;
    if (obj.radius !== undefined) normalized.radius = obj.radius / canvasWidth;
    if (obj.rx !== undefined) normalized.rx = obj.rx / canvasWidth;
    if (obj.ry !== undefined) normalized.ry = obj.ry / canvasHeight;
    if (obj.fontSize !== undefined) normalized.fontSize = obj.fontSize / canvasHeight;
    if (obj.strokeWidth !== undefined) normalized.strokeWidth = obj.strokeWidth / canvasWidth;
    
    // Pour les paths (dessins libres)
    if (obj.path && Array.isArray(obj.path)) {
      normalized.path = obj.path.map(cmd => {
        if (!Array.isArray(cmd)) return cmd;
        return cmd.map((val, idx) => {
          if (idx === 0) return val;
          if (typeof val !== 'number') return val;
          return idx % 2 === 1 ? val / canvasWidth : val / canvasHeight;
        });
      });
    }
    
    // Pour les lignes
    if (obj.x1 !== undefined) normalized.x1 = obj.x1 / canvasWidth;
    if (obj.y1 !== undefined) normalized.y1 = obj.y1 / canvasHeight;
    if (obj.x2 !== undefined) normalized.x2 = obj.x2 / canvasWidth;
    if (obj.y2 !== undefined) normalized.y2 = obj.y2 / canvasHeight;
    
    // Copier les autres propriétés
    Object.keys(obj).forEach(key => {
      if (normalized[key] === undefined) {
        normalized[key] = obj[key];
      }
    });
    
    return normalized;
  }, []);
  
  // Convertir pourcentages → coordonnées canvas (pour affichage)
  const denormalizeCoordinates = useCallback((obj, canvasWidth, canvasHeight) => {
    const denormalized = {};
    
    if (obj.left !== undefined) denormalized.left = obj.left * canvasWidth;
    if (obj.top !== undefined) denormalized.top = obj.top * canvasHeight;
    if (obj.width !== undefined) denormalized.width = obj.width * canvasWidth;
    if (obj.height !== undefined) denormalized.height = obj.height * canvasHeight;
    if (obj.radius !== undefined) denormalized.radius = obj.radius * canvasWidth;
    if (obj.rx !== undefined) denormalized.rx = obj.rx * canvasWidth;
    if (obj.ry !== undefined) denormalized.ry = obj.ry * canvasHeight;
    if (obj.fontSize !== undefined) denormalized.fontSize = obj.fontSize * canvasHeight;
    if (obj.strokeWidth !== undefined) denormalized.strokeWidth = obj.strokeWidth * canvasWidth;
    
    // Pour les paths
    if (obj.path && Array.isArray(obj.path)) {
      denormalized.path = obj.path.map(cmd => {
        if (!Array.isArray(cmd)) return cmd;
        return cmd.map((val, idx) => {
          if (idx === 0) return val;
          if (typeof val !== 'number') return val;
          return idx % 2 === 1 ? val * canvasWidth : val * canvasHeight;
        });
      });
    }
    
    // Pour les lignes
    if (obj.x1 !== undefined) denormalized.x1 = obj.x1 * canvasWidth;
    if (obj.y1 !== undefined) denormalized.y1 = obj.y1 * canvasHeight;
    if (obj.x2 !== undefined) denormalized.x2 = obj.x2 * canvasWidth;
    if (obj.y2 !== undefined) denormalized.y2 = obj.y2 * canvasHeight;
    
    // Copier les autres propriétés
    Object.keys(obj).forEach(key => {
      if (denormalized[key] === undefined) {
        denormalized[key] = obj[key];
      }
    });
    
    return denormalized;
  }, []);

  // ==================== API CALLS ====================
  
  const createObjectAPI = useCallback(async (boardId, fabricObject) => {
    if (!token || !fabricObject) return null;
    const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
    
    try {
      const rawObject = fabricObject.toJSON(['id']);
      const normalizedData = normalizeCoordinates(rawObject, dimensions.width, dimensions.height);
      
      const response = await fetch(`${API_URL}/objects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          board_id: boardId,
          object_data: normalizedData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[API ${boardId}] Objet créé:`, data.object_id);
        fabricObject.id = data.object_id;
        return data.object_id;
      }
    } catch (error) {
      console.error(`[API ${boardId}] Erreur création objet:`, error);
    }
    
    return null;
  }, [token, normalizeCoordinates]);

  const updateObjectAPI = useCallback(async (boardId, fabricObject) => {
    if (!token || !fabricObject || !fabricObject.id) return;
    const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
    
    try {
      const rawObject = fabricObject.toJSON(['id']);
      const normalizedData = normalizeCoordinates(rawObject, dimensions.width, dimensions.height);
      
      const response = await fetch(`${API_URL}/objects/${fabricObject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          object_data: normalizedData
        })
      });
      
      if (response.ok) {
        console.log(`[API ${boardId}] Objet mis à jour:`, fabricObject.id);
      }
    } catch (error) {
      console.error(`[API ${boardId}] Erreur modification objet:`, error);
    }
  }, [token, normalizeCoordinates]);

  const deleteObjectAPI = useCallback(async (boardId, objectId) => {
    if (!token || !objectId) return;
    
    try {
      const response = await fetch(`${API_URL}/objects/${objectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        console.log(`[API ${boardId}] Objet supprimé:`, objectId);
      }
    } catch (error) {
      console.error(`[API ${boardId}] Erreur suppression objet:`, error);
    }
  }, [token]);

  const loadBoardFromAPI = useCallback(async (boardId) => {
    const canvas = boardId === 'board_1' ? canvas1 : canvas2;
    const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
    if (!canvas || !token) return;
    
    try {
      const response = await fetch(`${API_URL}/objects/${boardId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const objects = data.objects || [];
        
        console.log(`[API ${boardId}] ${objects.length} objets chargés`);
        
        isApplyingRemoteChangeRef.current = true;
        canvas.clear();
        
        for (const obj of objects) {
          const denormalized = denormalizeCoordinates(obj.object_data, dimensions.width, dimensions.height);
          
          // Créer l'objet Fabric.js en fonction du type
          let fabricObj = null;
          if (denormalized.type === 'rect') {
            fabricObj = new Rect(denormalized);
          } else if (denormalized.type === 'circle') {
            fabricObj = new FabricCircle(denormalized);
          } else if (denormalized.type === 'i-text') {
            fabricObj = new IText(denormalized.text || '', denormalized);
          } else if (denormalized.type === 'path') {
            fabricObj = FabricObject.fromObject(denormalized);
          }
          
          if (fabricObj) {
            fabricObj.id = obj.id;
            canvas.add(fabricObj);
          }
        }
        
        canvas.renderAll();
        
        setTimeout(() => {
          isApplyingRemoteChangeRef.current = false;
        }, 100);
      }
    } catch (error) {
      console.error(`[API ${boardId}] Erreur chargement:`, error);
    }
  }, [canvas1, canvas2, token, denormalizeCoordinates]);

  // ==================== WEBSOCKET ====================
  
  const handleWebSocketMessage = useCallback((boardId, message) => {
    const canvas = boardId === 'board_1' ? canvas1 : canvas2;
    const dimensions = boardId === 'board_1' ? canvasDimensions1Ref.current : canvasDimensions2Ref.current;
    if (!canvas) return;
    
    console.log(`[WS ${boardId}] Message reçu:`, message.type);
    
    isApplyingRemoteChangeRef.current = true;
    
    try {
      if (message.type === 'object_added') {
        const denormalized = denormalizeCoordinates(message.object_data, dimensions.width, dimensions.height);
        
        let fabricObj = null;
        if (denormalized.type === 'rect') {
          fabricObj = new Rect(denormalized);
        } else if (denormalized.type === 'circle') {
          fabricObj = new FabricCircle(denormalized);
        } else if (denormalized.type === 'i-text') {
          fabricObj = new IText(denormalized.text || '', denormalized);
        } else if (denormalized.type === 'path') {
          fabricObj = FabricObject.fromObject(denormalized);
        }
        
        if (fabricObj) {
          fabricObj.id = message.object_id;
          canvas.add(fabricObj);
          canvas.renderAll();
          console.log(`[WS ${boardId}] Objet ajouté:`, message.object_id);
        }
        
      } else if (message.type === 'object_modified') {
        const existingObj = canvas.getObjects().find(o => o.id === message.object_id);
        if (existingObj) {
          const denormalized = denormalizeCoordinates(message.object_data, dimensions.width, dimensions.height);
          existingObj.set(denormalized);
          canvas.renderAll();
          console.log(`[WS ${boardId}] Objet modifié:`, message.object_id);
        }
        
      } else if (message.type === 'object_removed') {
        const objToRemove = canvas.getObjects().find(o => o.id === message.object_id);
        if (objToRemove) {
          canvas.remove(objToRemove);
          canvas.renderAll();
          console.log(`[WS ${boardId}] Objet supprimé:`, message.object_id);
        } else {
          console.warn(`[WS ${boardId}] Objet non trouvé pour suppression:`, message.object_id);
          loadBoardFromAPI(boardId);
        }
        
      } else if (message.type === 'board_cleared') {
        canvas.clear();
        canvas.renderAll();
        console.log(`[WS ${boardId}] Tableau effacé`);
        
      } else if (message.type === 'user_joined' || message.type === 'user_left' || message.type === 'users_list') {
        if (message.users) {
          setConnectedUsers(prev => ({ ...prev, [boardId]: message.users }));
        }
      }
    } finally {
      setTimeout(() => {
        isApplyingRemoteChangeRef.current = false;
      }, 100);
    }
  }, [canvas1, canvas2, denormalizeCoordinates, loadBoardFromAPI]);

  const connectWebSocket = useCallback((boardId) => {
    if (!user?.id) return;
    
    const wsRef = boardId === 'board_1' ? ws1Ref : ws2Ref;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    const wsUrl = `${WS_URL}/ws/whiteboard/${boardId}?user_id=${user.id}&user_name=${encodeURIComponent(`${user.prenom || ''} ${user.nom || ''}`.trim() || user.email)}`;
    console.log(`[WS ${boardId}] Connexion à:`, wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`[WS ${boardId}] Connecté ✅`);
      setWsConnected(prev => ({ ...prev, [boardId]: true }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(boardId, message);
    };
    
    ws.onerror = (error) => {
      console.error(`[WS ${boardId}] Erreur:`, error);
      setWsConnected(prev => ({ ...prev, [boardId]: false }));
    };
    
    ws.onclose = () => {
      console.log(`[WS ${boardId}] Déconnecté`);
      setWsConnected(prev => ({ ...prev, [boardId]: false }));
      
      setTimeout(() => connectWebSocket(boardId), 3000);
    };
    
    wsRef.current = ws;
  }, [user, handleWebSocketMessage]);

  // ==================== INITIALISATION CANVAS ====================
  
  useEffect(() => {
    if (!canViewWhiteboard) {
      if (!hasCheckedPermission) {
        setHasCheckedPermission(true);
        toast({
          variant: "destructive",
          title: "Accès refusé",
          description: "Vous n'avez pas la permission d'accéder au tableau d'affichage."
        });
        navigate('/');
      }
      return;
    }
    
    // Initialiser Canvas 1
    if (container1Ref.current && !canvas1) {
      const width = container1Ref.current.offsetWidth;
      const height = container1Ref.current.offsetHeight;
      
      canvasDimensions1Ref.current = { width, height };
      
      const fabricCanvas = new Canvas('canvas-board_1', {
        width,
        height,
        backgroundColor: '#ffffff',
        isDrawingMode: false,
        selection: true
      });
      
      setCanvas1(fabricCanvas);
      console.log('[Canvas board_1] Initialisé ✅');
    }
    
    // Initialiser Canvas 2
    if (container2Ref.current && !canvas2) {
      const width = container2Ref.current.offsetWidth;
      const height = container2Ref.current.offsetHeight;
      
      canvasDimensions2Ref.current = { width, height };
      
      const fabricCanvas = new Canvas('canvas-board_2', {
        width,
        height,
        backgroundColor: '#ffffff',
        isDrawingMode: false,
        selection: true
      });
      
      setCanvas2(fabricCanvas);
      console.log('[Canvas board_2] Initialisé ✅');
    }
    
    // Cleanup
    return () => {
      if (canvas1) canvas1.dispose();
      if (canvas2) canvas2.dispose();
    };
  }, [canViewWhiteboard, hasCheckedPermission, navigate, toast]);

  // Attacher les événements aux canvas
  useEffect(() => {
    if (!canvas1) return;
    
    const handleObjectAdded = async (e) => {
      if (isApplyingRemoteChangeRef.current) return;
      
      const obj = e.target;
      if (!obj.id) {
        console.log('[Canvas board_1] Nouvel objet détecté');
        await createObjectAPI('board_1', obj);
      }
    };
    
    const handleObjectModified = async (e) => {
      if (isApplyingRemoteChangeRef.current) return;
      
      const obj = e.target;
      if (obj.id) {
        console.log('[Canvas board_1] Objet modifié:', obj.id);
        await updateObjectAPI('board_1', obj);
      }
    };
    
    const handleObjectRemoved = async (e) => {
      if (isApplyingRemoteChangeRef.current) return;
      
      const obj = e.target;
      if (obj.id) {
        console.log('[Canvas board_1] Objet supprimé:', obj.id);
        await deleteObjectAPI('board_1', obj.id);
      }
    };
    
    canvas1.on('object:added', handleObjectAdded);
    canvas1.on('object:modified', handleObjectModified);
    canvas1.on('object:removed', handleObjectRemoved);
    
    return () => {
      canvas1.off('object:added', handleObjectAdded);
      canvas1.off('object:modified', handleObjectModified);
      canvas1.off('object:removed', handleObjectRemoved);
    };
  }, [canvas1, createObjectAPI, updateObjectAPI, deleteObjectAPI]);

  useEffect(() => {
    if (!canvas2) return;
    
    const handleObjectAdded = async (e) => {
      if (isApplyingRemoteChangeRef.current) return;
      
      const obj = e.target;
      if (!obj.id) {
        console.log('[Canvas board_2] Nouvel objet détecté');
        await createObjectAPI('board_2', obj);
      }
    };
    
    const handleObjectModified = async (e) => {
      if (isApplyingRemoteChangeRef.current) return;
      
      const obj = e.target;
      if (obj.id) {
        console.log('[Canvas board_2] Objet modifié:', obj.id);
        await updateObjectAPI('board_2', obj);
      }
    };
    
    const handleObjectRemoved = async (e) => {
      if (isApplyingRemoteChangeRef.current) return;
      
      const obj = e.target;
      if (obj.id) {
        console.log('[Canvas board_2] Objet supprimé:', obj.id);
        await deleteObjectAPI('board_2', obj.id);
      }
    };
    
    canvas2.on('object:added', handleObjectAdded);
    canvas2.on('object:modified', handleObjectModified);
    canvas2.on('object:removed', handleObjectRemoved);
    
    return () => {
      canvas2.off('object:added', handleObjectAdded);
      canvas2.off('object:modified', handleObjectModified);
      canvas2.off('object:removed', handleObjectRemoved);
    };
  }, [canvas2, createObjectAPI, updateObjectAPI, deleteObjectAPI]);

  // Charger les objets depuis l'API
  useEffect(() => {
    if (!canvas1 || !canvas2 || !token) return;
    
    loadBoardFromAPI('board_1');
    loadBoardFromAPI('board_2');
  }, [canvas1, canvas2, token, loadBoardFromAPI]);

  // Connecter les WebSockets
  useEffect(() => {
    if (!canvas1 || !canvas2 || !user?.id) return;
    
    const timeout = setTimeout(() => {
      connectWebSocket('board_1');
      connectWebSocket('board_2');
    }, 1000);
    
    return () => {
      clearTimeout(timeout);
      if (ws1Ref.current) ws1Ref.current.close();
      if (ws2Ref.current) ws2Ref.current.close();
    };
  }, [canvas1, canvas2, user?.id, connectWebSocket]);

  // ==================== OUTILS ====================
  
  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    const canvas = activeBoard === 'board_1' ? canvas1 : canvas2;
    if (!canvas) return;
    
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    if (tool === 'select') {
      canvas.defaultCursor = 'default';
    } else if (tool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else if (tool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = '#ffffff';
      canvas.freeDrawingBrush.width = strokeWidth * 2;
    } else if (tool === 'text') {
      const text = new IText('Texte', {
        left: 100,
        top: 100,
        fontSize: 24,
        fill: activeColor
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      setActiveTool('select');
    } else if (tool === 'rectangle') {
      const rect = new Rect({
        left: 100,
        top: 100,
        width: 150,
        height: 100,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: strokeWidth
      });
      canvas.add(rect);
      setActiveTool('select');
    } else if (tool === 'circle') {
      const circle = new FabricCircle({
        left: 100,
        top: 100,
        radius: 50,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: strokeWidth
      });
      canvas.add(circle);
      setActiveTool('select');
    }
    
    canvas.renderAll();
  }, [activeBoard, canvas1, canvas2, activeColor, strokeWidth]);

  const handleDelete = useCallback(() => {
    const canvas = activeBoard === 'board_1' ? canvas1 : canvas2;
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, [activeBoard, canvas1, canvas2]);

  const handleClearBoard = useCallback(async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir effacer tout le tableau ?')) return;
    
    const canvas = activeBoard === 'board_1' ? canvas1 : canvas2;
    if (!canvas || !token) return;
    
    try {
      const response = await fetch(`${API_URL}/boards/${activeBoard}/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        canvas.clear();
        canvas.renderAll();
        toast({
          title: "Tableau effacé",
          description: "Tous les objets ont été supprimés."
        });
      }
    } catch (error) {
      console.error('Erreur effacement tableau:', error);
    }
  }, [activeBoard, canvas1, canvas2, token, toast]);

  // ==================== INTERFACE ====================
  
  if (!canViewWhiteboard) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Tableau d'Affichage</h1>
          
          {/* Indicateurs de connexion */}
          <div className="flex gap-2 ml-4">
            {['board_1', 'board_2'].map(boardId => (
              <div key={boardId} className="flex items-center gap-1 text-sm">
                {wsConnected[boardId] ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-gray-600">
                  Tableau {boardId === 'board_1' ? '1' : '2'}
                </span>
                {connectedUsers[boardId]?.length > 0 && (
                  <span className="text-gray-500">
                    ({connectedUsers[boardId].length})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <Button
          variant={showToolbar ? 'default' : 'outline'}
          onClick={() => setShowToolbar(!showToolbar)}
        >
          {showToolbar ? 'Masquer' : 'Afficher'} Outils
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Barre d'outils */}
        {showToolbar && (
          <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2">
            {[
              { tool: 'select', icon: MousePointer2, label: 'Sélection' },
              { tool: 'pen', icon: Pencil, label: 'Crayon' },
              { tool: 'eraser', icon: Eraser, label: 'Gomme' },
              { tool: 'text', icon: Type, label: 'Texte' },
              { tool: 'rectangle', icon: Square, label: 'Rectangle' },
              { tool: 'circle', icon: Circle, label: 'Cercle' },
            ].map(({ tool, icon: Icon, label }) => (
              <Button
                key={tool}
                variant={activeTool === tool ? 'default' : 'ghost'}
                size="sm"
                className="w-14 h-14 flex flex-col items-center justify-center"
                onClick={() => handleToolChange(tool)}
                title={label}
              >
                <Icon className="h-5 w-5" />
              </Button>
            ))}
            
            <div className="h-px w-12 bg-gray-300 my-2" />
            
            {/* Couleurs */}
            <div className="flex flex-wrap gap-1 px-2">
              {COLORS.slice(0, 6).map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${activeColor === color ? 'border-blue-500' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>
            
            <div className="h-px w-12 bg-gray-300 my-2" />
            
            <Button
              variant="ghost"
              size="sm"
              className="w-14 h-14"
              onClick={handleDelete}
              title="Supprimer"
            >
              <Trash2 className="h-5 w-5 text-red-500" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-14 h-14"
              onClick={handleClearBoard}
              title="Effacer tout"
            >
              <X className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        )}

        {/* Tableaux */}
        <div className="flex-1 flex">
          {/* Tableau 1 */}
          <div
            className={`flex-1 border-r border-gray-300 relative ${activeBoard === 'board_1' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveBoard('board_1')}
          >
            <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded shadow text-sm font-semibold z-10">
              Tableau 1
            </div>
            <div ref={container1Ref} className="w-full h-full">
              <canvas id="canvas-board_1"></canvas>
            </div>
          </div>

          {/* Tableau 2 */}
          <div
            className={`flex-1 relative ${activeBoard === 'board_2' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveBoard('board_2')}
          >
            <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded shadow text-sm font-semibold z-10">
              Tableau 2
            </div>
            <div ref={container2Ref} className="w-full h-full">
              <canvas id="canvas-board_2"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardPage;
