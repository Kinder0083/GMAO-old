import React, { useRef, useState, useEffect } from 'react';
import { Pencil, ArrowRight, Square, Type, Eraser, Check, X, Undo2, Move } from 'lucide-react';
import { Button } from '../ui/button';

const DrawingCanvas = ({ onValidate, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil'); // pencil, arrow, rectangle, text, eraser
  const [color, setColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [startPos, setStartPos] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [palettePosition, setPalettePosition] = useState({ x: 20, y: 20 });
  const [isDraggingPalette, setIsDraggingPalette] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const colors = ['#FF0000', '#FFA500', '#00FF00', '#0000FF', '#000000', '#FFFFFF'];
  const sizes = [2, 4, 6];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Restaurer l'historique si présent
      if (history.length > 0) {
        redrawCanvas();
      }
    }

    // Empêcher le scroll pendant le dessin
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    history.forEach(item => {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (item.tool === 'pencil') {
        ctx.beginPath();
        item.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (item.tool === 'arrow') {
        drawArrow(ctx, item.start.x, item.start.y, item.end.x, item.end.y);
      } else if (item.tool === 'rectangle') {
        ctx.strokeRect(item.start.x, item.start.y, item.end.x - item.start.x, item.end.y - item.start.y);
      } else if (item.tool === 'text') {
        ctx.font = `${item.lineWidth * 6}px Arial`;
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.position.x, item.position.y);
      } else if (item.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = item.lineWidth * 3;
        ctx.beginPath();
        item.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    if (isDraggingPalette) return;
    
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPath([pos]);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pencil') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 3;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'text') {
      const text = prompt('Entrez votre texte :');
      if (text) {
        ctx.font = `${lineWidth * 6}px Arial`;
        ctx.fillText(text, pos.x, pos.y);
        
        setHistory([...history, {
          tool: 'text',
          text,
          position: pos,
          color,
          lineWidth
        }]);
      }
      setIsDrawing(false);
      setCurrentPath([]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || isDraggingPalette) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getMousePos(e);

    if (tool === 'pencil') {
      setCurrentPath(prev => [...prev, pos]);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      setCurrentPath(prev => [...prev, pos]);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'arrow' || tool === 'rectangle') {
      // Redessiner le canvas + preview
      redrawCanvas();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      
      if (tool === 'arrow') {
        drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
      } else if (tool === 'rectangle') {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || isDraggingPalette) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getMousePos(e);

    if (tool === 'pencil') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const points = [];
      // Sauvegarder les points du tracé
      // (simplifié - en production, on stockerait tous les points)
      setHistory([...history, {
        tool: 'pencil',
        points: [startPos, pos],
        color,
        lineWidth,
        imageData
      }]);
    } else if (tool === 'arrow') {
      drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
      setHistory([...history, {
        tool: 'arrow',
        start: startPos,
        end: pos,
        color,
        lineWidth
      }]);
    } else if (tool === 'rectangle') {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      setHistory([...history, {
        tool: 'rectangle',
        start: startPos,
        end: pos,
        color,
        lineWidth
      }]);
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'source-over';
      setHistory([...history, {
        tool: 'eraser',
        points: [startPos, pos],
        lineWidth
      }]);
    }

    setIsDrawing(false);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Redessiner avec le nouvel historique
      newHistory.forEach(item => {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.lineWidth;
        
        if (item.tool === 'arrow') {
          drawArrow(ctx, item.start.x, item.start.y, item.end.x, item.end.y);
        } else if (item.tool === 'rectangle') {
          ctx.strokeRect(item.start.x, item.start.y, item.end.x - item.start.x, item.end.y - item.start.y);
        } else if (item.tool === 'text') {
          ctx.font = `${item.lineWidth * 6}px Arial`;
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, item.position.x, item.position.y);
        }
      });
    }
  };

  const handleValidate = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onValidate(dataUrl);
  };

  // Gestion du drag de la palette
  const handlePaletteMouseDown = (e) => {
    if (e.target.closest('.palette-tool')) return; // Ne pas drag si on clique sur un outil
    
    setIsDraggingPalette(true);
    setDragOffset({
      x: e.clientX - palettePosition.x,
      y: e.clientY - palettePosition.y
    });
  };

  const handlePaletteMouseMove = (e) => {
    if (isDraggingPalette) {
      setPalettePosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handlePaletteMouseUp = () => {
    setIsDraggingPalette(false);
  };

  useEffect(() => {
    if (isDraggingPalette) {
      document.addEventListener('mousemove', handlePaletteMouseMove);
      document.addEventListener('mouseup', handlePaletteMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handlePaletteMouseMove);
        document.removeEventListener('mouseup', handlePaletteMouseUp);
      };
    }
  }, [isDraggingPalette, dragOffset]);

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Canvas de dessin */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="absolute inset-0 cursor-crosshair"
        style={{ 
          backgroundColor: 'transparent',
          cursor: tool === 'eraser' ? 'not-allowed' : tool === 'text' ? 'text' : 'crosshair'
        }}
      />

      {/* Palette d'outils flottante */}
      <div
        className="absolute bg-white rounded-lg shadow-2xl border-2 border-gray-300 p-3"
        style={{
          left: `${palettePosition.x}px`,
          top: `${palettePosition.y}px`,
          cursor: isDraggingPalette ? 'grabbing' : 'grab'
        }}
        onMouseDown={handlePaletteMouseDown}
      >
        {/* En-tête avec icône de déplacement */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Move size={16} className="text-gray-400" />
            Outils de dessin
          </div>
        </div>

        {/* Outils */}
        <div className="flex gap-2 mb-3 palette-tool">
          <Button
            size="sm"
            variant={tool === 'pencil' ? 'default' : 'outline'}
            onClick={() => setTool('pencil')}
            title="Crayon"
            className="p-2"
          >
            <Pencil size={18} />
          </Button>
          <Button
            size="sm"
            variant={tool === 'arrow' ? 'default' : 'outline'}
            onClick={() => setTool('arrow')}
            title="Flèche"
            className="p-2"
          >
            <ArrowRight size={18} />
          </Button>
          <Button
            size="sm"
            variant={tool === 'rectangle' ? 'default' : 'outline'}
            onClick={() => setTool('rectangle')}
            title="Rectangle"
            className="p-2"
          >
            <Square size={18} />
          </Button>
          <Button
            size="sm"
            variant={tool === 'text' ? 'default' : 'outline'}
            onClick={() => setTool('text')}
            title="Texte"
            className="p-2"
          >
            <Type size={18} />
          </Button>
          <Button
            size="sm"
            variant={tool === 'eraser' ? 'default' : 'outline'}
            onClick={() => setTool('eraser')}
            title="Gomme"
            className="p-2"
          >
            <Eraser size={18} />
          </Button>
        </div>

        {/* Couleurs */}
        <div className="flex gap-2 mb-3 palette-tool">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                color === c ? 'border-blue-500 scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c }}
              title={`Couleur ${c}`}
            />
          ))}
        </div>

        {/* Tailles */}
        <div className="flex gap-2 mb-3 palette-tool">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => setLineWidth(size)}
              className={`w-8 h-8 rounded flex items-center justify-center border-2 transition-all ${
                lineWidth === size ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              title={`Épaisseur ${size}px`}
            >
              <div
                className="rounded-full bg-gray-700"
                style={{ width: `${size * 2}px`, height: `${size * 2}px` }}
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t palette-tool">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Annuler le dernier trait"
            className="flex-1"
          >
            <Undo2 size={18} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            title="Annuler et fermer"
            className="flex-1 text-red-600 hover:bg-red-50"
          >
            <X size={18} />
          </Button>
          <Button
            size="sm"
            onClick={handleValidate}
            title="Valider les annotations"
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;
