import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { X, Download, File, Image, Video, FileText, Eye, Loader2 } from 'lucide-react';
import { workOrdersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useConfirmDialog } from '../ui/confirm-dialog';
import AttachmentGallery from '../shared/AttachmentGallery';

const AttachmentsList = ({ workOrderId, refreshTrigger }) => {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(null);

  const isPreviewable = (mimeType) => {
    if (!mimeType) return false;
    return mimeType.startsWith('image/') || mimeType === 'application/pdf' || 
           mimeType.startsWith('video/') || mimeType.startsWith('text/');
  };

  useEffect(() => {
    if (workOrderId) {
      loadAttachments();
    }
  }, [workOrderId, refreshTrigger]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const response = await workOrdersAPI.getAttachments(workOrderId);
      setAttachments(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des pièces jointes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    confirm({
      title: 'Supprimer la pièce jointe',
      description: 'Êtes-vous sûr de vouloir supprimer cette pièce jointe ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await workOrdersAPI.deleteAttachment(workOrderId, attachmentId);
          toast({
            title: 'Succès',
            description: 'Pièce jointe supprimée'
          });
          loadAttachments();
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
    try {
      const response = await workOrdersAPI.downloadAttachment(workOrderId, attachmentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
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
    }
  };

  const handlePreview = async (attachmentId, mimeType) => {
    try {
      setPreviewing(attachmentId);
      const response = await workOrdersAPI.downloadAttachment(workOrderId, attachmentId);
      const blob = new Blob([response.data], { type: mimeType });
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
    if (mimeType.startsWith('image/')) return <Image size={20} className="text-blue-600" />;
    if (mimeType.startsWith('video/')) return <Video size={20} className="text-purple-600" />;
    if (mimeType.includes('pdf')) return <FileText size={20} className="text-red-600" />;
    return <File size={20} className="text-gray-600" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  if (attachments.length === 0) {
    return <p className="text-sm text-gray-500">Aucune pièce jointe</p>;
  }

  // Wrapper pour la galerie (format itemId, attachmentId)
  const galleryDownload = (id, attachmentId) => workOrdersAPI.downloadAttachment(id, attachmentId);

  return (
    <div className="space-y-4">
      <AttachmentGallery
        attachments={attachments}
        downloadFunction={galleryDownload}
        itemId={workOrderId}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {attachments.map((attachment) => (
        <Card key={attachment.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getFileIcon(attachment.mime_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(attachment.size)} • {new Date(attachment.uploaded_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isPreviewable(attachment.mime_type) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(attachment.id, attachment.mime_type)}
                    disabled={previewing === attachment.id}
                    className="h-8 w-8 p-0"
                    data-testid={`wo-preview-btn-${attachment.id}`}
                    title="Prévisualiser"
                  >
                    {previewing === attachment.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Eye size={16} />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment.id, attachment.original_filename)}
                  className="h-8 w-8 p-0"
                  data-testid={`wo-download-btn-${attachment.id}`}
                  title="Télécharger"
                >
                  <Download size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(attachment.id)}
                  className="h-8 w-8 p-0 hover:bg-red-50"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
};

export default AttachmentsList;
