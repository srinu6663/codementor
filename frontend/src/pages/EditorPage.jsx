import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const LANGUAGES = [
  { id: 71, name: 'Python', value: 'python', defaultCode: 'def solve():\n    pass' },
  { id: 63, name: 'JavaScript', value: 'javascript', defaultCode: 'function solve() {\n}' },
  { id: 62, name: 'Java', value: 'java', defaultCode: 'public class Main {\n  public static void main(String[] args) {\n  }\n}' },
  { id: 54, name: 'C++', value: 'cpp', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n  return 0;\n}' },
  { id: 50, name: 'C', value: 'c', defaultCode: '#include <stdio.h>\n\nint main() {\n  return 0;\n}' }
];

export default function EditorPage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const editorRef = useRef(null);

  useEffect(() => {
    axios.get(`/api/problems/${id}`)
      .then(res => setProblem(res.data.data))
      .catch(err => console.error("Failed to load problem", err));
  }, [id]);

  const handleLanguageChange = (e) => {
    const lang = LANGUAGES.find(l => l.id === parseInt(e.target.value));
    setSelectedLang(lang);
    setCode(lang.defaultCode);
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const pollJobStatus = async (jobId) => {
    try {
      const res = await axios.get(`/api/submit/status/${jobId}`);
      const data = res.data;
      
      if (data.state === 'completed' || data.state === 'failed') {
        setIsRunning(false);
        setOutput(data);
        setJobProgress(100);
      } else {
        setJobProgress(data.progress || 0);
        setTimeout(() => pollJobStatus(jobId), 1000);
      }
    } catch (err) {
      console.error(err);
      setIsRunning(false);
      setOutput({ state: 'error', error: 'Failed to poll status' });
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput(null);
    setJobProgress(0);

    try {
      const response = await axios.post('/api/submit', {
        source_code: code,
        language_id: selectedLang.id,
        problem_id: id
      });

      if (response.data.success) {
        pollJobStatus(response.data.jobId);
      } else {
        setIsRunning(false);
        setOutput({ state: 'error', error: response.data.error });
      }
    } catch (error) {
      console.error("Error queueing job:", error);
      setIsRunning(false);
      setOutput({ state: 'error', error: "Failed to connect to server" });
    }
  };

  if (!problem) return <div className="p-8 text-center animate-pulse">Loading Workspace...</div>;

  const renderVerdict = (statusId, description) => {
    if (!description) return null;
    if (statusId === 3) return <span className="badge-accepted">{description}</span>;
    if (statusId === 4) return <span className="badge-wrong">{description}</span>;
    if (statusId === 5) return <span className="badge-tle">{description}</span>;
    return <span className="badge-error">{description}</span>;
  };

  return (
    <div className="flex-1 flex gap-2 p-2 min-h-0">
      
      {/* LEFT PANEL: Problem Description */}
      <div className="flex-1 panel flex flex-col overflow-auto bg-surface-100 p-6 rounded-xl border border-surface-300">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
            problem.difficulty === 'easy' ? 'text-green-400 bg-green-400/10' :
            problem.difficulty === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
            'text-red-400 bg-red-400/10'
          }`}>
            {problem.difficulty}
          </span>
        </div>
        
        <div className="flex gap-2 mb-6">
          {problem.tags?.map(t => (
            <span key={t} className="px-2 py-1 rounded bg-surface-300 text-xs text-gray-300">{t}</span>
          ))}
        </div>

        <div className="prose prose-invert max-w-none text-gray-300 mb-8 whitespace-pre-wrap">
          {problem.description}
        </div>

        <div className="text-sm text-gray-400 space-y-1">
          <div><strong className="text-gray-300">Time Limit:</strong> {problem.time_limit}s</div>
          <div><strong className="text-gray-300">Memory Limit:</strong> {problem.memory_limit} MB</div>
        </div>
      </div>

      {/* RIGHT PANEL: Editor & Output */}
      <div className="flex-[1.5] flex flex-col gap-2 min-h-0">
        
        {/* Editor Controls */}
        <div className="bg-surface-100 p-2 rounded-xl border border-surface-300 flex justify-between items-center px-4">
          <select 
            value={selectedLang.id} 
            onChange={handleLanguageChange}
            className="bg-surface-200 border border-surface-400 text-sm rounded-md px-3 py-1 focus:outline-none"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
          <button onClick={runCode} disabled={isRunning} className="btn-success py-1.5 px-4 text-sm">
            {isRunning ? `Running ${jobProgress}%...` : "Submit Code"}
          </button>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 panel flex flex-col rounded-xl overflow-hidden border border-surface-300">
          <Editor
            height="100%"
            language={selectedLang.value}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value)}
            onMount={handleEditorDidMount}
            options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        {/* Output Panel */}
        <div className="h-64 panel flex flex-col rounded-xl border border-surface-300 bg-surface-100 overflow-auto">
          <div className="panel-header justify-between sticky top-0 bg-surface-100 z-10 border-b border-surface-300">
            <span className="font-medium text-sm">Test Results</span>
            {output?.result?.verdict && renderVerdict(output.result.verdict.id, output.result.verdict.description)}
          </div>
          
          <div className="p-4 font-mono text-sm">
            {isRunning ? (
              <div className="text-gray-400 animate-pulse-slow">Executing against test cases...</div>
            ) : output ? (
              output.state === 'completed' ? (
                <div className="space-y-4">
                  <div className="text-lg font-bold mb-4">
                    {renderVerdict(output.result.verdict.id, output.result.verdict.description)}
                  </div>
                  <div className="space-y-2">
                    {output.result.test_case_results.map((tc, idx) => (
                      <div key={idx} className="bg-surface-200 p-3 rounded border border-surface-300">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Test Case #{idx + 1}</span>
                          {renderVerdict(tc.status.id, tc.status.description)}
                        </div>
                        {tc.status.id !== 3 && (
                          <div className="mt-2 text-xs text-red-400">
                            <pre className="bg-surface-100 p-2 rounded whitespace-pre-wrap">{tc.message || tc.stderr || tc.stdout || tc.compile_output}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 pt-2 border-t border-surface-300">
                    Max Runtime: {output.result.time}s | Max Memory: {output.result.memory} KB
                  </div>
                </div>
              ) : (
                <div className="text-red-400">Error: {output.error}</div>
              )
            ) : (
              <div className="text-gray-500 italic flex items-center justify-center h-full">
                Run code to see test case results.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
