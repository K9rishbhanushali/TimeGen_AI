import React from 'react';
import {
  LayoutDashboard,
  DoorOpen,
  FlaskConical,
  GraduationCap,
  Users,
  BookOpen,
  Link2,
  Clock,
  CalendarCheck,
  Zap,
  Calendar,
  AlertTriangle,
  BarChart3,
  Download,
  Settings,
  Bot,
  Database,
  Sparkles,
  RefreshCw,
  Repeat,
  Bell
} from 'lucide-react';

export type ActivePage =
  | 'dashboard'
  | 'classrooms'
  | 'labs'
  | 'classes'
  | 'teachers'
  | 'subjects'
  | 'assignments'
  | 'timings'
  | 'availability'
  | 'generate'
  | 'timetable'
  | 'conflicts'
  | 'analytics'
  | 'export'
  | 'settings'
  | 'users'
  | 'cover'
  | 'notices';

interface NavigationProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  onToggleAIChat: () => void;
  onSeedData: () => void;
  isSeeding?: boolean;
  role?: import('../types').UserRole;
  userName?: string;
  onLogout?: () => void;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ElementType;
  isHighlight?: boolean;
}

interface NavSection {
  title: string;
  adminOnly?: boolean;
  items: NavItem[];
}

export const Navigation: React.FC<NavigationProps> = ({
  activePage,
  onSelectPage,
  onToggleAIChat,
  onSeedData,
  isSeeding = false,
  role = 'admin',
  userName,
  onLogout,
}) => {
  const fullSections: NavSection[] = [
    {
      title: 'General',
      items: [{ id: 'dashboard' as ActivePage, label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'User Management',
      adminOnly: true,
      items: [{ id: 'users' as ActivePage, label: 'Add Teacher / Student', icon: Users }],
    },
    {
      title: 'Academic Setup',
      items: [
        { id: 'classrooms' as ActivePage, label: 'Classrooms', icon: DoorOpen },
        { id: 'labs' as ActivePage, label: 'Laboratories', icon: FlaskConical },
        { id: 'classes' as ActivePage, label: 'Student Classes', icon: GraduationCap },
        { id: 'teachers' as ActivePage, label: 'Faculty & Teachers', icon: Users },
        { id: 'subjects' as ActivePage, label: 'Subjects & Curriculum', icon: BookOpen },
        { id: 'assignments' as ActivePage, label: 'Class Assignments', icon: Link2 },
      ],
    },
    {
      title: 'Scheduling Engine',
      items: [
        { id: 'timings' as ActivePage, label: 'Timings & Slots', icon: Clock },
        { id: 'availability' as ActivePage, label: 'Availability Matrix', icon: CalendarCheck },
        { id: 'generate' as ActivePage, label: 'Generate Timetable', icon: Zap, isHighlight: true },
        { id: 'timetable' as ActivePage, label: 'Weekly Timetable', icon: Calendar },
        { id: 'conflicts' as ActivePage, label: 'Conflict Auditor', icon: AlertTriangle },
      ],
    },
    {
      title: 'Reports & Settings',
      items: [
        { id: 'analytics' as ActivePage, label: 'Analytics', icon: BarChart3 },
        { id: 'export' as ActivePage, label: 'Export & Print', icon: Download },
        { id: 'settings' as ActivePage, label: 'Settings', icon: Settings },
      ],
    },
  ];

  // Role gating: teachers get timetable + leave/cover, students get timetable + notices.
  // Admin keeps full access including Add Teacher / Student.
  const teacherExtra: NavItem[] =
    role === 'teacher' ? [{ id: 'cover', label: 'Leave & Cover', icon: Repeat, isHighlight: true }] : [];
  const studentExtra: NavItem[] =
    role === 'student' ? [{ id: 'notices', label: 'Timetable & Notices', icon: Bell, isHighlight: true }] : [];
  const navSections = fullSections.filter(sec => {
    if (role === 'admin') return true;
    if (sec.title === 'General') return true;
    if (sec.title === 'Scheduling Engine') return true; // filtered below per role
    return false;
  }).map(sec => {
    if (role === 'teacher' && sec.title === 'Scheduling Engine') {
      return { ...sec, items: [...sec.items.filter(i => i.id === 'timetable'), ...teacherExtra] };
    }
    if (role === 'student' && sec.title === 'Scheduling Engine') {
      return { ...sec, items: [...sec.items.filter(i => i.id === 'timetable'), ...studentExtra] };
    }
    return sec;
  });

  return (
    <aside className="w-64 bg-[#16191f] border-r border-gray-800 text-gray-300 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
            T
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white leading-tight">TimeGen AI</h1>
            <p className="text-[10px] text-gray-400 font-medium">Scheduler Pro</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {navSections.map((sec, idx) => (
          <div key={idx}>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2.5 px-2 font-semibold">
              {sec.title}
            </p>
            <ul className="space-y-1">
              {sec.items.map(item => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelectPage(item.id)}
                      className={`w-full px-3 py-2 rounded-md text-sm flex items-center gap-3 transition-colors cursor-pointer font-medium text-left ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : item.isHighlight
                          ? 'text-emerald-400 hover:bg-gray-800 hover:text-emerald-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.isHighlight ? 'text-emerald-400' : 'text-gray-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2 bg-[#16191f]">
        {/* Logged-in user */}
        {userName && (
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-900 border border-gray-800 text-xs">
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{userName}</div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold">{role}</div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="ml-2 px-2.5 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 font-semibold cursor-pointer"
              >
                Logout
              </button>
            )}
          </div>
        )}
        {role === 'admin' && (
          <>
            <button
              onClick={onToggleAIChat}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium bg-gray-800 border border-gray-700 text-gray-200 hover:text-white hover:border-indigo-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>Assistant</span>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">
                Gemini
              </span>
            </button>

            <button
              onClick={onSeedData}
              disabled={isSeeding}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-900 hover:bg-gray-800 transition-colors border border-gray-800 disabled:opacity-50 cursor-pointer"
            >
              {isSeeding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span>{isSeeding ? 'Resetting...' : 'Reset Demo Dataset'}</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
