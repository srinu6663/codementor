import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import ProblemList from './pages/ProblemList';
import EditorPage from './pages/EditorPage';
import SubmissionsPage from './pages/SubmissionsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyProblems from './pages/FacultyProblems';

function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#121212] text-gray-200 font-sans flex flex-col">
        {/* Global Navigation */}
        <nav className="bg-surface-100 border-b border-surface-300 p-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to={user?.role === 'faculty' ? "/faculty-dashboard" : user ? "/dashboard" : "/"} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-accent-blue flex items-center justify-center font-bold text-lg text-white">C</div>
              <h1 className="font-semibold text-lg tracking-wide text-white">CodeMentor</h1>
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">Problems</Link>
              <Link to="/submissions" className="text-gray-400 hover:text-white transition-colors">Submissions</Link>
              {user?.role === 'student' && <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>}
              {user?.role === 'faculty' && <Link to="/faculty-dashboard" className="text-gray-400 hover:text-white transition-colors">Faculty Panel</Link>}
            </div>
          </div>
          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-300">
                  Hi, {user.name} <span className="ml-2 text-xs text-gray-500 uppercase tracking-wider">({user.role})</span>
                </span>
                <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition-colors">Logout</button>
                <div className="w-8 h-8 rounded-full bg-surface-300 flex items-center justify-center text-sm font-bold text-white border border-surface-400">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="px-4 py-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">Log in</Link>
                <Link to="/register" className="px-4 py-1.5 text-sm font-medium bg-accent-blue text-white rounded-md hover:bg-blue-600 transition-colors">Sign up</Link>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-auto">
          <Routes>
            <Route path="/" element={<ProblemList />} />
            <Route path="/problems/:id" element={<EditorPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/login" element={user ? <Navigate to={user.role === 'faculty' ? "/faculty-dashboard" : "/dashboard"} /> : <LoginPage />} />
            <Route path="/register" element={user ? <Navigate to={user.role === 'faculty' ? "/faculty-dashboard" : "/dashboard"} /> : <RegisterPage />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty-problems" element={<FacultyProblems />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
