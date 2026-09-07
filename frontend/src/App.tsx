import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { CaseList } from './pages/CaseList';
import { CaseWorkspace } from './pages/CaseWorkspace';
import { FailureSimulation } from './pages/FailureSimulation';
import { IngestionSimulator } from './pages/IngestionSimulator';
import { ExperimentDashboard } from './pages/ExperimentDashboard';
import { ErrorAnalysis } from './pages/ErrorAnalysis';
import { UserFeedback } from './pages/UserFeedback';
import { WorkflowMap } from './pages/WorkflowMap';
import { AuditTrail } from './pages/AuditTrail';
import { Settings } from './pages/Settings';

// ─── Page label map for Access Restricted messages ─────────────────────────
const PAGE_LABELS: Record<string, string> = {
  dashboard:    'Dashboard',
  cases:        'Cases Registry',
  timeline:     'Evidence Timeline',
  pathology:    'Pathology',
  imaging:      'Imaging',
  molecular:    'Molecular',
  lineage:      'Specimen Lineage',
  reviews:      'Review Decisions',
  audit:        'Audit Trail',
  failures:     'Failure Simulation',
  ingestion:    'Data Ingestion',
  experiment:   'Experiment',
  error_analysis: 'Error Analysis',
  workflow_map: 'Workflow Map',
  feedback:     'User Feedback',
  settings:     'System Settings',
};

// ─── Role → default landing page after login ────────────────────────────────
const ROLE_DEFAULT_PAGE: Record<string, string> = {
  Cardiologist:           'dashboard',
  Pathologist:            'dashboard',
  'Imaging Specialist':   'dashboard',
  'Molecular Specialist': 'dashboard',
  Reviewer:               'dashboard',
  Administrator:          'dashboard',
};

// ─── Role → default workspace tab when opening a case ──────────────────────
const ROLE_DEFAULT_TAB: Record<string, string> = {
  Cardiologist:           'overview',
  Pathologist:            'pathology',
  'Imaging Specialist':   'imaging',
  'Molecular Specialist': 'molecular',
  Reviewer:               'overview',
  Administrator:          'overview',
};

// ─── Authenticated application shell ────────────────────────────────────────
function AuthenticatedApp() {
  const { allowedPages } = useRole();
  const { user } = useAuth();
  const role = user?.role ?? 'Cardiologist';

  const [currentPage, setCurrentPage] = useState(ROLE_DEFAULT_PAGE[role] ?? 'dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState('CASE-1001');
  const [workspaceTab, setWorkspaceTab] = useState(ROLE_DEFAULT_TAB[role] ?? 'overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const goToDashboard = () => setCurrentPage('dashboard');

  const handleSelectCase = (caseId: string, initialTab?: string) => {
    setSelectedCaseId(caseId);
    setWorkspaceTab(initialTab ?? ROLE_DEFAULT_TAB[role] ?? 'overview');
    setCurrentPage('workspace');
  };

  const handleNavSelect = (pageKey: string) => {
    if (['timeline', 'pathology', 'imaging', 'molecular', 'lineage', 'reviews'].includes(pageKey)) {
      setWorkspaceTab(pageKey);
      setCurrentPage('workspace');
    } else {
      setCurrentPage(pageKey);
    }
  };

  const guard = (pageKey: string, content: React.ReactNode) => (
    <ProtectedRoute
      pageKey={pageKey}
      pageLabel={PAGE_LABELS[pageKey]}
      allowedPages={allowedPages}
      onRedirectToLogin={() => {}}
      onBack={goToDashboard}
    >
      {content}
    </ProtectedRoute>
  );

  const renderContent = () => {
    if (currentPage === 'workspace') {
      return (
        <CaseWorkspace
          caseId={selectedCaseId}
          onBack={() => setCurrentPage('cases')}
          initialTab={workspaceTab}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return guard('dashboard', <Dashboard onSelectCase={(id) => handleSelectCase(id)} />);
      case 'cases':
        return guard('cases', <CaseList onSelectCase={(id) => handleSelectCase(id)} />);
      case 'failures':
        return guard('failures', <FailureSimulation onSelectCase={(id) => handleSelectCase(id)} />);
      case 'ingestion':
        return guard('ingestion', <IngestionSimulator onSelectCase={(id) => handleSelectCase(id)} />);
      case 'experiment':
        return guard('experiment', <ExperimentDashboard />);
      case 'error_analysis':
        return guard('error_analysis', <ErrorAnalysis />);
      case 'workflow_map':
        return guard('workflow_map', <WorkflowMap />);
      case 'feedback':
        return guard('feedback', <UserFeedback />);
      case 'audit':
        return guard('audit', <AuditTrail />);
      case 'settings':
        return guard('settings', <Settings />);
      default:
        return guard('dashboard', <Dashboard onSelectCase={(id) => handleSelectCase(id)} />);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Header onRefreshData={() => setRefreshTrigger((p) => p + 1)} />
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <Sidebar
          currentPage={currentPage === 'workspace' ? workspaceTab : currentPage}
          onSelectPage={handleNavSelect}
          selectedCaseId={selectedCaseId}
        />
        <main className="flex-1 overflow-x-hidden min-w-0" key={refreshTrigger}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// ─── Root auth gate ───────────────────────────────────────────────────────────
function AppGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-slate-400 text-sm animate-pulse">Loading CardioEvidence…</div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <RoleProvider>
      <AuthenticatedApp />
    </RoleProvider>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
