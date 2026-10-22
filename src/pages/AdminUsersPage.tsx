import React, { useEffect, useState } from 'react';
import { Users, GraduationCap, Plus, Trash2, Search, ShieldCheck, KeyRound, Mail } from 'lucide-react';
import { AppUser, StudentClass, Teacher } from '../types';
import { userService, classService, teacherService } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

type Tab = 'teacher' | 'student';

export const AdminUsersPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('teacher');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    department: 'Information Technology',
    phone: '+91 9876543210',
    classId: '',
    rollNo: '',
    linkTeacherId: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [uData, cData, tData] = await Promise.all([
        userService.getAll(),
        classService.getAll(),
        teacherService.getAll(),
      ]);
      setUsers(uData);
      setClasses(cData);
      setTeachers(tData);
      if (cData.length > 0 && !formData.classId) {
        setFormData(f => ({ ...f, classId: f.classId || cData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setFormData({
      name: tab === 'teacher' ? `Prof. Teacher ${users.filter(u => u.role === 'teacher').length + 1}` : `Student ${users.filter(u => u.role === 'student').length + 1}`,
      email: tab === 'teacher' ? `faculty${users.filter(u => u.role === 'teacher').length + 1}@college.edu` : `student${users.filter(u => u.role === 'student').length + 1}@college.edu`,
      password: 'pass1234',
      employeeId: `EMP${100 + users.filter(u => u.role === 'teacher').length + 1}`,
      department: 'Information Technology',
      phone: '+91 9876543210',
      classId: classes[0]?.id || '',
      rollNo: tab === 'student' ? `${users.filter(u => u.role === 'student').length + 1}` : '',
      linkTeacherId: '',
    });
    setIsModalOpen(true);
  };

  // Faculty without a login yet — candidates to link (same entity, no duplicates)
  const linkableTeachers = teachers.filter(
    t => !users.some(u => u.role === 'teacher' && (u.teacherId === t.id || u.email.toLowerCase() === (t.email || '').toLowerCase()))
  );

  const handleLinkTeacherSelect = (teacherId: string) => {
    if (!teacherId) {
      setFormData(f => ({ ...f, linkTeacherId: '' }));
      return;
    }
    const t = teachers.find(x => x.id === teacherId);
    if (!t) return;
    setFormData(f => ({
      ...f,
      linkTeacherId: teacherId,
      name: t.name,
      email: t.email,
      employeeId: t.employeeId,
      department: t.department,
      phone: t.phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tab === 'teacher') {
        await userService.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'teacher',
          employeeId: formData.employeeId,
          department: formData.department,
          phone: formData.phone,
          ...(formData.linkTeacherId ? { teacherId: formData.linkTeacherId } : {}),
        } as unknown as Partial<AppUser> & { password: string });
      } else {
        if (!formData.classId) {
          alert('Please select a class for the student. Create a class first under Student Classes.');
          return;
        }
        await userService.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'student',
          classId: formData.classId,
          rollNo: formData.rollNo,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await userService.delete(deletingId);
      setDeletingId(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleResetPassword = async (user: AppUser) => {
    const next = window.prompt(`Set new password for ${user.name} (${user.email}):`, 'pass1234');
    if (!next) return;
    try {
      await userService.update(user.id, { password: next });
      alert('Password updated.');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filtered = users.filter(
    u =>
      u.role === tab &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const studentCount = users.filter(u => u.role === 'student').length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <span>Admin — Manage Logins</span>
          </h1>
          <p className="text-xs text-slate-400">
            Admin creates teacher &amp; student accounts here. Only these accounts can login — there is no public signup.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{tab === 'teacher' ? 'Add Teacher' : 'Add Student'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setTab('teacher')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'teacher' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Add Teacher ({teacherCount})</span>
        </button>
        <button
          onClick={() => setTab('student')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'student' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Add Student ({studentCount})</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab}s by name or email...`}
          className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading accounts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <Mail className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No {tab} logins yet. Click “{tab === 'teacher' ? 'Add Teacher' : 'Add Student'}” to create the first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Name / Email</th>
                  <th className="p-4">{tab === 'teacher' ? 'Employee / Dept' : 'Class / Roll No'}</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map(u => {
                  const cls = classes.find(c => c.id === u.classId);
                  const linkedProfile = u.teacherId ? teachers.find(t => t.id === u.teacherId) : undefined;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                        {u.teacherId && (
                          <div className="text-[10px] mt-0.5">
                            {linkedProfile ? (
                              <span className="text-emerald-300 font-medium">✓ Linked faculty: {linkedProfile.name} ({linkedProfile.employeeId})</span>
                            ) : (
                              <span className="text-amber-300 font-medium">⚠ Faculty profile removed — login has no teaching profile</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-slate-300">
                        {tab === 'teacher' ? (
                          <span>
                            {u.employeeId || '—'} · {u.department || '—'}
                          </span>
                        ) : (
                          <span>
                            {cls ? `${cls.name} (${cls.department})` : u.classId || '—'}
                            {u.rollNo ? ` · Roll ${u.rollNo}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleResetPassword(u)}
                          title="Reset password"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(u.id)}
                          title="Delete login"
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

      {/* Add modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <h2 className="text-base font-bold text-white">
              {tab === 'teacher' ? 'Add New Teacher Login' : 'Add New Student Login'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Login Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Login Password</label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {tab === 'teacher' ? (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Teaching Faculty Profile (same teacher)</label>
                    <select
                      value={formData.linkTeacherId}
                      onChange={e => handleLinkTeacherSelect(e.target.value)}
                      className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">+ Create new faculty profile</option>
                      {linkableTeachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.employeeId}) — {t.department}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {linkableTeachers.length > 0
                        ? 'Pick an existing faculty member to give them this login — login and teaching profile stay the same teacher.'
                        : 'No faculty without login. A new faculty profile will be created and linked automatically.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Employee ID</label>
                      <input
                        type="text"
                        required
                        value={formData.employeeId}
                        onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                        className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
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
                      className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formData.linkTeacherId
                        ? 'Saving will link this login to the selected faculty profile (one teacher, one login).'
                        : 'A faculty profile is auto-created and linked so the teacher appears in timetables.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Assign to Class</label>
                    <select
                      required
                      value={formData.classId}
                      onChange={e => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Choose class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.department} ({c.studentCount} students)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Roll No (optional)</label>
                    <input
                      type="text"
                      value={formData.rollNo}
                      onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                      className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
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
                  Create {tab === 'teacher' ? 'Teacher' : 'Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Login"
        message="Delete this login? The person will no longer be able to sign in. (Linked faculty profile is kept for timetable history.)"
        confirmText="Delete Login"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
