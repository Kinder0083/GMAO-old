import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import {
  GraduationCap, Plus, Send, Trash2, Edit, Eye, Users,
  ChevronDown, ChevronUp, Link2, Clock, CheckCircle, XCircle,
  FileText, Image, ArrowLeft, Save, BarChart3, Mail
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export default function TrainingPage() {
  const { toast } = useToast();
  const [view, setView] = useState('list'); // list, create, edit, detail, responses, send-link
  const [sessions, setSessions] = useState([]);
  const [links, setLinks] = useState([]);
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSlides, setFormSlides] = useState([]);
  const [formQuestions, setFormQuestions] = useState([]);

  // Send link state
  const [linkName, setLinkName] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkDays, setLinkDays] = useState(7);
  const [sendingLink, setSendingLink] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, linksRes, respRes, statsRes] = await Promise.all([
        fetch(`${API}/api/training/sessions`, { headers: getHeaders() }),
        fetch(`${API}/api/training/links`, { headers: getHeaders() }),
        fetch(`${API}/api/training/responses`, { headers: getHeaders() }),
        fetch(`${API}/api/training/stats`, { headers: getHeaders() })
      ]);
      if (sessRes.ok) setSessions(await sessRes.json());
      if (linksRes.ok) setLinks(await linksRes.json());
      if (respRes.ok) setResponses(await respRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error('Erreur chargement formation:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormSlides([{ order: 0, title: '', content: '', image_url: null }]);
    setFormQuestions([{
      order: 0, question: '', type: 'multiple_choice',
      options: [{ label: 'Oui', value: 'oui' }, { label: 'Non', value: 'non' }],
      correct_answer: ''
    }]);
  };

  const handleCreateSession = () => {
    resetForm();
    setSelectedSession(null);
    setView('create');
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setFormTitle(session.title);
    setFormDescription(session.description || '');
    setFormSlides(session.slides?.length > 0 ? session.slides : [{ order: 0, title: '', content: '', image_url: null }]);
    setFormQuestions(session.questionnaire?.length > 0 ? session.questionnaire : [{
      order: 0, question: '', type: 'multiple_choice',
      options: [{ label: 'Oui', value: 'oui' }, { label: 'Non', value: 'non' }],
      correct_answer: ''
    }]);
    setView('edit');
  };

  const handleSaveSession = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Erreur', description: 'Le titre est obligatoire', variant: 'destructive' });
      return;
    }

    const body = {
      title: formTitle,
      description: formDescription,
      slides: formSlides.map((s, i) => ({ ...s, order: i })),
      questionnaire: formQuestions.map((q, i) => ({ ...q, order: i }))
    };

    try {
      const url = selectedSession
        ? `${API}/api/training/sessions/${selectedSession.id}`
        : `${API}/api/training/sessions`;
      const method = selectedSession ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      if (res.ok) {
        toast({ title: selectedSession ? 'Session modifiee' : 'Session creee' });
        fetchAll();
        setView('list');
      } else {
        const err = await res.json();
        toast({ title: 'Erreur', description: err.detail, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Supprimer cette session ?')) return;
    try {
      const res = await fetch(`${API}/api/training/sessions/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        toast({ title: 'Session supprimee' });
        fetchAll();
      }
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleSendLink = async () => {
    if (!linkName.trim() || !linkEmail.trim()) {
      toast({ title: 'Erreur', description: 'Nom et email requis', variant: 'destructive' });
      return;
    }
    setSendingLink(true);
    try {
      const res = await fetch(`${API}/api/training/sessions/${selectedSession.id}/send-link`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ employee_name: linkName, employee_email: linkEmail, validity_days: linkDays })
      });
      if (res.ok) {
        const result = await res.json();
        toast({ title: 'Lien envoye', description: `Email envoye a ${linkEmail}` });
        setLinkName('');
        setLinkEmail('');
        fetchAll();
        setView('list');
      } else {
        const err = await res.json();
        toast({ title: 'Erreur', description: err.detail, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
    setSendingLink(false);
  };

  const handleDeleteLink = async (id) => {
    try {
      await fetch(`${API}/api/training/links/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  // ===== SLIDE MANAGEMENT =====
  const addSlide = () => setFormSlides([...formSlides, { order: formSlides.length, title: '', content: '', image_url: null }]);
  const removeSlide = (index) => setFormSlides(formSlides.filter((_, i) => i !== index));
  const updateSlide = (index, field, value) => {
    const updated = [...formSlides];
    updated[index] = { ...updated[index], [field]: value };
    setFormSlides(updated);
  };

  const handleSlideImageUpload = async (index, file) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/api/training/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        updateSlide(index, 'image_url', data.url);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ===== QUESTION MANAGEMENT =====
  const addQuestion = () => setFormQuestions([...formQuestions, {
    order: formQuestions.length, question: '', type: 'multiple_choice',
    options: [{ label: 'Oui', value: 'oui' }, { label: 'Non', value: 'non' }],
    correct_answer: ''
  }]);
  const removeQuestion = (index) => setFormQuestions(formQuestions.filter((_, i) => i !== index));
  const updateQuestion = (index, field, value) => {
    const updated = [...formQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setFormQuestions(updated);
  };
  const updateOption = (qIndex, oIndex, field, value) => {
    const updated = [...formQuestions];
    updated[qIndex].options[oIndex] = { ...updated[qIndex].options[oIndex], [field]: value };
    setFormQuestions(updated);
  };
  const addOption = (qIndex) => {
    const updated = [...formQuestions];
    updated[qIndex].options.push({ label: '', value: '' });
    setFormQuestions(updated);
  };
  const removeOption = (qIndex, oIndex) => {
    const updated = [...formQuestions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    setFormQuestions(updated);
  };

  // ===== RENDERS =====

  if (loading && view === 'list') {
    return (
      <div className="p-4 md:p-6 space-y-4" data-testid="training-page-loading">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Formation</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  // ===== FORM VIEW (create/edit) =====
  if (view === 'create' || view === 'edit') {
    return (
      <div className="p-4 md:p-6 space-y-4" data-testid="training-form">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} data-testid="back-to-list-btn">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold text-gray-900">
            {view === 'create' ? 'Nouvelle session de formation' : 'Modifier la session'}
          </h1>
        </div>

        {/* Info generales */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informations generales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Titre de la formation"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              data-testid="session-title-input"
            />
            <Textarea
              placeholder="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              data-testid="session-description-input"
            />
          </CardContent>
        </Card>

        {/* Slides */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Slides de presentation ({formSlides.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={addSlide} data-testid="add-slide-btn">
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {formSlides.map((slide, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Slide {i + 1}</span>
                  {formSlides.length > 1 && (
                    <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => removeSlide(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Titre du slide"
                  value={slide.title}
                  onChange={(e) => updateSlide(i, 'title', e.target.value)}
                  data-testid={`slide-title-${i}`}
                />
                <Textarea
                  placeholder="Contenu du slide"
                  value={slide.content}
                  onChange={(e) => updateSlide(i, 'content', e.target.value)}
                  rows={4}
                  data-testid={`slide-content-${i}`}
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex items-center gap-2 cursor-pointer">
                    <Image className="w-4 h-4" />
                    <span>Image:</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files[0] && handleSlideImageUpload(i, e.target.files[0])}
                    />
                    <span className="text-blue-600 underline text-xs">
                      {slide.image_url ? 'Changer' : 'Ajouter une image'}
                    </span>
                  </label>
                  {slide.image_url && (
                    <img src={slide.image_url} alt="" className="h-12 w-12 object-cover rounded" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Questionnaire */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Questionnaire ({formQuestions.length} questions)</CardTitle>
            <Button size="sm" variant="outline" onClick={addQuestion} data-testid="add-question-btn">
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {formQuestions.map((q, qi) => (
              <div key={qi} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Question {qi + 1}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                      data-testid={`question-type-${qi}`}
                    >
                      <option value="multiple_choice">QCM</option>
                      <option value="text">Texte libre</option>
                      <option value="yes_no">Oui/Non</option>
                    </select>
                    {formQuestions.length > 1 && (
                      <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => removeQuestion(qi)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  placeholder="Question"
                  value={q.question}
                  onChange={(e) => updateQuestion(qi, 'question', e.target.value)}
                  data-testid={`question-text-${qi}`}
                />
                {(q.type === 'multiple_choice' || q.type === 'yes_no') && (
                  <div className="space-y-2">
                    <span className="text-xs text-gray-500">Options:</span>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          placeholder="Label"
                          value={opt.label}
                          onChange={(e) => updateOption(qi, oi, 'label', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Valeur"
                          value={opt.value}
                          onChange={(e) => updateOption(qi, oi, 'value', e.target.value)}
                          className="w-32"
                        />
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correct_answer === opt.value}
                          onChange={() => updateQuestion(qi, 'correct_answer', opt.value)}
                          title="Bonne reponse"
                        />
                        {q.options.length > 2 && (
                          <Button size="sm" variant="ghost" className="text-red-400 h-7 px-1" onClick={() => removeOption(qi, oi)}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {q.type === 'multiple_choice' && (
                      <Button size="sm" variant="ghost" className="text-blue-600 text-xs" onClick={() => addOption(qi)}>
                        <Plus className="w-3 h-3 mr-1" /> Option
                      </Button>
                    )}
                  </div>
                )}
                {q.type === 'text' && (
                  <Input
                    placeholder="Bonne reponse attendue (optionnel)"
                    value={q.correct_answer || ''}
                    onChange={(e) => updateQuestion(qi, 'correct_answer', e.target.value)}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSaveSession} data-testid="save-session-btn">
            <Save className="w-4 h-4 mr-2" /> Enregistrer
          </Button>
          <Button variant="outline" onClick={() => setView('list')}>Annuler</Button>
        </div>
      </div>
    );
  }

  // ===== SEND LINK VIEW =====
  if (view === 'send-link' && selectedSession) {
    return (
      <div className="p-4 md:p-6 space-y-4" data-testid="send-link-view">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} data-testid="back-from-send-link">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Envoyer un lien de formation</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formation: {selectedSession.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nom du nouvel arrivant</label>
              <Input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Jean Dupont"
                data-testid="link-name-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="jean.dupont@iris.fr"
                data-testid="link-email-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Validite (jours)</label>
              <Input
                type="number"
                value={linkDays}
                onChange={(e) => setLinkDays(parseInt(e.target.value) || 7)}
                min={1}
                max={30}
                data-testid="link-days-input"
              />
            </div>
            <Button onClick={handleSendLink} disabled={sendingLink} data-testid="send-link-btn">
              <Send className="w-4 h-4 mr-2" />
              {sendingLink ? 'Envoi en cours...' : 'Envoyer le lien par email'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== DETAIL VIEW =====
  if (view === 'detail' && selectedSession) {
    return (
      <div className="p-4 md:p-6 space-y-4" data-testid="session-detail-view">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} data-testid="back-from-detail">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold text-gray-900">{selectedSession.title}</h1>
        </div>

        {selectedSession.description && (
          <p className="text-gray-600">{selectedSession.description}</p>
        )}

        {/* Slides */}
        <Card>
          <CardHeader><CardTitle className="text-base">Slides ({selectedSession.slides?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(selectedSession.slides || []).map((s, i) => (
              <div key={i} className="border rounded-lg p-3 bg-gray-50">
                <div className="font-medium text-sm">{i + 1}. {s.title || '(Sans titre)'}</div>
                <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{s.content}</p>
                {s.image_url && <img src={s.image_url} alt="" className="mt-2 max-h-32 rounded" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Questionnaire */}
        <Card>
          <CardHeader><CardTitle className="text-base">Questionnaire ({selectedSession.questionnaire?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(selectedSession.questionnaire || []).map((q, i) => (
              <div key={i} className="border rounded-lg p-3 bg-gray-50">
                <div className="font-medium text-sm">{i + 1}. {q.question}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(q.options || []).map((o, oi) => (
                    <Badge key={oi} variant={o.value === q.correct_answer ? 'default' : 'outline'} className="text-xs">
                      {o.label} {o.value === q.correct_answer && <CheckCircle className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={() => handleEditSession(selectedSession)} data-testid="edit-session-btn">
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
          <Button variant="outline" onClick={() => {
            setSelectedSession(selectedSession);
            setLinkName('');
            setLinkEmail('');
            setView('send-link');
          }} data-testid="open-send-link-btn">
            <Send className="w-4 h-4 mr-2" /> Envoyer un lien
          </Button>
        </div>
      </div>
    );
  }

  // ===== RESPONSES VIEW =====
  if (view === 'responses') {
    return (
      <div className="p-4 md:p-6 space-y-4" data-testid="responses-view">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} data-testid="back-from-responses">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Historique des reponses</h1>
        </div>

        {responses.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Aucune reponse pour le moment</p>
        ) : (
          <div className="space-y-3">
            {responses.map((r) => (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedResponse(r); setView('response-detail'); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.employee_name}</div>
                      <div className="text-sm text-gray-500">{r.session_title} - {r.employee_email}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant={r.score >= r.total_questions * 0.7 ? 'default' : 'destructive'}>
                        {r.score}/{r.total_questions}
                      </Badge>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(r.submitted_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== RESPONSE DETAIL =====
  if (view === 'response-detail' && selectedResponse) {
    return (
      <div className="p-4 md:p-6 space-y-4" data-testid="response-detail-view">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('responses')} data-testid="back-from-response-detail">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Detail de la reponse</h1>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-gray-500">Nom:</span> <span className="font-medium">{selectedResponse.employee_name}</span></div>
              <div><span className="text-sm text-gray-500">Email:</span> <span className="font-medium">{selectedResponse.employee_email}</span></div>
              <div><span className="text-sm text-gray-500">Formation:</span> <span className="font-medium">{selectedResponse.session_title}</span></div>
              <div><span className="text-sm text-gray-500">Score:</span> <Badge>{selectedResponse.score}/{selectedResponse.total_questions}</Badge></div>
              <div><span className="text-sm text-gray-500">Date:</span> <span>{new Date(selectedResponse.submitted_at).toLocaleString('fr-FR')}</span></div>
            </div>

            <hr />
            <h3 className="font-medium text-sm">Reponses detaillees:</h3>
            {(selectedResponse.answers || []).map((a, i) => (
              <div key={i} className="border rounded p-2 bg-gray-50 text-sm">
                <span className="text-gray-500">Q{a.question_index + 1}:</span>{' '}
                <span className="font-medium">{a.answer}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== LIST VIEW (default) =====
  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="training-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Formation</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView('responses')} data-testid="view-responses-btn">
            <BarChart3 className="w-4 h-4 mr-1" /> Reponses ({responses.length})
          </Button>
          <Button size="sm" onClick={handleCreateSession} data-testid="create-session-btn">
            <Plus className="w-4 h-4 mr-1" /> Nouvelle session
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.sessions || 0}</div>
          <div className="text-xs text-gray-500">Sessions</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.links_sent || 0}</div>
          <div className="text-xs text-gray-500">Liens envoyes</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
          <div className="text-xs text-gray-500">Completees</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.pending || 0}</div>
          <div className="text-xs text-gray-500">En attente</div>
        </CardContent></Card>
      </div>

      {/* Sessions list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sessions de formation</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune session de formation</p>
              <Button size="sm" className="mt-3" onClick={handleCreateSession}>
                <Plus className="w-4 h-4 mr-1" /> Creer la premiere session
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow" data-testid={`session-card-${s.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{s.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {s.slides?.length || 0} slides - {s.questionnaire?.length || 0} questions
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Cree le {new Date(s.created_at).toLocaleDateString('fr-FR')} par {s.created_by_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedSession(s); setView('detail'); }}
                        title="Voir" data-testid={`view-session-${s.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEditSession(s)}
                        title="Modifier" data-testid={`edit-session-${s.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setSelectedSession(s);
                        setLinkName('');
                        setLinkEmail('');
                        setView('send-link');
                      }} title="Envoyer un lien" data-testid={`send-link-session-${s.id}`}>
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteSession(s.id)}
                        title="Supprimer" data-testid={`delete-session-${s.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Links list */}
      {links.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Liens envoyes ({links.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {links.map((l) => {
                const expired = new Date(l.expires_at) < new Date();
                return (
                  <div key={l.id} className="flex items-center justify-between border rounded p-3 text-sm" data-testid={`link-card-${l.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{l.employee_name} - <span className="text-gray-500">{l.employee_email}</span></div>
                      <div className="text-xs text-gray-400">{l.session_title} - Expire le {new Date(l.expires_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {l.completed ? (
                        <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Complete</Badge>
                      ) : expired ? (
                        <Badge variant="destructive"><Clock className="w-3 h-3 mr-1" /> Expire</Badge>
                      ) : (
                        <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400 h-7" onClick={() => handleDeleteLink(l.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
