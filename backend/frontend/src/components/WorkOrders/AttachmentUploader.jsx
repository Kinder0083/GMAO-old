import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Camera, Plus, X, File, Image, Video } from 'lucide-react';
import { workOrdersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';

const AttachmentUploader = ({ workOrderId, onUploadComplete }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      
      for (const file of files) {
        // Vérifier la taille (25MB max)
        if (file.size > 25 * 1024 * 1024) {
          toast({
            title: 'Fichier trop volumineux',
            description: `${file.name} dépasse la limite de 25MB`,
            variant: 'destructive'
          });
          continue;
        }

        await workOrdersAPI.uploadAttachment(workOrderId, file);
        
        toast({
          title: 'Succès',
          description: `${file.name} uploadé avec succès`
        });
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible d\'uploader le fichier'),
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (event) => {
    const files = Array.from(event.target.files);
    await handleFileUpload(files);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    await handleFileUpload(files);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {/* Bouton Caméra */}
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || !workOrderId}
          className="gap-2"
        >
          <Camera size={18} />
          Photo/Vidéo
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          multiple
          onChange={handleCameraCapture}
          className="hidden"
        />

        {/* Bouton Upload */}
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !workOrderId}
          className="gap-2"
        >
          <Plus size={18} />
          Ajouter fichier
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {!workOrderId && (
        <p className="text-sm text-gray-500">
          Enregistrez d'abord l'ordre de travail pour ajouter des pièces jointes
        </p>
      )}

      {uploading && (
        <p className="text-sm text-blue-600">Upload en cours...</p>
      )}
    </div>
  );
};

export default AttachmentUploader;
