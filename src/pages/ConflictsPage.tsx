import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, RefreshCw, Bot, ShieldAlert, ArrowRight } from 'lucide-react';
import { ValidationReport, ConflictInfo } from '../types';
import { timetableService, aiService } from '../services/api';

export const ConflictsPage: React.FC = () => {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState<{ [key: string]: string }>({});
  const [explainingId, setExplainingId] = useState<string | null>(null);

  const loadValidation = async () => {
    setLoading(true);
    try {
      const rep = await timetableService.validate();
      setReport(rep);
    } catch (err) {
      console.error('Failed to run validation check:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidation();
  }, []);

  const handleExplain = async (conflict: ConflictInfo) => {
    setExplainingId(conflict.id);
    try {
      const res = await aiService.explainConflict(conflict);
      setAiExplanation(prev => ({ ...prev, [conflict.id]: res.explanation }));
    } catch (err) {
      alert(`AI explanation error: ${(err as Error).message}`);
    } finally {
      setExplainingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span>Conflict Center & Constraint Auditor</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time validation auditor checking for double-booked faculty, room overlaps, and capacity issues.
          </p>
        </div>

        <button
          onClick={loadValidation}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Re-Auditing Timetable</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Auditing schedule for hard conflicts...</div>
      ) : !report ? (
        <div className="p-12 text-center text-xs text-slate-400">Failed to load validation report.</div>
      ) : (
        <div className="space-y-6">
          {/* Audit Result Status Card */}
          <div
            className={`p-6 rounded-2xl border flex items-center justify-between ${
              report.isValid
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              {report.isValid ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              )}

              <div>
                <h2 className="text-base font-bold text-white">
                  {report.isValid ? '100% Conflict-Free Schedule' : 'Conflicts Detected'}
                </h2>
                <p className="text-xs text-slate-400">
                  {report.isValid
                    ? 'All hard constraints satisfied with zero double-bookings or capacity violations.'
                    : `Found ${report.conflicts.length} hard conflicts and ${report.warnings.length} soft workload warnings.`}
                </p>
              </div>
            </div>
          </div>

          {/* Hard Conflicts List */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Hard Conflicts ({report.conflicts.length})</span>
            </h2>

            {report.conflicts.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                No hard conflicts present in the current timetable.
              </div>
            ) : (
              <div className="space-y-3">
                {report.conflicts.map(c => (
                  <div key={c.id} className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-mono">
                          {c.type}
                        </span>
                        <h3 className="text-xs font-bold text-white">{c.description}</h3>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Slot: {c.day} Period #{c.periodIndex}
                        </p>
                      </div>

                      <button
                        onClick={() => handleExplain(c)}
                        disabled={explainingId === c.id}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>{explainingId === c.id ? 'Analyzing...' : 'AI Explain & Fix'}</span>
                      </button>
                    </div>

                    {/* AI Explanation Box */}
                    {aiExplanation[c.id] && (
                      <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-xs text-indigo-200 space-y-1 animate-in fade-in">
                        <div className="font-bold flex items-center gap-1 text-indigo-300">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Gemini AI Diagnosis & Solution:</span>
                        </div>
                        <p className="leading-relaxed text-[11px] whitespace-pre-wrap">{aiExplanation[c.id]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warnings List */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Workload Warnings & Soft Optimization Flags ({report.warnings.length})</span>
            </h2>

            {report.warnings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                No workload warnings or soft constraint flags.
              </div>
            ) : (
              <div className="space-y-2">
                {report.warnings.map(w => (
                  <div key={w.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{w.description}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                      Warning
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
