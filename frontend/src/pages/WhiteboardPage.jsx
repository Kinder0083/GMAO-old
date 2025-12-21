import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fabric } from 'fabric';
import { useToast } from '../components/ui/use-toast';
import { Button } from '../components/ui/button';
import {
  Pencil,
  Eraser,
  Type,
  Square,
  Circle,
  ArrowRight,
  Image,
  StickyNote,
  Undo2,
  Redo2,
  Palette,
  ChevronLeft,
  X,
  Minus,
  Plus,
  MousePointer2,
  Highlighter,
  Trash2,
  Move,
  Users
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Couleurs disponibles
const COLORS = [
  '#000000', // Noir
  '#FF0000', // Rouge
  '#0000FF', // Bleu
  '#008000', // Vert
  '#FFA500', // Orange
  '#800080', // Violet
  '#FFFF00', // Jaune
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#FFFFFF', // Blanc
];

// Tailles de trait
const STROKE_SIZES = [2, 4, 6, 8, 12, 16, 24];

const WhiteboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Récupérer l'utilisateur depuis localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  
  // Refs pour les canvas
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  const fabricCanvas1Ref = useRef(null);
  const fabricCanvas2Ref = useRef(null);
  
  // WebSocket refs
  const ws1Ref = useRef(null);
  const ws2Ref = useRef(null);
  
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
  
  // Désactiver la déconnexion automatique sur cette page
  useEffect(() => {
    // Sauvegarder le timeout original et le désactiver
    const originalTimeout = window.autoLogoutTimeout;
    if (window.autoLogoutTimeout) {
      clearTimeout(window.autoLogoutTimeout);
    }
    
    // Réactiver à la sortie de la page
    return () => {
      if (originalTimeout) {
        // Le timeout sera réactivé automatiquement par le système d'auth
      }
    };
  }, []);

  // Initialiser les canvas Fabric.js
  const initCanvas = useCallback((canvasEl, boardId) => {
    if (!canvasEl) return null;
    
    const container = canvasEl.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const fabricCanvas = new fabric.Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#FFFFFF',
      isDrawingMode: false,
      selection: true,
    });
    
    // Événements de modification
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
    
    // Événement de dessin libre
    fabricCanvas.on('path:created', (e) => {
      if (e.path) {
        e.path.id = generateId();
        sendObjectUpdate(boardId, 'object_added', e.path);
        saveToUndoStack(boardId);
      }
    });
    
    return fabricCanvas;
  }, []);

  // Générer un ID unique
  const generateId = () => {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Sauvegarder dans l'historique pour Undo
  const saveToUndoStack = (boardId) => {
    const canvas = boardId === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
    if (!canvas) return;
    
    const json = canvas.toJSON(['id']);
    setUndoStack(prev => ({
      ...prev,
      [boardId]: [...(prev[boardId] || []).slice(-20), json]
    }));
    setRedoStack(prev => ({ ...prev, [boardId]: [] }));
  };

  // Envoyer une mise à jour via WebSocket
  const sendObjectUpdate = (boardId, type, object) => {
    const ws = boardId === 'board_1' ? ws1Ref.current : ws2Ref.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    const objectData = object.toJSON(['id']);
    ws.send(JSON.stringify({
      type,
      object: objectData,
      object_id: object.id || generateId()
    }));
  };

  // Connexion WebSocket
  const connectWebSocket = useCallback((boardId) => {
    if (!user) return;
    
    const wsUrl = `${WS_URL}/ws/whiteboard/${boardId}?user_id=${user.id}&user_name=${encodeURIComponent(user.prenom + ' ' + user.nom)}`;
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
      
      // Reconnexion automatique après 3 secondes
      setTimeout(() => connectWebSocket(boardId), 3000);
    };
    
    ws.onerror = (error) => {
      console.error(`Erreur WebSocket ${boardId}:`, error);
    };
    
    return ws;
  }, [user]);

  // Gérer les messages WebSocket
  const handleWebSocketMessage = (boardId, data) => {
    const canvas = boardId === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
    if (!canvas) return;
    
    switch (data.type) {
      case 'sync_response':
        // Charger l'état initial du tableau
        if (data.board && data.board.objects) {
          canvas.clear();
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
      
      case 'cursor_move':
        // Afficher le curseur de l'autre utilisateur (optionnel)
        break;
      
      default:
        break;
    }
  };

  // Initialisation
  useEffect(() => {
    // Initialiser les canvas
    if (canvas1Ref.current && !fabricCanvas1Ref.current) {
      fabricCanvas1Ref.current = initCanvas(canvas1Ref.current, 'board_1');
    }
    if (canvas2Ref.current && !fabricCanvas2Ref.current) {
      fabricCanvas2Ref.current = initCanvas(canvas2Ref.current, 'board_2');
    }
    
    // Connecter les WebSockets
    if (user) {
      ws1Ref.current = connectWebSocket('board_1');
      ws2Ref.current = connectWebSocket('board_2');
    }
    
    // Cleanup
    return () => {
      if (ws1Ref.current) ws1Ref.current.close();
      if (ws2Ref.current) ws2Ref.current.close();
      if (fabricCanvas1Ref.current) fabricCanvas1Ref.current.dispose();
      if (fabricCanvas2Ref.current) fabricCanvas2Ref.current.dispose();
    };
  }, [user, initCanvas, connectWebSocket]);

  // Redimensionner les canvas
  useEffect(() => {
    const handleResize = () => {
      [fabricCanvas1Ref.current, fabricCanvas2Ref.current].forEach((canvas, idx) => {
        if (!canvas) return;
        const container = canvas.lowerCanvasEl.parentElement;
        canvas.setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
        canvas.renderAll();
      });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Changer d'outil
  const setTool = (tool) => {
    setActiveTool(tool);
    
    const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
    if (!canvas) return;
    
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    switch (tool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = activeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;
      
      case 'highlighter':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = activeColor + '80'; // Semi-transparent
        canvas.freeDrawingBrush.width = strokeWidth * 3;
        break;
      
      case 'eraser':
        canvas.isDrawingMode = true;
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
    const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
    if (!canvas) return;
    
    const text = new fabric.IText('Texte', {
      id: generateId(),
      left: canvas.width / 2,
      top: canvas.height / 2,
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
    const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
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
          strokeWidth: strokeWidth,
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
  };

  // Ajouter un post-it
  const addStickyNote = () => {
    const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
    if (!canvas) return;
    
    const colors = ['#FFEB3B', '#FF9800', '#4CAF50', '#2196F3', '#E91E63'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const group = new fabric.Group([
      new fabric.Rect({
        width: 150,
        height: 150,
        fill: randomColor,
        shadow: 'rgba(0,0,0,0.3) 3px 3px 5px',
      }),
      new fabric.IText('Note...', {
        left: 10,
        top: 10,
        fontSize: 16,
        fill: '#000000',
        width: 130,
      })
    ], {
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
          const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
          if (!canvas) return;
          
          // Redimensionner si trop grande
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
    
    const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
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
    
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
    });
  };

  // Redo
  const handleRedo = () => {
    const stack = redoStack[activeBoard] || [];
    if (stack.length === 0) return;
    
    const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
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
    
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
    });
  };

  // Supprimer l'objet sélectionné
  const deleteSelected = () => {
    const canvas = activeBoard === 'board_1' ? fabricCanvas1Ref.current : fabricCanvas2Ref.current;
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach(obj => {
      canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col">
      {/* Barre de contrôle minimale */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        {/* Bouton retour Dashboard */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="bg-white shadow-md hover:bg-gray-100"
          title="Retour au Dashboard"
        >
          <ChevronLeft size={20} />
        </Button>
        
        {/* Bouton Palette d'outils */}
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
              <Button
                variant={activeTool === 'select' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTool('select')}
                title="Sélection"
              >
                <MousePointer2 size={18} />
              </Button>
              <Button
                variant={activeTool === 'pencil' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTool('pencil')}
                title="Crayon"
              >
                <Pencil size={18} />
              </Button>
              <Button
                variant={activeTool === 'highlighter' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTool('highlighter')}
                title="Surligneur"
              >
                <Highlighter size={18} />
              </Button>
              <Button
                variant={activeTool === 'eraser' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTool('eraser')}
                title="Gomme"
              >
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
                <Image size={18} />
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
                    if (activeTool === 'pencil' || activeTool === 'highlighter') {
                      setTool(activeTool);
                    }
                  }}
                  className={`w-6 h-6 rounded-full border-2 ${activeColor === color ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          {/* Taille du trait */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Taille du trait: {strokeWidth}px</label>
            <div className="flex gap-1">
              {STROKE_SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setStrokeWidth(size);
                    if (activeTool === 'pencil' || activeTool === 'highlighter' || activeTool === 'eraser') {
                      setTool(activeTool);
                    }
                  }}
                  className={`flex-1 h-8 rounded flex items-center justify-center ${strokeWidth === size ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-100 border border-gray-300'}`}
                >
                  <div
                    className="rounded-full bg-black"
                    style={{ width: Math.min(size, 16), height: Math.min(size, 16) }}
                  />
                </button>
              ))}
            </div>
          </div>
          
          {/* Undo/Redo */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Historique</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={(undoStack[activeBoard]?.length || 0) < 2}
                className="flex-1"
              >
                <Undo2 size={16} className="mr-1" />
                Annuler
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={(redoStack[activeBoard]?.length || 0) === 0}
                className="flex-1"
              >
                <Redo2 size={16} className="mr-1" />
                Rétablir
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Zone des tableaux */}
      <div className="flex-1 flex gap-4 p-4 pt-16">
        {/* Tableau 1 */}
        <div 
          className={`flex-1 bg-white rounded-lg border-4 ${activeBoard === 'board_1' ? 'border-purple-500' : 'border-gray-300'} shadow-lg overflow-hidden relative`}
          onClick={() => setActiveBoard('board_1')}
        >
          <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600 z-10">
            Tableau 1
          </div>
          <canvas ref={canvas1Ref} className="w-full h-full" />
        </div>
        
        {/* Tableau 2 */}
        <div 
          className={`flex-1 bg-white rounded-lg border-4 ${activeBoard === 'board_2' ? 'border-purple-500' : 'border-gray-300'} shadow-lg overflow-hidden relative`}
          onClick={() => setActiveBoard('board_2')}
        >
          <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600 z-10">
            Tableau 2
          </div>
          <canvas ref={canvas2Ref} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default WhiteboardPage;
