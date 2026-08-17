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
import { databaseService } from './services/api';

export function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
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
    switch (activePage) {
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
      />

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {renderActivePage()}
      </main>

      {/* AI Assistant Drawer */}
      <AIChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        onRefreshData={() => window.location.reload()}
      />
    </div>
  );
}

export default App;
