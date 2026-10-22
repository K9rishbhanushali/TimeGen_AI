import React, { useState } from 'react';
import { ShieldCheck, Users, GraduationCap, LogIn, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';
import { authService } from '../services/api';

interface LoginPageProps {
  onLogin: (token: string, user: import('../types').AppUser) => void;
}

const ROLE_TABS: { id: UserRole; label: string; icon: React.ElementType; hint: string }[] = [
  { id: 'admin', label: 'Admin', icon: ShieldCheck, hint: 'Manage teacher & student accounts' },
  { id: 'teacher', label: 'Teacher', icon: Users, hint: 'View your own timetable' },
  { id: 'student', label: 'Student', icon: GraduationCap, hint: 'View your class timetable' },
];

const DEFAULT_CREDS: Record<UserRole, { email: string; password: string }> = {
  admin: { email: 'admin@timegen.ai', password: 'admin123' },
  teacher: { email: '', password: '' },
  student: { email: '', password: '' },
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState(DEFAULT_CREDS.admin.email);
  const [password, setPassword] = useState(DEFAULT_CREDS.admin.password);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchRole = (r: UserRole) => {
    setRole(r);
    setError('');
    // Keep admin demo creds prefilled; clear for teacher/student
    if (r === 'admin') {
      setEmail(DEFAULT_CREDS.admin.email);
      setPassword(DEFAULT_CREDS.admin.password);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(email.trim(), password, role);
      authService.saveSession(res);
      onLogin(res.token, res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const ActiveIcon = ROLE_TABS.find(t => t.id === role)?.icon || ShieldCheck;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f1115] p-4">
      <div className="w-full max-w-md bg-[#16191f] border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl mx-auto shadow-lg shadow-indigo-600/30">
            T
          </div>
          <h1 className="text-xl font-bold text-white">TimeGen AI</h1>
          <p className="text-xs text-gray-400">Sign in to continue — only admin-created accounts can login</p>
        </div>

        {/* Role tabs */}
        <div className="grid grid-cols-3 gap-2 bg-gray-900 border border-gray-800 p-1.5 rounded-xl">
          {ROLE_TABS.map(tab => {
            const Icon = tab.icon;
            const active = role === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchRole(tab.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <ActiveIcon className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{ROLE_TABS.find(t => t.id === role)?.hint}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">
              {role === 'admin' ? 'Admin email' : role === 'teacher' ? 'Teacher email' : 'Student email'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={role === 'admin' ? 'admin@timegen.ai' : 'you@college.edu'}
              className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-gray-900 text-white p-3 pr-11 rounded-xl border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing in...' : `Login as ${role}`}</span>
          </button>
        </form>

        <div className="text-center space-y-1">
          {role === 'admin' ? (
            <p className="text-[11px] text-gray-500">
              Default admin: <span className="font-mono text-gray-300">admin@timegen.ai / admin123</span>
            </p>
          ) : (
            <p className="text-[11px] text-gray-500">
              No signup here — ask your admin to create your {role} account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
