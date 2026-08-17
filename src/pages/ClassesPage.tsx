import React, { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, GraduationCap, Search, Users, Calculator, RefreshCw, Layers,
  BookOpen, Clock, FlaskConical, Link2, X
} from 'lucide-react';
import { StudentClass, ClassSubject, Subject, Teacher, Lab } from '../types';
import { classService, assignmentService, subjectService, teacherService, labService } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [assignments, setAssignments] = useState<ClassSubject[]>([]);
  const [masterSubjects, setMasterSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);

  // Class Modal (Add/Edit Student Class)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<StudentClass | null>(null);
  const [classFormData, setClassFormData] = useState({
    name: '',
    department: 'Information Technology',
    academicYear: 'Third Year',
    division: '1',
    studentCount: 70,
  });

  // Batch Recalculation state
  const [recalcCap, setRecalcCap] = useState<number>(35);
  const [selectedClassForRecalc, setSelectedClassForRecalc] = useState<string | null>(null);

  // Class Subject Assignments Modal State
  const [activeClassForSubjects, setActiveClassForSubjects] = useState<StudentClass | null>(null);
  const [isAssignSubjModalOpen, setIsAssignSubjModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ClassSubject | null>(null);

  const [assignFormData, setAssignFormData] = useState({
    subjectId: '',
    teacherId: '',
    weeklyTheoryHours: 3,
    weeklyPracticalHours: 2,
    labId: '',
    requiresBatches: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, aData, sData, tData, lData] = await Promise.all([
        classService.getAll(),
        assignmentService.getAll(),
        subjectService.getAll(),
        teacherService.getAll(),
        labService.getAll(),
      ]);
      setClasses(cData);
      setAssignments(aData);
      setMasterSubjects(sData);
      setTeachers(tData);
      setLabs(lData);
    } catch (err) {
      console.error('Failed to load class data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassFormData({
      name: `TYIT${classes.length + 1}`,
      department: 'Information Technology',
      academicYear: 'Third Year',
      division: `${classes.length + 1}`,
      studentCount: 70,
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (item: StudentClass) => {
    setEditingClass(item);
    setClassFormData({
      name: item.name,
      department: item.department,
      academicYear: item.academicYear,
      division: item.division,
      studentCount: item.studentCount,
    });
    setIsClassModalOpen(true);
  };

  const handleDeleteClassClick = (id: string) => {
    setDeletingClassId(id);
  };

  const handleConfirmDeleteClass = async () => {
    if (!deletingClassId) return;
    try {
      await classService.delete(deletingClassId);
      setDeletingClassId(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCalculateBatches = async (classId: string) => {
    try {
      await classService.calculateBatches(classId, recalcCap);
      setSelectedClassForRecalc(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await classService.update(editingClass.id, classFormData);
      } else {
        await classService.create(classFormData);
      }
      setIsClassModalOpen(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Class Subject Assignments Modal Handlers
  const handleOpenClassSubjects = (studentClass: StudentClass) => {
    setActiveClassForSubjects(studentClass);
  };

  const handleOpenAddAssignment = () => {
    if (!activeClassForSubjects) return;
    setEditingAssignment(null);
    const defaultSubj = masterSubjects[0]?.id || '';
    const defaultTeach = teachers[0]?.id || '';
    const defaultLab = labs[0]?.id || '';

    setAssignFormData({
      subjectId: defaultSubj,
      teacherId: defaultTeach,
      weeklyTheoryHours: 3,
      weeklyPracticalHours: 2,
      labId: defaultLab,
      requiresBatches: true,
    });
    setIsAssignSubjModalOpen(true);
  };

  const handleOpenEditAssignment = (assignment: ClassSubject) => {
    setEditingAssignment(assignment);
    setAssignFormData({
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      weeklyTheoryHours: assignment.weeklyTheoryHours,
      weeklyPracticalHours: assignment.weeklyPracticalHours,
      labId: assignment.labId || '',
      requiresBatches: assignment.requiresBatches,
    });
    setIsAssignSubjModalOpen(true);
  };

  const handleDeleteAssignmentClick = (id: string) => {
    setDeletingAssignmentId(id);
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!deletingAssignmentId) return;
    try {
      await assignmentService.delete(deletingAssignmentId);
      setDeletingAssignmentId(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassForSubjects) return;

    try {
      const payload = {
        classId: activeClassForSubjects.id,
        class_id: activeClassForSubjects.id,
        subjectId: assignFormData.subjectId,
        subject_id: assignFormData.subjectId,
        teacherId: assignFormData.teacherId,
        teacher_id: assignFormData.teacherId,
        weeklyTheoryHours: assignFormData.weeklyTheoryHours,
        weekly_theory_hours: assignFormData.weeklyTheoryHours,
        weeklyPracticalHours: assignFormData.weeklyPracticalHours,
        weekly_practical_hours: assignFormData.weeklyPracticalHours,
        labId: assignFormData.weeklyPracticalHours > 0 ? assignFormData.labId : null,
        lab_id: assignFormData.weeklyPracticalHours > 0 ? assignFormData.labId : null,
        requiresBatches: assignFormData.requiresBatches,
        requires_batches: assignFormData.requiresBatches,
      };

      if (editingAssignment) {
        await assignmentService.update(editingAssignment.id, payload);
      } else {
        await assignmentService.create(payload);
      }
      setIsAssignSubjModalOpen(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filtered = classes.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase()) ||
      c.academicYear.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            <span>Student Classes & Subjects</span>
          </h1>
          <p className="text-xs text-slate-400">
            Manage academic classes, assign master subjects with specific faculty & weekly hours, and split lab batches.
          </p>
        </div>

        <button
          onClick={handleOpenAddClass}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student Class</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by class name, department, or year..."
          className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400">Loading student classes...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400 space-y-2">
            <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No student classes found.</p>
          </div>
        ) : (
          filtered.map(item => {
            const classAssigned = assignments.filter(a => a.classId === item.id || a.class_id === item.id);

            return (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{item.name}</h3>
                        <p className="text-[11px] text-slate-400">{item.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditClass(item)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit Class Info"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClassClick(item.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-medium">Academic Year</span>
                      <div className="font-semibold text-slate-200">{item.academicYear}</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-medium">Class Strength</span>
                      <div className="font-semibold text-indigo-300 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {item.studentCount} Students
                      </div>
                    </div>
                  </div>

                  {/* Assigned Subjects Summary */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                        Class Subjects ({classAssigned.length})
                      </span>
                      <button
                        onClick={() => handleOpenClassSubjects(item)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Manage Subjects</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {classAssigned.length > 0 ? (
                        classAssigned.map(a => {
                          const subj = masterSubjects.find(s => s.id === a.subjectId);
                          const teach = teachers.find(t => t.id === a.teacherId);
                          return (
                            <span
                              key={a.id}
                              className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[10px] font-medium text-slate-300 flex items-center gap-1"
                            >
                              <span className="text-white font-semibold">{subj?.name || 'Subject'}</span>
                              <span className="text-amber-400 font-normal">({teach?.name.split(' ')[1] || 'Teacher'})</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No subjects assigned yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Auto-Calculated Batches */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-400 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-violet-400" />
                        Lab Batches ({item.batches?.length || 0})
                      </span>
                      <button
                        onClick={() => setSelectedClassForRecalc(selectedClassForRecalc === item.id ? null : item.id)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Recalculate</span>
                      </button>
                    </div>

                    {selectedClassForRecalc === item.id && (
                      <div className="p-2.5 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2 animate-in fade-in text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-300 font-medium">Lab Bench Capacity:</span>
                          <input
                            type="number"
                            value={recalcCap}
                            onChange={e => setRecalcCap(parseInt(e.target.value, 10) || 35)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-white"
                          />
                        </div>
                        <button
                          onClick={() => handleCalculateBatches(item.id)}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Run Batch Calculator</span>
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {item.batches && item.batches.length > 0 ? (
                        item.batches.map(b => (
                          <span
                            key={b.id}
                            className="px-2.5 py-1 bg-violet-950/40 border border-violet-500/30 text-violet-300 text-[11px] rounded-lg font-medium font-mono"
                          >
                            {b.name} ({b.studentCount} students)
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No batches split yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Class Modal (Add/Edit) */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white">
              {editingClass ? 'Edit Student Class' : 'Add New Student Class'}
            </h2>

            <form onSubmit={handleClassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Class Name</label>
                <input
                  type="text"
                  required
                  value={classFormData.name}
                  onChange={e => setClassFormData({ ...classFormData, name: e.target.value })}
                  placeholder="e.g. TYIT1"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Department</label>
                <input
                  type="text"
                  required
                  value={classFormData.department}
                  onChange={e => setClassFormData({ ...classFormData, department: e.target.value })}
                  placeholder="Information Technology, CS"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={classFormData.academicYear}
                    onChange={e => setClassFormData({ ...classFormData, academicYear: e.target.value })}
                    placeholder="Third Year"
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Division</label>
                  <input
                    type="text"
                    required
                    value={classFormData.division}
                    onChange={e => setClassFormData({ ...classFormData, division: e.target.value })}
                    placeholder="1"
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Total Student Count</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={classFormData.studentCount}
                  onChange={e => setClassFormData({ ...classFormData, studentCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Batches will be automatically split (e.g. 70 students / 35 bench capacity = 2 batches).
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Subject Assignments Modal Drawer */}
      {activeClassForSubjects && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Subjects Assigned to {activeClassForSubjects.name}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Department: {activeClassForSubjects.department} | Strength: {activeClassForSubjects.studentCount} Students
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveClassForSubjects(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Actions */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Each assignment defines teacher, weekly theory/practical hours, and lab venue specifically for <strong className="text-white">{activeClassForSubjects.name}</strong>.
              </div>

              <button
                onClick={handleOpenAddAssignment}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Subject</span>
              </button>
            </div>

            {/* List of assigned subjects for this class */}
            {(() => {
              const classAssignedList = assignments.filter(a => a.classId === activeClassForSubjects.id || a.class_id === activeClassForSubjects.id);

              if (classAssignedList.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No subjects assigned to {activeClassForSubjects.name} yet.</p>
                    <button
                      onClick={handleOpenAddAssignment}
                      className="text-indigo-400 hover:underline text-xs font-semibold"
                    >
                      + Click here to assign first subject
                    </button>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3.5">Subject</th>
                        <th className="p-3.5">Assigned Teacher</th>
                        <th className="p-3.5">Theory Hrs</th>
                        <th className="p-3.5">Practical Hrs</th>
                        <th className="p-3.5">Lab Venue</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {classAssignedList.map(item => {
                        const subj = masterSubjects.find(s => s.id === item.subjectId);
                        const teach = teachers.find(t => t.id === item.teacherId);
                        const labObj = labs.find(l => l.id === item.labId);

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 font-bold text-white flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                <BookOpen className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div>{subj?.name || 'Subject'}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{subj?.code}</div>
                              </div>
                            </td>
                            <td className="p-3.5 text-amber-300 font-medium">
                              {teach?.name || 'Teacher'}
                            </td>
                            <td className="p-3.5 font-semibold text-slate-200">
                              {item.weeklyTheoryHours} hrs/wk
                            </td>
                            <td className="p-3.5 font-semibold text-violet-300">
                              {item.weeklyPracticalHours} hrs/wk
                            </td>
                            <td className="p-3.5">
                              {item.weeklyPracticalHours > 0 && labObj ? (
                                <span className="inline-flex items-center gap-1 text-violet-400 font-medium">
                                  <FlaskConical className="w-3 h-3" />
                                  {labObj.name}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditAssignment(item)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAssignmentClick(item.id)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setActiveClassForSubjects(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Assigning / Editing Subject for a Class */}
      {isAssignSubjModalOpen && activeClassForSubjects && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white">
              {editingAssignment ? 'Edit Class Subject Assignment' : `Assign Subject to ${activeClassForSubjects.name}`}
            </h3>

            <form onSubmit={handleAssignmentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Master Subject</label>
                <select
                  required
                  value={assignFormData.subjectId}
                  onChange={e => setAssignFormData({ ...assignFormData, subjectId: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose Master Subject...</option>
                  {masterSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Assign Faculty Teacher</label>
                <select
                  required
                  value={assignFormData.teacherId}
                  onChange={e => setAssignFormData({ ...assignFormData, teacherId: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose Teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Weekly Theory Hours</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={2}
                    value={assignFormData.weeklyTheoryHours}
                    onChange={e => setAssignFormData({ ...assignFormData, weeklyTheoryHours: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Weekly Practical Hours</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={assignFormData.weeklyPracticalHours}
                    onChange={e => setAssignFormData({ ...assignFormData, weeklyPracticalHours: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Use 2, 4, 6… (one lab session = two periods).</p>
                </div>
              </div>

              {assignFormData.weeklyPracticalHours > 0 && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Required Laboratory Venue</label>
                  <select
                    required
                    value={assignFormData.labId}
                    onChange={e => setAssignFormData({ ...assignFormData, labId: e.target.value })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Lab Venue...</option>
                    {labs.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.labCode}) - Bench Cap: {l.benchCapacity}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {assignFormData.weeklyPracticalHours > 0 && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="requiresBatches"
                    checked={assignFormData.requiresBatches}
                    onChange={e => setAssignFormData({ ...assignFormData, requiresBatches: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="requiresBatches" className="text-slate-300 text-xs">
                    Divide class into parallel lab batches ({activeClassForSubjects.batches?.length || 2} batches)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignSubjModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Save Subject Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Class Confirm Modal */}
      <ConfirmModal
        isOpen={!!deletingClassId}
        title="Delete Student Class"
        message="Are you sure you want to delete this student class? All subjects and timetables assigned to this class will be affected."
        confirmText="Delete Class"
        onConfirm={handleConfirmDeleteClass}
        onCancel={() => setDeletingClassId(null)}
      />

      {/* Delete Assignment Confirm Modal */}
      <ConfirmModal
        isOpen={!!deletingAssignmentId}
        title="Remove Subject Assignment"
        message="Are you sure you want to remove this subject from this class?"
        confirmText="Remove Subject"
        onConfirm={handleConfirmDeleteAssignment}
        onCancel={() => setDeletingAssignmentId(null)}
      />
    </div>
  );
};
