import React, { useState } from 'react';
import { Zap, CheckCircle2, AlertTriangle, Play, RefreshCw, Cpu, Layers, Sparkles, Sliders } from 'lucide-react';
import { timetableService } from '../services/api';
import { ActivePage } from '../components/Navigation';

interface GeneratePageProps {
  onNavigate: (page: ActivePage) => void;
}

export const GeneratePage: React.FC<GeneratePageProps> = ({ onNavigate }) => {
  const [startFresh, setStartFresh] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<any>(null);

  const [constraints, setConstraints] = useState({
    hardTeacherOverlap: true,
    hardRoomOverlap: true,
    hardClassOverlap: true,
    hardCapacity: true,
    hardAvailability: true,
    softMinimizeGaps: true,
    softSpreadPracticals: true,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(10);
    setStage('Initializing OR-Tools CP-SAT Constraint Engine...');
    setResult(null);

    try {
      const p1 = setTimeout(() => {
        setProgress(35);
        setStage('Building hard constraint matrix (Teacher, Room, Class, Lab Benches)...');
      }, 300);

      const p2 = setTimeout(() => {
        setProgress(65);
        setStage('Executing heuristic CP-SAT backtracking search & batch allocations...');
      }, 700);

      const p3 = setTimeout(() => {
        setProgress(85);
        setStage('Evaluating soft constraint penalty scores & gap optimization...');
      }, 1000);

      const genResult = await timetableService.generate({ startFresh });

      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);

      setProgress(100);
      setStage('Generation Complete!');
      setResult(genResult);
    } catch (err) {
      alert(`Timetable generation error: ${(err as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-2">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Constraint Scheduler Engine
          </span>
          <span className="text-xs text-slate-400">OR-Tools + High-Performance Solver</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-indigo-400 fill-current" />
          <span>Generate College Timetable</span>
        </h1>
        <p className="text-xs text-slate-400">
          Run the automatic constraint solver to create an optimized, conflict-free schedule across all classes, labs, and teachers.
        </p>
      </div>

      {/* Solver Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Options & Toggle */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Generation Parameters</span>
          </h2>

          <div className="space-y-4 text-xs">
            {/* Start Fresh vs Incremental */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <label className="text-slate-300 font-semibold block">Execution Mode</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={startFresh}
                    onChange={() => setStartFresh(true)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-white font-medium">Start Fresh</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={!startFresh}
                    onChange={() => setStartFresh(false)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400">Preserve Locked Slots</span>
                </label>
              </div>
              <p className="text-[10px] text-slate-500">
                {startFresh
                  ? 'Overwrites all unlocked entries with a newly generated schedule.'
                  : 'Keeps user-locked entries fixed and fills remaining slots.'}
              </p>
            </div>

            {/* Hard Constraints */}
            <div className="space-y-2">
              <span className="font-semibold text-rose-400 block text-[11px] uppercase tracking-wider">
                Strict Hard Constraints (Must satisfy)
              </span>
              {[
                { key: 'hardTeacherOverlap', label: 'Zero Teacher Double-Booking' },
                { key: 'hardRoomOverlap', label: 'Zero Classroom / Lab Overlap' },
                { key: 'hardClassOverlap', label: 'Zero Student Class Conflict' },
                { key: 'hardCapacity', label: 'Enforce Lab Bench & Classroom Capacity' },
                { key: 'hardAvailability', label: 'Enforce Resource Availability Rules' },
              ].map(item => (
                <label key={item.key} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={constraints[item.key as keyof typeof constraints]}
                    onChange={e =>
                      setConstraints({ ...constraints, [item.key]: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Soft Constraints */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="font-semibold text-amber-400 block text-[11px] uppercase tracking-wider">
                Soft Constraints (Optimization heuristics)
              </span>
              {[
                { key: 'softMinimizeGaps', label: 'Minimize Empty Periods in Student Timetable' },
                { key: 'softSpreadPracticals', label: 'Spread Lab Practicals Evenly across Days' },
              ].map(item => (
                <label key={item.key} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={constraints[item.key as keyof typeof constraints]}
                    onChange={e =>
                      setConstraints({ ...constraints, [item.key]: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Progress & Action */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Solver Execution Status</span>
            </h2>

            {isGenerating ? (
              <div className="p-6 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-4 text-center animate-in fade-in">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <div>
                  <div className="text-xs font-bold text-white mb-1">{stage}</div>
                  <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : result ? (
              <div className="p-5 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Timetable Successfully Generated!</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-emerald-500/20">
                  <div>
                    <span className="text-slate-500">Quality Score:</span>{' '}
                    <span className="font-bold text-white">{result.qualityScore}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Execution Time:</span>{' '}
                    <span className="font-mono text-indigo-300">{result.solverTimeMs} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Scheduled Sessions:</span>{' '}
                    <span className="font-bold text-white">{result.entries.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Conflicts:</span>{' '}
                    <span className="font-bold text-amber-300">{result.conflicts?.length || 0}</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('timetable')}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
                >
                  View Interactive Timetable Grid
                </button>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-xs text-slate-400">Ready to execute constraint scheduler.</p>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isGenerating ? 'Solving Constraints...' : 'Run Timetable Generator Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
