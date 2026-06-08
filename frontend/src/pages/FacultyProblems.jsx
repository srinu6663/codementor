import { useState } from 'react';
import axios from 'axios';
import { Sparkles, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FacultyProblems() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('arrays');
  const [testCases, setTestCases] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleAIGenerate = async () => {
    if (!title || !description) return alert("Please enter a title and description first so the AI understands the problem.");
    
    setLoadingAI(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.post('/api/faculty/ai/generate-tests', { title, description }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestCases(res.data.data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate test cases via AI");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSave = async () => {
    if (!title || !description || testCases.length === 0) return alert("Please fill all fields and generate test cases.");
    
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post('/api/faculty/problems', {
        title,
        description,
        difficulty,
        tags: tags.split(',').map(t => t.trim()),
        test_cases: testCases
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Problem saved successfully to the Bank!");
      navigate('/faculty-dashboard');
    } catch (err) {
      console.error(err);
      alert("Failed to save problem");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Create New Problem</h2>
        <button onClick={() => navigate('/faculty-dashboard')} className="text-gray-400 hover:text-white">← Back to Dashboard</button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        
        {/* Left Col: Problem Details */}
        <div className="space-y-4">
          <div className="panel p-6 rounded-2xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Problem Title</label>
              <input 
                type="text" 
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-surface-200 border border-surface-400 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-blue text-white"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
                <select 
                  value={difficulty} onChange={e => setDifficulty(e.target.value)}
                  className="w-full bg-surface-200 border border-surface-400 rounded-lg px-4 py-2 focus:outline-none text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={tags} onChange={e => setTags(e.target.value)}
                  className="w-full bg-surface-200 border border-surface-400 rounded-lg px-4 py-2 focus:outline-none text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Problem Description</label>
              <textarea 
                rows="8"
                value={description} onChange={e => setDescription(e.target.value)}
                className="w-full bg-surface-200 border border-surface-400 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-blue text-white"
                placeholder="Markdown is supported..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Col: AI Test Cases */}
        <div className="panel p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-white">Edge Cases</h3>
            <button 
              onClick={handleAIGenerate}
              disabled={loadingAI}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4" /> 
              {loadingAI ? 'AI Thinking...' : 'Generate 15 Test Cases'}
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-surface-200 rounded-lg border border-surface-400 p-4 space-y-4">
            {testCases.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 italic">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                Provide a description and let AI generate the optimal edge cases for your students.
              </div>
            ) : (
              testCases.map((tc, idx) => (
                <div key={idx} className="bg-surface-100 p-3 rounded border border-surface-300">
                  <div className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Test Case #{idx + 1}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    <div><span className="text-gray-500 block mb-1">Input:</span><div className="bg-surface-300 p-1.5 rounded break-words">{tc.input}</div></div>
                    <div><span className="text-gray-500 block mb-1">Expected Output:</span><div className="bg-green-900/30 text-green-400 border border-green-500/30 p-1.5 rounded break-words">{tc.output}</div></div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-surface-300 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-accent-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Publish Problem'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
