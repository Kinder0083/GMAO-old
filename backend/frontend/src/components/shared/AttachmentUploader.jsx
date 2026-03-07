import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Camera, Plus, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';

/**
 * Composant générique d'upload de pièces jointes
 * @param {string} itemId - ID de l'item auquel attacher les fichiers
 * @param {function} uploadFunction - Fonction API pour uploader (itemId, file) => Promise
 * @param {function} onUploadComplete - Callback appelé après upload réussi
 * @param {boolean} disabled - Désactiver les boutons
 * @param {string} entityLabel - Label de l'entité (pour les messages)
 */
const AttachmentUploader = ({ 
  itemId, 
  uploadFunction, 
  onUploadComplete, 
  disabled = false,
  entityLabel = "l'élément"
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    if (!itemId) {
      toast({
        title: 'Information',
        description: `Enregistrez d'abord ${entityLabel} pour ajouter des pièces jointes`,
        variant: 'default'
      });
      return;
    }

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

        await uploadFunction(itemId, file);
        
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
      // Reset les inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
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
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Bouton Caméra */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || disabled || !itemId}
          className="gap-2"
          data-testid="camera-upload-btn"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          Photo
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
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled || !itemId}
          className="gap-2"
          data-testid="file-upload-btn"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Fichier
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {!itemId && (
        <p className="text-xs text-gray-500">
          Enregistrez d&apos;abord {entityLabel} pour ajouter des pièces jointes
        </p>
      )}

      {uploading && (
        <p className="text-sm text-blue-600 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          Upload en cours...
        </p>
      )}
    </div>
  );
};

export default AttachmentUploader;
