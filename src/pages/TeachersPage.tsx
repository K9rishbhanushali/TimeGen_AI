import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, Search, Mail, Phone, Clock, Briefcase, KeyRound } from 'lucide-react';
import { AppUser, Teacher } from '../types';
import { teacherService, userService } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Teacher | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    department: 'Information Technology',
    email: '',
    phone: '',
    maxHoursPerDay: 6,
    loginPassword: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, uData] = await Promise.all([teacherService.getAll(), userService.getAll()]);
      setTeachers(tData);
      setUsers(uData);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Same entity: find the login belonging to a faculty profile
  const findLogin = (t: Teacher): AppUser | undefined =>
    users.find(u => u.role === 'teacher' && (u.teacherId === t.id || u.email.toLowerCase() === (t.email || '').toLowerCase()));

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: `Prof. Teacher ${teachers.length + 1}`,
      employeeId: `EMP${100 + teachers.length + 1}`,
      department: 'Information Technology',
      email: `faculty${teachers.length + 1}@college.edu`,
      phone: '+91 9876543210',
      maxHoursPerDay: 6,
      loginPassword: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Teacher) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      employeeId: item.employeeId,
      department: item.department,
      email: item.email,
      phone: item.phone,
      maxHoursPerDay: item.maxHoursPerDay,
      loginPassword: '',
    });
    setIsModalOpen(true);
  };

  const handleCreateLogin = async (item: Teacher) => {
    const pw = window.prompt(`Create login for ${item.name} (${item.email}). Enter password:`, 'pass1234');
    if (!pw) return;
    try {
      await userService.create({
        name: item.name,
        email: item.email,
        password: pw,
        role: 'teacher',
        teacherId: item.id,
        employeeId: item.employeeId,
        department: item.department,
      });
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await teacherService.delete(deletingId);
      setDeletingId(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { loginPassword, ...profileData } = formData;
      let teacherId = editingItem?.id;
      if (editingItem) {
        await teacherService.update(editingItem.id, profileData);
      } else {
        const created = await teacherService.create(profileData);
        teacherId = created.id;
      }
      // Optional: create the login for the same teacher right away
      if (loginPassword.trim() && teacherId && !findLogin({ ...profileData, id: teacherId } as Teacher)) {
        try {
          await userService.create({
            name: profileData.name,
            email: profileData.email,
            password: loginPassword.trim(),
            role: 'teacher',
            teacherId,
            employeeId: profileData.employeeId,
            department: profileData.department,
          });
        } catch (loginErr) {
          alert(`Teacher saved, but login creation failed: ${(loginErr as Error).message}`);
        }
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filtered = teachers.filter(
    t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Faculty & Teachers</span>
          </h1>
          <p className="text-xs text-slate-400">
            Manage college faculty profiles, employee IDs, department affiliations, and daily maximum workload limits.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Teacher</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by teacher name, ID, or department..."
          className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Teachers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading faculty profiles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No faculty members found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Faculty Name & ID</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Max Workload / Day</th>
                  <th className="p-4">Login</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map(item => {
                  const login = findLogin(item);
                  return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {item.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        {item.department}
                      </span>
                    </td>
                    <td className="p-4 space-y-0.5 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{item.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{item.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/50 text-amber-300 border border-amber-800/50">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Max {item.maxHoursPerDay} hrs/day
                      </span>
                    </td>
                    <td className="p-4">
                      {login ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
                          <KeyRound className="w-3 h-3 text-emerald-400" />
                          Login: {login.email}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCreateLogin(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:border-indigo-500 hover:text-white transition-all cursor-pointer"
                          title="Create a login for this same teacher"
                        >
                          <KeyRound className="w-3 h-3" />
                          No login — create one
                        </button>
                      )}
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
              {editingItem ? 'Edit Faculty Record' : 'Add New Faculty Member'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Prof. Sharma"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="EMP101"
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Max Hours / Day</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={formData.maxHoursPerDay}
                    onChange={e => setFormData({ ...formData, maxHoursPerDay: parseInt(e.target.value, 10) || 6 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Department</label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Information Technology"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sharma@college.edu"
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Login Password (optional)</label>
                <input
                  type="text"
                  value={formData.loginPassword}
                  onChange={e => setFormData({ ...formData, loginPassword: e.target.value })}
                  placeholder="Leave empty for no login — e.g. pass1234"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {editingItem && findLogin(editingItem)
                    ? 'This teacher already has a login linked to the same profile.'
                    : 'If filled, a login is created for this same teacher using the email above.'}
                </p>
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
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-600/20"
                >
                  Save Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Teacher Record"
        message="Are you sure you want to delete this faculty member? Class assignments and sessions assigned to this teacher will be affected. Their login (if any) is kept but unlinked from this profile."
        confirmText="Delete Teacher"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
