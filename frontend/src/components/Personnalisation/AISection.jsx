import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import { Bot, Sparkles, Save, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    loadProviders();
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
          <h4 className="font-medium text-purple-800 mb-2">Aperçu</h4>
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
              Sauvegarder les préférences IA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AISection;
