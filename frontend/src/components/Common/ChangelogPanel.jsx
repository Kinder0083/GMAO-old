import React, { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Sparkles, Wrench, Bug, X } from 'lucide-react';
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

const ChangelogPanel = ({ open, onOpenChange }) => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadChangelog = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await api.get('/releases');
      setReleases(res.data.releases || []);
      // Marquer comme lu
      await api.post('/releases/mark-read');
    } catch (err) {
      console.error('Erreur chargement changelog:', err);
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    loadChangelog();
  }, [loadChangelog]);

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
                        className="flex gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        data-testid={`changelog-entry-${release.version}-${entryIdx}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <EntryBadge type={entry.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{entry.description}</p>
                        </div>
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
