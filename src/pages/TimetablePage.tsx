import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  Filter,
  GraduationCap,
  Users,
  DoorOpen,
  FlaskConical,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Coffee
} from 'lucide-react';
import {
  TimetableEntry,
  StudentClass,
  Teacher,
  Classroom,
  Lab,
  Subject,
  TimeSlot,
  TimingConfig,
  ValidationReport
} from '../types';
import {
  timetableService,
  classService,
  teacherService,
  classroomService,
  labService,
  subjectService,
  timingService
} from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

type ViewMode = 'class' | 'teacher' | 'room' | 'lab';

export const TimetablePage: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [config, setConfig] = useState<TimingConfig | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedId, setSelectedId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editFormData, setEditFormData] = useState({
    day: 'Monday',
    periodIndex: 1,
    teacherId: '',
    resourceType: 'classroom' as 'classroom' | 'lab',
    resourceId: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, cData, tData, crData, lData, sData, slotData, cfgData] = await Promise.all([
        timetableService.getAll(),
        classService.getAll(),
        teacherService.getAll(),
        classroomService.getAll(),
        labService.getAll(),
        subjectService.getAll(),
        timingService.getSlots(),
        timingService.getConfig(),
      ]);

      setEntries(eData);
      setClasses(cData);
      setTeachers(tData);
      setClassrooms(crData);
      setLabs(lData);
      setSubjects(sData);
      setSlots(slotData);
      setConfig(cfgData);

      if (cData.length > 0 && !selectedId) setSelectedId(cData[0].id);

      // Run live validation
      const report = await timetableService.validate(eData);
      setValidationReport(report);
    } catch (err) {
      console.error('Failed to load timetable view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'class' && classes.length > 0) setSelectedId(classes[0].id);
    if (mode === 'teacher' && teachers.length > 0) setSelectedId(teachers[0].id);
    if (mode === 'room' && classrooms.length > 0) setSelectedId(classrooms[0].id);
    if (mode === 'lab' && labs.length > 0) setSelectedId(labs[0].id);
  };

  const handleToggleLock = async (entry: TimetableEntry) => {
    try {
      await timetableService.toggleLock(entry.id, !entry.isLocked);
      setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, isLocked: !e.isLocked } : e)));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteEntryClick = (id: string) => {
    setDeletingEntryId(id);
  };

  const handleConfirmDeleteEntry = async () => {
    if (!deletingEntryId) return;
    try {
      await timetableService.delete(deletingEntryId);
      setDeletingEntryId(null);
      if (editingEntry?.id === deletingEntryId) setEditingEntry(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleOpenEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setEditFormData({
      day: entry.day,
      periodIndex: entry.periodIndex,
      teacherId: entry.teacherId,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      await timetableService.update(editingEntry.id, editFormData);
      setEditingEntry(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const workingDays = config?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const nonBreakSlots = slots.filter(s => !s.isBreak);

  // Filter entries for current view
  const filteredEntries = entries.filter(e => {
    if (!selectedId) return true;
    if (viewMode === 'class') return e.classId === selectedId;
    if (viewMode === 'teacher') return e.teacherId === selectedId;
    if (viewMode === 'room') return e.resourceType === 'classroom' && e.resourceId === selectedId;
    if (viewMode === 'lab') return e.resourceType === 'lab' && e.resourceId === selectedId;
    return true;
  });

  // Deduplicate slots for row rendering while preserving breaks
  const tableRows = slots.reduce<TimeSlot[]>((acc, slot) => {
    if (!acc.some(s => s.periodIndex === slot.periodIndex && s.isBreak === slot.isBreak && s.startTime === slot.startTime)) {
      acc.push(slot);
    }
    return acc;
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto print:p-0 print:m-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <span>Weekly Timetable Schedule Grid</span>
          </h1>
          <p className="text-xs text-slate-400">
            View schedules by Class, Teacher, Room, or Lab with 2-hour lab practical blocks & light-green break highlights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Timetable</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { mode: 'class' as const, label: 'Class View', icon: GraduationCap },
              { mode: 'teacher' as const, label: 'Teacher View', icon: Users },
              { mode: 'room' as const, label: 'Room View', icon: DoorOpen },
              { mode: 'lab' as const, label: 'Lab View', icon: FlaskConical },
            ].map(item => {
              const Icon = item.icon;
              const isActive = viewMode === item.mode;
              return (
                <button
                  key={item.mode}
                  onClick={() => handleViewModeChange(item.mode)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="min-w-[220px]">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {viewMode === 'class' &&
                classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Class: {c.name} ({c.studentCount} students)
                  </option>
                ))}
              {viewMode === 'teacher' &&
                teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    Faculty: {t.name} ({t.department})
                  </option>
                ))}
              {viewMode === 'room' &&
                classrooms.map(c => (
                  <option key={c.id} value={c.id}>
                    Classroom: {c.name} (Room #{c.roomNumber})
                  </option>
                ))}
              {viewMode === 'lab' &&
                labs.map(l => (
                  <option key={l.id} value={l.id}>
                    Laboratory: {l.name} ({l.labCode})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Validation Status Indicator */}
        {validationReport && (
          <div className="flex items-center space-x-2 text-xs">
            {validationReport.isValid ? (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Valid (0 Hard Conflicts)
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/30 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                {validationReport.conflicts.length} Conflicts Found
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Timetable Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-slate-800 text-[10px] font-semibold print:hidden">
          <span className="text-slate-400">Lab batch colours:</span>
          <span className="inline-flex items-center gap-1.5 text-teal-200"><span className="w-3 h-3 rounded bg-teal-500/40 border border-teal-400"></span>Batch A</span>
          <span className="inline-flex items-center gap-1.5 text-blue-200"><span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-400"></span>Batch B</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading weekly grid...</div>
        ) : filteredEntries.length === 0 && selectedId ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-300">No scheduled sessions for this resource.</p>
            <p className="text-[11px] text-slate-500">
              Run the automatic solver from the "Generate Timetable" tab to allocate classes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3 w-36 border-r border-slate-800 text-center font-bold">
                    Period / Slot
                  </th>
                  {workingDays.map(day => (
                    <th key={day} className="p-3 font-bold text-center border-r border-slate-800/60">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tableRows.map(slot => {
                  if (slot.isBreak) {
                    return (
                      <tr key={`break_${slot.periodIndex}_${slot.startTime}`} className="bg-emerald-950/80 border-y border-emerald-500/40">
                        <td className="p-3 bg-emerald-950 border-r border-emerald-500/40 text-center font-mono">
                          <div className="font-bold text-emerald-300 text-xs flex items-center justify-center gap-1">
                            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                            <span>BREAK</span>
                          </div>
                          <div className="text-[10px] text-emerald-400 font-semibold">{slot.startTime} - {slot.endTime}</div>
                        </td>
                        <td colSpan={workingDays.length} className="p-3 text-center bg-emerald-950/60 text-emerald-200 font-bold text-xs">
                          <div className="flex items-center justify-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                              <Coffee className="w-4 h-4 text-emerald-400" />
                              <span>{slot.breakName || 'Scheduled Break'}</span>
                              <span className="text-[11px] text-emerald-400 font-mono">({slot.startTime} – {slot.endTime})</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.periodIndex} className="hover:bg-slate-800/20">
                      {/* Time Slot Column */}
                      <td className="p-3 bg-slate-950/60 border-r border-slate-800 text-center font-mono">
                        <div className="font-bold text-white text-xs">Period #{slot.periodIndex}</div>
                        <div className="text-[10px] text-slate-400">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </td>

                      {/* Days Columns */}
                      {workingDays.map(day => {
                        const slotEntries = filteredEntries.filter(
                          e => e.day === day && e.periodIndex === slot.periodIndex
                        );
                        const continuingEntries = filteredEntries.filter(e => {
                          const duration = e.durationPeriods ?? ((e.sessionType === 'PRACTICAL' || e.resourceType === 'lab') ? 2 : 1);
                          return e.day === day && e.periodIndex < slot.periodIndex && slot.periodIndex < e.periodIndex + duration;
                        });
                        const hasScheduledSession = slotEntries.length > 0 || continuingEntries.length > 0;
                        const rowSpan = slotEntries.length > 0
                          ? Math.max(...slotEntries.map(e => e.durationPeriods ?? ((e.sessionType === 'PRACTICAL' || e.resourceType === 'lab') ? 2 : 1)))
                          : 1;

                        // The period is already occupied by the cell above. Returning no
                        // cell allows the 2-hour lab cell to span and centre across both rows.
                        if (slotEntries.length === 0 && continuingEntries.length > 0) return null;

                        return (
                          <td key={day} rowSpan={rowSpan} className="p-2 border-r border-slate-800/40 align-middle">
                            {!hasScheduledSession ? (
                              <div className="h-20 rounded-xl border border-dashed border-slate-800/60 flex items-center justify-center text-[10px] text-slate-600">
                                Free Slot
                              </div>
                            ) : (
                              <div className="space-y-1.5 h-full flex flex-col justify-center">
                                {slotEntries.map(entry => {
                                  const classObj = classes.find(c => c.id === entry.classId);
                                  const subjObj = subjects.find(s => s.id === entry.subjectId);
                                  const teachObj = teachers.find(t => t.id === entry.teacherId);
                                  const roomObj = classrooms.find(c => c.id === entry.resourceId);
                                  const labObj = labs.find(l => l.id === entry.resourceId);

                                  const isPractical = entry.sessionType === 'PRACTICAL' || entry.resourceType === 'lab';
                                  const batchName = entry.batchName || classObj?.batches?.find(batch => batch.id === entry.batchId)?.name;
                                  const batchLetter = batchName?.match(/(?:-|\s)([A-Z])$/i)?.[1]?.toUpperCase();
                                  const practicalColours = batchLetter === 'A'
                                    ? 'bg-teal-950/60 border-teal-400/70 text-teal-50 shadow-lg shadow-teal-950/30'
                                    : batchLetter === 'B'
                                      ? 'bg-blue-950/60 border-blue-400/70 text-blue-50 shadow-lg shadow-blue-950/30'
                                      : 'bg-violet-950/50 border-violet-500/50 text-violet-100 shadow-lg shadow-violet-950/30';
                                  const tagColours = batchLetter === 'A'
                                    ? 'bg-teal-500/20 border-teal-400/50 text-teal-200'
                                    : batchLetter === 'B'
                                      ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                                      : 'bg-violet-500/20 border-violet-500/40 text-violet-300';

                                  return (
                                    <div
                                      key={entry.id}
                                      className={`p-2.5 rounded-xl border text-xs relative group transition-all ${
                                        isPractical
                                          ? practicalColours
                                          : 'bg-slate-950 border-slate-800 text-slate-200'
                                      }`}
                                    >
                                      {/* Entry Header: Subject + Lock */}
                                      <div className="flex items-start justify-between gap-1 mb-1">
                                        <span className="font-bold text-white leading-tight line-clamp-1">
                                          {subjObj?.name || 'Subject'}
                                        </span>

                                        <div className="flex items-center space-x-1 shrink-0">
                                          <button
                                            onClick={() => handleToggleLock(entry)}
                                            className={`p-0.5 rounded ${
                                              entry.isLocked
                                                ? 'text-amber-400 bg-amber-500/20'
                                                : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                            title={entry.isLocked ? 'Locked (Pinned)' : 'Unlocked'}
                                          >
                                            {entry.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                          </button>
                                          <button
                                            onClick={() => handleOpenEdit(entry)}
                                            className="p-0.5 text-slate-500 hover:text-white"
                                            title="Edit entry"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteEntryClick(entry.id)}
                                            className="p-0.5 text-slate-500 hover:text-rose-400"
                                            title="Delete entry"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* 2-Hour Lab Block Tag */}
                                      {isPractical && (
                                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold mb-1 ${tagColours}`}>
                                          <span>🧪 2-Hour Lab ({entry.startTime} - {entry.endTime})</span>
                                          {batchName && <span>({batchName})</span>}
                                        </div>
                                      )}

                                      {/* Details */}
                                      <div className="space-y-0.5 text-[10px] text-slate-300">
                                        {viewMode !== 'class' && (
                                          <div>Class: <span className="font-semibold text-white">{classObj?.name}</span></div>
                                        )}
                                        {viewMode !== 'teacher' && (
                                          <div>Faculty: <span className="text-amber-300 font-medium">{teachObj?.name}</span></div>
                                        )}
                                        <div>
                                          Venue:{' '}
                                          <span className="font-semibold text-slate-200">
                                            {entry.resourceType === 'lab'
                                              ? labObj?.name || 'Lab'
                                              : roomObj?.name || 'Room'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white">Manual Timetable Adjustment</h2>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Day</label>
                  <select
                    value={editFormData.day}
                    onChange={e => setEditFormData({ ...editFormData, day: e.target.value })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {workingDays.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Period Index</label>
                  <select
                    value={editFormData.periodIndex}
                    onChange={e => setEditFormData({ ...editFormData, periodIndex: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {nonBreakSlots.map(s => (
                      <option key={s.periodIndex} value={s.periodIndex}>
                        Period #{s.periodIndex} ({s.startTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Faculty Teacher</label>
                <select
                  value={editFormData.teacherId}
                  onChange={e => setEditFormData({ ...editFormData, teacherId: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Venue Type</label>
                  <select
                    value={editFormData.resourceType}
                    onChange={e =>
                      setEditFormData({
                        ...editFormData,
                        resourceType: e.target.value as 'classroom' | 'lab',
                        resourceId: e.target.value === 'classroom' ? classrooms[0]?.id || '' : labs[0]?.id || '',
                      })
                    }
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="classroom">Classroom</option>
                    <option value="lab">Laboratory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Venue Location</label>
                  <select
                    value={editFormData.resourceId}
                    onChange={e => setEditFormData({ ...editFormData, resourceId: e.target.value })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {editFormData.resourceType === 'classroom'
                      ? classrooms.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      : labs.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteEntryClick(editingEntry.id)}
                  className="px-3.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Session</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(null)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
                  >
                    Save & Validate Slot
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Entry Modal */}
      <ConfirmModal
        isOpen={!!deletingEntryId}
        title="Remove Timetable Entry"
        message="Are you sure you want to remove this scheduled entry from the timetable?"
        confirmText="Remove Entry"
        onConfirm={handleConfirmDeleteEntry}
        onCancel={() => setDeletingEntryId(null)}
      />
    </div>
  );
};
