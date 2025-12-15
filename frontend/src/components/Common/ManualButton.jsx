import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { useToast } from '../../hooks/use-toast';
import { 
  BookOpen, 
  Search, 
  Download, 
  ChevronRight, 
  ChevronDown,
  Home,
  Filter,
  X
} from 'lucide-react';
import axios from 'axios';
import { getBackendURL } from '../../utils/config';
import './ManualButton.css';

const ManualButton = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualData, setManualData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [levelFilter, setLevelFilter] = useState('both'); // 'beginner', 'advanced', 'both'
  const [moduleFilter, setModuleFilter] = useState('all');
  const [adminMode, setAdminMode] = useState(false);
  
  // Nouveaux états pour la recherche avancée
  const [searchResults, setSearchResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(10);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchLevelFilter, setSearchLevelFilter] = useState('all');
  const [searchModuleFilter, setSearchModuleFilter] = useState('all');
  const [editingSection, setEditingSection] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLevel, setEditLevel] = useState('beginner');
  const { toast } = useToast();
  
  // Vérifier si l'utilisateur est ADMIN
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'ADMIN';

  // Charger le manuel quand la modale s'ouvre ou quand les filtres changent
  useEffect(() => {
    if (open) {
      loadManual();
    }
  }, [open, levelFilter, moduleFilter]);

  const loadManual = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const params = new URLSearchParams();
      if (levelFilter !== 'both') params.append('level_filter', levelFilter);
      if (moduleFilter !== 'all') params.append('module_filter', moduleFilter);
      
      console.log('📚 Chargement du manuel depuis:', `${backend_url}/api/manual/content`);
      
      const response = await axios.get(
        `${backend_url}/api/manual/content?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('📚 Manuel chargé:', response.data);
      console.log('📚 Chapitres:', response.data.chapters);
      console.log('📚 Sections:', response.data.sections);
      setManualData(response.data);
      
      // Sélectionner le premier chapitre par défaut
      if (response.data.chapters && response.data.chapters.length > 0) {
        const firstChapter = response.data.chapters[0];
        setSelectedChapter(firstChapter);
        
        console.log('📚 Premier chapitre:', firstChapter);
        console.log('📚 Sections du chapitre:', firstChapter.sections);
        
        // Ouvrir automatiquement le premier chapitre
        setExpandedChapters(new Set([firstChapter.id]));
        
        // Sélectionner la première section du premier chapitre
        const firstSection = response.data.sections.find(
          s => firstChapter.sections && firstChapter.sections.includes(s.id)
        );
        console.log('📚 Première section trouvée:', firstSection);
        
        if (firstSection) {
          setSelectedSection(firstSection);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement manuel:', error);
      console.error('❌ Détails:', error.response?.data || error.message);
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de charger le manuel',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (chapterId) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
      
      // Auto-sélectionner la première section du chapitre si aucune section n'est sélectionnée
      if (!selectedSection) {
        const chapter = manualData.chapters.find(c => c.id === chapterId);
        if (chapter && chapter.sections && chapter.sections.length > 0) {
          const firstSection = manualData.sections.find(s => chapter.sections.includes(s.id));
          if (firstSection) {
            selectSection(firstSection, chapter);
          }
        }
      }
    }
    setExpandedChapters(newExpanded);
  };

  const selectSection = (section, chapter) => {
    setSelectedSection(section);
    setSelectedChapter(chapter);
    setSearchResults([]); // Réinitialiser les résultats de recherche
    setCurrentPage(1);
  };

  // Fonction pour surligner les mots-clés dans le texte
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const words = query.toLowerCase().split(' ').filter(w => w.length > 2);
    let highlightedText = text;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark style="background-color: #fef08a; padding: 2px 4px; border-radius: 2px; font-weight: 600;">$1</mark>');
    });
    
    return highlightedText;
  };

  const exportPDF = async () => {
    try {
      setLoading(true);
      toast({
        title: 'Génération en cours...',
        description: 'Veuillez patienter pendant la génération du PDF'
      });
      
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      // Construire l'URL avec le filtre de niveau actuel
      const params = new URLSearchParams();
      if (levelFilter !== 'both') {
        params.append('level_filter', levelFilter);
      }
      
      // Télécharger le PDF
      const response = await fetch(
        `${backend_url}/api/manual/export-pdf?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }
      
      // Créer un blob à partir de la réponse
      const blob = await response.blob();
      
      // Créer un lien de téléchargement temporaire
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuel_gmao_iris_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Succès',
        description: 'Le PDF a été téléchargé avec succès',
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF. Veuillez réessayer.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };



  // Fonctions d'édition Admin
  const startEditSection = (section) => {
    setEditingSection(section.id);
    setEditTitle(section.title);
    setEditContent(section.content);
    setEditLevel(section.level);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditTitle('');
    setEditContent('');
    setEditLevel('beginner');
  };

  const saveSection = async () => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await axios.put(
        `${backend_url}/api/manual/sections/${editingSection}`,
        {
          title: editTitle,
          content: editContent,
          level: editLevel
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast({
        title: 'Succès',
        description: 'Section mise à jour avec succès'
      });
      
      // Recharger le manuel
      await loadManual();
      cancelEdit();
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la section',
        variant: 'destructive'
      });
    }
  };

  const deleteSection = async (sectionId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      await axios.delete(
        `${backend_url}/api/manual/sections/${sectionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast({
        title: 'Succès',
        description: 'Section supprimée avec succès'
      });
      
      // Recharger le manuel
      await loadManual();
      setSelectedSection(null);
      
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la section',
        variant: 'destructive'
      });
    }
  };

  const searchManual = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await axios.post(
        `${backend_url}/api/manual/search`,
        {
          query: searchQuery,
          level_filter: searchLevelFilter !== 'all' ? searchLevelFilter : null,
          module_filter: searchModuleFilter !== 'all' ? searchModuleFilter : null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Résultats recherche:', response.data.results);
      
      // Afficher les résultats dans la zone de contenu
      if (response.data.results && response.data.results.length > 0) {
        const results = response.data.results;
        
        // Stocker les résultats pour la pagination
        setSearchResults(results);
        setCurrentPage(1);
        
        // Développer les chapitres pertinents
        const relevantChapters = [...new Set(results.map(r => r.chapter_id).filter(Boolean))];
        setExpandedChapters(new Set(relevantChapters));
        
        toast({
          title: 'Recherche terminée',
          description: `${results.length} résultat(s) trouvé(s)`,
          duration: 2000
        });
      } else {
        setSearchResults([]);
        toast({
          title: 'Aucun résultat',
          description: 'Aucun résultat trouvé pour votre recherche',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la recherche',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour naviguer vers un résultat de recherche
  const goToSearchResult = (result) => {
    const section = manualData.sections.find(s => s.id === result.section_id);
    const chapter = manualData.chapters.find(c => c.id === result.chapter_id);
    
    if (section && chapter) {
      selectSection(section, chapter);
      setExpandedChapters(new Set([chapter.id]));
    }
  };

  // Rendu des résultats de recherche avec pagination
  const renderSearchResults = () => {
    if (searchResults.length === 0) return null;
    
    const indexOfLastResult = currentPage * resultsPerPage;
    const indexOfFirstResult = indexOfLastResult - resultsPerPage;
    const currentResults = searchResults.slice(indexOfFirstResult, indexOfLastResult);
    const totalPages = Math.ceil(searchResults.length / resultsPerPage);
    
    return (
      <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Résultats pour "{searchQuery}"
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchResults([]);
              setSearchQuery('');
              setCurrentPage(1);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          {searchResults.length} résultat(s) trouvé(s) • Page {currentPage}/{totalPages}
        </p>
        
        <div className="space-y-3">
          {currentResults.map((result, index) => (
            <div
              key={result.section_id}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
              onClick={() => goToSearchResult(result)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
                      #{indexOfFirstResult + index + 1}
                    </span>
                    <span className="text-xs text-gray-500">{result.chapter_title}</span>
                  </div>
                  
                  <h4 
                    className="font-semibold text-base mb-2"
                    dangerouslySetInnerHTML={{ __html: highlightText(result.title, searchQuery) }}
                  />
                  
                  <p 
                    className="text-sm text-gray-700 mb-2"
                    dangerouslySetInnerHTML={{ __html: highlightText(result.excerpt, searchQuery) }}
                  />
                  
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Score:</span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        {result.relevance_score.toFixed(1)}
                      </span>
                    </span>
                    <span className="text-blue-600 hover:underline">
                      Voir le contenu complet →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Précédent
            </Button>
            
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                  className="w-8 h-8 p-0"
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant →
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderTableOfContents = () => {
    if (!manualData || !manualData.chapters) return null;

    return (
      <div className="space-y-1">
        {manualData.chapters.map(chapter => {
          const chapterSections = manualData.sections.filter(
            s => chapter.sections.includes(s.id)
          );
          const isExpanded = expandedChapters.has(chapter.id);

          return (
            <div key={chapter.id} className="mb-2">
              <div
                className="flex items-center justify-between p-3 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                onClick={() => toggleChapter(chapter.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {isExpanded ? <ChevronDown size={18} className="text-gray-600" /> : <ChevronRight size={18} className="text-gray-600" />}
                  <span className="font-semibold text-sm text-gray-800">{chapter.title}</span>
                </div>
              </div>
              
              {isExpanded && chapterSections.length > 0 && (
                <div className="ml-8 mt-1 space-y-0.5">
                  {chapterSections.map(section => (
                    <div
                      key={section.id}
                      className={`p-2.5 text-sm rounded-lg cursor-pointer transition-all ${
                        selectedSection?.id === section.id 
                          ? 'bg-blue-100 text-blue-800 font-medium border-l-4 border-blue-600 pl-3' 
                          : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-l-4 border-transparent hover:border-gray-300 pl-3'
                      }`}
                      onClick={() => selectSection(section, chapter)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{section.title}</span>
                        {section.level !== 'both' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            section.level === 'beginner' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {section.level === 'beginner' ? '🎓 Débutant' : '⚡ Avancé'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du manuel...</p>
          </div>
        </div>
      );
    }

    if (!selectedSection) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>Sélectionnez une section dans la table des matières</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-5xl">
        {/* Breadcrumb */}
        <div className="manual-breadcrumb">
          <Home size={16} />
          <ChevronRight size={14} />
          <span>{selectedChapter?.title}</span>
          <ChevronRight size={14} />
          <span>{selectedSection.title}</span>
        </div>
        
        {/* Mode édition ou affichage */}
        {adminMode && editingSection === selectedSection.id ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Titre</label>
              <Input 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Niveau</label>
              <select 
                value={editLevel}
                onChange={(e) => setEditLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm bg-white w-full"
              >
                <option value="beginner">Débutant</option>
                <option value="advanced">Avancé</option>
                <option value="both">Les deux</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Contenu (Markdown)</label>
              <textarea 
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-96 p-3 border border-gray-300 rounded font-mono text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={saveSection} className="bg-green-600 hover:bg-green-700">
                Sauvegarder
              </Button>
              <Button onClick={cancelEdit} variant="outline">
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Titre de la section */}
            <div className="flex items-center justify-between">
              <h1>{selectedSection.title}</h1>
              {adminMode && isAdmin && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => startEditSection(selectedSection)}
                    variant="outline"
                    size="sm"
                  >
                    ✏️ Modifier
                  </Button>
                  <Button 
                    onClick={() => deleteSection(selectedSection.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    🗑️ Supprimer
                  </Button>
                </div>
              )}
            </div>
            
            {/* Contenu avec formatage préservé et support HTML pour les images */}
            <div 
              className="whitespace-pre-wrap" 
              dangerouslySetInnerHTML={{ __html: selectedSection.content }}
            />
          </>
        )}
        
        {/* Images si présentes */}
        {selectedSection.images && selectedSection.images.length > 0 && (
          <div className="mt-8 space-y-6">
            {selectedSection.images.map((img, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
                <img 
                  src={img} 
                  alt={`Illustration ${idx + 1}`} 
                  className="w-full rounded-lg"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <BookOpen size={18} />
        <span>Manuel</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <BookOpen size={28} className="text-blue-600" />
                <span>Manuel Utilisateur - GMAO Iris</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    variant={adminMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdminMode(!adminMode)}
                    className="flex items-center gap-2"
                  >
                    {adminMode ? "👁️ Mode Lecture" : "⚙️ Mode Admin"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPDF}
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  Export PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Search Bar */}
          <div className="px-6 py-3 border-b bg-gray-50 shrink-0">
            <div className="flex gap-2 items-center mb-2">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Rechercher dans le manuel... (Ex: équipement, maintenance, stock)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchManual()}
                  className="pl-10"
                />
              </div>
              <Button onClick={searchManual} size="sm" disabled={loading}>
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
              
              {/* Bouton Filtres Avancés */}
              <Button 
                variant={showAdvancedFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter size={16} className="mr-1" />
                Filtres
              </Button>
            </div>
            
            {/* Filtres Avancés */}
            {showAdvancedFilters && (
              <div className="flex gap-2 items-center pt-2 border-t">
                <span className="text-xs font-medium text-gray-600 mr-2">Filtres:</span>
                
                {/* Filtre Niveau */}
                <select
                  value={searchLevelFilter}
                  onChange={(e) => setSearchLevelFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">📚 Tous niveaux</option>
                  <option value="beginner">🌱 Débutant</option>
                  <option value="intermediate">📖 Intermédiaire</option>
                  <option value="advanced">🎓 Avancé</option>
                </select>
                
                {/* Filtre Module */}
                <select
                  value={searchModuleFilter}
                  onChange={(e) => setSearchModuleFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">📦 Tous modules</option>
                  <option value="equipment">🏭 Équipements</option>
                  <option value="workorders">📋 Ordres de Travail</option>
                  <option value="maintenance">🔄 Maintenance</option>
                  <option value="inventory">📦 Stock</option>
                  <option value="requests">🛠️ Demandes</option>
                  <option value="reports">📊 Rapports</option>
                  <option value="admin">⚙️ Administration</option>
                  <option value="people">👥 Personnel</option>
                </select>
                
                {/* Bouton Réinitialiser */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchLevelFilter('all');
                    setSearchModuleFilter('all');
                  }}
                  className="text-xs"
                >
                  <X size={14} className="mr-1" />
                  Réinitialiser
                </Button>
              </div>
            )}
          </div>

          {/* Content Area - with explicit height */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Table of Contents - Sidebar with scrollbar */}
            <div className="w-80 border-r bg-gray-50 flex flex-col shrink-0">
              <div className="px-4 py-3 border-b bg-white">
                <h3 className="font-semibold flex items-center gap-2 text-base">
                  <Filter size={18} />
                  Table des Matières
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 manual-scrollbar manual-toc">
                {renderTableOfContents()}
              </div>
            </div>

            {/* Main Content with scrollbar */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <div className="flex-1 overflow-y-auto p-8 manual-scrollbar manual-content">
                {renderContent()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManualButton;
