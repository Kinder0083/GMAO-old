import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import { Bot, Sparkles, Save, RefreshCw, QrCode } from 'lucide-react';
import api from '../../services/api';

const AISection = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  
  const [aiName, setAiName] = useState(preferences?.ai_assistant_name || 'Adria');
  const [aiGender, setAiGender] = useState(preferences?.ai_assistant_gender || 'female');
  const [llmProvider, setLlmProvider] = useState(preferences?.ai_llm_provider || 'gemini');
  const [llmModel, setLlmModel] = useState(preferences?.ai_llm_model || 'gemini-2.5-flash');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // QR AI settings (system-level)
  const [qrProvider, setQrProvider] = useState('gemini');
  const [qrModel, setQrModel] = useState('gemini-2.5-flash');
  const [qrProviders, setQrProviders] = useState({});
  const [savingQr, setSavingQr] = useState(false);

  useEffect(() => {
    loadProviders();
    loadQrAiSettings();
  }, []);

  useEffect(() => {
    // Mettre à jour les états locaux quand les préférences changent
    if (preferences) {
      setAiName(preferences.ai_assistant_name || 'Adria');
      setAiGender(preferences.ai_assistant_gender || 'female');
      setLlmProvider(preferences.ai_llm_provider || 'gemini');
      setLlmModel(preferences.ai_llm_model || 'gemini-2.5-flash');
    }
  }, [preferences]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await api.ai.getProviders();
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Erreur chargement fournisseurs LLM:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQrAiSettings = async () => {
    try {
      const res = await api.get('/qr/ai-settings');
      setQrProvider(res.data.provider || 'gemini');
      setQrModel(res.data.model || 'gemini-2.5-flash');
      setQrProviders(res.data.providers || {});
    } catch (error) {
      console.error('Erreur chargement parametres QR IA:', error);
    }
  };

  const handleQrProviderChange = (providerId) => {
    setQrProvider(providerId);
    const prov = qrProviders[providerId];
    if (prov?.models?.length > 0) {
      const def = prov.models.find(m => m.default) || prov.models[0];
      setQrModel(def.id);
    }
  };

  const handleSaveQr = async () => {
    try {
      setSavingQr(true);
      await api.put('/qr/ai-settings', { provider: qrProvider, model: qrModel });
      toast({ title: 'Succes', description: 'Modele IA pour les resumes QR mis a jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingQr(false);
    }
  };

  const handleProviderChange = (providerId) => {
    setLlmProvider(providerId);
    // Sélectionner le modèle par défaut du nouveau provider
    const provider = providers.find(p => p.id === providerId);
    if (provider && provider.models.length > 0) {
      const defaultModel = provider.models.find(m => m.default) || provider.models[0];
      setLlmModel(defaultModel.id);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updatePreferences({
        ai_assistant_name: aiName,
        ai_assistant_gender: aiGender,
        ai_llm_provider: llmProvider,
        ai_llm_model: llmModel
      });
      
      toast({
        title: 'Succès',
        description: 'Préférences IA sauvegardées'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les préférences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const currentProvider = providers.find(p => p.id === llmProvider);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-purple-600" />
          Assistant IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Nom de l'assistant */}
        <div className="space-y-2">
          <Label htmlFor="ai-name">Nom de votre assistant IA</Label>
          <Input
            id="ai-name"
            value={aiName}
            onChange={(e) => setAiName(e.target.value)}
            placeholder="Adria"
            maxLength={20}
          />
          <p className="text-xs text-gray-500">
            Ce nom apparaîtra dans le bouton et les conversations
          </p>
        </div>

        {/* Genre de l'assistant */}
        <div className="space-y-2">
          <Label>Genre de l'assistant</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ai-gender"
                value="female"
                checked={aiGender === 'female'}
                onChange={(e) => setAiGender(e.target.value)}
                className="w-4 h-4 text-purple-600"
              />
              <span>Femme</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ai-gender"
                value="male"
                checked={aiGender === 'male'}
                onChange={(e) => setAiGender(e.target.value)}
                className="w-4 h-4 text-purple-600"
              />
              <span>Homme</span>
            </label>
          </div>
        </div>

        {/* Fournisseur LLM */}
        <div className="space-y-2">
          <Label htmlFor="llm-provider">Fournisseur LLM</Label>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="animate-spin" size={16} />
              Chargement...
            </div>
          ) : (
            <select
              id="llm-provider"
              value={llmProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {providers.map((provider) => (
                <option 
                  key={provider.id} 
                  value={provider.id}
                  disabled={!provider.is_available && provider.requires_api_key}
                >
                  {provider.name}
                  {!provider.is_available && provider.requires_api_key && ' (Clé API requise)'}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500">
            <Sparkles className="inline" size={12} /> Les fournisseurs avec clé Emergent sont disponibles par défaut
          </p>
        </div>

        {/* Modèle LLM */}
        <div className="space-y-2">
          <Label htmlFor="llm-model">Modèle</Label>
          <select
            id="llm-model"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {currentProvider?.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.default && '(Recommandé)'}
              </option>
            ))}
          </select>
        </div>

        {/* Aperçu */}
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-medium text-purple-800 mb-2">Apercu</h4>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <Bot className="text-white" size={24} />
            </div>
            <div>
              <p className="font-medium text-purple-900">{aiName}</p>
              <p className="text-sm text-purple-600">
                {aiGender === 'female' ? 'Assistante' : 'Assistant'} • {currentProvider?.name || 'Gemini'}
              </p>
            </div>
          </div>
        </div>

        {/* Fonctionnalites IA */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-2 text-sm">Fonctionnalites IA utilisant ce modele</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>- Assistant conversationnel ({aiName})</li>
            <li>- Generation de checklists et plans de maintenance depuis documents</li>
            <li>- Analyse des non-conformites et creation d'OT curatifs</li>
            <li>- Analyse des causes racines (5 Pourquoi + Ishikawa)</li>
            <li>- Detection d'incidents similaires</li>
            <li>- Analyse des tendances et predictions de risques</li>
            <li>- Generation de rapports QHSE</li>
            <li>- Alertes email automatiques</li>
          </ul>
        </div>

        {/* Bouton Sauvegarder */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {saving ? (
            <>
              <RefreshCw className="animate-spin mr-2" size={16} />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="mr-2" size={16} />
              Sauvegarder les preferences IA
            </>
          )}
        </Button>

        {/* ========== Modele IA pour QR Code ========== */}
        <div className="pt-4 mt-4 border-t-2 border-dashed border-indigo-200" />

        <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200" data-testid="qr-ai-settings">
          <h4 className="font-semibold text-indigo-800 flex items-center gap-2 mb-3">
            <QrCode size={18} className="text-indigo-600" />
            Modele IA pour les resumes QR
          </h4>
          <p className="text-xs text-gray-600 mb-4">
            Ce modele est utilise lorsqu'un utilisateur scanne un QR code d'equipement et demande une analyse IA. Ce parametre est global (s'applique a tous les utilisateurs).
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="qr-ai-provider" className="text-sm">Fournisseur</Label>
              <select
                id="qr-ai-provider"
                value={qrProvider}
                onChange={(e) => handleQrProviderChange(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                data-testid="qr-ai-provider-select"
              >
                {Object.values(qrProviders).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="qr-ai-model" className="text-sm">Modele</Label>
              <select
                id="qr-ai-model"
                value={qrModel}
                onChange={(e) => setQrModel(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                data-testid="qr-ai-model-select"
              >
                {qrProviders[qrProvider]?.models?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.default ? '(Recommande)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleSaveQr}
              disabled={savingQr}
              size="sm"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              data-testid="qr-ai-save-btn"
            >
              {savingQr ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={14} />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={14} />
                  Appliquer au QR Code
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISection;
