import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Link2, Search, GraduationCap, BookOpen, Users, FlaskConical, Clock } from 'lucide-react';
import { ClassSubject, StudentClass, Subject, Teacher, Lab } from '../types';
import { assignmentService, classService, subjectService, teacherService, labService } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<ClassSubject[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassSubject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    teacherIds: [] as string[],
    weeklyTheoryHours: 2,
    weeklyPracticalHours: 2,
    labId: '',
    requiresBatches: true,
    batchTeacherIds: {} as Record<string, string>,
    batchLabIds: {} as Record<string, string>,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [aData, cData, sData, tData, lData] = await Promise.all([
        assignmentService.getAll(),
        classService.getAll(),
        subjectService.getAll(),
        teacherService.getAll(),
        labService.getAll(),
      ]);
      setAssignments(aData);
      setClasses(cData);
      setSubjects(sData);
      setTeachers(tData);
      setLabs(lData);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    const defaultClass = classes[0]?.id || '';
    const defaultSubj = subjects[0]?.id || '';
    const defaultTeach = teachers[0]?.id || '';
    const defaultLab = labs[0]?.id || '';

    setFormData({
      classId: defaultClass,
      subjectId: defaultSubj,
      teacherId: defaultTeach,
      teacherIds: defaultTeach ? [defaultTeach] : [],
      weeklyTheoryHours: 2,
      weeklyPracticalHours: 2,
      labId: defaultLab,
      requiresBatches: true,
      batchTeacherIds: {},
      batchLabIds: {},
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ClassSubject) => {
    setEditingItem(item);
    setFormData({
      classId: item.classId,
      subjectId: item.subjectId,
      teacherId: item.teacherId,
      teacherIds: item.teacherIds?.length ? item.teacherIds : [item.teacherId],
      weeklyTheoryHours: item.weeklyTheoryHours,
      weeklyPracticalHours: item.weeklyPracticalHours,
      labId: item.labId || '',
      requiresBatches: item.requiresBatches,
      batchTeacherIds: item.batchTeacherIds || {},
      batchLabIds: item.batchLabIds || {},
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await assignmentService.delete(deletingId);
      setDeletingId(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.teacherIds.length === 0) {
      alert('Select at least one teacher for this subject.');
      return;
    }
    try {
      if (editingItem) {
        await assignmentService.update(editingItem.id, formData);
      } else {
        await assignmentService.create(formData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const selectedSubj = subjects.find(s => s.id === subjectId);
    if (selectedSubj) {
      setFormData(prev => ({
        ...prev,
        subjectId,
        weeklyTheoryHours: selectedSubj.type === 'PRACTICAL' ? 0 : (prev.weeklyTheoryHours || 3),
        weeklyPracticalHours: selectedSubj.type === 'THEORY' ? 0 : (prev.weeklyPracticalHours || 2),
      }));
    } else {
      setFormData(prev => ({ ...prev, subjectId }));
    }
  };

  const selectedClass = classes.find(item => item.id === formData.classId);
  const updateBatchOverride = (batchId: string, field: 'batchTeacherIds' | 'batchLabIds', value: string) => {
    setFormData(prev => ({ ...prev, [field]: { ...prev[field], [batchId]: value } }));
  };

  const toggleTeacher = (teacherId: string) => {
    setFormData(prev => {
      const teacherIds = prev.teacherIds.includes(teacherId)
        ? prev.teacherIds.filter(id => id !== teacherId)
        : [...prev.teacherIds, teacherId];
      return { ...prev, teacherIds, teacherId: teacherIds[0] || '' };
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Link2 className="w-6 h-6 text-indigo-400" />
            <span>Class Subject Assignments</span>
          </h1>
          <p className="text-xs text-slate-400">
            Map subjects and assigned faculty to student classes, defining weekly theory and practical batch hours.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Subject to Class</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400 space-y-2">
            <Link2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No class assignments found.</p>
          </div>
        ) : (
          assignments.map(item => {
            const classObj = classes.find(c => c.id === item.classId);
            const subjObj = subjects.find(s => s.id === item.subjectId);
            const teachObj = teachers.find(t => t.id === item.teacherId);
            const labObj = labs.find(l => l.id === item.labId);

            return (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        Class: {classObj?.name || 'Class'}
                      </span>
                      <h3 className="text-base font-bold text-white">{subjObj?.name || 'Subject'}</h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-medium">Faculty Teacher:</span>
                      <span className="font-semibold text-amber-300 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {item.teacherIds?.length
                          ? item.teacherIds.map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(', ')
                          : teachObj?.name || 'Teacher'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-medium">Theory Hours:</span>
                      <span className="font-semibold text-slate-200">{item.weeklyTheoryHours} hrs/week</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-medium">Practical Hours:</span>
                      <span className="font-semibold text-violet-300">{item.weeklyPracticalHours} hrs/week</span>
                    </div>

                    {item.weeklyPracticalHours > 0 && (
                      <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                        <span className="text-slate-500 font-medium">Lab Venue:</span>
                        <span className="font-semibold text-violet-400 flex items-center gap-1">
                          <FlaskConical className="w-3.5 h-3.5" />
                          {labObj?.name || 'Lab'}
                        </span>
                      </div>
                    )}
                    {item.requiresBatches && (item.batchTeacherIds || item.batchLabIds) && (
                      <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                        Batch-specific teachers and labs configured
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white">
              {editingItem ? 'Edit Class Assignment' : 'Assign Subject to Class'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Student Class</label>
                <select
                  required
                  value={formData.classId}
                  onChange={e => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.studentCount} students)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Subject</label>
                <select
                  required
                  value={formData.subjectId}
                  onChange={e => handleSubjectChange(e.target.value)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Teachers for this subject</label>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2">
                  {teachers.map(t => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-slate-200 hover:bg-slate-800">
                      <input type="checkbox" checked={formData.teacherIds.includes(t.id)} onChange={() => toggleTeacher(t.id)} className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                      <span>{t.name} <span className="text-slate-500">({t.department})</span></span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Select one or more teachers. The scheduler can use different selected teachers for parallel batches.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Theory Hours/Wk</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={2}
                    value={formData.weeklyTheoryHours}
                    onChange={e => setFormData({ ...formData, weeklyTheoryHours: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Practical Hours/Wk</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.weeklyPracticalHours}
                    onChange={e => setFormData({ ...formData, weeklyPracticalHours: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Use 2, 4, 6… Each lab session occupies two consecutive periods.</p>
                </div>
              </div>

              {formData.weeklyPracticalHours > 0 && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Lab Venue</label>
                  <select
                    value={formData.labId}
                    onChange={e => setFormData({ ...formData, labId: e.target.value })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Lab...</option>
                    {labs.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.labCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="requiresBatches"
                  checked={formData.requiresBatches}
                  onChange={e => setFormData({ ...formData, requiresBatches: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="requiresBatches" className="text-slate-300 font-medium">
                  Requires Lab Batch Split (Practicals split into Batch A, B, etc.)
                </label>
              </div>

              {formData.weeklyPracticalHours > 0 && formData.requiresBatches && (selectedClass?.batches?.length || 0) > 0 && (
                <div className="space-y-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
                  <p className="text-xs font-semibold text-violet-200">Batch practical setup</p>
                  <p className="text-[10px] text-slate-400">Assign different teachers and labs to run batches simultaneously. A teacher cannot supervise two batches at the same time.</p>
                  {selectedClass!.batches!.map(batch => (
                    <div key={batch.id} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-300">{batch.name}</span>
                      <select value={formData.batchTeacherIds[batch.id] || formData.teacherId} onChange={e => updateBatchOverride(batch.id, 'batchTeacherIds', e.target.value)} className="min-w-0 bg-slate-950 text-white p-2 rounded-lg border border-slate-800">
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <select value={formData.batchLabIds[batch.id] || formData.labId} onChange={e => updateBatchOverride(batch.id, 'batchLabIds', e.target.value)} className="min-w-0 bg-slate-950 text-white p-2 rounded-lg border border-slate-800">
                        <option value="">Auto-select lab</option>
                        {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Class Subject Assignment"
        message="Are you sure you want to delete this assignment mapping?"
        confirmText="Delete Assignment"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
