import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Send, 
  Trash2, 
  RefreshCw, 
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const MQTTPubSub = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Publish
  const [publishTopic, setPublishTopic] = useState('');
  const [publishPayload, setPublishPayload] = useState('');
  const [publishQos, setPublishQos] = useState(0);
  const [publishRetain, setPublishRetain] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // Subscribe
  const [subscribeTopic, setSubscribeTopic] = useState('');
  const [subscribeQos, setSubscribeQos] = useState(0);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [formatJson, setFormatJson] = useState(false);
  
  // Messages
  const [messages, setMessages] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    loadStatus();
    loadSubscriptions();
    loadMessages();
    
    // Auto-refresh messages every 5 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadMessages();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadStatus = async () => {
    try {
      const response = await api.mqtt.getStatus();
      setConnectionStatus(response.data);
    } catch (error) {
      console.error('Erreur chargement statut MQTT:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await api.mqtt.getSubscriptions();
      setSubscriptions(response.data.subscriptions || []);
    } catch (error) {
      console.error('Erreur chargement abonnements:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.mqtt.getMessages();
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const handlePublish = async () => {
    if (!publishTopic.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un sujet',
        variant: 'destructive'
      });
      return;
    }

    setPublishing(true);
    try {
      await api.mqtt.publish({
        topic: publishTopic,
        payload: publishPayload,
        qos: publishQos,
        retain: publishRetain
      });
      
      toast({
        title: 'Succès',
        description: 'Message publié avec succès'
      });
      
      // Clear form
      setPublishPayload('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors de la publication',
        variant: 'destructive'
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!subscribeTopic.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un sujet',
        variant: 'destructive'
      });
      return;
    }

    setSubscribing(true);
    try {
      await api.mqtt.subscribe({
        topic: subscribeTopic,
        qos: subscribeQos
      });
      
      toast({
        title: 'Succès',
        description: `Abonné au sujet: ${subscribeTopic}`
      });
      
      // Clear form and reload
      setSubscribeTopic('');
      await loadSubscriptions();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors de l\'abonnement',
        variant: 'destructive'
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async (topic) => {
    try {
      const encodedTopic = topic.replace(/\//g, '%2F');
      await api.mqtt.unsubscribe(encodedTopic);
      
      toast({
        title: 'Succès',
        description: `Désabonné du sujet: ${topic}`
      });
      
      await loadSubscriptions();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors du désabonnement',
        variant: 'destructive'
      });
    }
  };

  const handleClearMessages = async () => {
    if (!confirm('Êtes-vous sûr de vouloir effacer tous les messages reçus ?')) {
      return;
    }

    try {
      await api.mqtt.clearMessages();
      toast({
        title: 'Succès',
        description: 'Messages effacés'
      });
      setMessages([]);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'effacement des messages',
        variant: 'destructive'
      });
    }
  };

  const formatPayload = (payload) => {
    if (!formatJson) return payload;
    
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return payload;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Radio className="text-blue-600" size={32} />
            P/L MQTT
          </h1>
          <p className="text-gray-600 mt-1">Publication et écoute de messages MQTT</p>
        </div>
        
        {connectionStatus && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            connectionStatus.connected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {connectionStatus.connected ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="font-medium">
              {connectionStatus.connected ? 'Connecté' : 'Déconnecté'}
            </span>
            {connectionStatus.connected && (
              <span className="text-sm">
                ({connectionStatus.host}:{connectionStatus.port})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Publier un paquet */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Publier un paquet</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sujet</label>
              <Input
                value={publishTopic}
                onChange={(e) => setPublishTopic(e.target.value)}
                placeholder="home/temperature"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">QoS</label>
                <select
                  value={publishQos}
                  onChange={(e) => setPublishQos(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
              
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishRetain}
                    onChange={(e) => setPublishRetain(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Retenir</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Payload (modèle autorisé)
              </label>
              <textarea
                value={publishPayload}
                onChange={(e) => setPublishPayload(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                placeholder='{"temperature": 23.5}'
              />
            </div>

            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full"
            >
              <Send className="mr-2" size={18} />
              Publier
            </Button>
          </div>
        </Card>

        {/* Écouter un sujet */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Écouter un sujet</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formatJson}
                  onChange={(e) => setFormatJson(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Mettre en forme le contenu JSON</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sujet auquel s'abonner
              </label>
              <Input
                value={subscribeTopic}
                onChange={(e) => setSubscribeTopic(e.target.value)}
                placeholder="home/# ou sensor/+/temperature"
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez # pour multi-niveaux, + pour un niveau
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">QoS</label>
              <select
                value={subscribeQos}
                onChange={(e) => setSubscribeQos(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="w-full"
            >
              <Activity className="mr-2" size={18} />
              Commencer à écouter
            </Button>

            {/* Liste des abonnements actifs */}
            {subscriptions.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-semibold mb-3">Abonnements actifs</h3>
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.topic}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                    >
                      <div>
                        <div className="font-mono text-sm">{sub.topic}</div>
                        <div className="text-xs text-gray-600">QoS: {sub.qos}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnsubscribe(sub.topic)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Messages reçus */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Messages reçus ({messages.length})</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Auto-actualisation</span>
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={loadMessages}
            >
              <RefreshCw size={16} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearMessages}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity size={48} className="mx-auto mb-4 opacity-50" />
            <p>Aucun message reçu</p>
            <p className="text-sm mt-2">Abonnez-vous à un sujet pour recevoir des messages</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-blue-600">
                    {msg.topic}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>QoS: {msg.qos}</span>
                    <span>•</span>
                    <span>{new Date(msg.received_at).toLocaleString()}</span>
                  </div>
                </div>
                <pre className="text-sm bg-white p-3 rounded border border-gray-200 overflow-x-auto font-mono">
                  {formatPayload(msg.payload)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MQTTPubSub;
