import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const ValidateImprovementRequest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const actionParam = searchParams.get('action'); // 'reject' si rejet, sinon approbation
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [comment, setComment] = useState('');
  
  const isReject = actionParam === 'reject';

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token manquant dans l\'URL');
        setLoading(false);
        return;
      }

      try {
        // Valider le token et récupérer les infos
        const response = await api.get(`/improvement-requests/email-action/validate/${token}`);
        setTokenData(response.data.token_data);
        setRequestData(response.data.request);
      } catch (err) {
        console.error('Erreur validation token:', err);
        if (err.response?.status === 400) {
          setError(err.response.data?.detail || 'Token invalide ou expiré');
        } else if (err.response?.status === 404) {
          setError('Demande non trouvée ou déjà traitée');
        } else {
          setError('Erreur lors de la validation du lien');
        }
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      const action = isReject ? 'reject' : 'approve';
      await api.post(`/improvement-requests/email-action/${token}`, {
        action,
        comment: comment || undefined
      });
      
      setSuccess(true);
    } catch (err) {
      console.error('Erreur action:', err);
      setError(err.response?.data?.detail || 'Erreur lors du traitement de votre demande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
            <p className="mt-4 text-gray-600">Validation du lien en cours...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-red-700">Lien invalide</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => navigate('/login')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la connexion
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <Card className={`w-full max-w-md ${isReject ? 'border-red-200' : 'border-green-200'}`}>
          <CardHeader className="text-center">
            {isReject ? (
              <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            ) : (
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            )}
            <CardTitle className={isReject ? 'text-red-700' : 'text-green-700'}>
              Demande {isReject ? 'rejetée' : 'approuvée'}
            </CardTitle>
            <CardDescription>
              {isReject 
                ? 'La demande a été rejetée. Le demandeur sera notifié par email.'
                : 'La demande a été approuvée. Elle peut maintenant être convertie en projet d\'amélioration.'
              }
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => window.close()}>
              Fermer cette page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto mb-4 p-4 rounded-full ${isReject ? 'bg-red-100' : 'bg-green-100'}`}>
            {isReject ? (
              <XCircle className="h-12 w-12 text-red-600" />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isReject ? 'Rejeter' : 'Approuver'} la demande
          </CardTitle>
          <CardDescription>
            Confirmez votre décision pour cette demande d'amélioration
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Résumé de la demande */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">{requestData?.titre}</h3>
            <p className="text-sm text-gray-600 line-clamp-3">{requestData?.description}</p>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>Par: {requestData?.created_by_name}</span>
              {requestData?.service && <span>Service: {requestData?.service}</span>}
            </div>
          </div>
          
          {/* Commentaire */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              Commentaire {isReject ? '(recommandé)' : '(optionnel)'}
            </Label>
            <Textarea
              id="comment"
              placeholder={isReject 
                ? "Expliquez la raison du rejet..." 
                : "Ajoutez un commentaire si nécessaire..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={() => window.close()}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={isReject ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isReject ? 'Confirmer le rejet' : 'Confirmer l\'approbation'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ValidateImprovementRequest;
