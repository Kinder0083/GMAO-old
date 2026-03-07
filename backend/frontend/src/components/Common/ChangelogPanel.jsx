import React, { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Sparkles, Wrench, Bug, ThumbsUp, ThumbsDown } from 'lucide-react';
import api from '../../services/api';

const typeConfig = {
  feature: { label: 'Nouveau', icon: Sparkles, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  improvement: { label: 'Amélioration', icon: Wrench, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  fix: { label: 'Correction', icon: Bug, className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const EntryBadge = ({ type }) => {
  const config = typeConfig[type] || typeConfig.feature;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const FeedbackButtons = ({ version, entryIndex, feedbackData, onVote }) => {
  const stats = feedbackData.stats?.[entryIndex] || { up: 0, down: 0 };
  const userVote = feedbackData.userVotes?.[entryIndex] || null;

  return (
    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
      <button
        onClick={() => onVote(version, entryIndex, 'up')}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
          userVote === 'up'
            ? 'bg-emerald-100 text-emerald-700 font-semibold'
            : 'text-gray-400 hover:bg-gray-100 hover:text-emerald-600'
        }`}
        data-testid={`feedback-up-${version}-${entryIndex}`}
      >
        <ThumbsUp size={13} />
        {stats.up > 0 && <span>{stats.up}</span>}
      </button>
      <button
        onClick={() => onVote(version, entryIndex, 'down')}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
          userVote === 'down'
            ? 'bg-red-100 text-red-600 font-semibold'
            : 'text-gray-400 hover:bg-gray-100 hover:text-red-500'
        }`}
        data-testid={`feedback-down-${version}-${entryIndex}`}
      >
        <ThumbsDown size={13} />
        {stats.down > 0 && <span>{stats.down}</span>}
      </button>
    </div>
  );
};

const ChangelogPanel = ({ open, onOpenChange }) => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  // feedbackMap: { "1.7.0": { stats: { 0: {up:1,down:0} }, userVotes: { 0: "up" } } }
  const [feedbackMap, setFeedbackMap] = useState({});

  const loadFeedback = useCallback(async (versions) => {
    const map = {};
    await Promise.all(
      versions.map(async (ver) => {
        try {
          const res = await api.get(`/releases/feedback/${ver}`);
          map[ver] = { stats: res.data.stats || {}, userVotes: res.data.user_votes || {} };
        } catch {
          map[ver] = { stats: {}, userVotes: {} };
        }
      })
    );
    setFeedbackMap(map);
  }, []);

  const loadChangelog = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await api.get('/releases');
      const rel = res.data.releases || [];
      setReleases(rel);
      await api.post('/releases/mark-read');
      await loadFeedback(rel.map(r => r.version));
    } catch (err) {
      console.error('Erreur chargement changelog:', err);
    } finally {
      setLoading(false);
    }
  }, [open, loadFeedback]);

  useEffect(() => {
    loadChangelog();
  }, [loadChangelog]);

  const handleVote = async (version, entryIndex, vote) => {
    try {
      const res = await api.post('/releases/feedback', { version, entry_index: entryIndex, vote });
      const newVote = res.data.vote; // null if removed

      // Mise à jour optimiste locale
      setFeedbackMap(prev => {
        const verData = prev[version] || { stats: {}, userVotes: {} };
        const oldVote = verData.userVotes[entryIndex] || null;
        const newStats = { ...verData.stats };
        const entryStat = { ...(newStats[entryIndex] || { up: 0, down: 0 }) };

        // Retirer l'ancien vote
        if (oldVote) entryStat[oldVote] = Math.max(0, (entryStat[oldVote] || 0) - 1);
        // Ajouter le nouveau vote
        if (newVote) entryStat[newVote] = (entryStat[newVote] || 0) + 1;

        newStats[entryIndex] = entryStat;
        const newUserVotes = { ...verData.userVotes };
        if (newVote) {
          newUserVotes[entryIndex] = newVote;
        } else {
          delete newUserVotes[entryIndex];
        }

        return { ...prev, [version]: { stats: newStats, userVotes: newUserVotes } };
      });
    } catch (err) {
      console.error('Erreur vote:', err);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[440px] p-0 flex flex-col" data-testid="changelog-panel">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" />
              Quoi de neuf ?
            </SheetTitle>
          </div>
          <p className="text-sm text-gray-500 mt-1">Découvrez les dernières nouveautés de FSAO Iris</p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : releases.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Aucune mise à jour pour le moment</p>
          ) : (
            <div className="space-y-8">
              {releases.map((release, idx) => (
                <div key={release.id || idx} data-testid={`changelog-release-${release.version}`}>
                  {/* Version header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">v{release.version}</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(release.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {idx === 0 && (
                      <Badge variant="outline" className="bg-blue-600 text-white border-blue-600 text-xs">
                        Dernière
                      </Badge>
                    )}
                  </div>

                  {/* Entries */}
                  <div className="space-y-3 ml-1">
                    {(release.entries || []).map((entry, entryIdx) => (
                      <div
                        key={entryIdx}
                        className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        data-testid={`changelog-entry-${release.version}-${entryIdx}`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <EntryBadge type={entry.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{entry.description}</p>
                          </div>
                        </div>
                        <FeedbackButtons
                          version={release.version}
                          entryIndex={entryIdx}
                          feedbackData={feedbackMap[release.version] || { stats: {}, userVotes: {} }}
                          onVote={handleVote}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Separator between versions */}
                  {idx < releases.length - 1 && (
                    <div className="border-t border-gray-200 mt-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ChangelogPanel;
