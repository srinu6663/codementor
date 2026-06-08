import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  useEffect(() => {
    axios.get('/api/problems')
      .then(res => setProblems(res.data.data || []))
      .catch(err => console.error(err));
  }, []);

  const filteredProblems = problems.filter(p => {
    if (filterDifficulty !== 'all' && p.difficulty !== filterDifficulty) return false;
    return true;
  });

  const getDifficultyColor = (diff) => {
    if (diff === 'easy') return 'text-green-400 bg-green-400/10';
    if (diff === 'medium') return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Problem Bank</h2>
        <div className="flex gap-4">
          <select 
            className="bg-surface-200 border border-surface-400 rounded-md px-3 py-1.5 text-sm"
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-100 rounded-xl border border-surface-300 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-200 text-gray-400 text-sm border-b border-surface-300">
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Title</th>
              <th className="p-4 font-medium">Difficulty</th>
              <th className="p-4 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((p, i) => (
              <tr key={p.id} className="border-b border-surface-300 hover:bg-surface-200/50 transition-colors">
                <td className="p-4">
                  <div className="w-5 h-5 rounded-full border-2 border-surface-400" title="Unsolved (Auth needed)"></div>
                </td>
                <td className="p-4">
                  <Link to={`/problems/${p.id}`} className="font-semibold text-accent-blue hover:underline">
                    {i + 1}. {p.title}
                  </Link>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(p.difficulty)} capitalize`}>
                    {p.difficulty}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 flex-wrap">
                    {p.tags?.map(t => (
                      <span key={t} className="px-2 py-1 rounded bg-surface-300 text-xs text-gray-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProblems.length === 0 && (
          <div className="p-8 text-center text-gray-500">No problems found.</div>
        )}
      </div>
    </div>
  );
}
