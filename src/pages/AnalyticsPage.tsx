import React, { useEffect, useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Users, DoorOpen, FlaskConical } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { Teacher, Classroom, Lab, TimetableEntry } from '../types';
import { teacherService, classroomService, labService, timetableService } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [tData, crData, lData, eData] = await Promise.all([
          teacherService.getAll(),
          classroomService.getAll(),
          labService.getAll(),
          timetableService.getAll(),
        ]);
        setTeachers(tData);
        setClassrooms(crData);
        setLabs(lData);
        setEntries(eData);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Prepare chart data: Faculty Workload
  const teacherWorkloadData = teachers.map(t => {
    const totalHours = entries.filter(e => e.teacherId === t.id).length;
    return {
      name: t.name.replace('Prof. ', ''),
      Hours: totalHours,
      Max: t.maxHoursPerDay * 5, // weekly max assumption
    };
  });

  // Venue Utilization
  const classroomUtilData = classrooms.map(c => ({
    name: c.name,
    OccupiedSlots: entries.filter(e => e.resourceType === 'classroom' && e.resourceId === c.id).length,
  }));

  const labUtilData = labs.map(l => ({
    name: l.name,
    OccupiedSlots: entries.filter(e => e.resourceType === 'lab' && e.resourceId === l.id).length,
  }));

  // Sessions breakdown (Theory vs Practical)
  const theoryCount = entries.filter(e => e.sessionType === 'THEORY').length;
  const practicalCount = entries.filter(e => e.sessionType === 'PRACTICAL').length;

  const pieData = [
    { name: 'Theory Lectures', value: theoryCount, color: '#6366f1' },
    { name: 'Practical Labs', value: practicalCount, color: '#8b5cf6' },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <span>Resource Analytics & Workload Insights</span>
        </h1>
        <p className="text-xs text-slate-400">
          Visual metrics on teacher workload distribution, classroom vs lab utilization, and lecture breakdown.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading analytics dashboards...</div>
      ) : (
        <div className="space-y-6">
          {/* Top Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Faculty Workload Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Faculty Weekly Workload (Hours Scheduled)</span>
              </h2>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teacherWorkloadData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="Hours" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Theory vs Practical Breakdown Pie */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-violet-400" />
                <span>Theory vs Practical Sessions</span>
              </h2>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    Theory Hours:
                  </span>
                  <span className="font-bold text-white">{theoryCount} hrs</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                    Practical Hours:
                  </span>
                  <span className="font-bold text-white">{practicalCount} hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Classroom vs Lab Occupancy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-emerald-400" />
                <span>Classroom Occupancy (Periods Scheduled)</span>
              </h2>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classroomUtilData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="OccupiedSlots" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-violet-400" />
                <span>Laboratory Occupancy (Periods Scheduled)</span>
              </h2>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={labUtilData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="OccupiedSlots" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
