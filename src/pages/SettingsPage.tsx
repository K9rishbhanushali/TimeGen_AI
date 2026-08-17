import React, { useState } from 'react';
import { Settings, Database, RefreshCw, Trash2, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { databaseService } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

interface SettingsPageProps {
  onSeedData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onSeedData }) => {
  const [clearing, setClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleConfirmClearData = async () => {
    setShowConfirmClear(false);
    setClearing(true);
    try {
      await databaseService.clearAll();
      alert('Database cleared successfully.');
      window.location.reload();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Application Settings & Database Management</span>
        </h1>
        <p className="text-xs text-slate-400">
          Configure MongoDB database connection, seed demo datasets, or reset system resources.
        </p>
      </div>

      <div className="space-y-6">
        {/* System Architecture Status */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>System Status & Stack Verification</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">Database Persistence</span>
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                <span>MongoDB / Express Backend</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium">AI Intelligence Layer</span>
              <div className="font-bold text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini 3.6 Flash SDK</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Seed & Reset Controls */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Database Seed & Reset Tools</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Reset to Seeded Demo Dataset</h3>
                <p className="text-[11px] text-slate-400">
                  Pre-populates database with 50+ classrooms, labs, TYIT1/FYCS student classes, faculty members, and subjects.
                </p>
              </div>

              <button
                onClick={onSeedData}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                Seed Demo Data
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-rose-300">Wipe Database Clean</h3>
                <p className="text-[11px] text-slate-400">
                  Deletes all classrooms, laboratories, student classes, faculty, assignments, and generated timetables.
                </p>
              </div>

              <button
                onClick={() => setShowConfirmClear(true)}
                disabled={clearing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {clearing ? 'Wiping...' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Clear Modal */}
      <ConfirmModal
        isOpen={showConfirmClear}
        title="Wipe Database Clean"
        message="WARNING: Are you sure you want to clear ALL classrooms, labs, classes, teachers, and timetable entries? This action cannot be undone."
        confirmText="Wipe All Data"
        onConfirm={handleConfirmClearData}
        onCancel={() => setShowConfirmClear(false)}
      />
    </div>
  );
};
