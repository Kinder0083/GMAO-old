import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  GraduationCap, ChevronLeft, ChevronRight, CheckCircle,
  Clock, AlertTriangle, Send, FileText, Image as ImageIcon
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function TrainingPublicPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [phase, setPhase] = useState('presentation'); // presentation, questionnaire, submitted
  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [attestFormateur, setAttestFormateur] = useState(false);
  const [attestEmploye, setAttestEmploye] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API}/api/training/public/${token}`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
          setEmployeeName(d.link?.employee_name || '');
          // Init answers array
          const qs = d.session?.questionnaire || [];
          setAnswers(qs.map((_, i) => ({ question_index: i, answer: '' })));
        } else {
          const err = await res.json();
          if (res.status === 410) setError('Ce lien a expire. Veuillez contacter votre responsable.');
          else if (res.status === 400) setError('Cette formation a deja ete completee.');
          else setError(err.detail || 'Lien invalide');
        }
      } catch (e) {
        setError('Impossible de charger la formation');
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  const handleSubmit = async () => {
    if (!attestEmploye) {
      alert('Vous devez cocher la case de declaration avant de soumettre.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/training/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: employeeName,
          answers,
          attestation_formateur: attestFormateur,
          attestation_employe: attestEmploye
        })
      });
      if (res.ok) {
        const r = await res.json();
        setResult(r);
        setPhase('submitted');
      } else {
        const err = await res.json();
        alert(err.detail || 'Erreur lors de la soumission');
      }
    } catch (e) {
      alert('Erreur de connexion');
    }
    setSubmitting(false);
  };

  const updateAnswer = (qIndex, value) => {
    setAnswers(prev => prev.map((a, i) => i === qIndex ? { ...a, answer: value } : a));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" data-testid="training-public-loading">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" data-testid="training-public-error">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Acces impossible</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = data?.session;
  const link = data?.link;
  const slides = session?.slides || [];
  const questions = session?.questionnaire || [];

  // ===== SUBMITTED =====
  if (phase === 'submitted' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4" data-testid="training-submitted">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Formation terminee !</h2>
            <p className="text-gray-600 mb-6">Merci {result.employee_name}, vos reponses ont ete enregistrees.</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Votre score</div>
              <div className="text-4xl font-bold text-blue-600">{result.score}/{result.total_questions}</div>
              <div className="text-sm text-gray-500 mt-1">
                {result.score >= result.total_questions * 0.7 ? 'Excellent resultat !' : 'Resultat enregistre.'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== PRESENTATION =====
  if (phase === 'presentation') {
    const slide = slides[currentSlide];
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" data-testid="training-presentation">
        {/* Header */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-bold text-gray-900 text-sm md:text-base">{session?.title}</div>
                <div className="text-xs text-gray-500">Bienvenue, {link?.employee_name}</div>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Slide {currentSlide + 1}/{slides.length}
            </Badge>
          </div>
        </div>

        {/* Slide content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          {slides.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune slide dans cette presentation.</p>
                <Button className="mt-4" onClick={() => setPhase('questionnaire')}>
                  Passer au questionnaire
                </Button>
              </CardContent>
            </Card>
          ) : slide ? (
            <Card className="overflow-hidden">
              {/* Slide header with number */}
              <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
                <h2 className="font-bold text-lg">{slide.title || `Slide ${currentSlide + 1}`}</h2>
                <span className="text-blue-200 text-sm">{currentSlide + 1} / {slides.length}</span>
              </div>

              <CardContent className="p-6">
                {slide.image_url && (
                  <div className="mb-4">
                    <img src={slide.image_url} alt="" className="w-full max-h-96 object-contain rounded-lg" />
                  </div>
                )}
                {slide.content && (
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{slide.content}</div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              data-testid="prev-slide-btn"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Precedent
            </Button>

            {/* Progress bar */}
            <div className="flex-1 mx-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 rounded-full h-2 transition-all"
                  style={{ width: `${((currentSlide + 1) / Math.max(slides.length, 1)) * 100}%` }}
                />
              </div>
            </div>

            {currentSlide < slides.length - 1 ? (
              <Button onClick={() => setCurrentSlide(currentSlide + 1)} data-testid="next-slide-btn">
                Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => setPhase('questionnaire')} data-testid="start-questionnaire-btn">
                Passer au questionnaire <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== QUESTIONNAIRE =====
  if (phase === 'questionnaire') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" data-testid="training-questionnaire">
        {/* Header */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-bold text-gray-900 text-sm md:text-base">Questionnaire - {session?.title}</div>
                <div className="text-xs text-gray-500">{questions.length} questions</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setPhase('presentation'); setCurrentSlide(0); }}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Revoir la presentation
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* Employee info */}
          <Card>
            <CardContent className="p-4">
              <label className="text-sm font-medium text-gray-700">Votre nom</label>
              <Input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Votre nom complet"
                data-testid="public-name-input"
              />
            </CardContent>
          </Card>

          {/* Questions */}
          {questions.map((q, qi) => (
            <Card key={qi} data-testid={`public-question-${qi}`}>
              <CardContent className="p-4">
                <div className="font-medium text-gray-900 mb-3">
                  <span className="text-blue-600 mr-2">{qi + 1}.</span>
                  {q.question}
                </div>

                {q.type === 'text' ? (
                  <Textarea
                    value={answers[qi]?.answer || ''}
                    onChange={(e) => updateAnswer(qi, e.target.value)}
                    placeholder="Votre reponse..."
                    rows={3}
                    data-testid={`public-answer-text-${qi}`}
                  />
                ) : (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[qi]?.answer === opt.value
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        data-testid={`public-option-${qi}-${oi}`}
                      >
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          value={opt.value}
                          checked={answers[qi]?.answer === opt.value}
                          onChange={() => updateAnswer(qi, opt.value)}
                          className="text-blue-600"
                        />
                        <span className="text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Attestations */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attestFormateur}
                  onChange={(e) => setAttestFormateur(e.target.checked)}
                  className="mt-1"
                  data-testid="attest-formateur"
                />
                <span className="text-sm text-gray-700">J'atteste avoir forme l'operateur sur les points ci-dessus</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attestEmploye}
                  onChange={(e) => setAttestEmploye(e.target.checked)}
                  className="mt-1"
                  data-testid="attest-employe"
                />
                <span className="text-sm text-gray-700">Je declare avoir compris les differents points ci-dessus</span>
              </label>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-center pb-8">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || !attestEmploye}
              data-testid="submit-training-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Envoi en cours...' : 'Soumettre mes reponses'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
