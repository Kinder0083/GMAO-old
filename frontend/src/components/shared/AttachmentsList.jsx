import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Download, File, Image, Video, FileText, Loader2, Paperclip, Eye } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useConfirmDialog } from '../ui/confirm-dialog';

/**
 * Composant générique pour afficher et gérer les pièces jointes
 * @param {string} itemId - ID de l'item
 * @param {function} getAttachmentsFunction - Fonction API pour récupérer les pièces jointes (itemId) => Promise
 * @param {function} downloadFunction - Fonction API pour télécharger (itemId, attachmentId) => Promise<blob>
 * @param {function} deleteFunction - Fonction API pour supprimer (itemId, attachmentId) => Promise
 * @param {number} refreshTrigger - Trigger pour rafraîchir la liste
 * @param {boolean} canDelete - Autoriser la suppression
 * @param {Array} localAttachments - Pièces jointes déjà chargées (optionnel, évite un fetch)
 */
const AttachmentsList = ({ 
  itemId, 
  getAttachmentsFunction, 
  downloadFunction, 
  deleteFunction,
  refreshTrigger,
  canDelete = true,
  localAttachments = null
}) => {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [previewing, setPreviewing] = useState(null);

  const isPreviewable = (mimeType) => {
    if (!mimeType) return false;
    return mimeType.startsWith('image/') || mimeType === 'application/pdf' || 
           mimeType.startsWith('video/') || mimeType.startsWith('text/');
  };

  useEffect(() => {
    if (localAttachments !== null) {
      setAttachments(localAttachments);
      setLoading(false);
    } else if (itemId && getAttachmentsFunction) {
      loadAttachments();
    } else {
      setLoading(false);
    }
  }, [itemId, refreshTrigger, localAttachments]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const response = await getAttachmentsFunction(itemId);
      setAttachments(response.data || response || []);
    } catch (error) {
      console.error('Erreur lors du chargement des pièces jointes:', error);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (attachmentId, filename) => {
    if (!deleteFunction) return;
    
    confirm({
      title: 'Supprimer la pièce jointe',
      description: `Êtes-vous sûr de vouloir supprimer "${filename}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteFunction(itemId, attachmentId);
          toast({
            title: 'Succès',
            description: 'Pièce jointe supprimée'
          });
          // Rafraîchir la liste
          if (localAttachments !== null) {
            setAttachments(prev => prev.filter(a => a.id !== attachmentId));
          } else {
            loadAttachments();
          }
        } catch (error) {
          toast({
            title: 'Erreur',
            description: 'Impossible de supprimer la pièce jointe',
            variant: 'destructive'
          });
        }
      }
    });
  };

  const handleDownload = async (attachmentId, filename) => {
    if (!downloadFunction) return;
    
    try {
      setDownloading(attachmentId);
      const response = await downloadFunction(itemId, attachmentId);
      const blob = response.data || response;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive'
      });
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (attachmentId, mimeType) => {
    if (!downloadFunction) return;
    
    try {
      setPreviewing(attachmentId);
      const response = await downloadFunction(itemId, attachmentId);
      const blob = new Blob([response.data || response], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 120000);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de prévisualiser le fichier',
        variant: 'destructive'
      });
    } finally {
      setPreviewing(null);
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <File size={18} className="text-gray-500" />;
    if (mimeType.startsWith('image/')) return <Image size={18} className="text-blue-600" />;
    if (mimeType.startsWith('video/')) return <Video size={18} className="text-purple-600" />;
    if (mimeType.includes('pdf')) return <FileText size={18} className="text-red-600" />;
    return <File size={18} className="text-gray-600" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={14} className="animate-spin" />
        Chargement...
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <p className="text-sm text-gray-500 flex items-center gap-2">
        <Paperclip size={14} />
        Aucune pièce jointe
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="attachments-list">
      {attachments.map((attachment) => (
        <div 
          key={attachment.id} 
          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid={`attachment-${attachment.id}`}
        >
          <div className="flex-shrink-0">
            {getFileIcon(attachment.mime_type || attachment.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {attachment.original_filename || attachment.filename}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(attachment.size)}
              {attachment.uploaded_at && (
                <> • {new Date(attachment.uploaded_at).toLocaleDateString('fr-FR')}</>
              )}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {downloadFunction && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDownload(attachment.id, attachment.original_filename || attachment.filename);
                }}
                disabled={downloading === attachment.id}
                className="h-8 w-8 p-0"
                title="Télécharger"
                data-testid={`download-btn-${attachment.id}`}
              >
                {downloading === attachment.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
              </Button>
            )}
            {canDelete && deleteFunction && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(attachment.id, attachment.original_filename || attachment.filename);
                }}
                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                title="Supprimer"
                data-testid={`delete-btn-${attachment.id}`}
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
};

export default AttachmentsList;
