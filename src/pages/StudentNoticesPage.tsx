import React, { useEffect, useState } from 'react';
import { Bell, Clock, MapPin, CheckCircle2, Coffee } from 'lucide-react';
import { AppUser, TimetableEntry, Teacher, Subject, Classroom, Lab, CoverNotice } from '../types';
import {
  timetableService,
  teacherService,
  subjectService,
  classroomService,
  labService,
  timingService,
  coverService,
} from '../services/api';

interface StudentNoticesPageProps {
  user: AppUser;
}

const statusOf = (e: TimetableEntry) => e.status || 'SCHEDULED';

export const StudentNoticesPage: React.FC<StudentNoticesPageProps> = ({ user }) => {
  const classId = user.classId || '';
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [notices, setNotices] = useState<CoverNotice[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [day, setDay] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, nData, tData, sData, crData, lData, cfg] = await Promise.all([
        timetableService.getAll(),
        coverService.getNotices(),
        teacherService.getAll(),
        subjectService.getAll(),
        classroomService.getAll(),
        labService.getAll(),
        timingService.getConfig(),
      ]);
      setEntries(eData);
      setNotices(nData.notices);
      setTeachers(tData);
      setSubjects(sData);
      setClassrooms(crData);
      setLabs(lData);
      if (cfg?.workingDays?.length) setWorkingDays(cfg.workingDays);
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeDay = workingDays.includes(day) ? day : workingDays[0] || day;

  const teacherName = (id?: string | null) => teachers.find(t => t.id === id)?.name || 'Teacher';
  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Lecture';
  const venueName = (e: TimetableEntry) =>
    e.resourceType === 'lab'
      ? labs.find(l => l.id === e.resourceId)?.name || 'Lab'
      : classrooms.find(c => c.id === e.resourceId)?.name || 'Room';

  const dayEntries = entries
    .filter(e => e.classId === classId && e.day === activeDay)
    .sort((a, b) => a.periodIndex - b.periodIndex);

  const dayNotices = notices.filter(n => n.classId === classId && n.day === activeDay);
  const coveredCount = dayNotices.filter(n => n.status === 'COVERED').length;
  const freeCount = dayNotices.filter(n => n.status === 'OPEN').length;

  if (!classId) {
    return <div className="p-8 text-sm text-slate-300">No class linked to this login. Ask admin to assign your class.</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-indigo-400" />
          <span>Timetable & Notices</span>
        </h1>
        <p className="text-xs text-slate-400">
          Your class schedule for the day — see at a glance if a teacher is absent, who takes the class, or if a period is free.
        </p>
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
        <div className="p-8 text-center text-xs text-slate-400">Loading timetable...</div>
      ) : dayEntries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <Coffee className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">No classes today ({activeDay})</p>
          <p className="text-xs text-slate-400">Enjoy the day off — nothing is scheduled for your class.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[11px] text-slate-500">Lectures on {activeDay}</p>
              <p className="text-xl font-bold text-white">{dayEntries.length}</p>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-[11px] text-emerald-300/70">Taken by another teacher</p>
              <p className="text-xl font-bold text-emerald-300">{coveredCount}</p>
            </div>
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4">
              <p className="text-[11px] text-amber-300/70">Free periods (no teacher)</p>
              <p className="text-xl font-bold text-amber-300">{freeCount}</p>
            </div>
          </div>

          {/* Notices */}
          {dayNotices.length > 0 && (
            <div className="space-y-2">
              {dayNotices.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 rounded-xl border text-xs font-medium ${
                    n.status === 'COVERED'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                  }`}
                >
                  {n.status === 'COVERED' ? '✓ ' : '! '}{n.message}
                </div>
              ))}
            </div>
          )}

          {/* Lecture list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="divide-y divide-slate-800/60">
              {dayEntries.map(e => {
                const st = statusOf(e);
                return (
                  <div key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white">
                        Period {e.periodIndex} · {subjectName(e.subjectId)}
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{e.startTime} - {e.endTime}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{venueName(e)}</span>
                        {st === 'SCHEDULED' && <span className="text-slate-300">Teacher: <strong className="text-amber-300">{teacherName(e.teacherId)}</strong></span>}
                      </div>
                    </div>
                    <div>
                      {st === 'SCHEDULED' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> As scheduled
                        </span>
                      )}
                      {st === 'COVERED' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Taken by {teacherName(e.coverTeacherId)} ({teacherName(e.teacherId)} absent)
                        </span>
                      )}
                      {st === 'OPEN' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          FREE — {teacherName(e.teacherId)} absent, no teacher yet
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
