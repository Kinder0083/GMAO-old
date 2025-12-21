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
  
  // Récupérer l'utilisateur depuis localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  
  // Refs pour les canvas
  const container1Ref = useRef(null);
  const container2Ref = useRef(null);
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

  // Générer un ID unique
  const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  // Sauvegarder dans l'historique pour Undo
  const saveToHistory = useCallback((boardId) => {
    if (isLoadingDataRef.current) return;
    
    const canvas = boardId === 'board_1' ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    
    const json = canvas.toJSON(['id']);
    setUndoStack(prev => ({
      ...prev,
      [boardId]: [...(prev[boardId] || []).slice(-20), json]
    }));
    setRedoStack(prev => ({ ...prev, [boardId]: [] }));
    
    debouncedSave(boardId);
  }, [debouncedSave]);

  // Initialiser un canvas Fabric.js
  const initCanvas = useCallback((containerEl, boardId) => {
    if (!containerEl) return null;
    
    const width = containerEl.clientWidth || 800;
    const height = containerEl.clientHeight || 400;
    
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
    
    // Événements - utiliser des fonctions qui ne dépendent pas de closures
    fabricCanvas.on('object:added', (e) => {
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current) {
        // Sauvegarder après un délai
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
      if (e.target && !e.target._fromRemote && !isLoadingDataRef.current) {
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
    
    fabricCanvas.on('path:created', (e) => {
      if (e.path && !isLoadingDataRef.current) {
        e.path.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
  }, []);

  // Initialisation des canvas - UNE SEULE FOIS
  useEffect(() => {
    let mounted = true;
    
    const initializeCanvases = async () => {
      // Attendre que les containers soient prêts
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
    canvas.renderAll();
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
          <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600 z-10 pointer-events-none">
            Tableau 1
          </div>
        </div>
        
        {/* Tableau 2 */}
        <div 
          ref={container2Ref}
          className={`flex-1 bg-white rounded-lg border-4 ${activeBoard === 'board_2' ? 'border-purple-500' : 'border-gray-300'} shadow-lg overflow-hidden relative cursor-crosshair`}
          onClick={() => setActiveBoard('board_2')}
        >
          <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600 z-10 pointer-events-none">
            Tableau 2
          </div>
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
