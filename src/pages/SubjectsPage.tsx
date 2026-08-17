import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Search, Link2, Info, ArrowRight } from 'lucide-react';
import { Subject, SubjectType, ClassSubject } from '../types';
import { subjectService, assignmentService } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassSubject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Subject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'BOTH' as SubjectType,
    description: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, aData] = await Promise.all([
        subjectService.getAll(),
        assignmentService.getAll(),
      ]);
      setSubjects(sData);
      setAssignments(aData);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: 'Web Programming',
      code: `IT${200 + subjects.length + 1}`,
      type: 'BOTH',
      description: 'Master course curriculum entity',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Subject) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      type: item.type,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await subjectService.delete(deletingId);
      setDeletingId(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await subjectService.update(editingItem.id, formData);
      } else {
        await subjectService.create(formData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filtered = subjects.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-rose-400" />
            <span>Master Subjects</span>
          </h1>
          <p className="text-xs text-slate-400">
            Define reusable master subject catalog. Assign teacher, weekly theory/practical hours, and lab per class under Class Assignments.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Master Subject</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-white">Decoupled Master Entity Architecture</div>
            <div className="text-slate-400 text-[11px]">
              A Master Subject (e.g., &quot;Web Programming&quot;) contains basic details only. To schedule it for a specific class (e.g. TYIT1 with Prof. Sharma for 3h theory + 2h lab), assign it on the Class Assignments page.
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by master subject name or code..."
          className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading master subjects...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No master subjects found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Subject Name & Code</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Class Assignments</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map(item => {
                  const assignedCount = assignments.filter(a => a.subjectId === item.id).length;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div>{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">Code: {item.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            item.type === 'THEORY'
                              ? 'bg-blue-950/50 text-blue-300 border-blue-800/50'
                              : item.type === 'PRACTICAL'
                              ? 'bg-violet-950/50 text-violet-300 border-violet-800/50'
                              : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-200">
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                          Assigned to {assignedCount} {assignedCount === 1 ? 'Class' : 'Classes'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white">
              {editingItem ? 'Edit Master Subject' : 'Add New Master Subject'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Subject Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Web Programming"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="IT202"
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Subject Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as SubjectType })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500"
                  >
                    <option value="THEORY">THEORY</option>
                    <option value="PRACTICAL">PRACTICAL</option>
                    <option value="BOTH">BOTH (Theory + Practical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Course summary or syllabus notes..."
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

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
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/20"
                >
                  Save Master Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Master Subject"
        message="Are you sure you want to delete this master subject? Any class assignments linking to this subject will be affected."
        confirmText="Delete Subject"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
