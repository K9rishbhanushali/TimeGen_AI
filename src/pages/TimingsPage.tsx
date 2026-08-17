import React, { useEffect, useState } from 'react';
import { Clock, Coffee, Save, CheckCircle2, Calendar, Plus, Trash2 } from 'lucide-react';
import { TimingConfig, TimeSlot } from '../types';
import { timingService } from '../services/api';

export const TimingsPage: React.FC = () => {
  const [config, setConfig] = useState<TimingConfig>({
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    startTime: '08:00',
    endTime: '16:00',
    periodDurationMinutes: 50,
    periodsPerDay: 6,
    breaks: [
      { id: 'b1', name: 'Short Break', startTime: '10:00', endTime: '10:15' },
      { id: 'b2', name: 'Lunch Break', startTime: '12:00', endTime: '12:45' },
    ],
  });

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, sData] = await Promise.all([
        timingService.getConfig(),
        timingService.getSlots(),
      ]);
      setConfig(cData);
      setSlots(sData);
    } catch (err) {
      console.error('Failed to load timings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await timingService.saveConfig(config);
      const updatedSlots = await timingService.getSlots();
      setSlots(updatedSlots);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    const days = config.workingDays.includes(day)
      ? config.workingDays.filter(d => d !== day)
      : [...config.workingDays, day];
    setConfig({ ...config, workingDays: days });
  };

  const addBreak = () => {
    setConfig({
      ...config,
      breaks: [...(config.breaks || []), { id: `break_${Date.now()}`, name: 'New Break', startTime: '12:00', endTime: '12:15' }],
    });
  };

  const updateBreak = (index: number, field: 'name' | 'startTime' | 'endTime', value: string) => {
    const breaks = [...(config.breaks || [])];
    breaks[index] = { ...breaks[index], [field]: value };
    setConfig({ ...config, breaks });
  };

  const removeBreak = (index: number) => setConfig({ ...config, breaks: config.breaks.filter((_, i) => i !== index) });

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // The API returns one copy of the day schedule for every working day. This page
  // is a daily preview, so retain a single representative copy of each time slot.
  const dailyPreviewSlots: TimeSlot[] = [];
  for (const slot of slots) {
    const key = `${slot.periodIndex}-${slot.startTime}-${slot.endTime}-${slot.isBreak ? 'break' : 'period'}`;
    if (!dailyPreviewSlots.some(existing => `${existing.periodIndex}-${existing.startTime}-${existing.endTime}-${existing.isBreak ? 'break' : 'period'}` === key)) {
      dailyPreviewSlots.push(slot);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-400" />
            <span>Timings, Periods & Break Configuration</span>
          </h1>
          <p className="text-xs text-slate-400">
            Define daily operating hours, period durations, lunch breaks, and active college working days.
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
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Timing Configuration'}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timing Config Controls */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>College Hours & Working Days</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-2 font-medium">Working Days</label>
              <div className="flex flex-wrap gap-1.5">
                {allDays.map(day => {
                  const active = config.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">College Start Time</label>
                <input
                  type="time"
                  value={config.startTime}
                  onChange={e => setConfig({ ...config, startTime: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">College End Time</label>
                <input
                  type="time"
                  value={config.endTime}
                  onChange={e => setConfig({ ...config, endTime: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Period Duration (Mins)</label>
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={config.periodDurationMinutes}
                  onChange={e => setConfig({ ...config, periodDurationMinutes: parseInt(e.target.value, 10) || 50 })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Periods / Day</label>
                <input
                  type="number"
                  min={4}
                  max={10}
                  value={config.periodsPerDay}
                  onChange={e => setConfig({ ...config, periodsPerDay: parseInt(e.target.value, 10) || 6 })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Breaks Config */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Scheduled Breaks</span>
              </span>
              <button type="button" onClick={addBreak} className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-white"><Plus className="w-3.5 h-3.5" /> Add break</button>
              </div>

              {config.breaks.map((b, idx) => (
                <div key={b.id || idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input value={b.name} onChange={e => updateBreak(idx, 'name', e.target.value)} aria-label="Break name" className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white" />
                    <button type="button" onClick={() => removeBreak(idx)} className="p-1.5 text-rose-400 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                    <label>Start<input type="time" value={b.startTime || ''} onChange={e => updateBreak(idx, 'startTime', e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white" /></label>
                    <label>End<input type="time" value={b.endTime || ''} onChange={e => updateBreak(idx, 'endTime', e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white" /></label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generated Time Slot Schedule Preview */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <div>
            <h2 className="text-sm font-bold text-white">Daily Generated Period Schedule</h2>
            <p className="text-xs text-slate-400">
              Calculated time slot grid based on start time, period duration, and break declarations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dailyPreviewSlots.map(s => (
              <div
                key={`${s.periodIndex}-${s.startTime}-${s.endTime}`}
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  s.isBreak
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      s.isBreak ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    {s.isBreak ? <Coffee className="w-4 h-4" /> : `#${s.periodIndex}`}
                  </div>
                  <div>
                    <div className="font-bold text-xs">{s.label}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {s.startTime} - {s.endTime}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-800">
                  {s.durationMinutes} mins
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
