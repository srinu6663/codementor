import { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Flame, CheckCircle, Code, Calendar, Bell } from 'lucide-react';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        const [dashRes, assRes, notifRes] = await Promise.all([
          axios.get('/api/student/dashboard', { headers }),
          axios.get('/api/student/assignments', { headers }),
          axios.get('/api/student/notifications', { headers })
        ]);

        setData(dashRes.data.data);
        setAssignments(assRes.data.data);
        setNotifications(notifRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="p-8 text-center animate-pulse">Loading Dashboard...</div>;

  const { stats, languages, heatmap, topics } = data;

  // Build basic heatmap grid (last 60 days)
  const today = new Date();
  const last60Days = Array.from({ length: 60 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (59 - i));
    const dateStr = d.toISOString().split('T')[0];
    const match = heatmap.find(h => h.date === dateStr);
    return { date: dateStr, count: match ? match.count : 0 };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* Welcome Hero */}
        <div className="bg-gradient-to-r from-surface-200 to-surface-100 p-8 rounded-2xl border border-surface-300 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back, Hacker!</h2>
            <p className="text-gray-400">You are doing great. Keep the momentum going!</p>
          </div>
          <div className="flex flex-col items-center bg-surface-300 p-4 rounded-xl border border-surface-400">
            <Flame className="w-8 h-8 text-orange-500 mb-1" />
            <span className="text-xl font-bold text-white">{stats.streak} Day</span>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Streak</span>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
            <span className="text-3xl font-bold text-white mb-1">{stats.problemsSolved}</span>
            <span className="text-xs text-gray-400 font-medium uppercase">Problems Solved</span>
          </div>
          <div className="panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <Code className="w-6 h-6 text-accent-blue mb-2" />
            <span className="text-3xl font-bold text-white mb-1">{stats.totalSubs}</span>
            <span className="text-xs text-gray-400 font-medium uppercase">Submissions</span>
          </div>
          <div className="panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-6 h-6 rounded-full border-2 border-yellow-400 mb-2"></div>
            <span className="text-3xl font-bold text-white mb-1">{stats.acRate}%</span>
            <span className="text-xs text-gray-400 font-medium uppercase">Acceptance Rate</span>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Submission Activity (Last 60 Days)
          </h3>
          <div className="flex flex-wrap gap-1">
            {last60Days.map((day, i) => {
              let color = 'bg-surface-300';
              if (day.count > 0) color = 'bg-green-900';
              if (day.count > 2) color = 'bg-green-700';
              if (day.count > 5) color = 'bg-green-500';
              if (day.count > 10) color = 'bg-green-400';
              return (
                <div 
                  key={i} 
                  title={`${day.date}: ${day.count} submissions`}
                  className={`w-4 h-4 rounded-sm ${color} transition-colors hover:ring-2 hover:ring-white`}
                ></div>
              );
            })}
          </div>
        </div>

        {/* Topic Mastery Radar Chart */}
        <div className="panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Topic Mastery</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={topics}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: '#888', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Mastery" dataKey="mastery" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Side Column */}
      <div className="space-y-8">
        
        {/* Assignments */}
        <div className="panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Assignments</h3>
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="text-sm text-gray-500">No active assignments.</div>
            ) : (
              assignments.map(ass => (
                <div key={ass.id} className="bg-surface-200 p-4 rounded-xl border border-surface-300">
                  <h4 className="font-semibold text-white text-sm mb-1">{ass.title}</h4>
                  <div className="text-xs text-red-400 mb-3">Due: {new Date(ass.deadline).toLocaleDateString()}</div>
                  <div className="w-full bg-surface-400 rounded-full h-1.5">
                    <div className="bg-accent-blue h-1.5 rounded-full" style={{ width: `${ass.progress}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            Notifications
          </h3>
          <div className="space-y-3">
            {notifications.map(notif => (
              <div key={notif.id} className={`p-3 rounded-lg border ${notif.read ? 'bg-surface-100 border-surface-300' : 'bg-surface-200 border-accent-blue/30'}`}>
                <p className="text-sm text-gray-300">{notif.message}</p>
                <span className="text-xs text-gray-500 mt-2 block">{new Date(notif.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Language Breakdown */}
        <div className="panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Languages Used</h3>
          <div className="space-y-3">
            {languages.map(l => (
              <div key={l.language} className="flex justify-between items-center bg-surface-200 p-3 rounded-lg border border-surface-300">
                <span className="text-sm font-medium text-white capitalize">{l.language}</span>
                <span className="text-xs bg-surface-400 text-gray-300 px-2 py-1 rounded">{l.count} Subs</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
