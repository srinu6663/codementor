import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const LANGUAGES = [
  { id: 71, name: 'Python (3.8.1)', value: 'python', defaultCode: 'def twoSum(nums, target):\n    # Write your code here\n    pass' },
  { id: 63, name: 'JavaScript (Node.js 12)', value: 'javascript', defaultCode: 'function twoSum(nums, target) {\n    // Write your code here\n}' },
  { id: 62, name: 'Java (OpenJDK 13)', value: 'java', defaultCode: 'public class Main {\n  public static void main(String[] args) {\n    // Handle input and call logic\n  }\n}' },
  { id: 54, name: 'C++ (GCC 9)', value: 'cpp', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n  // Handle input\n  return 0;\n}' }
];

export default function EditorPage() {
  const [problems, setProblems] = useState([]);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const editorRef = useRef(null);

  // Fetch problems on mount
  useEffect(() => {
    axios.get('/api/problems').then(res => {
      if (res.data.success && res.data.data.length > 0) {
        setProblems(res.data.data);
        setSelectedProblemId(res.data.data[0].id);
      }
    }).catch(err => console.error("Failed to load problems", err));
  }, []);

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
        // Poll again in 1 second
        setTimeout(() => pollJobStatus(jobId), 1000);
      }
    } catch (err) {
      console.error(err);
      setIsRunning(false);
      setOutput({ state: 'error', error: 'Failed to poll status' });
    }
  };

  const runCode = async () => {
    if (!selectedProblemId) return alert("Please select a problem first");
    
    setIsRunning(true);
    setOutput(null);
    setJobProgress(0);

    try {
      const response = await axios.post('/api/submit', {
        source_code: code,
        language_id: selectedLang.id,
        problem_id: selectedProblemId
      });

      if (response.data.success) {
        // Start polling
        pollJobStatus(response.data.jobId);
      } else {
        setIsRunning(false);
        setOutput({ state: 'error', error: response.data.error });
      }
    } catch (error) {
      console.error("Error queueing job:", error);
      setIsRunning(false);
      setOutput({
        state: 'error',
        error: error.response?.data?.error || "Failed to connect to server"
      });
    }
  };

  const renderVerdict = (statusId, description) => {
    if (!description) return null;
    if (statusId === 3) return <span className="badge-accepted">{description}</span>;
    if (statusId === 4) return <span className="badge-wrong">{description}</span>;
    if (statusId === 5) return <span className="badge-tle">{description}</span>;
    return <span className="badge-error">{description}</span>;
  };

  return (
    <div className="h-screen flex flex-col p-4 gap-4">
      
      <header className="flex justify-between items-center bg-surface-100 p-4 rounded-xl border border-surface-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent-blue flex items-center justify-center font-bold text-lg">C</div>
          <h1 className="font-semibold text-lg tracking-wide">CodeMentor Auto-Judge</h1>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedProblemId} 
            onChange={(e) => setSelectedProblemId(e.target.value)}
            className="bg-surface-200 border border-surface-400 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent-blue"
          >
            {problems.length === 0 ? <option value="">Loading problems...</option> : null}
            {problems.map(p => (
              <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>
            ))}
          </select>

          <select 
            value={selectedLang.id} 
            onChange={handleLanguageChange}
            className="bg-surface-200 border border-surface-400 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent-blue"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
          <button 
            onClick={runCode} 
            disabled={isRunning}
            className="btn-success min-w-[120px] justify-center"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {jobProgress}%
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Submit Code
              </>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-[2] panel flex flex-col">
          <div className="panel-header">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            <span className="font-medium text-sm">Editor</span>
          </div>
          <div className="flex-1">
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
        </div>

        <div className="flex-1 panel flex flex-col">
          <div className="panel-header justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              <span className="font-medium text-sm">Verdict</span>
            </div>
            {output?.result?.verdict && renderVerdict(output.result.verdict.id, output.result.verdict.description)}
          </div>
          
          <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-sm overflow-auto">
            {isRunning ? (
              <div className="text-gray-400 animate-pulse-slow">Queueing job and running test cases... ({jobProgress}%)</div>
            ) : output ? (
              output.state === 'completed' ? (
                <div className="space-y-4">
                  <div className="text-lg font-bold text-white mb-4">
                    Final Verdict: {renderVerdict(output.result.verdict.id, output.result.verdict.description)}
                  </div>

                  <div className="text-gray-400 mb-2 font-semibold tracking-wider text-xs uppercase">Test Cases:</div>
                  <div className="space-y-2">
                    {output.result.test_case_results.map((tc, idx) => (
                      <div key={idx} className="bg-surface-200 p-3 rounded border border-surface-300">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Test Case #{idx + 1}</span>
                          {renderVerdict(tc.status.id, tc.status.description)}
                        </div>
                        {tc.status.id !== 3 && (
                          <div className="mt-2 text-xs">
                            <div className="text-red-400 mb-1">Error/Output:</div>
                            <pre className="bg-surface-100 p-2 rounded">{tc.message || tc.stderr || tc.stdout || tc.compile_output}</pre>
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500 flex gap-4">
                          <span>Time: {tc.time || 0}s</span>
                          <span>Memory: {tc.memory || 0} KB</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-surface-300/50 flex gap-6 text-xs text-gray-400">
                    <div>Max Runtime: {output.result.time}s</div>
                    <div>Max Memory: {output.result.memory} KB</div>
                  </div>
                </div>
              ) : (
                <div className="text-red-400">
                  <div className="font-semibold mb-2">Queue / Execution Error</div>
                  <pre className="whitespace-pre-wrap">{output.error}</pre>
                </div>
              )
            ) : (
              <div className="text-gray-500 italic h-full flex items-center justify-center">
                Submit your code to see the test case results here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
