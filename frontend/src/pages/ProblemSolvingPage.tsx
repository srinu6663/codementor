import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { io, type Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import api from '../lib/api';
import DOMPurify from 'dompurify';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { VerdictBanner, type WorkspaceStatus } from '../components/problem/VerdictBanner';
import { VerdictBadge } from '../components/problem/VerdictBadge';
import { AITutorSidebar } from '../components/problem/AITutorSidebar';
import { MarkdownRenderer } from '../components/problem/MarkdownRenderer';
import { CodeReviewPanel } from '../components/problem/CodeReviewPanel';
import { ProblemListPanel } from '../components/problem/ProblemListPanel';
import { useProctor } from '../hooks/useProctor';
import {
  Code, ChevronLeft, ChevronRight, ChevronDown, Bot, List, Terminal, ChevronUp,
  Play, RotateCcw, RefreshCw, Settings, Lightbulb, Lock, FileText, CheckCircle2, MessageSquare,
  Cpu, Timer, X, BookOpen, Sparkles, ShieldAlert, Maximize, Users, ArrowRight, XCircle, WifiOff
} from 'lucide-react';

const LANGUAGES = [
  { id: 71, name: 'Python',     monacoLang: 'python',     defaultCode: 'class Solution:\n    def solve(self, s: str) -> int:\n        pass\n' },
  { id: 63, name: 'JavaScript', monacoLang: 'javascript', defaultCode: 'var solve = function(s) {\n    \n};\n' },
  { id: 62, name: 'Java',       monacoLang: 'java',        defaultCode: 'class Solution {\n    public int solve(String s) {\n        \n    }\n}\n' },
  { id: 54, name: 'C++',        monacoLang: 'cpp',         defaultCode: 'class Solution {\npublic:\n    int solve(string s) {\n        \n    }\n};\n' },
];

const LANG_KEY  = 'codesphere:editor-language';
const FONT_KEY  = 'codesphere:editor-fontsize';
const codeKey = (problemId: string, langName: string) =>
  `codesphere:code:${problemId}:${langName}`;

// ── Live Python syntax checker ────────────────────────────────────────────────
// Detects missing colons and indentation issues while typing.
function getPythonMarkers(code: string): any[] {
  const markers: any[] = [];
  const lines = code.split('\n');
  let expectIndent = false;
  let baseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.trimStart();
    if (!stripped || stripped.startsWith('#')) continue;

    const indent = raw.length - stripped.length;

    // Line after a colon must be indented more
    if (expectIndent && indent <= baseIndent) {
      markers.push({
        severity: 8,
        startLineNumber: i + 1, endLineNumber: i + 1,
        startColumn: indent + 1, endColumn: stripped.length + indent + 1,
        message: 'IndentationError: expected an indented block',
      });
      expectIndent = false;
    }

    // Compound keywords must end with ':'
    const kw = stripped.match(/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/);
    if (kw) {
      const noComment = stripped.split('#')[0].trimEnd();
      const openParens = (noComment.match(/\(/g) || []).length - (noComment.match(/\)/g) || []).length;
      const endsColon = noComment.endsWith(':');
      const cont = noComment.endsWith('\\');
      if (!endsColon && !cont && openParens === 0 && noComment.length > kw[1].length + 1) {
        markers.push({
          severity: 8,
          startLineNumber: i + 1, endLineNumber: i + 1,
          startColumn: indent + 1, endColumn: raw.length + 1,
          message: `SyntaxError: expected ':' after '${kw[1]}' statement`,
        });
      }
      if (endsColon) { expectIndent = true; baseIndent = indent; }
      else { expectIndent = false; }
    } else {
      expectIndent = false;
    }
  }
  return markers;
}

// ── Parse Judge0 compile/runtime output → Monaco markers ─────────────────────
function parseJudge0Markers(output: string, lang: string): any[] {
  const markers: any[] = [];
  if (!output) return markers;

  if (lang === 'Python') {
    const lineM = output.match(/line (\d+)/);
    const errM  = output.match(/(SyntaxError|IndentationError|NameError|TypeError|ValueError|AttributeError|ImportError|ZeroDivisionError|RuntimeError)[:\s]*(.*)/);
    if (lineM) {
      markers.push({
        severity: 8,
        startLineNumber: +lineM[1], endLineNumber: +lineM[1],
        startColumn: 1, endColumn: 1000,
        message: errM ? `${errM[1]}: ${errM[2].trim()}` : output.split('\n').slice(-2)[0]?.trim() || 'Python error',
      });
    }
  } else if (lang === 'C++') {
    const re = /[^\n:]*:(\d+):(\d+):\s*(?:fatal\s+)?error:\s*(.+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(output)) !== null) {
      markers.push({
        severity: 8,
        startLineNumber: +m[1], endLineNumber: +m[1],
        startColumn: +m[2], endColumn: +m[2] + 1,
        message: m[3].trim(),
      });
    }
  } else if (lang === 'Java') {
    const re = /[^\n:]*:(\d+):\s*error:\s*(.+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(output)) !== null) {
      markers.push({
        severity: 8,
        startLineNumber: +m[1], endLineNumber: +m[1],
        startColumn: 1, endColumn: 1000,
        message: m[2].trim(),
      });
    }
  } else if (lang === 'JavaScript') {
    const m = output.match(/:(\d+)/);
    if (m) {
      markers.push({
        severity: 8,
        startLineNumber: +m[1], endLineNumber: +m[1],
        startColumn: 1, endColumn: 1000,
        message: output.split('\n')[0]?.trim() || 'Runtime Error',
      });
    }
  }
  return markers;
}

export default function ProblemSolvingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignment');
  const contestId = searchParams.get('contest');
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === 'light' ? 'light' : 'vs-dark';

  // ── Proctored exam mode (enabled via ?proctor=1 on an assignment) ────────────
  const proctored = !!assignmentId && searchParams.get('proctor') === '1';
  const autoSubmitRef = useRef<() => void>(() => {});
  const proctor = useProctor({
    active: proctored,
    assignmentId,
    problemId: id,
    onAutoSubmit: () => autoSubmitRef.current(),
  });

  // ── Problem data ────────────────────────────────────────────────────────────
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked]   = useState(0);
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [pastSubmissions, setPastSubmissions] = useState<any[]>([]);
  const [adjacent, setAdjacent] = useState<{ prev: string | null; next: string | null; position: number; total: number }>({ prev: null, next: null, position: 0, total: 0 });

  // ── Editor state ────────────────────────────────────────────────────────────
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return LANGUAGES.find(l => l.name === saved) ?? LANGUAGES[0];
  });
  const [code, setCode] = useState(() => {
    // Will be properly loaded once id is available
    return language.defaultCode;
  });
  const [customInput, setCustomInput] = useState('');
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem(FONT_KEY)) || 14);
  const [vimMode, setVimMode]   = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── Workspace state ─────────────────────────────────────────────────────────
  const [status, setStatus]         = useState<WorkspaceStatus>('idle');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showAI, setShowAI]         = useState(false);
  const [tutorContext, setTutorContext] = useState<string | undefined>(undefined);
  const [leftTab, setLeftTab]       = useState('description');
  const [solved, setSolved]         = useState(false);
  const [reviewKey, setReviewKey]   = useState(0);
  const [explainData, setExplainData]       = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [community, setCommunity]           = useState<{ id: string; author: string; language: string; runtime: number | null; code: string }[]>([]);
  const [communityState, setCommunityState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [communityErr, setCommunityErr]     = useState<string | null>(null);
  
  const totalTests = problem?.test_cases_count || problem?.examples?.length || 5;
  const [progress, setProgress]     = useState({ current: 0, total: 5 });
  
  const [showProblemList, setShowProblemList] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState('cases');
  const [activeTestCase, setActiveTestCase]   = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(() => {
    const seg = window.location.pathname.match(/\/problems\/([^/]+)/);
    if (seg?.[1]) {
      const saved = localStorage.getItem(`codesphere:timer:${seg[1]}`);
      if (saved) return parseInt(saved, 10);
    }
    return 0;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [retryMsg, setRetryMsg]     = useState<string | null>(null);
  const [judgeError, setJudgeError] = useState<string | null>(null);

  // ── Verdict result data ─────────────────────────────────────────────────────
  const [verdictData, setVerdictData] = useState<{
    failingTest?: { input: string | null; expected: string | null; output: string; hidden: boolean } | null;
    errorOutput?: string | null;
    runtimeMs?: number | null;
    memoryMB?: number | null;
    testsPassed?: number;
    testsTotal?: number;
    testResults?: any[];
    consoleOutput?: string;
    score?: number | null;
    maxScore?: number | null;
    scoringMode?: string;
    verdictLabel?: string;
  }>({});

  // ── Socket.IO ────────────────────────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const currentJobRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && status !== 'accepted') {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, status]);

  // ── Persist editor prefs ────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(LANG_KEY, language.name); }, [language]);
  useEffect(() => { localStorage.setItem(FONT_KEY, String(fontSize)); }, [fontSize]);

  // ── Persist code per problem+language ────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem(codeKey(id, language.name));
    // Priority: saved code → problem stub → language default
    const stub = problem?.stubs?.[language.id];
    setCode(saved ?? stub ?? language.defaultCode);
  }, [id, language]);

  // ── Timer persistence per problem ────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`codesphere:timer:${id}`, String(timeElapsed));
  }, [timeElapsed, id]);

  const handleCodeChange = (val: string | undefined) => {
    const newCode = val || '';
    setCode(newCode);
    if (id) localStorage.setItem(codeKey(id, language.name), newCode);

    // Debounced live lint for Python (JS/TS is handled by Monaco's built-in TS worker)
    if (language.monacoLang === 'python' && editorRef.current && monacoRef.current) {
      if (lintTimer.current) clearTimeout(lintTimer.current);
      lintTimer.current = setTimeout(() => {
        const model = editorRef.current?.getModel();
        if (!model) return;
        monacoRef.current.editor.setModelMarkers(model, 'live-lint', getPythonMarkers(newCode));
      }, 350);
    }
  };

  // Peer code review — fetch other students' accepted solutions once the Community tab opens.
  useEffect(() => {
    if (leftTab === 'community' && communityState === 'idle' && id) {
      setCommunityState('loading');
      api.get(`/api/student/problems/${id}/solutions`)
        .then(r => { if (r.data?.success) { setCommunity(r.data.data); setCommunityState('loaded'); } })
        .catch(e => { setCommunityErr(e?.response?.data?.error || 'Failed to load solutions'); setCommunityState('error'); });
    }
  }, [leftTab, communityState, id]);

  // ── Load problem ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setUnlocked(0);
      try {
        const [probRes, subRes, adjRes] = await Promise.allSettled([
          api.get(`/api/problems/${id}`),
          api.get(`/api/submit/history/${id}`),
          api.get(`/api/problems/${id}/adjacent`),
        ]);
        if (probRes.status === 'fulfilled') {
          const prob = probRes.value.data.data || probRes.value.data;
          setProblem(prob);
          // If no saved code yet for this problem+language, use the problem's stub
          const saved = localStorage.getItem(codeKey(id, language.name));
          if (!saved) {
            const stub = prob?.stubs?.[language.id];
            if (stub) setCode(stub);
          }
        }
        if (subRes.status === 'fulfilled')  setPastSubmissions((subRes.value.data.data || []).slice(0, 10));
        if (adjRes.status === 'fulfilled')  setAdjacent(adjRes.value.data.data || { prev: null, next: null, position: 0, total: 0 });
      } catch (err) {
        console.error('Failed to load problem', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Monaco mount ─────────────────────────────────────────────────────────────
  const onRunRef    = useRef<() => void>(() => {});
  const onSubmitRef = useRef<() => void>(() => {});
  const editorRef   = useRef<any>(null);
  const monacoRef   = useRef<any>(null);
  const lintTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,        () => onRunRef.current());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => onSubmitRef.current());

    // Enable built-in JS/TS syntax + semantic validation
    if (language.monacoLang === 'javascript' || language.monacoLang === 'typescript') {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
    }
  };

  // Re-apply JS diagnostics when language changes; clear markers for other langs
  useEffect(() => {
    if (!monacoRef.current) return;
    const mc = monacoRef.current;
    if (language.monacoLang === 'javascript' || language.monacoLang === 'typescript') {
      mc.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
    }
    const model = editorRef.current?.getModel();
    if (model) {
      mc.editor.setModelMarkers(model, 'judge0', []);
      mc.editor.setModelMarkers(model, 'live-lint', []);
    }
  }, [language]);

  // Set Monaco error markers from Judge0 output whenever errorOutput changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const markers = verdictData.errorOutput
      ? parseJudge0Markers(verdictData.errorOutput, language.name)
      : [];
    monacoRef.current.editor.setModelMarkers(model, 'judge0', markers);
  }, [verdictData.errorOutput, language.name]);

  // ── Shared verdict handler ───────────────────────────────────────────────────
  const handleVerdictData = useCallback((jobResult: any, isCustomRun: boolean) => {
    if (isCustomRun) {
      setStatus('ran');
      const r = jobResult.test_case_results?.[0];
      setVerdictData({
        consoleOutput: r?.stdout || '(no output)',
        runtimeMs: jobResult.time ? Math.floor(jobResult.time * 1000) : null,
        memoryMB: jobResult.memory ? Number((jobResult.memory / 1024).toFixed(1)) : null,
      });
      return;
    }

    setProgress({ current: totalTests, total: totalTests });
    const verdictDesc = jobResult.verdict?.description || 'Error';
    const isOI = jobResult.scoring_mode === 'oi';
    const ws: WorkspaceStatus =
      verdictDesc === 'Accepted' ? 'accepted' :
      verdictDesc === 'Partial'  ? 'wrong'    :
      verdictDesc === 'Error'    ? 'error'     : 'wrong';
    setStatus(ws);

    // Auto-show console for compile/runtime errors so the trace is immediately visible
    const isCE = verdictDesc === 'Compilation Error';
    const isRE = verdictDesc?.includes('Runtime Error') || verdictDesc === 'Runtime Error (NZEC)' || verdictDesc === 'Runtime Error (SIGSEGV)' || verdictDesc === 'Runtime Error (SIGFPE)';
    if (isCE || isRE) setActiveOutputTab('console');

    const passedCount = jobResult.passed_count ?? jobResult.test_case_results?.filter((r: any) => r.status?.id === 3).length ?? 0;
    const totalCount  = jobResult.total_count  ?? jobResult.test_case_results?.length ?? totalTests;

    // First failing test result (drives both the failed-test hint and explain-error).
    const results = jobResult.test_case_results || [];
    const firstFail = results.find((r: any) => r.passed === false || r.status?.id !== 3);
    const errorOutput = firstFail
      ? (firstFail.compile_output || firstFail.stderr || null)
      : null;
    const failingTest = (ws !== 'accepted' && firstFail)
      ? {
          input:    firstFail.input ?? null,
          expected: firstFail.expected ?? null,
          output:   firstFail.stdout ?? '',
          hidden:   firstFail.is_public === false,
        }
      : null;

    setVerdictData({
      failingTest,
      errorOutput,
      verdictLabel:  verdictDesc,
      runtimeMs:     jobResult.time   ? Math.floor(jobResult.time * 1000)              : null,
      memoryMB:      jobResult.memory ? Number((jobResult.memory / 1024).toFixed(1))   : null,
      testsPassed:   passedCount,
      testsTotal:    totalCount,
      testResults:   results.map((tc: any) => ({ pass: tc.status?.id === 3, expected: tc.expected ?? '', got: tc.stdout })),
      consoleOutput: results.map((tc: any) => tc.stdout).join('\n') || '',
      score:         isOI ? jobResult.score    : null,
      maxScore:      isOI ? jobResult.max_score : null,
      scoringMode:   jobResult.scoring_mode,
    });

    if (ws === 'accepted') {
      setPastSubmissions(prev => [{
        id: Date.now(),
        verdict: 'AC',
        language: language.name,
        runtime: jobResult.time ? `${Math.floor(jobResult.time * 1000)} ms` : '—',
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 9)]);
      setSolved(true);
      setReviewKey(k => k + 1);
    }
  }, [language, totalTests]);

  // ── Submit / Run ─────────────────────────────────────────────────────────────
  const executeCode = useCallback(async (isSubmit: boolean) => {
    // Leave previous job room
    if (currentJobRef.current && socketRef.current) {
      socketRef.current.emit('leave', currentJobRef.current);
      socketRef.current.off('verdict');
      currentJobRef.current = null;
    }

    setStatus('judging');
    setRetryMsg(null);
    setJudgeError(null);
    setDrawerOpen(true);
    setActiveOutputTab('cases');
    setProgress({ current: 0, total: totalTests });
    setVerdictData({});
    setExplainData(null);

    // Clear stale error markers from the previous run
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) monacoRef.current.editor.setModelMarkers(model, 'judge0', []);
    }

    let animId: ReturnType<typeof setInterval>;
    let n = 0;
    animId = setInterval(() => {
      n = Math.min(n + 1, totalTests - 1);
      setProgress({ current: n, total: totalTests });
    }, 200);

    const timeoutId = setTimeout(() => {
      clearInterval(animId);
      setJudgeError('Execution timed out. The judge might be offline.');
      setStatus('error');
    }, 30000);

    try {
      const submitRes = await api.post('/api/submit', {
        problem_id: id,
        language_id: language.id,
        source_code: code,
        submit: isSubmit,
        ...(assignmentId ? { assignment_id: assignmentId } : {}),
        ...(contestId ? { contest_id: contestId } : {}),
      });

      // IP restricted — exam network enforcement
      if (submitRes.status === 403 && submitRes.data?.ip_restricted) {
        clearInterval(animId);
        clearTimeout(timeoutId);
        setStatus('error');
        setRetryMsg('Your IP is not allowed for this exam. Connect to the exam network.');
        return;
      }

      // Queue is full — show friendly message, auto-retry once after 3 s
      if (submitRes.status === 503 || submitRes.data?.queue_full) {
        clearInterval(animId);
        clearTimeout(timeoutId);
        setRetryMsg('Server is busy — retrying in 3 s…');
        setTimeout(() => executeCode(isSubmit), 3000);
        return;
      }

      const jobId = submitRes.data?.jobId || submitRes.data?.data?.jobId;
      if (!jobId) throw new Error('No jobId returned');

      currentJobRef.current = jobId;
      socketRef.current?.emit('join', jobId);

      // Show retry message if Judge0 queue is full inside the worker
      socketRef.current?.on('judging_retry', (data: { attempt: number; maxAttempts: number }) => {
        setRetryMsg(`Judge queue busy — retrying (${data.attempt}/${data.maxAttempts})…`);
      });

      socketRef.current?.once('verdict', (data: any) => {
        clearInterval(animId);
        clearTimeout(timeoutId);
        setRetryMsg(null);
        socketRef.current?.off('judging_retry');
        if (data?.state === 'completed' && data?.result) {
          handleVerdictData(data.result, false);
        } else {
          setJudgeError(data?.error || 'Execution failed on the judge server.');
          setStatus('error');
        }
      });
    } catch (err: any) {
      clearInterval(animId);
      clearTimeout(timeoutId);
      setJudgeError(err?.response?.data?.error || err.message);
      setStatus('error');
    }
  }, [id, language, code, handleVerdictData, totalTests, assignmentId, contestId]);

  const handleRun    = useCallback(() => executeCode(false), [executeCode]);
  const handleSubmit = useCallback(() => executeCode(true),  [executeCode]);
  autoSubmitRef.current = handleSubmit;

  const handleRunCustom = useCallback(async () => {
    if (!customInput.trim()) return;

    if (currentJobRef.current && socketRef.current) {
      socketRef.current.emit('leave', currentJobRef.current);
      socketRef.current.off('verdict');
      currentJobRef.current = null;
    }

    setStatus('judging');
    setDrawerOpen(true);
    setActiveOutputTab('console');
    setVerdictData({});
    setJudgeError(null);

    const timeoutId = setTimeout(() => {
      setJudgeError('Execution timed out. The judge might be offline.');
      setStatus('error');
    }, 30000);

    try {
      const submitRes = await api.post('/api/submit', {
        problem_id: id,
        language_id: language.id,
        source_code: code,
        custom_input: customInput,
      });

      const jobId = submitRes.data?.jobId;
      if (!jobId) throw new Error('No jobId');

      currentJobRef.current = jobId;
      socketRef.current?.emit('join', jobId);
      socketRef.current?.once('verdict', (data: any) => {
        clearTimeout(timeoutId);
        if (data?.state === 'completed' && data?.result) {
          handleVerdictData(data.result, true);
        } else {
          setJudgeError(data?.error || 'Execution failed on the judge server.');
          setStatus('error');
        }
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      setJudgeError(err?.response?.data?.error || err.message);
      setStatus('error');
    }
  }, [id, language, code, customInput, handleVerdictData]);

  onRunRef.current    = handleRun;
  onSubmitRef.current = handleSubmit;

  // ── Keyboard shortcut ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) handleSubmit(); else handleRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRun, handleSubmit]);

  const isJudging = status === 'judging';
  const drawerStatus: 'idle' | 'judging' | 'success' | 'error' =
    isJudging ? 'judging' :
    (status === 'ran' || status === 'accepted' || status === 'wrong') ? 'success' : 'idle';

  const handleExplainError = useCallback(async () => {
    if (!verdictData.errorOutput) return;
    setExplainLoading(true);
    setExplainData(null);
    try {
      const res = await api.post('/api/ai/explain-error', {
        problemDescription: problem?.description || problem?.title || 'Coding problem',
        code,
        errorTrace: verdictData.errorOutput,
      }, { timeout: 20000 });
      setExplainData(res.data?.explanation || res.data?.data?.explanation || 'No explanation returned.');
    } catch {
      setExplainData('Could not generate an explanation right now. Please try again.');
    } finally {
      setExplainLoading(false);
    }
  }, [verdictData.errorOutput, problem, code]);

  const difficultyColor = (d: string) =>
    d?.toLowerCase() === 'easy'   ? 'var(--success)' :
    d?.toLowerCase() === 'medium' ? 'var(--warning)' :
    d?.toLowerCase() === 'hard'   ? 'var(--destructive)' : 'var(--muted-foreground)';

  const HINTS = problem?.hints || [
    "Try a brute-force approach first and analyze its complexity.",
    "Consider using a hash map to speed up lookups.",
    "Think about what invariant you can maintain as you scan the array.",
  ];

  const visibleTestCases = (problem?.examples || []).slice(0, 2);
  const testResults = verdictData.testResults || [];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden font-['Inter']">

      {/* ── Proctored exam banner ───────────────────────────────────────────── */}
      {proctored && (
        <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-sm flex-shrink-0">
          <ShieldAlert className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-foreground font-medium">Proctored Exam</span>
          <span className="text-muted-foreground">· {proctor.violations} flag{proctor.violations === 1 ? '' : 's'} recorded · stay in fullscreen, don't switch tabs</span>
          {!proctor.fullscreen && (
            <button
              onClick={proctor.requestFullscreen}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-destructive text-white text-xs font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              <Maximize className="w-3.5 h-3.5" /> Enter fullscreen
            </button>
          )}
        </div>
      )}
      {proctored && proctor.warning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-warning/15 border-b border-warning/30 text-sm text-warning flex-shrink-0">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{proctor.warning}</span>
          <button onClick={proctor.dismissWarning} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="h-12 bg-card border-b border-border flex items-center px-3 gap-2 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" onClick={() => navigate('/')}>
          <div className="w-6 h-6 bg-brand flex items-center justify-center flex-shrink-0">
            <Code className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-foreground text-sm font-semibold hidden lg:inline">CodeMentor</span>
        </div>

        <div className="h-4 w-px bg-border flex-shrink-0" />

        {/* Problem nav */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setShowProblemList(true)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs transition-colors px-2 py-1.5 rounded-md hover:bg-secondary"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Problem List</span>
          </button>
          <button
            disabled={!adjacent.prev}
            onClick={() => adjacent.prev && navigate(`/app/problems/${adjacent.prev}`)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            title="Previous problem"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!adjacent.next}
            onClick={() => adjacent.next && navigate(`/app/problems/${adjacent.next}`)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            title="Next problem"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Run + Submit — center of nav */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRun}
            disabled={isJudging || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border text-foreground text-sm font-medium hover:bg-secondary/80 hover:border-muted-foreground transition-colors disabled:opacity-50 rounded-md"
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </button>
          <button
            onClick={handleSubmit}
            disabled={isJudging || loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-success text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 rounded-md"
          >
            {isJudging
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Judging…</>
              : 'Submit'
            }
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Right controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground text-sm font-mono select-none">
            <Timer className="w-3.5 h-3.5" />
            <span>{String(Math.floor(timeElapsed / 60)).padStart(2, '0')}:{String(timeElapsed % 60).padStart(2, '0')}</span>
          </div>
          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-colors ${
              showAI ? 'bg-purple/15 text-purple' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">AI Tutor</span>
          </button>
        </div>
      </div>

{/* Floating banner removed — verdict is shown inline in the output drawer */}

      {/* ── Workspace ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">

          {/* ── LEFT: Problem panel ─────────────────────────────────────────── */}
          <ResizablePanel defaultSize={40} minSize={24} className="overflow-hidden">
            <div className="h-full bg-background text-foreground flex flex-col">
              <TabsPrimitive.Root value={leftTab} onValueChange={setLeftTab} className="h-full flex flex-col">
                <TabsPrimitive.List className="flex border-b border-border px-2 gap-0 flex-shrink-0 overflow-x-auto">
                  {([
                    { value: 'description', label: 'Description' },
                    { value: 'submissions', label: 'Submissions' },
                    ...(solved ? [{ value: 'review', label: 'Review' }] : []),
                    ...(solved ? [{ value: 'community', label: 'Solutions' }] : []),
                    ...(problem?.editorial_unlocked ? [{ value: 'editorial', label: 'Editorial' }] : []),
                  ] as { value: string; label: string }[]).map(tab => (
                    <TabsPrimitive.Trigger
                      key={tab.value}
                      value={tab.value}
                      className="py-3 px-3 border-b-2 border-transparent data-[state=active]:border-brand text-muted-foreground data-[state=active]:text-foreground transition-colors text-sm font-medium outline-none whitespace-nowrap"
                    >
                      {tab.label}
                    </TabsPrimitive.Trigger>
                  ))}
                </TabsPrimitive.List>

                {/* DESCRIPTION */}
                <TabsPrimitive.Content value="description" className="flex-1 overflow-auto p-6 outline-none">
                  {loading ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-7 bg-card rounded w-3/4" />
                      <div className="h-4 bg-card rounded w-1/3" />
                      <div className="h-24 bg-card rounded" />
                    </div>
                  ) : problem ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h1 className="text-2xl font-semibold">{problem.title}</h1>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold border"
                            style={{ color: difficultyColor(problem.difficulty), borderColor: `${difficultyColor(problem.difficulty)}40`, backgroundColor: `${difficultyColor(problem.difficulty)}12` }}
                          >
                            {problem.difficulty}
                          </span>
                        </div>
                        {problem.tags && (
                          <div className="flex flex-wrap gap-2">
                            {problem.tags.map((t: string) => (
                              <span key={t} className="bg-secondary border border-border text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <MarkdownRenderer content={problem?.description || problem?.statement || ''} />

                      {(problem.examples || []).map((ex: any, i: number) => (
                        <div key={i} className="space-y-3">
                          <h3 className="text-sm font-semibold">Example {i + 1}</h3>
                          <div className="bg-card border border-border rounded-xl p-4 space-y-1.5 text-sm font-['JetBrains_Mono']">
                            <div><span className="text-muted-foreground">Input: </span><span className="text-foreground">{ex.input}</span></div>
                            <div><span className="text-muted-foreground">Output: </span><span className="text-foreground">{ex.output}</span></div>
                            {ex.explanation && <div className="font-['Inter'] text-muted-foreground">{ex.explanation}</div>}
                          </div>
                        </div>
                      ))}

                      {problem.constraints && (
                        <div className="border border-border overflow-hidden">
                          <button
                            onClick={() => setConstraintsOpen(o => !o)}
                            className="w-full flex items-center justify-between p-4 hover:bg-card transition-colors text-sm font-medium outline-none"
                          >
                            <span>Constraints</span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${constraintsOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {constraintsOpen && (
                            <div
                              className="px-4 pb-4 pt-1 text-sm text-foreground whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(problem.constraints) }}
                            />
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Lightbulb className="w-4 h-4 text-warning" />
                          Hints
                          <span className="text-xs text-muted-foreground font-normal">({unlocked} of {HINTS.length} unlocked)</span>
                        </div>
                        {HINTS.map((hint: string, i: number) => {
                          const isUnlocked = i < unlocked;
                          const isNext = i === unlocked;
                          if (isUnlocked) return (
                            <div key={i} className="border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
                              <div className="text-xs font-semibold text-warning mb-1.5 uppercase tracking-wider">Hint {i + 1}</div>
                              {hint}
                            </div>
                          );
                          return (
                            <button
                              key={i}
                              disabled={!isNext}
                              onClick={() => setUnlocked(u => u + 1)}
                              className={`w-full flex items-center gap-2.5 border p-4 text-sm font-medium transition-colors outline-none ${isNext ? 'border-border text-foreground hover:bg-card hover:border-muted-foreground cursor-pointer' : 'border-border/50 text-muted-foreground cursor-not-allowed'}`}
                            >
                              <Lock className="w-4 h-4 flex-shrink-0" />
                              Unlock hint {i + 1} of {HINTS.length}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">Problem not found.</div>
                  )}
                </TabsPrimitive.Content>

                {/* SUBMISSIONS */}
                <TabsPrimitive.Content value="submissions" className="flex-1 overflow-auto p-6 outline-none">
                  {pastSubmissions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16 px-6">
                      <div className="w-14 h-14 bg-card border border-border flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-foreground text-base font-semibold mb-1.5">No submissions yet</h3>
                      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">Run and submit your solution — your attempts will show up here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pastSubmissions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between border border-border bg-card p-3.5 hover:border-muted-foreground transition-colors">
                          <div className="flex items-center gap-3">
                            <VerdictBadge verdict={s.verdict} />
                            <span className="text-sm text-muted-foreground font-mono">{s.language}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                            <span>{s.runtime || '—'}</span>
                            <span>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsPrimitive.Content>

                {/* AI TUTOR tab */}
                <TabsPrimitive.Content value="ai" className="flex-1 overflow-auto p-6 outline-none">
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 px-6">
                    <div className="w-14 h-14 bg-card border border-border flex items-center justify-center mb-4">
                      <Bot className="w-6 h-6 text-purple" />
                    </div>
                    <h3 className="text-foreground text-base font-semibold mb-1.5">Your AI Tutor lives in the side panel</h3>
                    <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">The tutor guides you with questions instead of handing over the answer.</p>
                    <button
                      onClick={() => setShowAI(true)}
                      className="mt-5 px-4 py-2 bg-purple text-white text-sm font-medium hover:bg-purple transition-colors"
                    >
                      Open AI Tutor
                    </button>
                  </div>
                </TabsPrimitive.Content>

                {/* DISCUSSION */}
                <TabsPrimitive.Content value="discussion" className="flex-1 overflow-auto p-6 outline-none">
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 px-6">
                    <div className="w-14 h-14 bg-card border border-border flex items-center justify-center mb-4">
                      <MessageSquare className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-foreground text-base font-semibold mb-1.5">No discussions yet</h3>
                    <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">Be the first to share your approach once you've solved it.</p>
                  </div>
                </TabsPrimitive.Content>

                {/* REVIEW */}
                {solved && (
                  <TabsPrimitive.Content value="review" className="flex-1 overflow-auto outline-none">
                    <CodeReviewPanel
                      code={code}
                      problemTitle={problem?.title}
                      problemDescription={problem?.description}
                      language={language.name}
                      reviewKey={reviewKey}
                    />
                  </TabsPrimitive.Content>
                )}

                {/* COMMUNITY (peer solutions, unlocked after solving) */}
                {solved && (
                  <TabsPrimitive.Content value="community" className="flex-1 overflow-auto p-5 outline-none">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-4 h-4 text-brand" />
                      <h3 className="text-foreground font-semibold">Community Solutions</h3>
                    </div>
                    {communityState === 'loading' && (
                      <div className="flex justify-center py-10"><RefreshCw className="w-5 h-5 text-brand animate-spin" /></div>
                    )}
                    {communityState === 'error' && (
                      <p className="text-sm text-muted-foreground">{communityErr}</p>
                    )}
                    {communityState === 'loaded' && community.length === 0 && (
                      <p className="text-sm text-muted-foreground">No other accepted solutions yet — yours may be the first!</p>
                    )}
                    {communityState === 'loaded' && community.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">Learn from how your peers approached this — fastest solutions first.</p>
                        {community.map((s, i) => (
                          <div key={s.id} className="border border-border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border text-xs">
                              <span className="text-foreground font-medium">#{i + 1} · {s.author}</span>
                              <span className="text-muted-foreground font-mono">{s.language}{s.runtime != null ? ` · ${s.runtime} ms` : ''}</span>
                            </div>
                            <pre className="p-3 text-xs font-mono text-foreground bg-background overflow-x-auto whitespace-pre">{s.code}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsPrimitive.Content>
                )}

                {/* EDITORIAL */}
                {problem?.editorial_unlocked && (
                  <TabsPrimitive.Content value="editorial" className="flex-1 overflow-auto p-6 outline-none">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-4 h-4 text-link" />
                      <h3 className="text-foreground font-semibold">Editorial</h3>
                    </div>
                    <MarkdownRenderer content={problem.editorial || ''} />
                  </TabsPrimitive.Content>
                )}
              </TabsPrimitive.Root>
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border w-px hover:bg-brand data-[resize-handle-state=drag]:bg-brand transition-colors" />

          {/* ── RIGHT: Editor + Output ─────────────────────────────────────── */}
          <ResizablePanel defaultSize={60} minSize={40} className="overflow-hidden relative">
            <ResizablePanelGroup direction="vertical">

              {/* Editor */}
              <ResizablePanel defaultSize={drawerOpen ? 64 : 100} minSize={30} className="overflow-hidden">
                <div className="h-full flex flex-col bg-white dark:bg-[#1e1e1e]">
                  {/* Editor toolbar */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-card border-b border-border gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Language Select */}
                      <SelectPrimitive.Root
                        value={language.name}
                        onValueChange={(val) => {
                          const lang = LANGUAGES.find(l => l.name === val)!;
                          setLanguage(lang);
                          const saved = id ? localStorage.getItem(codeKey(id, lang.name)) : null;
                          const stub = problem?.stubs?.[lang.id];
                          setCode(saved ?? stub ?? lang.defaultCode);
                        }}
                      >
                        <SelectPrimitive.Trigger className="flex items-center justify-between gap-1.5 px-2.5 py-1 bg-secondary border border-border hover:border-muted-foreground transition-colors min-w-[110px] text-sm text-foreground outline-none rounded-md">
                          <SelectPrimitive.Value />
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </SelectPrimitive.Trigger>
                        <SelectPrimitive.Portal>
                          <SelectPrimitive.Content className="bg-card border border-border overflow-hidden z-50">
                            <SelectPrimitive.Viewport className="p-1">
                              {LANGUAGES.map(l => (
                                <SelectPrimitive.Item key={l.name} value={l.name} className="px-3 py-2 text-sm text-foreground data-[highlighted]:bg-brand cursor-pointer outline-none transition-colors">
                                  <SelectPrimitive.ItemText>{l.name}</SelectPrimitive.ItemText>
                                </SelectPrimitive.Item>
                              ))}
                            </SelectPrimitive.Viewport>
                          </SelectPrimitive.Content>
                        </SelectPrimitive.Portal>
                      </SelectPrimitive.Root>

                      {/* Settings */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Editor settings">
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-60 p-3 space-y-4 bg-card border-border">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Font size</div>
                            <div className="flex items-center gap-1">
                              {[12, 14, 16, 18].map(s => (
                                <button
                                  key={s}
                                  onClick={() => setFontSize(s)}
                                  className={`flex-1 py-1.5 text-sm border transition-colors ${fontSize === s ? 'bg-brand border-brand text-white' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => setVimMode(v => !v)}
                            className="w-full flex items-center justify-between py-1.5 text-sm text-foreground"
                          >
                            <span>Vim mode</span>
                            <span className={`flex items-center justify-center w-9 h-5 transition-colors ${vimMode ? 'bg-brand' : 'bg-border'}`}>
                              <span className={`w-4 h-4 bg-white transition-transform ${vimMode ? 'translate-x-2' : '-translate-x-2'}`} />
                            </span>
                          </button>
                        </PopoverContent>
                      </Popover>

                      {/* Reset */}
                      <Popover open={confirmReset} onOpenChange={setConfirmReset}>
                        <PopoverTrigger asChild>
                          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Reset to starter code">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-4 bg-card border-border">
                          <p className="text-sm text-foreground font-medium mb-1">Reset to starter code?</p>
                          <p className="text-xs text-muted-foreground mb-4">This will discard your current changes.</p>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border">Cancel</button>
                            <button onClick={() => { setCode(problem?.stubs?.[language.id] ?? language.defaultCode); setConfirmReset(false); }} className="px-3 py-1.5 text-sm bg-destructive text-white hover:bg-destructive transition-colors">Reset</button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Fullscreen */}
                      <button
                        onClick={() => {
                          if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen();
                          } else {
                            if (document.exitFullscreen) {
                              document.exitFullscreen();
                            }
                          }
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Toggle Fullscreen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                      </button>
                    </div>

                    {/* Run/Submit moved to top navbar */}
                  </div>

                  {/* Monaco editor */}
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      language={language.monacoLang}
                      value={code}
                      onChange={handleCodeChange}
                      onMount={handleEditorMount}
                      theme={editorTheme}
                      options={{
                        fontSize,
                        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace',
                        fontLigatures: true,
                        lineNumbers: 'on',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        wordWrap: 'on',
                        cursorStyle: vimMode ? 'block' : 'line',
                        smoothScrolling: true,
                        cursorSmoothCaretAnimation: 'on',
                        renderLineHighlight: 'line',
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                        padding: { top: 12, bottom: 12 },
                      }}
                    />
                  </div>
                </div>
              </ResizablePanel>

              {/* Output drawer */}
              {drawerOpen && (
                <>
                  <ResizableHandle className="bg-border h-px hover:bg-brand data-[resize-handle-state=drag]:bg-brand transition-colors" />
                  <ResizablePanel defaultSize={36} minSize={14} className="overflow-hidden">
                    <div className="h-full bg-background flex flex-col">
                      {/* ── Inline verdict strip ─────────────────────────────── */}
                      {!isJudging && status !== 'idle' && (() => {
                        const label = verdictData.verdictLabel || '';
                        const isCE  = label === 'Compilation Error';
                        const isRE  = label.includes('Runtime Error');
                        const isTLE = label === 'Time Limit Exceeded';
                        const isMLE = label === 'Memory Limit Exceeded';
                        const isExecError = isCE || isRE || isTLE || isMLE;
                        // Color: accepted=green, WA=red, CE/RE/TLE/MLE=orange, network-error=orange, ran=neutral
                        const colorClass =
                          status === 'accepted' ? 'border-success/25 bg-success/8'   :
                          status === 'error'    ? 'border-warning/25 bg-warning/8'   :
                          status === 'ran'      ? 'border-border bg-card/60'          :
                          isExecError          ? 'border-warning/25 bg-warning/8'   :
                          'border-destructive/25 bg-destructive/8';
                        const textClass =
                          status === 'accepted' ? 'text-success'     :
                          (status === 'error' || isExecError) ? 'text-warning' :
                          status === 'ran'      ? 'text-foreground'  :
                          'text-destructive';
                        const Icon =
                          status === 'accepted'          ? CheckCircle2 :
                          (status === 'error' || isExecError) ? WifiOff  :
                          status === 'ran'               ? CheckCircle2  :
                          XCircle;
                        const displayLabel =
                          status === 'accepted' ? 'Accepted'                                      :
                          status === 'error'    ? 'Error'                                          :
                          status === 'ran'      ? 'Finished'                                       :
                          (label || 'Wrong Answer');

                        return (
                          <div className={`flex items-center gap-2.5 px-4 py-2 border-b text-sm flex-shrink-0 ${colorClass}`}>
                            <Icon className={`w-4 h-4 flex-shrink-0 ${textClass}`} />
                            <span className={`font-semibold ${textClass}`}>{displayLabel}</span>

                            {/* Pass/fail count — not shown for CE/RE (no test cases ran) */}
                            {(status === 'accepted' || (status === 'wrong' && !isExecError)) && verdictData.testsPassed != null && (
                              <span className="text-muted-foreground text-xs">
                                {verdictData.testsPassed}/{verdictData.testsTotal} test cases
                                {status === 'accepted' && verdictData.runtimeMs
                                  ? ` · ${verdictData.runtimeMs} ms · ${verdictData.memoryMB ?? '?'} MB`
                                  : ''}
                              </span>
                            )}

                            {/* For CE/RE: hint that error details are in console */}
                            {isExecError && (
                              <span className="text-muted-foreground text-xs">
                                {isCE ? 'See compile output below' : isRE ? 'See runtime trace below' : ''}
                              </span>
                            )}

                            {/* Network error message */}
                            {status === 'error' && judgeError && (
                              <span className="text-muted-foreground text-xs truncate max-w-[280px]">{judgeError}</span>
                            )}

                            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                              {status === 'wrong' && !isExecError && (
                                <button
                                  onClick={() => { setShowAI(true); setTutorContext(`failing-test-${Date.now()}`); }}
                                  className="flex items-center gap-1 text-xs text-purple hover:underline"
                                >
                                  <Bot className="w-3 h-3" /> Ask AI
                                </button>
                              )}
                              {status === 'error' && (
                                <button onClick={handleSubmit} className="flex items-center gap-1 text-xs border border-border px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground">
                                  <RefreshCw className="w-3 h-3" /> Retry
                                </button>
                              )}
                              {status === 'accepted' && adjacent.next && (
                                <button
                                  onClick={() => { setStatus('idle'); navigate(`/app/problems/${adjacent.next!}`); }}
                                  className="flex items-center gap-1 text-xs text-success hover:underline font-medium"
                                >
                                  Next <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                              <button onClick={() => setStatus('idle')} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      <TabsPrimitive.Root value={activeOutputTab} onValueChange={setActiveOutputTab} className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center border-b border-border pr-2 bg-card/50 flex-shrink-0">
                          <TabsPrimitive.List className="flex px-4 gap-5 flex-1">
                            {[
                              { v: 'cases',   l: 'Testcase'     },
                              { v: 'console', l: 'Test Result'  },
                              { v: 'custom',  l: 'Custom Input' },
                            ].map(t => (
                              <TabsPrimitive.Trigger
                                key={t.v}
                                value={t.v}
                                className="py-2.5 px-1 border-b-2 border-transparent data-[state=active]:border-brand text-muted-foreground data-[state=active]:text-foreground transition-colors text-sm font-medium outline-none"
                              >
                                {t.l}
                              </TabsPrimitive.Trigger>
                            ))}
                          </TabsPrimitive.List>
                          <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors mr-1">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* TEST CASES */}
                        <TabsPrimitive.Content value="cases" className="flex-1 overflow-auto p-5 outline-none bg-background">
                          {isJudging ? (
                            <JudgingSkeleton progress={progress} retryMsg={retryMsg} />
                          ) : (
                            <div className="space-y-4">
                              <div className="flex flex-wrap gap-2">
                                {visibleTestCases.map((_: any, i: number) => {
                                  const result = testResults[i];
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => setActiveTestCase(i)}
                                      className={`flex items-center gap-1.5 px-3 py-1 text-sm border transition-colors ${activeTestCase === i ? 'bg-secondary border-muted-foreground text-foreground' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
                                    >
                                      {result && (result.pass ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <X className="w-3.5 h-3.5 text-destructive" />)}
                                      Case {i + 1}
                                    </button>
                                  );
                                })}
                              </div>
                              {visibleTestCases[activeTestCase] && (
                                <div className="space-y-3 text-sm">
                                  <Field label="Input" value={visibleTestCases[activeTestCase].input} />
                                  {(drawerStatus === 'success' && testResults[activeTestCase]) && (
                                    <>
                                      <Field label="Expected" value={testResults[activeTestCase].expected || visibleTestCases[activeTestCase].output} tone="text-success" />
                                      <Field label="Output" value={testResults[activeTestCase].got || '—'} tone={testResults[activeTestCase].pass ? 'text-success' : 'text-destructive'} />
                                    </>
                                  )}
                                  {drawerStatus !== 'success' && (
                                    <Field label="Expected" value={visibleTestCases[activeTestCase].output} />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </TabsPrimitive.Content>

                        {/* CONSOLE */}
                        <TabsPrimitive.Content value="console" className="flex-1 overflow-auto p-5 font-['JetBrains_Mono'] text-sm outline-none bg-[#0a0a0a] dark:bg-[#0a0a0a] text-gray-300">
                          {isJudging ? <JudgingSkeleton progress={progress} retryMsg={retryMsg} /> :
                           drawerStatus === 'success' ? (
                            <div className="space-y-4">
                              <div className="text-success font-semibold text-xs tracking-wider uppercase">stdout</div>
                              <div className="text-gray-100 whitespace-pre-wrap bg-white/5 p-4 rounded-md border border-white/10">{verdictData.consoleOutput || '(no output)'}</div>

                              {verdictData.errorOutput && (
                                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                  <div className="text-destructive font-semibold text-xs tracking-wider uppercase">stderr / error</div>
                                  <div className="text-destructive whitespace-pre-wrap text-sm bg-destructive/10 border border-destructive/20 p-4 rounded-md">{verdictData.errorOutput}</div>
                                  <button
                                    onClick={handleExplainError}
                                    disabled={explainLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-purple/40 bg-purple/10 text-purple text-xs font-medium hover:bg-purple/20 disabled:opacity-50 transition-colors font-['Inter']"
                                  >
                                    <Bot className="w-3.5 h-3.5" /> {explainLoading ? 'Analysing…' : 'Explain Error'}
                                  </button>
                                  {explainData && (
                                    <div className="bg-card border border-purple/30 border-l-2 border-l-purple p-3 text-sm text-foreground whitespace-pre-wrap font-['Inter'] leading-relaxed">
                                      {explainData}
                                    </div>
                                  )}
                                </div>
                              )}

                              {(verdictData.runtimeMs || verdictData.memoryMB || verdictData.score != null) && (
                                <div className="mt-4 pt-4 border-t border-border flex items-center gap-6 font-['Inter'] flex-wrap">
                                  {verdictData.runtimeMs && <span className="flex items-center gap-2 text-gray-400"><Timer className="w-4 h-4" /> Runtime <span className="text-gray-100 font-mono">{verdictData.runtimeMs} ms</span></span>}
                                  {verdictData.memoryMB  && <span className="flex items-center gap-2 text-gray-400"><Cpu   className="w-4 h-4" /> Memory  <span className="text-gray-100 font-mono">{verdictData.memoryMB} MB</span></span>}
                                  {verdictData.score != null && (
                                    <span className="flex items-center gap-2 text-gray-400">
                                      Score{' '}
                                      <span className={`font-mono font-bold ${verdictData.score === verdictData.maxScore ? 'text-success' : 'text-warning'}`}>
                                        {verdictData.score}/{verdictData.maxScore}
                                      </span>
                                      <span className="text-xs text-gray-500">pts</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : <div className="text-gray-500 font-['Inter'] text-center py-10">Run your code to see stdout / stderr here.</div>}
                        </TabsPrimitive.Content>

                        {/* CUSTOM INPUT */}
                        <TabsPrimitive.Content value="custom" className="flex-1 overflow-auto p-5 outline-none flex flex-col gap-4 bg-background">
                          <textarea
                            value={customInput}
                            onChange={e => setCustomInput(e.target.value)}
                            className="w-full flex-1 min-h-[120px] bg-card text-foreground border border-border p-4 rounded-md font-['JetBrains_Mono'] text-sm resize-none outline-none focus:border-brand transition-colors placeholder-muted-foreground shadow-sm"
                            placeholder="Enter custom stdin input…"
                          />
                          <button
                            onClick={handleRunCustom}
                            disabled={isJudging || !customInput.trim()}
                            className="self-start flex items-center gap-2 px-4 py-1.5 border border-border bg-card text-foreground text-sm font-medium hover:bg-secondary hover:border-muted-foreground transition-colors disabled:opacity-40"
                          >
                            <Play className="w-3.5 h-3.5" /> Run Custom Input
                          </button>
                        </TabsPrimitive.Content>
                      </TabsPrimitive.Root>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>

            {/* Collapsed console button */}
            {!drawerOpen && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-card border border-border text-foreground text-sm hover:border-muted-foreground transition-colors shadow-lg"
              >
                <Terminal className="w-4 h-4" /> Console <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* AI Tutor Sidebar */}
        {showAI && (
          <AITutorSidebar
            onClose={() => setShowAI(false)}
            contextNote={tutorContext}
            problemTitle={problem?.title}
            problemId={id}
            code={code}
            language={language.name}
            problemDescription={problem?.description}
            failingTest={verdictData.failingTest}
          />
        )}
        
        {showProblemList && (
          <ProblemListPanel
            currentProblemId={id}
            onClose={() => setShowProblemList(false)}
            onSelect={(pid) => {
              setShowProblemList(false);
              navigate(`/app/problems/${pid}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, value, tone = 'text-foreground' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-card/50 border border-border p-4 rounded-md">
      <div className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wider">{label}</div>
      <div className={`font-['JetBrains_Mono'] text-sm ${tone}`}>{value}</div>
    </div>
  );
}

function JudgingSkeleton({ progress, retryMsg }: { progress: { current: number; total: number }; retryMsg?: string | null }) {
  const pct = Math.round((progress.current / progress.total) * 100);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">Running test {progress.current}/{progress.total}</span>
        <span className="text-muted-foreground font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-card border border-border overflow-hidden">
        <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      {retryMsg && (
        <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 text-warning text-xs">
          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          {retryMsg}
        </div>
      )}
      <div className="space-y-2 pt-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-9 bg-card border border-border animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    </div>
  );
}
