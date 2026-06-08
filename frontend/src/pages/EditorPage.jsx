import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const LANGUAGES = [
  { id: 71, name: 'Python (3.8.1)', value: 'python', defaultCode: 'print("Hello from CodeMentor!")' },
  { id: 63, name: 'JavaScript (Node.js 12)', value: 'javascript', defaultCode: 'console.log("Hello from CodeMentor!");' },
  { id: 62, name: 'Java (OpenJDK 13)', value: 'java', defaultCode: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from CodeMentor!");\n  }\n}' },
  { id: 54, name: 'C++ (GCC 9)', value: 'cpp', defaultCode: '#include <iostream>\n\nint main() {\n  std::cout << "Hello from CodeMentor!\\n";\n  return 0;\n}' },
  { id: 50, name: 'C (GCC 9)', value: 'c', defaultCode: '#include <stdio.h>\n\nint main() {\n  printf("Hello from CodeMentor!\\n");\n  return 0;\n}' }
];

export default function EditorPage() {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef(null);

  const handleLanguageChange = (e) => {
    const lang = LANGUAGES.find(l => l.id === parseInt(e.target.value));
    setSelectedLang(lang);
    setCode(lang.defaultCode);
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput(null);

    try {
      // POST to our backend /api/submit endpoint
      const response = await axios.post('/api/submit', {
        source_code: code,
        language_id: selectedLang.id
      });

      setOutput(response.data);
    } catch (error) {
      console.error("Error running code:", error);
      setOutput({
        success: false,
        error: error.response?.data?.error || "Failed to connect to server",
        details: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Helper to render verdict badge
  const renderVerdict = (statusId, description) => {
    if (!description) return null;
    if (statusId === 3) return <span className="badge-accepted">{description}</span>;
    if (statusId === 4) return <span className="badge-wrong">{description}</span>;
    if (statusId === 5) return <span className="badge-tle">{description}</span>;
    return <span className="badge-error">{description}</span>;
  };

  return (
    <div className="h-screen flex flex-col p-4 gap-4">
      
      {/* Header / Navbar area */}
      <header className="flex justify-between items-center bg-surface-100 p-4 rounded-xl border border-surface-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent-blue flex items-center justify-center font-bold text-lg">C</div>
          <h1 className="font-semibold text-lg tracking-wide">CodeMentor</h1>
        </div>
        <div className="flex items-center gap-4">
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
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Run Code
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex gap-4 min-h-0">
        
        {/* Editor Panel */}
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
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth"
              }}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 panel flex flex-col">
          <div className="panel-header justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span className="font-medium text-sm">Output</span>
            </div>
            {output?.data?.status && renderVerdict(output.data.status.id, output.data.status.description)}
          </div>
          <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-sm overflow-auto">
            {isRunning ? (
              <div className="text-gray-400 animate-pulse-slow">Executing on Judge0...</div>
            ) : output ? (
              output.success ? (
                <div className="space-y-4">
                  {output.data.compile_output && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Compiler Output:</div>
                      <pre className="text-yellow-400 whitespace-pre-wrap">{output.data.compile_output}</pre>
                    </div>
                  )}
                  {output.data.stdout && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Standard Output:</div>
                      <pre className="text-gray-300 whitespace-pre-wrap">{output.data.stdout}</pre>
                    </div>
                  )}
                  {output.data.stderr && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Standard Error:</div>
                      <pre className="text-red-400 whitespace-pre-wrap">{output.data.stderr}</pre>
                    </div>
                  )}
                  {output.data.message && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Message:</div>
                      <pre className="text-orange-400 whitespace-pre-wrap">{output.data.message}</pre>
                    </div>
                  )}
                  
                  {/* Performance metrics */}
                  <div className="mt-6 pt-4 border-t border-surface-300/50 flex gap-6 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {output.data.time}s
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                      {output.data.memory} KB
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-red-400">
                  <div className="font-semibold mb-2">Execution Error</div>
                  <pre className="whitespace-pre-wrap">{output.error || JSON.stringify(output, null, 2)}</pre>
                </div>
              )
            ) : (
              <div className="text-gray-500 italic h-full flex items-center justify-center">
                Run your code to see the output here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
