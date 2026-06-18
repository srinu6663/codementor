import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { FacultyLayout } from './components/layout/FacultyLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import ProblemListPage from './pages/ProblemListPage';
import ProblemSolvingPage from './pages/ProblemSolvingPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import StudentClassesPage from './pages/StudentClassesPage';
import FacultyClassesPage from './pages/FacultyClassesPage';
import FacultyPlagiarismOverview from './pages/FacultyPlagiarismOverview';
import LeaderboardPage from './pages/LeaderboardPage';
import AssignmentsPage from './pages/AssignmentsPage';
import ContestsPage from './pages/ContestsPage';
import PlacementTrackPage from './pages/PlacementTrackPage';
import AITutorPage from './pages/AITutorPage';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyProblems from './pages/FacultyProblems';
import JudgeHealthPage from './pages/JudgeHealthPage';
import FacultyPermissionsPage from './pages/FacultyPermissionsPage';
import AuditLogPage from './pages/AuditLogPage';
import AptitudePage from './pages/AptitudePage';
import FacultyMcqPage from './pages/FacultyMcqPage';
import CodingProfilesPage from './pages/CodingProfilesPage';
import PlagiarismPage from './pages/PlagiarismPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireFaculty({ children }: { children: React.ReactNode }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'faculty' && user.role !== 'admin') return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/faculty/dashboard" replace />;
  return <>{children}</>;
}

function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const facultyHome = '/faculty/dashboard';
  const studentHome = '/app/dashboard';

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={
            user
              ? <Navigate to={user.role === 'faculty' ? facultyHome : studentHome} replace />
              : <Navigate to="/login" replace />
          }
        />

        {/* Legacy faculty routes → redirect to new paths */}
        <Route path="/faculty-dashboard" element={<Navigate to={facultyHome} replace />} />
        <Route path="/faculty-problems"  element={<Navigate to="/faculty/problems" replace />} />

        {/* Auth */}
        <Route path="/login"    element={user ? <Navigate to={user.role === 'faculty' ? facultyHome : studentHome} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'faculty' ? facultyHome : studentHome} replace /> : <RegisterPage />} />

        {/* Student app — with sidebar layout */}
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to={studentHome} replace />} />
          <Route path="dashboard"  element={<StudentDashboard />} />
          <Route path="problems"   element={<ProblemListPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="contests"   element={<ContestsPage />} />
          <Route path="placement"  element={<PlacementTrackPage />} />
          <Route path="ai-tutor"   element={<AITutorPage />} />
          <Route path="profile"    element={<ProfilePage />} />
          <Route path="submissions" element={<MySubmissionsPage />} />
          <Route path="classes" element={<StudentClassesPage />} />
          <Route path="aptitude" element={<AptitudePage />} />
          <Route path="coding-profiles" element={<CodingProfilesPage />} />
        </Route>

        {/* Problem solving — full screen, no sidebar */}
        <Route
          path="/app/problems/:id"
          element={<RequireAuth><ProblemSolvingPage /></RequireAuth>}
        />

        {/* Faculty — with sidebar layout */}
        <Route path="/faculty" element={<RequireFaculty><FacultyLayout /></RequireFaculty>}>
          <Route index element={<Navigate to={facultyHome} replace />} />
          <Route path="dashboard"   element={<FacultyDashboard />} />
          <Route path="problems"    element={<FacultyProblems />} />
          <Route path="assignments" element={<FacultyDashboard />} />
          <Route path="assignments/:assignmentId/plagiarism" element={<PlagiarismPage />} />
          <Route path="students"    element={<FacultyDashboard />} />
          <Route path="judge-health" element={<JudgeHealthPage />} />
          <Route path="permissions" element={<RequireAdmin><FacultyPermissionsPage /></RequireAdmin>} />
          <Route path="audit-logs" element={<RequireAdmin><AuditLogPage /></RequireAdmin>} />
          <Route path="classes" element={<FacultyClassesPage />} />
          <Route path="plagiarism" element={<FacultyPlagiarismOverview />} />
          <Route path="mcq" element={<FacultyMcqPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
