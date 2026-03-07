import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder, FileText, FileSpreadsheet, FileImage, FileVideo, File,
  ChevronRight, Plus, FolderPlus, Edit, Trash2, Move, Download,
  Eye, ArrowLeft, Home, MoreVertical, Printer
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { documentationsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useConfirmDialog } from '../ui/confirm-dialog';
import { getBackendURL } from '../../utils/config';

const POLE_COLORS = {
  MAINTENANCE: '#f97316', PRODUCTION: '#3b82f6', QHSE: '#22c55e',
  LOGISTIQUE: '#a855f7', LABO: '#06b6d4', ADV: '#ec4899',
  INDUS: '#f59e0b', DIRECTION: '#ef4444', RH: '#8b5cf6', AUTRE: '#6b7280'
};

const getFileIcon = (type) => {
  if (type?.includes('pdf')) return { icon: FileText, color: '#ef4444' };
  if (type?.includes('word') || type?.includes('document')) return { icon: FileText, color: '#2563eb' };
  if (type?.includes('sheet') || type?.includes('excel')) return { icon: FileSpreadsheet, color: '#22c55e' };
  if (type?.includes('image')) return { icon: FileImage, color: '#8b5cf6' };
  if (type?.includes('video')) return { icon: FileVideo, color: '#f97316' };
  return { icon: File, color: '#6b7280' };
};

export default function ExplorerView({ poles, onRefresh }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Navigation state
  const [currentPoleId, setCurrentPoleId] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [explorerData, setExplorerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);

  // UI state
  const [selectedItems, setSelectedItems] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [renameDialog, setRenameDialog] = useState(null);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [moveDialog, setMoveDialog] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameName, setRenameName] = useState('');
  const containerRef = useRef(null);

  // Load explorer contents when navigating into a pole
  const loadExplorerContents = useCallback(async (poleId, folderId) => {
    if (!poleId) return;
    setLoading(true);
    try {
      const data = await documentationsAPI.getExplorerContents(poleId, folderId);
      setExplorerData(data);
      setBreadcrumb(data.breadcrumb || []);
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de charger le contenu', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentPoleId) {
      loadExplorerContents(currentPoleId, currentFolderId);
    }
  }, [currentPoleId, currentFolderId, loadExplorerContents]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Navigate into a pole
  const openPole = (poleId) => {
    setCurrentPoleId(poleId);
    setCurrentFolderId(null);
    setSelectedItems([]);
  };

  // Navigate into a subfolder
  const openFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedItems([]);
  };

  // Navigate back
  const goBack = () => {
    if (currentFolderId) {
      // Go to parent folder
      const currentIdx = breadcrumb.findIndex(b => b.id === currentFolderId);
      if (currentIdx > 1) {
        setCurrentFolderId(breadcrumb[currentIdx - 1].id);
      } else {
        setCurrentFolderId(null);
      }
    } else {
      setCurrentPoleId(null);
      setExplorerData(null);
      setBreadcrumb([]);
    }
    setSelectedItems([]);
  };

  // Go to specific breadcrumb
  const goToBreadcrumb = (item, index) => {
    if (item.type === 'pole') {
      setCurrentFolderId(null);
    } else {
      setCurrentFolderId(item.id);
    }
    setSelectedItems([]);
  };

  // Context menu handler
  const handleContextMenu = (e, item, itemType) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, itemType });
  };

  // Background context menu (for creating folders)
  const handleBgContextMenu = (e) => {
    if (e.target === e.currentTarget || e.target.closest('[data-explorer-bg]')) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, item: null, itemType: 'background' });
    }
  };

  // Item selection
  const handleItemClick = (e, itemId) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedItems(prev =>
        prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
      );
    } else {
      setSelectedItems([itemId]);
    }
  };

  // Double click to open
  const handleDoubleClick = (item, itemType) => {
    if (itemType === 'pole') {
      openPole(item.id);
    } else if (itemType === 'folder') {
      openFolder(item.id);
    } else if (itemType === 'document') {
      const token = localStorage.getItem('token');
      window.open(`${getBackendURL()}/api/documentations/documents/${item.id}/view?token=${token}`, '_blank');
    } else if (itemType === 'bon') {
      navigate(`/documentations/${currentPoleId}/bon-de-travail/${item.id}/view`);
    }
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await documentationsAPI.createFolder(currentPoleId, {
        name: newFolderName.trim(),
        parent_id: currentFolderId
      });
      setNewFolderDialog(false);
      setNewFolderName('');
      loadExplorerContents(currentPoleId, currentFolderId);
      toast({ title: 'Dossier créé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de créer le dossier', variant: 'destructive' });
    }
  };

  // Rename
  const handleRename = async () => {
    if (!renameName.trim() || !renameDialog) return;
    try {
      if (renameDialog.type === 'folder') {
        await documentationsAPI.updateFolder(renameDialog.id, { name: renameName.trim() });
      } else if (renameDialog.type === 'document') {
        await documentationsAPI.updateDocument(renameDialog.id, { titre: renameName.trim() });
      }
      setRenameDialog(null);
      setRenameName('');
      loadExplorerContents(currentPoleId, currentFolderId);
      toast({ title: 'Renommé avec succès' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de renommer', variant: 'destructive' });
    }
  };

  // Delete
  const handleDelete = (item, itemType) => {
    confirm({
      title: itemType === 'folder' ? 'Supprimer le dossier' : 'Supprimer le document',
      description: `Êtes-vous sûr de vouloir supprimer "${item.name || item.titre || item.fichier_nom}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          if (itemType === 'folder') {
            await documentationsAPI.deleteFolder(item.id);
          } else if (itemType === 'document') {
            await documentationsAPI.deleteDocument(item.id);
          }
          loadExplorerContents(currentPoleId, currentFolderId);
          toast({ title: 'Supprimé' });
        } catch (err) {
          toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
        }
      }
    });
  };

  // Move document to a folder
  const handleMoveDocument = async (docId, targetFolderId) => {
    try {
      await documentationsAPI.moveDocument(docId, { folder_id: targetFolderId });
      setMoveDialog(null);
      loadExplorerContents(currentPoleId, currentFolderId);
      toast({ title: 'Document déplacé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de déplacer', variant: 'destructive' });
    }
  };

  // Drag & drop
  const handleDragStart = (e, item, itemType) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, type: itemType }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'document') {
        await handleMoveDocument(data.id, targetFolderId);
      } else if (data.type === 'folder' && data.id !== targetFolderId) {
        await documentationsAPI.updateFolder(data.id, { parent_id: targetFolderId });
        loadExplorerContents(currentPoleId, currentFolderId);
        toast({ title: 'Dossier déplacé' });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de déplacer', variant: 'destructive' });
    }
  };

  // Render the root view (list of poles as folders)
  if (!currentPoleId) {
    return (
      <div className="border rounded-lg bg-white" data-testid="explorer-view">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Home className="h-4 w-4" />
            <span className="font-medium">Documentations</span>
          </div>
        </div>

        {/* Content grid */}
        <div className="p-4 min-h-[400px]">
          {(!poles || poles.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Folder className="h-16 w-16 mb-4" />
              <p>Aucun pôle de service</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {poles.map(pole => (
                <ExplorerItem
                  key={pole.id}
                  id={pole.id}
                  name={pole.nom}
                  type="pole"
                  color={pole.couleur || POLE_COLORS[pole.pole]}
                  subtitle={`${pole.documents?.length || 0} doc · ${pole.bons_travail?.length || 0} bon`}
                  selected={selectedItems.includes(pole.id)}
                  onClick={(e) => handleItemClick(e, pole.id)}
                  onDoubleClick={() => handleDoubleClick(pole, 'pole')}
                  onContextMenu={(e) => handleContextMenu(e, pole, 'pole')}
                />
              ))}
            </div>
          )}
        </div>
        <ConfirmDialog />
      </div>
    );
  }

  // Render inside a pole (folders + documents + bons)
  const folders = explorerData?.folders || [];
  const documents = explorerData?.documents || [];
  const bons = explorerData?.bons_travail || [];
  const isEmpty = folders.length === 0 && documents.length === 0 && bons.length === 0;

  return (
    <div className="border rounded-lg bg-white" data-testid="explorer-view">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
        <Button variant="ghost" size="sm" onClick={goBack} data-testid="explorer-back-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-1 overflow-x-auto">
          <button
            className="text-blue-600 hover:underline flex items-center gap-1"
            onClick={() => { setCurrentPoleId(null); setCurrentFolderId(null); setExplorerData(null); }}
          >
            <Home className="h-3.5 w-3.5" />
          </button>
          {breadcrumb.map((item, idx) => (
            <React.Fragment key={item.id}>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <button
                className={`hover:underline flex-shrink-0 ${idx === breadcrumb.length - 1 ? 'font-semibold text-gray-800' : 'text-blue-600'}`}
                onClick={() => goToBreadcrumb(item, idx)}
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setNewFolderName('Nouveau dossier'); setNewFolderDialog(true); }}
          data-testid="explorer-new-folder-btn"
        >
          <FolderPlus className="h-4 w-4 mr-1" />
          Nouveau dossier
        </Button>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="p-4 min-h-[400px]"
        onContextMenu={handleBgContextMenu}
        onClick={() => setSelectedItems([])}
        data-explorer-bg="true"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <p>Chargement...</p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400" data-explorer-bg="true">
            <Folder className="h-16 w-16 mb-4" />
            <p>Ce dossier est vide</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setNewFolderName('Nouveau dossier'); setNewFolderDialog(true); }}
            >
              <FolderPlus className="h-4 w-4 mr-1" /> Créer un dossier
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {/* Folders */}
            {folders.map(folder => (
              <ExplorerItem
                key={folder.id}
                id={folder.id}
                name={folder.name}
                type="folder"
                color="#f59e0b"
                selected={selectedItems.includes(folder.id)}
                onClick={(e) => handleItemClick(e, folder.id)}
                onDoubleClick={() => handleDoubleClick(folder, 'folder')}
                onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                draggable
                onDragStart={(e) => handleDragStart(e, folder, 'folder')}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, folder.id)}
              />
            ))}
            {/* Documents */}
            {documents.map(doc => {
              const fi = getFileIcon(doc.fichier_type);
              return (
                <ExplorerItem
                  key={doc.id}
                  id={doc.id}
                  name={doc.fichier_nom || doc.titre || 'Document'}
                  type="document"
                  iconComp={fi.icon}
                  color={fi.color}
                  subtitle={doc.fichier_taille ? `${(doc.fichier_taille / 1024).toFixed(0)} KB` : ''}
                  selected={selectedItems.includes(doc.id)}
                  onClick={(e) => handleItemClick(e, doc.id)}
                  onDoubleClick={() => handleDoubleClick(doc, 'document')}
                  onContextMenu={(e) => handleContextMenu(e, doc, 'document')}
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc, 'document')}
                />
              );
            })}
            {/* Bons de travail */}
            {bons.map(bon => (
              <ExplorerItem
                key={bon.id}
                id={bon.id}
                name={bon.titre || bon.localisation_ligne || 'Bon de travail'}
                type="bon"
                iconComp={FileText}
                color="#3b82f6"
                subtitle={bon.created_at ? new Date(bon.created_at).toLocaleDateString() : ''}
                selected={selectedItems.includes(bon.id)}
                onClick={(e) => handleItemClick(e, bon.id)}
                onDoubleClick={() => handleDoubleClick(bon, 'bon')}
                onContextMenu={(e) => handleContextMenu(e, bon, 'bon')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenuPopup
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          itemType={contextMenu.itemType}
          currentPoleId={currentPoleId}
          onClose={() => setContextMenu(null)}
          onRename={(item, type) => {
            setRenameName(type === 'folder' ? item.name : (item.titre || item.fichier_nom || ''));
            setRenameDialog({ id: item.id, type });
            setContextMenu(null);
          }}
          onDelete={(item, type) => { handleDelete(item, type); setContextMenu(null); }}
          onNewFolder={() => { setNewFolderName('Nouveau dossier'); setNewFolderDialog(true); setContextMenu(null); }}
          onOpen={(item, type) => { handleDoubleClick(item, type); setContextMenu(null); }}
          onDownload={(item) => {
            window.open(`${getBackendURL()}/api/documentations/documents/${item.id}/download`, '_blank');
            setContextMenu(null);
          }}
          onPrint={(item) => {
            const token = localStorage.getItem('token');
            window.open(`${getBackendURL()}/api/documentations/bons-travail/${item.id}/pdf?token=${token}`, '_blank');
            setContextMenu(null);
          }}
        />
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Nom du dossier</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              data-testid="new-folder-name-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateFolder} data-testid="new-folder-confirm-btn">Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={() => setRenameDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Nouveau nom</Label>
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
              data-testid="rename-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Annuler</Button>
            <Button onClick={handleRename} data-testid="rename-confirm-btn">Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}

// ============ Explorer Item (folder/file icon) ============
function ExplorerItem({
  id, name, type, color, subtitle, iconComp,
  selected, onClick, onDoubleClick, onContextMenu,
  draggable, onDragStart, onDragOver, onDrop
}) {
  const [dragOver, setDragOver] = useState(false);
  const IconComp = type === 'pole' || type === 'folder' ? Folder : (iconComp || File);

  return (
    <div
      className={`flex flex-col items-center p-3 rounded-lg cursor-pointer select-none transition-all
        ${selected ? 'bg-blue-100 ring-1 ring-blue-400' : 'hover:bg-gray-100'}
        ${dragOver ? 'bg-yellow-50 ring-2 ring-yellow-400' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        if (type === 'folder') { setDragOver(true); onDragOver?.(e); }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop?.(e); }}
      data-testid={`explorer-item-${id}`}
    >
      <IconComp
        className="h-12 w-12 mb-1 drop-shadow-sm"
        style={{ color: color || '#6b7280' }}
        fill={type === 'pole' || type === 'folder' ? (color || '#f59e0b') + '30' : 'none'}
        strokeWidth={1.5}
      />
      <span className="text-xs text-center font-medium text-gray-700 line-clamp-2 w-full leading-tight mt-0.5">
        {name}
      </span>
      {subtitle && (
        <span className="text-[10px] text-gray-400 mt-0.5 text-center">{subtitle}</span>
      )}
    </div>
  );
}

// ============ Context Menu ============
function ContextMenuPopup({
  x, y, item, itemType, currentPoleId,
  onClose, onRename, onDelete, onNewFolder, onOpen, onDownload, onPrint
}) {
  const menuRef = useRef(null);

  // Adjust position if menu goes off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const MenuItem = ({ icon: Icon, label, onClick: action, destructive }) => (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors
        ${destructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
      onClick={(e) => { e.stopPropagation(); action(); }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border shadow-xl rounded-lg py-1 z-50 min-w-[180px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {itemType === 'background' ? (
        <>
          <MenuItem icon={FolderPlus} label="Nouveau dossier" onClick={onNewFolder} />
        </>
      ) : itemType === 'pole' ? (
        <>
          <MenuItem icon={FolderPlus} label="Ouvrir" onClick={() => onOpen(item, 'pole')} />
        </>
      ) : itemType === 'folder' ? (
        <>
          <MenuItem icon={FolderPlus} label="Ouvrir" onClick={() => onOpen(item, 'folder')} />
          <MenuItem icon={Edit} label="Renommer" onClick={() => onRename(item, 'folder')} />
          <div className="border-t my-1" />
          <MenuItem icon={Trash2} label="Supprimer" onClick={() => onDelete(item, 'folder')} destructive />
        </>
      ) : itemType === 'document' ? (
        <>
          <MenuItem icon={Eye} label="Ouvrir" onClick={() => onOpen(item, 'document')} />
          <MenuItem icon={Download} label="Télécharger" onClick={() => onDownload(item)} />
          <MenuItem icon={Edit} label="Renommer" onClick={() => onRename(item, 'document')} />
          <div className="border-t my-1" />
          <MenuItem icon={Trash2} label="Supprimer" onClick={() => onDelete(item, 'document')} destructive />
        </>
      ) : itemType === 'bon' ? (
        <>
          <MenuItem icon={Eye} label="Voir le bon" onClick={() => onOpen(item, 'bon')} />
          <MenuItem icon={Printer} label="Imprimer" onClick={() => onPrint(item)} />
        </>
      ) : null}
    </div>
  );
}
