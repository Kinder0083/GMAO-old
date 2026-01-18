import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Shield, 
  Edit, 
  Trash2, 
  Search,
  ClipboardList,
  Eye
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useConfirmDialog } from '../components/ui/confirm-dialog';
import api from '../services/api';

// Types de formulaires disponibles
const FORM_TYPES = [
  { 
    code: 'BON_TRAVAIL', 
    label: 'Bon de travail', 
    icon: FileText, 
    color: 'bg-blue-100 text-blue-700',
    description: 'Formulaire pour les bons de travail de maintenance'
  },
  { 
    code: 'AUTORISATION', 
    label: 'Autorisation particulière', 
    icon: Shield, 
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Formulaire pour les autorisations de travail spéciales'
  }
];

function FormTemplatesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    type: 'BON_TRAVAIL',
    description: '',
    actif: true
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documentations/form-templates');
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      // Initialiser avec les templates par défaut si l'API n'existe pas encore
      setTemplates([
        { id: 'default-bon-travail', nom: 'Bon de travail', type: 'BON_TRAVAIL', description: 'Formulaire standard pour les bons de travail', actif: true, is_system: true },
        { id: 'default-autorisation', nom: 'Autorisation particulière', type: 'AUTORISATION', description: 'Formulaire standard pour les autorisations de travail', actif: true, is_system: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      nom: '',
      type: 'BON_TRAVAIL',
      description: '',
      actif: true
    });
    setOpenDialog(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setFormData({
      nom: template.nom,
      type: template.type,
      description: template.description || '',
      actif: template.actif
    });
    setOpenDialog(true);
  };

  const handleDelete = (template) => {
    if (template.is_system) {
      toast({
        title: 'Action non autorisée',
        description: 'Les modèles système ne peuvent pas être supprimés',
        variant: 'destructive'
      });
      return;
    }
    
    confirm({
      title: 'Supprimer le modèle',
      description: `Êtes-vous sûr de vouloir supprimer le modèle "${template.nom}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await api.delete(`/documentations/form-templates/${template.id}`);
          toast({ title: 'Succès', description: 'Modèle supprimé' });
          loadTemplates();
        } catch (error) {
          toast({
            title: 'Erreur',
            description: 'Erreur lors de la suppression',
            variant: 'destructive'
          });
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTemplate) {
        await api.put(`/documentations/form-templates/${selectedTemplate.id}`, formData);
        toast({ title: 'Succès', description: 'Modèle mis à jour' });
      } else {
        await api.post('/documentations/form-templates', formData);
        toast({ title: 'Succès', description: 'Modèle créé' });
      }
      setOpenDialog(false);
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'enregistrement',
        variant: 'destructive'
      });
    }
  };

  const getFormTypeInfo = (typeCode) => {
    return FORM_TYPES.find(t => t.code === typeCode) || FORM_TYPES[0];
  };

  const filteredTemplates = templates.filter(t =>
    t.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper par type
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const type = template.type || 'BON_TRAVAIL';
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/documentations')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux documentations
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-blue-600" />
              Modèles de formulaires
            </h1>
            <p className="text-gray-500 mt-1">
              Gérez les modèles de formulaires disponibles dans les pôles
            </p>
          </div>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau modèle
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Templates par type */}
      {FORM_TYPES.map((formType) => {
        const Icon = formType.icon;
        const typeTemplates = groupedTemplates[formType.code] || [];
        
        return (
          <div key={formType.code} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${formType.color.split(' ')[0]}`}>
                <Icon className={`h-5 w-5 ${formType.color.split(' ')[1]}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{formType.label}</h2>
                <p className="text-sm text-gray-500">{formType.description}</p>
              </div>
              <Badge variant="outline" className="ml-auto">
                {typeTemplates.length} modèle(s)
              </Badge>
            </div>
            
            {typeTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-gray-500">
                  Aucun modèle de type "{formType.label}"
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${formType.color.split(' ')[0]}`}>
                            <Icon className={`h-5 w-5 ${formType.color.split(' ')[1]}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.nom}</CardTitle>
                            {template.is_system && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Système
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!template.actif && (
                          <Badge variant="outline" className="text-gray-500">
                            Inactif
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                          disabled={template.is_system}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        {!template.is_system && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Dialog création/modification */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Modifier le modèle' : 'Nouveau modèle de formulaire'}
            </DialogTitle>
            <DialogDescription>
              Les modèles de formulaires seront disponibles dans tous les pôles.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nom du modèle *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Bon de travail électrique"
                required
              />
            </div>
            
            <div>
              <Label>Type de formulaire *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {FORM_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.code}
                      type="button"
                      className={`p-3 border rounded-lg text-left transition-all ${
                        formData.type === type.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData({ ...formData, type: type.code })}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${type.color.split(' ')[1]}`} />
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du modèle..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {selectedTemplate ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}

export default FormTemplatesPage;
