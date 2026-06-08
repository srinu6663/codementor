import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProblemList from './pages/ProblemList';
import EditorPage from './pages/EditorPage';
import SubmissionsPage from './pages/SubmissionsPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#121212] text-gray-200 font-sans flex flex-col">
        {/* Global Navigation */}
        <nav className="bg-surface-100 border-b border-surface-300 p-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-accent-blue flex items-center justify-center font-bold text-lg text-white">C</div>
              <h1 className="font-semibold text-lg tracking-wide text-white">CodeMentor</h1>
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">Problems</Link>
              <Link to="/submissions" className="text-gray-400 hover:text-white transition-colors">Submissions</Link>
            </div>
          </div>
          <div>
            <div className="w-8 h-8 rounded-full bg-surface-300 flex items-center justify-center text-sm font-bold">U</div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0">
          <Routes>
            <Route path="/" element={<ProblemList />} />
            <Route path="/problems/:id" element={<EditorPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
