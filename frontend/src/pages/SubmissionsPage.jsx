import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    axios.get('/api/submissions')
      .then(res => setSubmissions(res.data.data || []))
      .catch(err => console.error(err));
  }, []);

  const getVerdictStyle = (verdict) => {
    if (verdict === 'Accepted') return 'text-green-400';
    if (verdict === 'Time Limit Exceeded') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-8">Submission History</h2>

      <div className="bg-surface-100 rounded-xl border border-surface-300 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-200 text-gray-400 text-sm border-b border-surface-300">
              <th className="p-4 font-medium">Time Submitted</th>
              <th className="p-4 font-medium">Problem</th>
              <th className="p-4 font-medium">Verdict</th>
              <th className="p-4 font-medium">Runtime</th>
              <th className="p-4 font-medium">Memory</th>
              <th className="p-4 font-medium">Language</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="border-b border-surface-300 hover:bg-surface-200/50 transition-colors">
                <td className="p-4 text-sm text-gray-400">
                  {new Date(sub.submitted_at).toLocaleString()}
                </td>
                <td className="p-4 font-semibold">
                  {sub.problem_title}
                </td>
                <td className={`p-4 font-bold ${getVerdictStyle(sub.verdict)}`}>
                  {sub.verdict}
                </td>
                <td className="p-4 text-sm">{sub.runtime} ms</td>
                <td className="p-4 text-sm">{sub.memory} KB</td>
                <td className="p-4 text-sm capitalize">{sub.language}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <div className="p-8 text-center text-gray-500">No submissions found. Go solve some problems!</div>
        )}
      </div>
    </div>
  );
}
