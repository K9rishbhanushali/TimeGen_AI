import React, { useEffect, useState } from 'react';
import { CalendarCheck, Save, CheckCircle2, User, DoorOpen, FlaskConical, GraduationCap } from 'lucide-react';
import { AvailabilityRule, Teacher, Classroom, Lab, StudentClass, TimeSlot, TimingConfig } from '../types';
import { availabilityService, teacherService, classroomService, labService, classService, timingService } from '../services/api';

export const AvailabilityPage: React.FC = () => {
  const [entityType, setEntityType] = useState<'teacher' | 'classroom' | 'lab' | 'class'>('teacher');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);

  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [config, setConfig] = useState<TimingConfig | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, crData, lData, clData, rData, cData, sData] = await Promise.all([
        teacherService.getAll(),
        classroomService.getAll(),
        labService.getAll(),
        classService.getAll(),
        availabilityService.getRules(),
        timingService.getConfig(),
        timingService.getSlots(),
      ]);

      setTeachers(tData);
      setClassrooms(crData);
      setLabs(lData);
      setClasses(clData);
      setRules(rData);
      setConfig(cData);
      setSlots(sData);

      if (tData.length > 0) setSelectedEntityId(tData[0].id);
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTypeChange = (type: 'teacher' | 'classroom' | 'lab' | 'class') => {
    setEntityType(type);
    if (type === 'teacher' && teachers.length > 0) setSelectedEntityId(teachers[0].id);
    if (type === 'classroom' && classrooms.length > 0) setSelectedEntityId(classrooms[0].id);
    if (type === 'lab' && labs.length > 0) setSelectedEntityId(labs[0].id);
    if (type === 'class' && classes.length > 0) setSelectedEntityId(classes[0].id);
  };

  const isSlotUnavailable = (day: string, periodIndex: number) => {
    return rules.some(
      r =>
        (r.targetType || r.entityType) === entityType &&
        (r.targetId || r.entityId) === selectedEntityId &&
        r.day === day &&
        r.periodIndex === periodIndex &&
        !(r.isAvailable ?? r.available ?? true)
    );
  };

  const toggleSlotAvailability = (day: string, periodIndex: number) => {
    if (!selectedEntityId) return;

    const existsIndex = rules.findIndex(
      r =>
        (r.targetType || r.entityType) === entityType &&
        (r.targetId || r.entityId) === selectedEntityId &&
        r.day === day &&
        r.periodIndex === periodIndex
    );

    if (existsIndex >= 0) {
      // Toggle or remove
      setRules(rules.filter((_, index) => index !== existsIndex && !(
        (rules[index].targetType || rules[index].entityType) === entityType &&
        (rules[index].targetId || rules[index].entityId) === selectedEntityId &&
        rules[index].day === day && rules[index].periodIndex === periodIndex
      )));
    } else {
      // Add unavailable rule
      const newRule: AvailabilityRule = {
        id: `rule_${Date.now()}_${Math.random()}`,
        entityType,
        entityId: selectedEntityId,
        day,
        periodIndex,
        isAvailable: false,
        reason: 'Marked unavailable by administrator',
      };
      setRules([...rules, newRule]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await availabilityService.saveRules(rules);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const workingDays = config?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // generateTimeSlots returns a set for every day; the matrix needs one row per period only.
  const nonBreakSlots: TimeSlot[] = [];
  for (const slot of slots) {
    if (!slot.isBreak && !nonBreakSlots.some(existing => existing.periodIndex === slot.periodIndex)) {
      nonBreakSlots.push(slot);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-400" />
            <span>Resource Availability & Unavailability Matrix</span>
          </h1>
          <p className="text-xs text-slate-400">
            Click grid cells to mark unavailable periods for teachers, classrooms, labs, or student classes.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Rules Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Availability Rules'}</span>
            </>
          )}
        </button>
      </div>

      {/* Target Type Selector */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { type: 'teacher' as const, label: 'Teacher', icon: User },
            { type: 'classroom' as const, label: 'Classroom', icon: DoorOpen },
            { type: 'lab' as const, label: 'Lab', icon: FlaskConical },
            { type: 'class' as const, label: 'Student Class', icon: GraduationCap },
          ].map(item => {
            const Icon = item.icon;
            const isActive = entityType === item.type;
            return (
              <button
                key={item.type}
                onClick={() => handleTypeChange(item.type)}
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

        {/* Entity Selector Dropdown */}
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedEntityId}
            onChange={e => setSelectedEntityId(e.target.value)}
            className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
          >
            {entityType === 'teacher' &&
              teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.department})
                </option>
              ))}
            {entityType === 'classroom' &&
              classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} - Room #{c.roomNumber} ({c.capacity} seats)
                </option>
              ))}
            {entityType === 'lab' &&
              labs.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.labCode}) - {l.benchCapacity} benches
                </option>
              ))}
            {entityType === 'class' &&
              classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} students)
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white">Click cell to toggle Available / Unavailable state</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block"></span>
              Available
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40 inline-block"></span>
              Blocked / Unavailable
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-3 text-left">Period / Day</th>
                {workingDays.map(day => (
                  <th key={day} className="p-3 font-semibold">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {nonBreakSlots.map(s => (
                <tr key={s.periodIndex}>
                  <td className="p-3 text-left font-bold text-white bg-slate-950/40 border-r border-slate-800">
                    <div>Period #{s.periodIndex}</div>
                    <div className="text-[10px] text-slate-500 font-mono font-normal">
                      {s.startTime} - {s.endTime}
                    </div>
                  </td>

                  {workingDays.map(day => {
                    const unavailable = isSlotUnavailable(day, s.periodIndex);
                    return (
                      <td key={day} className="p-2 border-r border-slate-800/40">
                        <button
                          onClick={() => toggleSlotAvailability(day, s.periodIndex)}
                          className={`w-full py-3 rounded-xl font-bold text-[11px] transition-all border ${
                            unavailable
                              ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/50'
                              : 'bg-emerald-950/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/30'
                          }`}
                        >
                          {unavailable ? 'BLOCKED' : 'AVAILABLE'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
