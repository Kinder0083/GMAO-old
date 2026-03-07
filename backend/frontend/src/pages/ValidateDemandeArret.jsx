import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const ValidateDemandeArret = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const action = searchParams.get('action'); // 'approve' ou 'refuse'
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  
  const [commentaire, setCommentaire] = useState('');
  const [dateProposee, setDateProposee] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de validation manquant');
      return;
    }

    if (action === 'approve') {
      // Approuver directement
      handleApprove();
    } else if (action === 'refuse') {
      // Afficher le formulaire de refus
      setShowRefuseForm(true);
    }
  }, [token, action]);

  const handleApprove = async (withComment = false) => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
      const url = `${API_BASE}/api/demandes-arret/validate/${token}`;
      
      const params = withComment && commentaire ? { commentaire } : {};
      
      await axios.post(url, null, { params });
      
      setSuccess(true);
    } catch (err) {
      console.error('Erreur validation:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la validation de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleRefuse = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
      const url = `${API_BASE}/api/demandes-arret/refuse/${token}`;
      
      const params = {};
      if (commentaire) params.commentaire = commentaire;
      if (dateProposee) params.date_proposee = dateProposee;
      
      await axios.post(url, null, { params });
      
      setSuccess(true);
    } catch (err) {
      console.error('Erreur refus:', err);
      setError(err.response?.data?.detail || 'Erreur lors du refus de la demande');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
            <p className="text-gray-600">Le lien de validation est manquant ou invalide.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {action === 'approve' ? 'Demande Approuvée' : 'Demande Refusée'}
            </h2>
            <p className="text-gray-600 mb-6">
              {action === 'approve' 
                ? 'La demande d\'arrêt a été approuvée avec succès. Le demandeur recevra une notification par email.'
                : 'La demande d\'arrêt a été refusée. Le demandeur recevra une notification par email avec votre commentaire.'
              }
            </p>
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold mb-2">Traitement en cours...</h2>
            <p className="text-gray-600">Veuillez patienter</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulaire de refus
  if (showRefuseForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-orange-500" />
              Refuser la Demande d'Arrêt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Vous êtes sur le point de refuser cette demande d'arrêt pour maintenance.
                Vous pouvez ajouter un commentaire et proposer une nouvelle date.
              </p>

              <div>
                <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
                <Textarea
                  id="commentaire"
                  placeholder="Expliquez pourquoi vous refusez cette demande..."
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="date_proposee">Proposer une nouvelle date (optionnel)</Label>
                <Input
                  id="date_proposee"
                  type="date"
                  value={dateProposee}
                  onChange={(e) => setDateProposee(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si vous proposez une nouvelle date, le demandeur pourra créer une nouvelle demande.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRefuse}
                  disabled={loading}
                >
                  Refuser la demande
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Action "approve" avec option d'ajouter un commentaire
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Approuver la Demande d'Arrêt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Vous êtes sur le point d'approuver cette demande d'arrêt pour maintenance.
              L'équipement sera automatiquement marqué comme "En Maintenance" dans le planning pour la période demandée.
            </p>

            <div>
              <Label htmlFor="commentaire_approve">Commentaire (optionnel)</Label>
              <Textarea
                id="commentaire_approve"
                placeholder="Ajoutez un commentaire si nécessaire..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleApprove(true)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Approuver la demande
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidateDemandeArret;
