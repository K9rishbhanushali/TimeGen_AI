import React, { useState } from 'react';
import { Navigation, ActivePage } from './components/Navigation';
import { AIChatDrawer } from './components/AIChatDrawer';
import { DashboardPage } from './pages/DashboardPage';
import { ClassroomsPage } from './pages/ClassroomsPage';
import { LabsPage } from './pages/LabsPage';
import { ClassesPage } from './pages/ClassesPage';
import { TeachersPage } from './pages/TeachersPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { TimingsPage } from './pages/TimingsPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { GeneratePage } from './pages/GeneratePage';
import { TimetablePage } from './pages/TimetablePage';
import { ConflictsPage } from './pages/ConflictsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { TeacherCoverPage } from './pages/TeacherCoverPage';
import { StudentNoticesPage } from './pages/StudentNoticesPage';
import { databaseService, authService } from './services/api';
import { AppUser } from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => authService.currentUser());
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleLogin = (_token: string, user: AppUser) => {
    setCurrentUser(user);
    // Land each role on the right start page
    if (user.role === 'admin') setActivePage('users');
    else setActivePage('timetable');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActivePage('dashboard');
    setIsAIChatOpen(false);
  };

  // Not logged in -> role-based login (Admin / Teacher / Student)
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const role = currentUser.role;
  const isAdmin = role === 'admin';

  const handleSeedData = async () => {
    if (!isAdmin) return;
    setIsSeeding(true);
    try {
      await databaseService.seed();
      alert('Successfully seeded default demo dataset!');
      window.location.reload();
    } catch (err) {
      alert(`Seeding error: ${(err as Error).message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const renderActivePage = () => {
    // Teacher: locked timetable + leave/cover workflow
    if (role === 'teacher') {
      if (activePage === 'timetable') {
        if (!currentUser.teacherId) {
          return (
            <div className="p-8 text-sm text-slate-300">
              No faculty profile linked to this login. Ask admin to link your teacher profile.
            </div>
          );
        }
        return <TimetablePage lockedViewMode="teacher" lockedId={currentUser.teacherId} readOnly />;
      }
      if (activePage === 'cover') {
        return <TeacherCoverPage user={currentUser} />;
      }
      return (
        <DashboardPage
          onNavigate={p => {
            if (p === 'timetable' || p === 'cover' || p === 'dashboard') setActivePage(p);
          }}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          onSeedData={handleSeedData}
        />
      );
    }

    if (role === 'student') {
      if (activePage === 'timetable') {
        if (!currentUser.classId) {
          return (
            <div className="p-8 text-sm text-slate-300">
              No class linked to this login. Ask admin to assign your class.
            </div>
          );
        }
        return <TimetablePage lockedViewMode="class" lockedId={currentUser.classId} readOnly />;
      }
      if (activePage === 'notices') {
        return <StudentNoticesPage user={currentUser} />;
      }
      return (
        <DashboardPage
          onNavigate={p => {
            if (p === 'timetable' || p === 'notices' || p === 'dashboard') setActivePage(p);
          }}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          onSeedData={handleSeedData}
        />
      );
    }

    // Admin: full access + Add Teacher / Student
    switch (activePage) {
      case 'users':
        return <AdminUsersPage />;
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={setActivePage}
            onOpenAIChat={() => setIsAIChatOpen(true)}
            onSeedData={handleSeedData}
          />
        );
      case 'classrooms':
        return <ClassroomsPage />;
      case 'labs':
        return <LabsPage />;
      case 'classes':
        return <ClassesPage />;
      case 'teachers':
        return <TeachersPage />;
      case 'subjects':
        return <SubjectsPage />;
      case 'assignments':
        return <AssignmentsPage />;
      case 'timings':
        return <TimingsPage />;
      case 'availability':
        return <AvailabilityPage />;
      case 'generate':
        return <GeneratePage onNavigate={setActivePage} />;
      case 'timetable':
        return <TimetablePage />;
      case 'conflicts':
        return <ConflictsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'export':
        return <ExportPage />;
      case 'settings':
        return <SettingsPage onSeedData={handleSeedData} />;
      default:
        return (
          <DashboardPage
            onNavigate={setActivePage}
            onOpenAIChat={() => setIsAIChatOpen(true)}
            onSeedData={handleSeedData}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#0f1115] font-sans text-gray-200 overflow-hidden">
      {/* Sidebar Navigation */}
      <Navigation
        activePage={activePage}
        onSelectPage={setActivePage}
        onToggleAIChat={() => setIsAIChatOpen(!isAIChatOpen)}
        onSeedData={handleSeedData}
        isSeeding={isSeeding}
        role={role}
        userName={currentUser.name}
        onLogout={handleLogout}
      />

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {renderActivePage()}
      </main>

      {/* AI Assistant Drawer (admin only) */}
      {isAdmin && (
        <AIChatDrawer
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          onRefreshData={() => window.location.reload()}
        />
      )}
    </div>
  );
}

export default App;
