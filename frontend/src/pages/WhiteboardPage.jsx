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
  Save,
  Cloud,
  CloudOff
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API_URL = `${BACKEND_URL}/api/whiteboard`;

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
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Refs pour les canvas
  const container1Ref = useRef(null);
  const container2Ref = useRef(null);
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  
  // WebSocket refs
  const ws1Ref = useRef(null);
  const ws2Ref = useRef(null);
  const saveTimeoutRef = useRef(null);
  
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
  const [canvasReady, setCanvasReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Token pour les requêtes API
  const token = localStorage.getItem('token');
  
  // Désactiver la déconnexion automatique
  useEffect(() => {
    const originalTimeout = window.autoLogoutTimeout;
    if (originalTimeout) {
      clearTimeout(originalTimeout);
    }
    return () => {};
  }, []);

  // Générer un ID unique
  const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Sauvegarder un tableau via API REST
  const saveBoard = useCallback(async (boardId) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas || !token) return;
    
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
        setLastSaved(new Date());
        console.log(`Tableau ${boardId} sauvegardé`);
      } else {
        console.error(`Erreur sauvegarde ${boardId}:`, await response.text());
      }
    } catch (error) {
      console.error(`Erreur sauvegarde ${boardId}:`, error);
    } finally {
      setIsSaving(false);
    }
  }, [token, user]);

  // Sauvegarde avec debounce (évite de sauvegarder trop souvent)
  const debouncedSave = useCallback((boardId) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveBoard(boardId);
    }, 1000); // Sauvegarde 1 seconde après la dernière modification
  }, [saveBoard]);

  // Charger un tableau depuis l'API
  const loadBoard = useCallback(async (boardId) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas || !token) return;
    
    try {
      const response = await fetch(`${API_URL}/board/${boardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.objects && data.objects.length > 0) {
          // Charger les objets dans le canvas
          canvas.clear();
          canvas.backgroundColor = '#FFFFFF';
          
          // Utiliser loadFromJSON avec Promise (Fabric.js v6)
          const canvasData = {
            version: '6.0.0',
            objects: data.objects,
            background: '#FFFFFF'
          };
          
          try {
            await canvas.loadFromJSON(canvasData);
            canvas.renderAll();
            console.log(`Tableau ${boardId} chargé avec ${data.objects.length} objets`);
          } catch (loadError) {
            console.error(`Erreur loadFromJSON ${boardId}:`, loadError);
          }
        }
        
        setIsConnected(prev => ({ ...prev, [boardId]: true }));
      }
    } catch (error) {
      console.error(`Erreur chargement ${boardId}:`, error);
    }
  }, [token]);

  // Sauvegarder dans l'historique pour Undo
  const saveToUndoStack = useCallback((boardId) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const json = canvas.toJSON(['id']);
    setUndoStack(prev => ({
      ...prev,
      [boardId]: [...(prev[boardId] || []).slice(-20), json]
    }));
    setRedoStack(prev => ({ ...prev, [boardId]: [] }));
    
    // Déclencher la sauvegarde automatique
    debouncedSave(boardId);
  }, [debouncedSave]);

  // Envoyer une mise à jour via WebSocket
  const sendObjectUpdate = useCallback((boardId, type, object) => {
    const ws = boardId === 'board_1' ? ws1Ref.current : ws2Ref.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    try {
      const objectData = object.toJSON(['id']);
      ws.send(JSON.stringify({
        type,
        object: objectData,
        object_id: object.id || generateId()
      }));
    } catch (e) {
      console.error('Erreur envoi objet:', e);
    }
  }, []);

  // Gérer les messages WebSocket
  const handleWebSocketMessage = useCallback((boardId, data) => {
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    switch (data.type) {
      case 'sync_response':
        if (data.board && data.board.objects) {
          canvas.clear();
          canvas.backgroundColor = '#FFFFFF';
          data.board.objects.forEach(objData => {
            fabric.util.enlivenObjects([objData], (objects) => {
              objects.forEach(obj => {
                obj._fromRemote = true;
                canvas.add(obj);
              });
            });
          });
          canvas.renderAll();
        }
        break;
      
      case 'object_added':
        fabric.util.enlivenObjects([data.object], (objects) => {
          objects.forEach(obj => {
            obj.id = data.object_id;
            obj._fromRemote = true;
            canvas.add(obj);
          });
          canvas.renderAll();
        });
        break;
      
      case 'object_modified':
        const objToModify = canvas.getObjects().find(o => o.id === data.object_id);
        if (objToModify) {
          objToModify.set(data.object);
          objToModify._fromRemote = true;
          canvas.renderAll();
        }
        break;
      
      case 'object_removed':
        const objToRemove = canvas.getObjects().find(o => o.id === data.object_id);
        if (objToRemove) {
          objToRemove._fromRemote = true;
          canvas.remove(objToRemove);
          canvas.renderAll();
        }
        break;
      
      case 'users_list':
        setConnectedUsers(prev => ({ ...prev, [boardId]: data.users }));
        break;
      
      case 'user_joined':
        toast({
          title: '👤 Utilisateur connecté',
          description: `${data.user_name} a rejoint le tableau`,
        });
        break;
      
      case 'user_left':
        toast({
          title: '👤 Utilisateur déconnecté',
          description: `${data.user_name} a quitté le tableau`,
        });
        break;
      
      default:
        break;
    }
  }, [toast]);

  // Connexion WebSocket - désactivée temporairement car non disponible dans cet environnement
  // La fonctionnalité temps réel sera active une fois déployé sur Proxmox
  const connectWebSocket = useCallback((boardId) => {
    // WebSocket désactivé temporairement
    // Sur Proxmox, cette fonctionnalité sera active
    console.log(`WebSocket ${boardId} - connexion désactivée dans cet environnement`);
    return null;
    
    /* CODE WEBSOCKET POUR PRODUCTION
    if (!user || !user.id) return;
    
    const userName = `${user.prenom || ''} ${user.nom || 'Anonyme'}`.trim();
    const wsUrl = `${WS_URL}/ws/whiteboard/${boardId}?user_id=${user.id}&user_name=${encodeURIComponent(userName)}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`WebSocket ${boardId} connecté`);
        setIsConnected(prev => ({ ...prev, [boardId]: true }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(boardId, data);
        } catch (e) {
          console.error('Erreur parsing message WS:', e);
        }
      };
      
      ws.onclose = () => {
        console.log(`WebSocket ${boardId} déconnecté`);
        setIsConnected(prev => ({ ...prev, [boardId]: false }));
      };
      
      ws.onerror = (error) => {
        console.error(`Erreur WebSocket ${boardId}:`, error);
      };
      
      return ws;
    } catch (e) {
      console.error('Erreur création WebSocket:', e);
      return null;
    }
    */
  }, [user, handleWebSocketMessage]);

  // Initialiser un canvas Fabric.js
  const initCanvas = useCallback((containerEl, boardId) => {
    if (!containerEl) return null;
    
    const width = containerEl.clientWidth || 800;
    const height = containerEl.clientHeight || 400;
    
    // Créer le canvas HTML
    const canvasEl = document.createElement('canvas');
    canvasEl.id = `canvas-${boardId}`;
    containerEl.innerHTML = '';
    containerEl.appendChild(canvasEl);
    
    // Créer le canvas Fabric
    const fabricCanvas = new fabric.Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#FFFFFF',
      isDrawingMode: false,
      selection: true,
    });
    
    // Événements
    fabricCanvas.on('object:added', (e) => {
      if (e.target && !e.target._fromRemote) {
        sendObjectUpdate(boardId, 'object_added', e.target);
        saveToUndoStack(boardId);
      }
    });
    
    fabricCanvas.on('object:modified', (e) => {
      if (e.target && !e.target._fromRemote) {
        sendObjectUpdate(boardId, 'object_modified', e.target);
        saveToUndoStack(boardId);
      }
    });
    
    fabricCanvas.on('object:removed', (e) => {
      if (e.target && !e.target._fromRemote) {
        sendObjectUpdate(boardId, 'object_removed', e.target);
        saveToUndoStack(boardId);
      }
    });
    
    fabricCanvas.on('path:created', (e) => {
      if (e.path) {
        e.path.id = generateId();
        sendObjectUpdate(boardId, 'object_added', e.path);
        saveToUndoStack(boardId);
      }
    });
    
    return fabricCanvas;
  }, [sendObjectUpdate, saveToUndoStack]);

  // Initialisation des canvas après montage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (container1Ref.current && !canvas1Ref.current) {
        canvas1Ref.current = initCanvas(container1Ref.current, 'board_1');
      }
      if (container2Ref.current && !canvas2Ref.current) {
        canvas2Ref.current = initCanvas(container2Ref.current, 'board_2');
      }
      
      if (canvas1Ref.current && canvas2Ref.current) {
        setCanvasReady(true);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      // Sauvegarder avant de quitter
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuter une seule fois au montage

  // Charger les tableaux depuis l'API après que les canvas soient prêts
  useEffect(() => {
    if (canvasReady && token) {
      setIsLoading(true);
      
      // Charger les deux tableaux
      Promise.all([
        loadBoard('board_1'),
        loadBoard('board_2')
      ]).then(() => {
        setIsLoading(false);
        toast({
          title: '✅ Tableaux chargés',
          description: 'Vos dessins ont été restaurés'
        });
      }).catch(() => {
        setIsLoading(false);
      });
    }
    
    return () => {
      if (ws1Ref.current) ws1Ref.current.close();
      if (ws2Ref.current) ws2Ref.current.close();
    };
  }, [canvasReady, token, loadBoard, toast]);

  // Redimensionner les canvas
  useEffect(() => {
    const handleResize = () => {
      [
        { canvas: canvas1Ref.current, container: container1Ref.current },
        { canvas: canvas2Ref.current, container: container2Ref.current }
      ].forEach(({ canvas, container }) => {
        if (!canvas || !container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        canvas.setDimensions({ width, height });
        canvas.renderAll();
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasReady]);

  // Changer d'outil
  const setTool = (tool) => {
    setActiveTool(tool);
    
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    switch (tool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        // Créer le brush s'il n'existe pas (Fabric.js v6)
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = activeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;
      
      case 'highlighter':
        canvas.isDrawingMode = true;
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = activeColor + '80';
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

  // Ajouter du texte
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
    text.enterEditing();
  };

  // Ajouter une forme
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
          fill: activeColor === '#000000' ? 'rgba(0,0,0,0.1)' : 'transparent',
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
          strokeWidth: strokeWidth,
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
    console.log('Shape added:', { type: shapeType, objectsCount: canvas.getObjects().length });
    canvas.renderAll();
  };

  // Ajouter un post-it
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
      left: canvas.width / 2 - 75,
      top: canvas.height / 2 - 75,
    });
    
    canvas.add(group);
    canvas.setActiveObject(group);
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
            left: canvas.width / 2 - img.getScaledWidth() / 2,
            top: canvas.height / 2 - img.getScaledHeight() / 2,
          });
          
          canvas.add(img);
          canvas.setActiveObject(img);
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
    
    canvas.loadFromJSON(previousState, () => canvas.renderAll());
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
    
    canvas.loadFromJSON(nextState, () => canvas.renderAll());
  };

  // Supprimer l'objet sélectionné
  const deleteSelected = () => {
    const canvas = activeBoard === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    
    // Sauvegarder après suppression
    debouncedSave(activeBoard);
  };

  // Fonction pour retourner au dashboard
  const handleGoBack = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Annuler le timeout de sauvegarde en cours
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Sauvegarder les deux tableaux avant de quitter
    setIsSaving(true);
    try {
      await Promise.all([
        saveBoard('board_1'),
        saveBoard('board_2')
      ]);
      toast({
        title: '✅ Sauvegarde effectuée',
        description: 'Vos dessins ont été sauvegardés'
      });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
    
    // Fermer les WebSockets proprement
    if (ws1Ref.current) {
      ws1Ref.current.close();
      ws1Ref.current = null;
    }
    if (ws2Ref.current) {
      ws2Ref.current.close();
      ws2Ref.current = null;
    }
    
    // Naviguer vers le dashboard
    navigate('/dashboard');
  }, [navigate, saveBoard, toast]);

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
      
      {/* Indicateurs de connexion */}
      <div className="absolute top-4 right-4 z-50 flex gap-4">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-md text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected.board_1 ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>Tableau 1</span>
          <Users size={14} />
          <span>{connectedUsers.board_1?.length || 0}</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-md text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected.board_2 ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>Tableau 2</span>
          <Users size={14} />
          <span>{connectedUsers.board_2?.length || 0}</span>
        </div>
      </div>
      
      {/* Palette d'outils */}
      {showToolbar && (
        <div className="absolute top-16 left-4 z-50 bg-white rounded-xl shadow-2xl p-4 w-64">
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
                    if (['pencil', 'highlighter'].includes(activeTool)) setTool(activeTool);
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
                    if (['pencil', 'highlighter', 'eraser'].includes(activeTool)) setTool(activeTool);
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
      
      {/* Zone des tableaux */}
      <div className="flex-1 flex gap-4 p-4 pt-16">
        {/* Tableau 1 */}
        <div 
          ref={container1Ref}
          className={`flex-1 bg-white rounded-lg border-4 ${activeBoard === 'board_1' ? 'border-purple-500' : 'border-gray-300'} shadow-lg overflow-hidden relative cursor-crosshair`}
          onClick={() => setActiveBoard('board_1')}
        >
          <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600 z-10">
            Tableau 1
          </div>
        </div>
        
        {/* Tableau 2 */}
        <div 
          ref={container2Ref}
          className={`flex-1 bg-white rounded-lg border-4 ${activeBoard === 'board_2' ? 'border-purple-500' : 'border-gray-300'} shadow-lg overflow-hidden relative cursor-crosshair`}
          onClick={() => setActiveBoard('board_2')}
        >
          <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600 z-10">
            Tableau 2
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardPage;
