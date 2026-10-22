import React, { useEffect, useState } from 'react';
import {
  CalendarOff,
  Hand,
  Undo2,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AppUser, TimetableEntry, Teacher, StudentClass, Subject, Classroom, Lab } from '../types';
import {
  timetableService,
  teacherService,
  classService,
  subjectService,
  classroomService,
  labService,
  timingService,
  coverService,
  ClaimConflict,
} from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

interface TeacherCoverPageProps {
  user: AppUser;
}

const statusOf = (e: TimetableEntry) => e.status || 'SCHEDULED';

export const TeacherCoverPage: React.FC<TeacherCoverPageProps> = ({ user }) => {
  const myId = user.teacherId || '';
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [day, setDay] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [loading, setLoading] = useState(true);

  const [claimTarget, setClaimTarget] = useState<TimetableEntry | null>(null);
  const [claimConflict, setClaimConflict] = useState<ClaimConflict | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, tData, cData, sData, crData, lData, cfg] = await Promise.all([
        timetableService.getAll(),
        teacherService.getAll(),
        classService.getAll(),
        subjectService.getAll(),
        classroomService.getAll(),
        labService.getAll(),
        timingService.getConfig(),
      ]);
      setEntries(eData);
      setTeachers(tData);
      setClasses(cData);
      setSubjects(sData);
      setClassrooms(crData);
      setLabs(lData);
      if (cfg?.workingDays?.length) setWorkingDays(cfg.workingDays);
    } catch (err) {
      console.error('Failed to load cover data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeDay = workingDays.includes(day) ? day : workingDays[0] || day;

  const teacherName = (id?: string | null) => teachers.find(t => t.id === id)?.name || 'Unknown';
  const className = (id: string) => classes.find(c => c.id === id)?.name || 'Class';
  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Lecture';
  const venueName = (e: TimetableEntry) =>
    e.resourceType === 'lab'
      ? labs.find(l => l.id === e.resourceId)?.name || 'Lab'
      : classrooms.find(c => c.id === e.resourceId)?.name || 'Room';

  const myDayEntries = entries
    .filter(e => e.teacherId === myId && e.day === activeDay)
    .sort((a, b) => a.periodIndex - b.periodIndex);

  const openEntries = entries
    .filter(e => e.day === activeDay && statusOf(e) === 'OPEN' && e.teacherId !== myId)
    .sort((a, b) => a.periodIndex - b.periodIndex);

  const myCovers = entries
    .filter(e => e.day === activeDay && e.coverTeacherId === myId)
    .sort((a, b) => a.periodIndex - b.periodIndex);

  // Am I busy at this slot? (own scheduled lecture or a cover I hold)
  const busyAt = (periodIndex: number, excludeId?: string) =>
    entries.find(
      e =>
        e.id !== excludeId &&
        e.day === activeDay &&
        e.periodIndex === periodIndex &&
        ((e.teacherId === myId && statusOf(e) !== 'OPEN') || e.coverTeacherId === myId)
    );

  const handleRelease = async (entry: TimetableEntry) => {
    try {
      await coverService.release(entry.id, myId);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCancelRelease = async (entry: TimetableEntry) => {
    try {
      await coverService.cancelRelease(entry.id, myId);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUnclaim = async (entry: TimetableEntry) => {
    try {
      await coverService.unclaim(entry.id, myId);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleClaimClick = (entry: TimetableEntry) => {
    const conflict = busyAt(entry.periodIndex, entry.id);
    if (conflict) {
      setClaimTarget(entry);
      setClaimConflict({
        entryId: conflict.id,
        subjectName: subjectName(conflict.subjectId),
        className: className(conflict.classId),
        day: conflict.day,
        periodIndex: conflict.periodIndex,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
      });
    } else {
      void doClaim(entry, false);
    }
  };

  const doClaim = async (entry: TimetableEntry, force: boolean, releaseOwnEntryId?: string) => {
    setClaiming(true);
    try {
      await coverService.claim(entry.id, { teacherId: myId, force, releaseOwnEntryId });
      setClaimTarget(null);
      setClaimConflict(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  const handleFullDayLeave = async () => {
    try {
      const res = await coverService.markLeave(myId, activeDay);
      setLeaveConfirm(false);
      alert(res.released > 0 ? `Marked leave for ${activeDay}: ${res.released} lecture(s) released.` : `No scheduled lectures on ${activeDay}.`);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (!myId) {
    return <div className="p-8 text-sm text-slate-300">No faculty profile linked to this login. Ask admin to link your teacher profile.</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Hand className="w-6 h-6 text-emerald-400" />
            <span>Leave & Cover Lectures</span>
          </h1>
          <p className="text-xs text-slate-400">
            Not coming? Release your lectures so any free teacher can take them — subject need not match. Pick up open lectures from absent teachers too.
          </p>
        </div>
        <button
          onClick={() => setLeaveConfirm(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition-all"
        >
          <CalendarOff className="w-4 h-4" />
          <span>Full-day leave ({activeDay})</span>
        </button>
      </div>

      {/* Day selector */}
      <div className="flex flex-wrap gap-2">
        {workingDays.map(d => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              d === activeDay ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading lectures...</div>
      ) : (
        <>
          {/* My lectures */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">My lectures — {activeDay} ({myDayEntries.length})</h2>
              <p className="text-[11px] text-slate-500">Release a lecture if you are absent. Released lectures appear to other teachers and students instantly.</p>
            </div>
            {myDayEntries.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No lectures assigned to you on {activeDay}. You are free all day.</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {myDayEntries.map(e => {
                  const st = statusOf(e);
                  return (
                    <div key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white">
                          Period {e.periodIndex} · {subjectName(e.subjectId)} · {className(e.classId)}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{e.startTime} - {e.endTime}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{venueName(e)}</span>
                          {st === 'OPEN' && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">Released — waiting for cover</span>}
                          {st === 'COVERED' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">Covered by {teacherName(e.coverTeacherId)}</span>}
                          {st === 'SCHEDULED' && <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">Scheduled</span>}
                        </div>
                      </div>
                      <div>
                        {st === 'SCHEDULED' && (
                          <button
                            onClick={() => handleRelease(e)}
                            className="px-3.5 py-2 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Mark absent (release)
                          </button>
                        )}
                        {st === 'OPEN' && (
                          <button
                            onClick={() => handleCancelRelease(e)}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> Undo release
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lectures I cover */}
          {myCovers.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-500/20">
                <h2 className="text-sm font-bold text-emerald-200">Lectures I am covering — {activeDay} ({myCovers.length})</h2>
              </div>
              <div className="divide-y divide-emerald-500/10">
                {myCovers.map(e => (
                  <div key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-200">
                      <span className="font-bold text-white">Period {e.periodIndex} · {subjectName(e.subjectId)} · {className(e.classId)}</span>
                      <span className="text-slate-400"> ({e.startTime} - {e.endTime}, {venueName(e)}) — absent: {teacherName(e.teacherId)}</span>
                    </div>
                    <button
                      onClick={() => handleUnclaim(e)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Give up cover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open lectures to claim */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Open lectures — {activeDay} ({openEntries.length})</h2>
              <p className="text-[11px] text-slate-500">Anyone free in that slot can take it, any subject. If you have your own class then, we will ask before freeing it.</p>
            </div>
            {openEntries.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p>No open lectures on {activeDay}. Nobody is absent, or all absences are already covered.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {openEntries.map(e => {
                  const conflict = busyAt(e.periodIndex, e.id);
                  return (
                    <div key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white">
                          Period {e.periodIndex} · {subjectName(e.subjectId)} · {className(e.classId)}
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{e.startTime} - {e.endTime}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{venueName(e)}</span>
                          <span className="text-amber-300">Absent: {teacherName(e.teacherId)}</span>
                          {!conflict
                            ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">You are FREE this slot</span>
                            : <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">Clashes with your Period {conflict.periodIndex} class</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleClaimClick(e)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        Take this lecture
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Conflict popup: you have a class — free it? */}
      {claimTarget && claimConflict && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>You have a class at this time</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Period {claimConflict.periodIndex} ({claimConflict.startTime} - {claimConflict.endTime}): you teach{' '}
              <strong className="text-white">{claimConflict.subjectName}</strong>
              {claimConflict.className && <> to <strong className="text-white">{claimConflict.className}</strong></>}.
              <br /><br />
              Do you want to <strong className="text-amber-300">free your class</strong> so another teacher can take it,
              and take Period {claimTarget.periodIndex} ({subjectName(claimTarget.subjectId)}, {className(claimTarget.classId)}) instead?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setClaimTarget(null); setClaimConflict(null); }}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
              >
                Keep my class
              </button>
              <button
                onClick={() => claimTarget && void doClaim(claimTarget, true, claimConflict.entryId)}
                disabled={claiming}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg disabled:opacity-60 cursor-pointer"
              >
                {claiming ? 'Swapping...' : 'Yes, free my class & take it'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={leaveConfirm}
        title={`Mark full-day leave (${activeDay})?`}
        message="All your scheduled lectures for this day will be released so other teachers can cover them. You can undo each release individually afterwards."
        confirmText="Mark Leave"
        onConfirm={handleFullDayLeave}
        onCancel={() => setLeaveConfirm(false)}
      />
    </div>
  );
};
