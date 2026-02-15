import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Save } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import ImportExportTab from './ImportExportTab';
import BackupTab from './BackupTab';

const ImportExport = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('import-export');

  useEffect(() => {
    if (searchParams.get('drive_connected') === 'true') {
      setActiveTab('backup');
      toast({ title: 'Google Drive connecté avec succès' });
    }
  }, [searchParams, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import / Export</h1>
        <p className="text-gray-600 mt-1">Sauvegardez et restaurez vos données</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit" data-testid="import-export-tabs">
        <button
          onClick={() => setActiveTab('import-export')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'import-export' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          data-testid="tab-import-export"
        >
          <Download size={16} className="inline mr-2" />Import / Export
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'backup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          data-testid="tab-backup"
        >
          <Save size={16} className="inline mr-2" />Sauvegardes Automatiques
        </button>
      </div>

      {activeTab === 'import-export' && <ImportExportTab />}
      {activeTab === 'backup' && <BackupTab />}
    </div>
  );
};

export default ImportExport;
