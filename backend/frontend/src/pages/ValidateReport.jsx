import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { CheckCircle2, XCircle, Calendar, AlertCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const ValidateReport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const action = searchParams.get('action');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Pour la contre-proposition
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterData, setCounterData] = useState({
    nouvelle_date_debut: '',
    nouvelle_date_fin: '',
    commentaire: ''
  });
  const [reportInfo, setReportInfo] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Token manquant dans l\'URL');
      setLoading(false);
      return;
    }

    if (action === 'counter_propose') {
      // Récupérer les infos pour le formulaire de contre-proposition
      fetchReportInfo();
    } else if (action === 'approve' || action === 'refuse') {
      // Traiter directement l'action
      processAction();
    } else {
      setError('Action invalide');
      setLoading(false);
    }
  }, [token, action]);

  const fetchReportInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/demandes-arret/validate-report?token=${token}&action=counter_propose`);
      const data = await response.json();
      
      if (response.ok && data.status === 'need_counter_proposal') {
        setReportInfo(data);
        setShowCounterForm(true);
        // Pré-remplir avec les dates proposées actuelles
        setCounterData({
          nouvelle_date_debut: data.current_proposal?.date_debut || '',
          nouvelle_date_fin: data.current_proposal?.date_fin || '',
          commentaire: ''
        });
      } else if (data.status === 'already_processed') {
        setResult({
          status: 'already_processed',
          message: data.message
        });
      } else {
        setError(data.detail || 'Erreur lors de la récupération des informations');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const processAction = async () => {
    try {
      const response = await fetch(`${API_URL}/api/demandes-arret/validate-report?token=${token}&action=${action}`);
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

  const submitCounterProposal = async (e) => {
    e.preventDefault();
    
    if (!counterData.nouvelle_date_debut || !counterData.nouvelle_date_fin) {
      setError('Veuillez remplir les deux dates');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        token: token,
        nouvelle_date_debut: counterData.nouvelle_date_debut,
        nouvelle_date_fin: counterData.nouvelle_date_fin,
        commentaire: counterData.commentaire
      });
      
      const response = await fetch(`${API_URL}/api/demandes-arret/submit-counter-proposal?${params}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          status: 'counter_proposal_sent',
          message: 'Votre contre-proposition a été envoyée au demandeur.',
          dates: {
            debut: counterData.nouvelle_date_debut,
            fin: counterData.nouvelle_date_fin
          }
        });
        setShowCounterForm(false);
      } else {
        setError(data.detail || 'Erreur lors de l\'envoi de la contre-proposition');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-600">Traitement en cours...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !showCounterForm) {
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
    const isSuccess = result.status === 'approved' || result.status === 'counter_proposal_sent';
    const isRefused = result.status === 'refused';
    const isAlreadyProcessed = result.status === 'already_processed';

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className={`w-full max-w-md ${isSuccess ? 'border-green-200' : isRefused ? 'border-red-200' : 'border-yellow-200'}`}>
          <CardHeader className="text-center">
            {isSuccess && <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />}
            {isRefused && <XCircle className="h-16 w-16 text-red-500 mx-auto" />}
            {isAlreadyProcessed && <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />}
            <CardTitle className={isSuccess ? 'text-green-700' : isRefused ? 'text-red-700' : 'text-yellow-700'}>
              {isSuccess ? 'Succès' : isRefused ? 'Report Refusé' : 'Déjà traité'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{result.message}</p>
            
            {result.nouvelles_dates && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-medium text-green-800">Nouvelles dates appliquées :</p>
                <p className="text-green-700">
                  Du {result.nouvelles_dates.debut} au {result.nouvelles_dates.fin}
                </p>
              </div>
            )}
            
            {result.dates && result.status === 'counter_proposal_sent' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium text-blue-800">Dates proposées :</p>
                <p className="text-blue-700">
                  Du {result.dates.debut} au {result.dates.fin}
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  Le demandeur va recevoir un email avec votre proposition.
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

  // Formulaire de contre-proposition
  if (showCounterForm) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600">
              <Calendar className="h-6 w-6" />
              <CardTitle>Proposer d'autres dates</CardTitle>
            </div>
            <CardDescription>
              Vous pouvez proposer des dates alternatives au demandeur du report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportInfo && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Demandeur du report :</strong> {reportInfo.demandeur_report}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Dates initialement demandées :</strong><br />
                  Du {reportInfo.current_proposal?.date_debut} au {reportInfo.current_proposal?.date_fin}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Dates originales de la maintenance :</strong><br />
                  Du {reportInfo.original_dates?.date_debut} au {reportInfo.original_dates?.date_fin}
                </p>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={submitCounterProposal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_debut">Nouvelle date de début</Label>
                  <Input
                    id="date_debut"
                    type="date"
                    value={counterData.nouvelle_date_debut}
                    onChange={(e) => setCounterData(prev => ({ ...prev, nouvelle_date_debut: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_fin">Nouvelle date de fin</Label>
                  <Input
                    id="date_fin"
                    type="date"
                    value={counterData.nouvelle_date_fin}
                    onChange={(e) => setCounterData(prev => ({ ...prev, nouvelle_date_fin: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
                <Textarea
                  id="commentaire"
                  placeholder="Expliquez pourquoi vous proposez ces dates..."
                  value={counterData.commentaire}
                  onChange={(e) => setCounterData(prev => ({ ...prev, commentaire: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/')}
                  disabled={processing}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    'Envoyer la proposition'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ValidateReport;
