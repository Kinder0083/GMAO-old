import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { vendorsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';
import { Building, User, MapPin, FileText, CreditCard } from 'lucide-react';

const CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'FOURNITURES', label: 'Fournitures' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'EQUIPEMENTS', label: 'Équipements' },
  { value: 'SOUS_TRAITANCE', label: 'Sous-traitance' },
  { value: 'ENERGIE', label: 'Énergie' },
  { value: 'INFORMATIQUE', label: 'Informatique' },
  { value: 'LOGISTIQUE', label: 'Logistique' },
  { value: 'NETTOYAGE', label: 'Nettoyage' },
  { value: 'SECURITE', label: 'Sécurité' },
  { value: 'AUTRE', label: 'Autre' },
];

const CONDITIONS_PAIEMENT = [
  { value: '30J_NET', label: '30 jours net' },
  { value: '30J_FDM', label: '30 jours fin de mois' },
  { value: '45J_FDM', label: '45 jours fin de mois' },
  { value: '60J_FDM', label: '60 jours fin de mois' },
  { value: '90J_FDM', label: '90 jours fin de mois' },
];

const EMPTY_FORM = {
  nom: '', contact: '', email: '', telephone: '', adresse: '', specialite: '',
  pays: '', code_postal: '', ville: '', tva_intra: '', siret: '',
  conditions_paiement: '', devise: 'EUR', categorie: '', sous_traitant: false,
  contact_fonction: '', site_web: '', notes: ''
};

const VendorFormDialog = ({ open, onOpenChange, vendor, onSuccess, prefillData }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (vendor) {
        setFormData({ ...EMPTY_FORM, ...vendor });
      } else if (prefillData) {
        // Pré-remplir depuis l'extraction IA
        const clean = {};
        Object.keys(EMPTY_FORM).forEach(key => {
          clean[key] = prefillData[key] ?? EMPTY_FORM[key];
        });
        setFormData(clean);
      } else {
        setFormData(EMPTY_FORM);
      }
    }
  }, [open, vendor, prefillData]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Nettoyer les champs vides (envoyer null au lieu de "")
      const payload = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) {
          if (['nom', 'contact', 'email', 'telephone', 'adresse', 'specialite'].includes(k)) {
            payload[k] = v; // Champs obligatoires - garder tel quel
          }
          // Ne pas envoyer les champs optionnels vides
        } else {
          payload[k] = v;
        }
      });

      if (vendor) {
        await vendorsAPI.update(vendor.id, payload);
        toast({ title: 'Fournisseur modifié avec succès' });
      } else {
        await vendorsAPI.create(payload);
        toast({ title: 'Fournisseur créé avec succès' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Une erreur est survenue'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="vendor-form-dialog">
        <DialogHeader>
          <DialogTitle data-testid="vendor-form-title">
            {vendor ? 'Modifier' : 'Nouveau'} fournisseur
          </DialogTitle>
          <DialogDescription>
            {prefillData && !vendor && (
              <Badge className="bg-blue-100 text-blue-700 mr-2">Pré-rempli par IA</Badge>
            )}
            Remplissez les informations du fournisseur
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="general" className="text-xs"><Building className="h-3 w-3 mr-1" />Société</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs"><User className="h-3 w-3 mr-1" />Contact</TabsTrigger>
              <TabsTrigger value="adresse" className="text-xs"><MapPin className="h-3 w-3 mr-1" />Adresse</TabsTrigger>
              <TabsTrigger value="commercial" className="text-xs"><CreditCard className="h-3 w-3 mr-1" />Commercial</TabsTrigger>
            </TabsList>

            {/* Onglet Société */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'entreprise *</Label>
                  <Input id="nom" value={formData.nom} onChange={(e) => set('nom', e.target.value)} required data-testid="vendor-nom-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialite">Spécialité / Activité *</Label>
                  <Input id="specialite" placeholder="Ex: Fournitures industrielles" value={formData.specialite} onChange={(e) => set('specialite', e.target.value)} required data-testid="vendor-specialite-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET / N° enregistrement</Label>
                  <Input id="siret" placeholder="Ex: 843 272 238 00012" value={formData.siret || ''} onChange={(e) => set('siret', e.target.value)} data-testid="vendor-siret-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tva_intra">N° TVA intracommunautaire</Label>
                  <Input id="tva_intra" placeholder="Ex: FR78843272238" value={formData.tva_intra || ''} onChange={(e) => set('tva_intra', e.target.value)} data-testid="vendor-tva-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categorie">Catégorie</Label>
                  <Select value={formData.categorie || 'none'} onValueChange={(v) => set('categorie', v === 'none' ? '' : v)}>
                    <SelectTrigger data-testid="vendor-categorie-select"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non définie</SelectItem>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_web">Site web</Label>
                  <Input id="site_web" placeholder="https://..." value={formData.site_web || ''} onChange={(e) => set('site_web', e.target.value)} data-testid="vendor-web-input" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="sous_traitant" checked={formData.sous_traitant || false} onCheckedChange={(v) => set('sous_traitant', v)} data-testid="vendor-soustraitant-switch" />
                <Label htmlFor="sous_traitant">Ce fournisseur est un sous-traitant</Label>
              </div>
            </TabsContent>

            {/* Onglet Contact */}
            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">Nom du contact *</Label>
                  <Input id="contact" placeholder="Prénom Nom" value={formData.contact} onChange={(e) => set('contact', e.target.value)} required data-testid="vendor-contact-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_fonction">Fonction</Label>
                  <Input id="contact_fonction" placeholder="Ex: Responsable commercial" value={formData.contact_fonction || ''} onChange={(e) => set('contact_fonction', e.target.value)} data-testid="vendor-fonction-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => set('email', e.target.value)} required data-testid="vendor-email-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input id="telephone" value={formData.telephone} onChange={(e) => set('telephone', e.target.value)} required data-testid="vendor-phone-input" />
                </div>
              </div>
            </TabsContent>

            {/* Onglet Adresse */}
            <TabsContent value="adresse" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse *</Label>
                <Input id="adresse" placeholder="Rue, numéro" value={formData.adresse} onChange={(e) => set('adresse', e.target.value)} required data-testid="vendor-adresse-input" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input id="code_postal" value={formData.code_postal || ''} onChange={(e) => set('code_postal', e.target.value)} data-testid="vendor-cp-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" value={formData.ville || ''} onChange={(e) => set('ville', e.target.value)} data-testid="vendor-ville-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pays">Pays</Label>
                  <Input id="pays" placeholder="FR" value={formData.pays || ''} onChange={(e) => set('pays', e.target.value.toUpperCase())} maxLength={3} data-testid="vendor-pays-input" />
                </div>
              </div>
            </TabsContent>

            {/* Onglet Commercial */}
            <TabsContent value="commercial" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conditions_paiement">Conditions de paiement</Label>
                  <Select value={formData.conditions_paiement || 'none'} onValueChange={(v) => set('conditions_paiement', v === 'none' ? '' : v)}>
                    <SelectTrigger data-testid="vendor-paiement-select"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non définies</SelectItem>
                      {CONDITIONS_PAIEMENT.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="devise">Devise</Label>
                  <Select value={formData.devise || 'EUR'} onValueChange={(v) => set('devise', v)}>
                    <SelectTrigger data-testid="vendor-devise-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - Dollar US</SelectItem>
                      <SelectItem value="GBP">GBP - Livre Sterling</SelectItem>
                      <SelectItem value="CHF">CHF - Franc Suisse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes / Commentaires</Label>
                <Textarea id="notes" placeholder="Informations complémentaires..." value={formData.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={4} data-testid="vendor-notes-input" />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700" data-testid="vendor-form-submit">
              {loading ? 'Enregistrement...' : vendor ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorFormDialog;
