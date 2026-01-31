import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Clock, RefreshCw, Save, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';

const LlmKeysSettings = () => {
  const [llmKeys, setLlmKeys] = useState({
    deepseek_api_key: '',
    mistral_api_key: ''
  });
  const [loadingLlmKeys, setLoadingLlmKeys] = useState(true);
  const [savingLlmKeys, setSavingLlmKeys] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [llmVersions, setLlmVersions] = useState(null);
  const [checkingLlmVersions, setCheckingLlmVersions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLlmKeys();
    loadLlmVersions();
  }, []);

  const loadLlmKeys = async () => {
    try {
      setLoadingLlmKeys(true);
      const response = await api.get('/ai/global-keys');
      setLlmKeys(response.data || {
        deepseek_api_key: '',
        mistral_api_key: ''
      });
    } catch (error) {
      console.error('Erreur chargement clés LLM:', error);
    } finally {
      setLoadingLlmKeys(false);
    }
  };

  const loadLlmVersions = async () => {
    try {
      const response = await api.get('/ai/llm-versions');
      setLlmVersions(response.data);
    } catch (error) {
      console.error('Erreur chargement versions LLM:', error);
    }
  };

  const handleSaveLlmKeys = async () => {
    try {
      setSavingLlmKeys(true);
      await api.put('/ai/global-keys', llmKeys);
      
      toast({
        title: 'Clés API sauvegardées',
        description: 'Les clés API des fournisseurs LLM ont été mises à jour',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de sauvegarder les clés API'),
        variant: 'destructive'
      });
    } finally {
      setSavingLlmKeys(false);
    }
  };

  const handleCheckLlmVersions = async () => {
    try {
      setCheckingLlmVersions(true);
      const response = await api.post('/ai/check-llm-updates');
      
      toast({
        title: 'Vérification terminée',
        description: response.data.message,
      });
      
      await loadLlmVersions();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de vérifier les mises à jour'),
        variant: 'destructive'
      });
    } finally {
      setCheckingLlmVersions(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <Bot className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-bold">Clés API - Fournisseurs LLM</h2>
          <p className="text-sm text-purple-100 mt-1">
            Configurez les clés API pour les fournisseurs d'IA non couverts par la clé Emergent
          </p>
        </div>
      </div>

      <div className="p-6">
        {loadingLlmKeys ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-gray-600">Chargement des clés API...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Box */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-800">
                  <p className="font-semibold mb-1">À propos des clés API LLM :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Clé Emergent</strong> : Déjà configurée, supporte OpenAI, Claude et Gemini</li>
                    <li><strong>DeepSeek</strong> : Obtenez votre clé sur <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="underline">platform.deepseek.com</a></li>
                    <li><strong>Mistral</strong> : Obtenez votre clé sur <a href="https://console.mistral.ai" target="_blank" rel="noopener noreferrer" className="underline">console.mistral.ai</a></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Clé DeepSeek */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clé API DeepSeek
              </label>
              <div className="relative">
                <input
                  type={showDeepseekKey ? 'text' : 'password'}
                  value={llmKeys.deepseek_api_key || ''}
                  onChange={(e) => setLlmKeys({...llmKeys, deepseek_api_key: e.target.value})}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showDeepseekKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Permet d'utiliser les modèles DeepSeek Chat et DeepSeek Coder
              </p>
            </div>

            {/* Clé Mistral */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clé API Mistral
              </label>
              <div className="relative">
                <input
                  type={showMistralKey ? 'text' : 'password'}
                  value={llmKeys.mistral_api_key || ''}
                  onChange={(e) => setLlmKeys({...llmKeys, mistral_api_key: e.target.value})}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowMistralKey(!showMistralKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showMistralKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Permet d'utiliser les modèles Mistral Large et Mistral Medium
              </p>
            </div>

            {/* Bouton Sauvegarder */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveLlmKeys}
                disabled={savingLlmKeys}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingLlmKeys ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Sauvegarder les clés API</span>
                  </>
                )}
              </button>
            </div>

            {/* Section Vérification des versions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Vérification des versions LLM
              </h4>
              
              {llmVersions && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Dernière vérification :</span>
                    <span className="font-medium">
                      {llmVersions.last_check 
                        ? new Date(llmVersions.last_check).toLocaleString('fr-FR')
                        : 'Jamais'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Prochaine vérification automatique :</span>
                    <span className="font-medium">
                      {llmVersions.next_check 
                        ? new Date(llmVersions.next_check).toLocaleString('fr-FR')
                        : 'Lundi prochain à 03h00'
                      }
                    </span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleCheckLlmVersions}
                disabled={checkingLlmVersions}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                {checkingLlmVersions ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Vérification en cours...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Vérifier maintenant</span>
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 mt-2">
                La vérification automatique s'effectue chaque lundi à 03h00 GMT.
                Vous recevrez une notification email si de nouvelles versions sont disponibles.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LlmKeysSettings;
