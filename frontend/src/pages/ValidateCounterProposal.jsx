import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const ValidateCounterProposal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const action = searchParams.get('action');
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Token manquant dans l\'URL');
      setLoading(false);
      return;
    }

    if (action !== 'accept' && action !== 'refuse') {
      setError('Action invalide. Utilisez "accept" ou "refuse".');
      setLoading(false);
      return;
    }

    processAction();
  }, [token, action]);

  const processAction = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/demandes-arret/validate-counter-proposal?token=${token}&action=${action}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.detail || 'Erreur lors du traitement');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-600">Traitement de votre réponse...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <CardTitle className="text-red-700">Erreur</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">{error}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (result) {
    const isAccepted = result.status === 'accepted';
    const isRefused = result.status === 'refused';
    const isAlreadyProcessed = result.status === 'already_processed';

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className={`w-full max-w-md ${isAccepted ? 'border-green-200' : isRefused ? 'border-red-200' : 'border-yellow-200'}`}>
          <CardHeader className="text-center">
            {isAccepted && <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />}
            {isRefused && <XCircle className="h-16 w-16 text-red-500 mx-auto" />}
            {isAlreadyProcessed && <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />}
            <CardTitle className={isAccepted ? 'text-green-700' : isRefused ? 'text-red-700' : 'text-yellow-700'}>
              {isAccepted ? 'Contre-proposition Acceptée' : isRefused ? 'Contre-proposition Refusée' : 'Déjà traité'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{result.message}</p>
            
            {result.dates_finales && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-medium text-green-800">Nouvelles dates de la maintenance :</p>
                <p className="text-green-700">
                  Du {result.dates_finales.debut} au {result.dates_finales.fin}
                </p>
              </div>
            )}
            
            {isRefused && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  Les dates initiales de la maintenance sont maintenues.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
};

export default ValidateCounterProposal;
