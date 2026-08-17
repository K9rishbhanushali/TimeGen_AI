import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Users,
  DoorOpen,
  FlaskConical,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  RefreshCw,
  BarChart2
} from 'lucide-react';
import { DashboardStats, GenerationRun } from '../types';
import { dashboardService, timetableService } from '../services/api';
import { ActivePage } from '../components/Navigation';

interface DashboardPageProps {
  onNavigate: (page: ActivePage) => void;
  onOpenAIChat: () => void;
  onSeedData: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenAIChat, onSeedData }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [runs, setRuns] = useState<GenerationRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sData, rData] = await Promise.all([
        dashboardService.getStats(),
        timetableService.getRuns(),
      ]);
      setStats(sData);
      setRuns(rData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const workflowSteps = [
    { label: 'Classrooms', page: 'classrooms' as ActivePage, done: (stats?.totalClassrooms || 0) > 0 },
    { label: 'Labs', page: 'labs' as ActivePage, done: (stats?.totalLabs || 0) > 0 },
    { label: 'Classes & Batches', page: 'classes' as ActivePage, done: (stats?.totalClasses || 0) > 0 },
    { label: 'Teachers', page: 'teachers' as ActivePage, done: (stats?.totalTeachers || 0) > 0 },
    { label: 'Subjects', page: 'subjects' as ActivePage, done: (stats?.totalSubjects || 0) > 0 },
    { label: 'Assignments', page: 'assignments' as ActivePage, done: true },
    { label: 'Timings', page: 'timings' as ActivePage, done: true },
    { label: 'Generate Timetable', page: 'generate' as ActivePage, done: (stats?.scheduledHours || 0) > 0 },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0f1115]">
      {/* Top Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0f1115] shrink-0">
        <h2 className="text-lg font-medium text-white">Dashboard Overview</h2>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('generate')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>New Generation Run</span>
          </button>
          <button
            onClick={onOpenAIChat}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Assistant</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#16191f] p-5 rounded-xl border border-gray-800 space-y-1">
            <p className="text-xs text-gray-500 mb-1">Total Active Classes</p>
            <p className="text-2xl font-bold text-white">{loading ? '...' : stats?.totalClasses ?? 0}</p>
            <div className="mt-2 text-[10px] text-emerald-400 font-medium">
              {stats?.totalStudents || 0} students enrolled
            </div>
          </div>

          <div className="bg-[#16191f] p-5 rounded-xl border border-gray-800 space-y-1">
            <p className="text-xs text-gray-500 mb-1">Resource Utilization</p>
            <p className="text-2xl font-bold text-white">{loading ? '...' : `${stats?.resourceUtilization ?? 0}%`}</p>
            <div className="mt-2 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats?.resourceUtilization ?? 0)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-[#16191f] p-5 rounded-xl border border-gray-800 space-y-1">
            <p className="text-xs text-gray-500 mb-1">Constraint Score</p>
            <p className="text-2xl font-bold text-white">{loading ? '...' : `${stats?.timetableQuality ?? 0}/100`}</p>
            <div className="mt-2 text-[10px] text-indigo-400 font-medium">
              Optimized by OR-Tools Engine
            </div>
          </div>

          <div className="bg-[#16191f] p-5 rounded-xl border border-gray-800 space-y-1">
            <p className="text-xs text-gray-500 mb-1">Active Conflicts</p>
            <p className={`text-2xl font-bold ${(stats?.conflictsCount || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {loading ? '...' : stats?.conflictsCount ?? 0}
            </p>
            <div className="mt-2 text-[10px] text-gray-500">
              {(stats?.conflictsCount || 0) === 0 ? 'Clean validation' : 'Soft/hard constraint overlaps'}
            </div>
          </div>
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#16191f] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">Classrooms</p>
              <p className="text-lg font-semibold text-white">{stats?.totalClassrooms ?? 0}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#16191f] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">Laboratories</p>
              <p className="text-lg font-semibold text-white">{stats?.totalLabs ?? 0}</p>
            </div>
            <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#16191f] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">Faculty Members</p>
              <p className="text-lg font-semibold text-white">{stats?.totalTeachers ?? 0}</p>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#16191f] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">Master Subjects</p>
              <p className="text-lg font-semibold text-white">{stats?.totalMasterSubjects ?? stats?.totalSubjects ?? 0}</p>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#16191f] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">Class Assignments</p>
              <p className="text-lg font-semibold text-white">{stats?.totalAssignments ?? 0}</p>
            </div>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#16191f] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">Scheduled Hours</p>
              <p className="text-lg font-semibold text-white">{stats?.scheduledHours ?? 0} hrs</p>
            </div>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Workflow Setup Steps */}
        <div className="bg-[#16191f] rounded-xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Academic Setup & Solver Pipeline</h3>
              <p className="text-xs text-gray-500">Complete setup sequence prior to automatic generation.</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {workflowSteps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(step.page)}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                  step.done
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-500">0{idx + 1}</span>
                  {step.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowRight className="w-3.5 h-3.5 opacity-40" />}
                </div>
                <span className="text-xs font-medium truncate">{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Timetable Solver Runs */}
        <div className="bg-[#16191f] rounded-xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Timetable Solver Executions</h3>
              <p className="text-xs text-gray-500">History of constraint engine solver runs.</p>
            </div>
            <button
              onClick={() => onNavigate('timetable')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View Current Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {runs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-gray-800 rounded-lg space-y-2">
              <Zap className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">No generation runs recorded yet.</p>
              <button
                onClick={() => onNavigate('generate')}
                className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
              >
                Run Generation Engine Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="p-3 font-semibold">Run ID / Date</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Quality Score</th>
                    <th className="p-3 font-semibold">Scheduled Sessions</th>
                    <th className="p-3 font-semibold">Solver Time</th>
                    <th className="p-3 font-semibold">Conflicts / Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80 text-gray-300">
                  {runs.slice(0, 5).map(r => (
                    <tr key={r.id} className="hover:bg-gray-800/40">
                      <td className="p-3 font-mono text-indigo-300">
                        <div>{r.id}</div>
                        <div className="text-[10px] text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{r.qualityScore}%</td>
                      <td className="p-3">{r.scheduledHours} / {r.totalRequiredHours} hrs</td>
                      <td className="p-3 font-mono">{r.solverTimeMs} ms</td>
                      <td className="p-3 text-gray-400">
                        {r.conflicts?.length || 0} conflicts, {r.warnings?.length || 0} warnings
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
