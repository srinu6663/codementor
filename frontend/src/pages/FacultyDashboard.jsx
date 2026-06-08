import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Users, CheckCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FacultyDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await axios.get('/api/faculty/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="p-8 text-center animate-pulse">Loading Faculty Dashboard...</div>;

  const { stats, assignments } = data;

  const handleExport = async (assignmentId, title) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.get(`/api/faculty/assignments/${assignmentId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_marks.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      
      <div className="flex justify-between items-center bg-gradient-to-r from-purple-900 to-surface-100 p-8 rounded-2xl border border-purple-500/30">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Faculty Dashboard</h2>
          <p className="text-gray-300">Manage your class, assignments, and curriculum from here.</p>
        </div>
        <Link to="/faculty-problems" className="btn-success px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-green-500/20 transition-all">
          Manage Problem Bank
        </Link>
      </div>

      {/* Class Overview */}
      <div className="grid grid-cols-3 gap-6">
        <div className="panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/30">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{stats.totalStudents}</div>
            <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">Total Students</div>
          </div>
        </div>
        <div className="panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-accent-blue/10 rounded-full border border-accent-blue/30">
            <FileText className="w-8 h-8 text-accent-blue" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{stats.totalSubs}</div>
            <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">Total Submissions</div>
          </div>
        </div>
        <div className="panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-green-500/10 rounded-full border border-green-500/30">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white">{stats.acRate}%</div>
            <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">Avg Class AC Rate</div>
          </div>
        </div>
      </div>

      {/* Assignments */}
      <div className="panel p-8 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Active Assignments</h3>
          <button className="bg-surface-300 hover:bg-surface-400 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-surface-400">
            + Create Assignment
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed border-surface-400 rounded-xl">
            You haven't assigned any problem sets to your class yet.
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map(ass => (
              <div key={ass.id} className="flex items-center justify-between bg-surface-200 p-4 rounded-xl border border-surface-300">
                <div>
                  <h4 className="font-semibold text-lg text-white">{ass.title}</h4>
                  <div className="text-sm text-gray-400">Due: {new Date(ass.deadline).toLocaleString()}</div>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-surface-300 text-sm font-medium rounded-lg hover:bg-surface-400 transition-colors">
                    View Submissions
                  </button>
                  <button 
                    onClick={() => handleExport(ass.id, ass.title)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-blue/10 text-accent-blue border border-accent-blue/30 text-sm font-medium rounded-lg hover:bg-accent-blue/20 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
