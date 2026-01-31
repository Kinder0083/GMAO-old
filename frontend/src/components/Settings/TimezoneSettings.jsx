import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Server, 
  RefreshCw, 
  Save, 
  Globe, 
  AlertCircle, 
  CheckCircle, 
  Search 
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';

const TimezoneSettings = () => {
  const [timezoneConfig, setTimezoneConfig] = useState({
    timezone_offset: 1,
    timezone_name: 'Europe/Paris',
    ntp_server: 'pool.ntp.org'
  });
  const [loadingTimezone, setLoadingTimezone] = useState(true);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [testingNtp, setTestingNtp] = useState(false);
  const [ntpTestResult, setNtpTestResult] = useState(null);
  const [availableTimezones, setAvailableTimezones] = useState([]);
  const [availableNtpServers, setAvailableNtpServers] = useState([]);
  const [customNtpServer, setCustomNtpServer] = useState('');
  const [timezoneSearchQuery, setTimezoneSearchQuery] = useState('');
  const [currentServerTime, setCurrentServerTime] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTimezoneConfig();
  }, []);

  // Actualiser l'heure du serveur toutes les 30 secondes
  useEffect(() => {
    if (!currentServerTime) return;
    
    const interval = setInterval(async () => {
      try {
        const timeResponse = await api.timezone.getCurrentTime();
        setCurrentServerTime(timeResponse.data);
      } catch (error) {
        // Silencieux
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentServerTime]);

  const loadTimezoneConfig = async () => {
    try {
      setLoadingTimezone(true);
      
      const configResponse = await api.timezone.getConfig();
      setTimezoneConfig(configResponse.data);
      
      const timezonesResponse = await api.timezone.getTimezones();
      setAvailableTimezones(timezonesResponse.data);
      
      const ntpServersResponse = await api.timezone.getNtpServers();
      setAvailableNtpServers(ntpServersResponse.data);
      
      const timeResponse = await api.timezone.getCurrentTime();
      setCurrentServerTime(timeResponse.data);
      
    } catch (error) {
      console.error('Erreur chargement config timezone:', error);
    } finally {
      setLoadingTimezone(false);
    }
  };

  const handleSaveTimezoneConfig = async () => {
    try {
      setSavingTimezone(true);
      
      await api.timezone.updateConfig(timezoneConfig);
      
      toast({
        title: 'Configuration sauvegardée',
        description: 'Le fuseau horaire a été mis à jour avec succès'
      });
      
      const timeResponse = await api.timezone.getCurrentTime();
      setCurrentServerTime(timeResponse.data);
      
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de sauvegarder la configuration'),
        variant: 'destructive'
      });
    } finally {
      setSavingTimezone(false);
    }
  };

  const handleTestNtp = async (serverToTest) => {
    const server = serverToTest || customNtpServer || timezoneConfig.ntp_server;
    
    if (!server || !server.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez spécifier un serveur NTP à tester',
        variant: 'destructive'
      });
      return;
    }

    try {
      setTestingNtp(true);
      setNtpTestResult(null);
      
      const response = await api.timezone.testNtp(server.trim());
      setNtpTestResult(response.data);
      
      if (response.data.success) {
        toast({
          title: 'Test réussi',
          description: `Connexion au serveur ${server} réussie`
        });
      } else {
        toast({
          title: 'Test échoué',
          description: response.data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Erreur lors du test NTP'),
        variant: 'destructive'
      });
    } finally {
      setTestingNtp(false);
    }
  };

  const handleSelectTimezone = (tz) => {
    setTimezoneConfig({
      ...timezoneConfig,
      timezone_offset: tz.offset,
      timezone_name: tz.name
    });
  };

  const handleSelectNtpServer = (server) => {
    setTimezoneConfig({
      ...timezoneConfig,
      ntp_server: server
    });
    setCustomNtpServer('');
  };

  const handleSetCustomNtpServer = () => {
    if (customNtpServer.trim()) {
      setTimezoneConfig({
        ...timezoneConfig,
        ntp_server: customNtpServer.trim()
      });
    }
  };

  // Filtrer les fuseaux horaires selon la recherche
  const filteredTimezones = availableTimezones.filter(tz => {
    if (!timezoneSearchQuery) return true;
    const query = timezoneSearchQuery.toLowerCase();
    return tz.name.toLowerCase().includes(query) || 
           tz.cities.toLowerCase().includes(query);
  });

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-white" />
          <h2 className="text-lg font-semibold text-white">Fuseau Horaire et Synchronisation NTP</h2>
        </div>
        <p className="text-sm text-teal-100 mt-1">
          Configurer le fuseau horaire de l'application et la synchronisation avec un serveur de temps
        </p>
      </div>

      <div className="p-6">
        {loadingTimezone ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-gray-600">Chargement de la configuration...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Indicateur de l'heure actuelle du serveur */}
            {currentServerTime && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-100 p-2 rounded-full">
                      <Clock className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-teal-800">Heure actuelle du serveur</p>
                      <p className="text-2xl font-mono font-bold text-teal-700">
                        {currentServerTime.formatted_local}
                      </p>
                      <p className="text-xs text-teal-600 mt-1">
                        {currentServerTime.timezone_name} (GMT{currentServerTime.timezone_offset >= 0 ? '+' : ''}{currentServerTime.timezone_offset})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Heure UTC</p>
                    <p className="text-sm font-mono text-gray-600">{currentServerTime.formatted_utc}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sélection du fuseau horaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuseau horaire <span className="text-red-500">*</span>
              </label>
              
              {/* Barre de recherche */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={timezoneSearchQuery}
                  onChange={(e) => setTimezoneSearchQuery(e.target.value)}
                  placeholder="Rechercher par ville ou GMT..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              
              {/* Liste des fuseaux horaires */}
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredTimezones.map((tz, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTimezone(tz)}
                    className={`w-full px-4 py-3 text-left hover:bg-teal-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                      timezoneConfig.timezone_offset === tz.offset 
                        ? 'bg-teal-100 border-l-4 border-l-teal-500' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-800">{tz.name}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{tz.cities}</p>
                      </div>
                      {timezoneConfig.timezone_offset === tz.offset && (
                        <CheckCircle className="h-5 w-5 text-teal-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Fuseau sélectionné : <span className="font-semibold">
                  GMT{timezoneConfig.timezone_offset >= 0 ? '+' : ''}{timezoneConfig.timezone_offset}
                </span> ({timezoneConfig.timezone_name})
              </p>
            </div>

            {/* Configuration du serveur NTP */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-gray-600" />
                Serveur NTP (Network Time Protocol)
              </h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">À propos de NTP :</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>NTP permet de synchroniser l'heure du serveur avec une source de temps fiable</li>
                      <li>Important pour l'horodatage précis des capteurs MQTT</li>
                      <li>Utilisez un serveur proche géographiquement pour de meilleurs résultats</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sélection du serveur NTP prédéfini */}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serveurs NTP populaires
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {availableNtpServers.map((ntp, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectNtpServer(ntp.server)}
                    className={`px-4 py-3 text-left rounded-lg border transition-colors ${
                      timezoneConfig.ntp_server === ntp.server 
                        ? 'bg-teal-100 border-teal-500' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-semibold text-gray-800">{ntp.server}</span>
                        <p className="text-xs text-gray-500">{ntp.description}</p>
                      </div>
                      {timezoneConfig.ntp_server === ntp.server && (
                        <CheckCircle className="h-4 w-4 text-teal-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Serveur NTP personnalisé */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serveur NTP personnalisé
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customNtpServer}
                    onChange={(e) => setCustomNtpServer(e.target.value)}
                    placeholder="ntp.votre-serveur.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                  />
                  <button
                    onClick={handleSetCustomNtpServer}
                    disabled={!customNtpServer.trim()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Utiliser
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Serveur actuel : <span className="font-mono font-semibold">{timezoneConfig.ntp_server}</span>
                </p>
              </div>

              {/* Bouton Test NTP */}
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={() => handleTestNtp(timezoneConfig.ntp_server)}
                  disabled={testingNtp}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {testingNtp ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Test en cours...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      <span>Tester la connexion</span>
                    </>
                  )}
                </button>
                
                {/* Résultat du test */}
                {ntpTestResult && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    ntpTestResult.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {ntpTestResult.success ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Connexion OK - Décalage : {ntpTestResult.offset_ms?.toFixed(1)}ms
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{ntpTestResult.message}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bouton Sauvegarder */}
            <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
              <button
                onClick={handleSaveTimezoneConfig}
                disabled={savingTimezone}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingTimezone ? (
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
              
              <p className="text-sm text-gray-500">
                Cette configuration sera appliquée à toute l'application, y compris l'horodatage des capteurs MQTT.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimezoneSettings;
