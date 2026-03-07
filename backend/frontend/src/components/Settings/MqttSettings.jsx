import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, Save, Eye, EyeOff, Power } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';

const MqttSettings = () => {
  const [mqttConfig, setMqttConfig] = useState({
    host: '',
    port: 1883,
    username: '',
    password: '',
    use_ssl: false,
    client_id: 'gmao_iris'
  });
  const [loadingMqtt, setLoadingMqtt] = useState(true);
  const [savingMqtt, setSavingMqtt] = useState(false);
  const [connectingMqtt, setConnectingMqtt] = useState(false);
  const [mqttStatus, setMqttStatus] = useState(null);
  const [showMqttPassword, setShowMqttPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMqttConfig();
  }, []);

  const loadMqttConfig = async () => {
    try {
      setLoadingMqtt(true);
      const response = await api.mqtt.getConfig();
      setMqttConfig({
        host: response.data.host || '',
        port: response.data.port || 1883,
        username: response.data.username || '',
        password: '',
        use_ssl: response.data.use_ssl || false,
        client_id: response.data.client_id || 'gmao_iris'
      });
      
      const statusResponse = await api.mqtt.getStatus();
      setMqttStatus(statusResponse.data);
    } catch (error) {
      console.error('Erreur chargement config MQTT:', error);
    } finally {
      setLoadingMqtt(false);
    }
  };

  const handleSaveMqttConfig = async () => {
    if (!mqttConfig.host.trim()) {
      toast({
        title: 'Erreur',
        description: 'L\'adresse du broker MQTT est requise',
        variant: 'destructive'
      });
      return;
    }

    if (mqttConfig.port < 1 || mqttConfig.port > 65535) {
      toast({
        title: 'Erreur',
        description: 'Le port doit être entre 1 et 65535',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSavingMqtt(true);
      await api.mqtt.saveConfig(mqttConfig);
      
      toast({
        title: 'Configuration sauvegardée',
        description: 'La configuration MQTT a été enregistrée avec succès'
      });
      
      await loadMqttConfig();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de sauvegarder la configuration MQTT'),
        variant: 'destructive'
      });
    } finally {
      setSavingMqtt(false);
    }
  };

  const handleConnectMqtt = async () => {
    try {
      setConnectingMqtt(true);
      await api.mqtt.connect();
      
      toast({
        title: 'Connexion réussie',
        description: 'Connecté au broker MQTT avec succès'
      });
      
      const statusResponse = await api.mqtt.getStatus();
      setMqttStatus(statusResponse.data);
    } catch (error) {
      toast({
        title: 'Erreur de connexion',
        description: formatErrorMessage(error, 'Impossible de se connecter au broker MQTT'),
        variant: 'destructive'
      });
    } finally {
      setConnectingMqtt(false);
    }
  };

  const handleDisconnectMqtt = async () => {
    try {
      setConnectingMqtt(true);
      await api.mqtt.disconnect();
      
      toast({
        title: 'Déconnexion',
        description: 'Déconnecté du broker MQTT'
      });
      
      const statusResponse = await api.mqtt.getStatus();
      setMqttStatus(statusResponse.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Erreur lors de la déconnexion'),
        variant: 'destructive'
      });
    } finally {
      setConnectingMqtt(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-white" />
          <h2 className="text-lg font-semibold text-white">Configuration MQTT</h2>
        </div>
        <p className="text-sm text-purple-100 mt-1">
          Configurer la connexion au broker MQTT pour les capteurs et compteurs IoT
        </p>
      </div>

      <div className="p-6">
        {loadingMqtt ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-gray-600">Chargement de la configuration MQTT...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Radio className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-semibold mb-1">À propos de MQTT :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Protocole de messagerie léger pour l'IoT</li>
                    <li>Utilisé pour recevoir les données des capteurs en temps réel</li>
                    <li>Permet de créer des compteurs et capteurs connectés</li>
                    <li>Supporte les alertes automatiques basées sur les valeurs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Statut de connexion */}
            {mqttStatus && (
              <div className={`flex items-center justify-between p-4 rounded-lg ${
                mqttStatus.connected 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <Power className={`h-5 w-5 ${mqttStatus.connected ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold text-sm">
                      {mqttStatus.connected ? 'Connecté au broker MQTT' : 'Déconnecté'}
                    </p>
                    {mqttStatus.connected && (
                      <p className="text-xs text-gray-600">
                        {mqttStatus.host}:{mqttStatus.port} (Client: {mqttStatus.client_id})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mqttStatus.connected ? (
                    <button
                      onClick={handleDisconnectMqtt}
                      disabled={connectingMqtt}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      {connectingMqtt ? 'Déconnexion...' : 'Déconnecter'}
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectMqtt}
                      disabled={connectingMqtt}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      {connectingMqtt ? 'Connexion...' : 'Connecter'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Formulaire de configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Host */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse du broker MQTT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={mqttConfig.host}
                  onChange={(e) => setMqttConfig({...mqttConfig, host: e.target.value})}
                  placeholder="192.168.1.100 ou mqtt.example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={mqttConfig.port}
                  onChange={(e) => setMqttConfig({...mqttConfig, port: parseInt(e.target.value)})}
                  placeholder="1883"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1883 (standard), 8883 (SSL)
                </p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={mqttConfig.username}
                  onChange={(e) => setMqttConfig({...mqttConfig, username: e.target.value})}
                  placeholder="username (optionnel)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showMqttPassword ? "text" : "password"}
                    value={mqttConfig.password}
                    onChange={(e) => setMqttConfig({...mqttConfig, password: e.target.value})}
                    placeholder="password (optionnel)"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMqttPassword(!showMqttPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showMqttPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Client
                </label>
                <input
                  type="text"
                  value={mqttConfig.client_id}
                  onChange={(e) => setMqttConfig({...mqttConfig, client_id: e.target.value})}
                  placeholder="gmao_iris"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* SSL */}
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mqttConfig.use_ssl}
                    onChange={(e) => setMqttConfig({...mqttConfig, use_ssl: e.target.checked})}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Utiliser SSL/TLS
                  </span>
                </label>
              </div>
            </div>

            {/* Bouton Sauvegarder */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveMqttConfig}
                disabled={savingMqtt}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingMqtt ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Sauvegarder la configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MqttSettings;
