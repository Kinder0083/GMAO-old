import React from 'react';
import { Play, RotateCcw, CheckCircle, Map } from 'lucide-react';
import { useGuidedTour } from '../../contexts/GuidedTourContext';
import { useToast } from '../../hooks/use-toast';

const GuidedTourSettings = () => {
  const { startTour, resetTour, hasCompletedTour } = useGuidedTour();
  const { toast } = useToast();

  const handleStartTour = () => {
    startTour('dashboard');
    toast({
      title: 'Visite guidée démarrée',
      description: 'Suivez les instructions pour découvrir les fonctionnalités',
    });
  };

  const handleResetTour = () => {
    resetTour();
    toast({
      title: 'Visite réinitialisée',
      description: 'La visite guidée sera proposée automatiquement lors de votre prochaine visite du dashboard',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <Map className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-lg font-semibold text-white">Visite guidée</h2>
            <p className="text-sm text-cyan-100 mt-1">
              Découvrez les fonctionnalités de l'application avec un tutoriel interactif
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {/* Statut */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            {hasCompletedTour ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-gray-800">Visite terminée</p>
                  <p className="text-sm text-gray-500">
                    Vous avez déjà effectué la visite guidée de l'application.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Map className="h-6 w-6 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-800">Visite en attente</p>
                  <p className="text-sm text-gray-500">
                    La visite guidée sera proposée lors de votre prochaine connexion.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Map className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Ce que vous découvrirez :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Navigation principale et menu latéral</li>
                  <li>Tableau de bord et statistiques</li>
                  <li>Gestion des équipements et interventions</li>
                  <li>Chat en direct et communication d'équipe</li>
                  <li>Surveillance IoT et capteurs connectés</li>
                  <li>Assistant IA intégré</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleStartTour}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="h-5 w-5" />
              <span>Démarrer la visite</span>
            </button>

            {hasCompletedTour && (
              <button
                onClick={handleResetTour}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Réinitialiser la visite</span>
              </button>
            )}
          </div>

          {/* Note */}
          <p className="text-sm text-gray-500 italic">
            💡 Astuce : La visite guidée est proposée automatiquement aux nouveaux utilisateurs
            lors de leur première connexion au tableau de bord.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuidedTourSettings;
