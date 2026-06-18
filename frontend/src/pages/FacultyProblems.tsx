import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { ExportPdfButton } from '../components/dashboard/ExportPdfButton';
import { ZipImportButton } from '../components/dashboard/ZipImportButton';
import { TestHeatmapModal } from '../components/dashboard/TestHeatmapModal';
import { RandomTestsModal } from '../components/dashboard/RandomTestsModal';
import {
  PlusCircle, Pencil, Trash2, X, Loader2, Sparkles,
  Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  FileText, CheckSquare, Square, Flame, Dice5
} from 'lucide-react';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Language options that match Judge0 language IDs used by the judge
const STUB_LANGUAGES = [
  { id: 71,  name: 'Python',      placeholder: 'def solve(s: str) -> int:\n    pass\n' },
  { id: 63,  name: 'JavaScript',  placeholder: 'var solve = function(s) {\n    \n};\n' },
  { id: 62,  name: 'Java',        placeholder: 'class Solution {\n    public int solve(String s) {\n        \n    }\n}\n' },
  { id: 54,  name: 'C++',         placeholder: '#include <bits/stdc++.h>\nusing namespace std;\nint solve(string s) {\n    \n}\n' },
];

const diffColor = (d: string) =>
  d?.toLowerCase() === 'easy'   ? 'text-success' :
  d?.toLowerCase() === 'medium' ? 'text-warning' :
  d?.toLowerCase() === 'hard'   ? 'text-destructive' : 'text-muted-foreground';

interface TestCase { input: string; output: string; is_public?: boolean; score?: number }
interface Problem {
  id: string; title: string; difficulty: string; tags: string[];
  totalSubmissions: number; acceptanceRate: number;
}

interface Toast { id: number; message: string; type: 'success' | 'error' }

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 border text-sm font-medium shadow-lg ${
          t.type === 'success'
            ? 'bg-card border-success/50 text-success'
            : 'bg-card border-destructive/50 text-destructive'
        }`}>
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function FacultyProblems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  // Question-paper builder
  const [paperMode, setPaperMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paperTitle, setPaperTitle] = useState('');
  const [exportingPaper, setExportingPaper] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [heatmapProblem, setHeatmapProblem] = useState<{ id: string; title: string } | null>(null);
  const [randomTestsProblem, setRandomTestsProblem] = useState<{ id: string; title: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [tagsInput, setTagsInput] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', output: '', is_public: true }]);
  const [stubs, setStubs] = useState<Record<number, string>>({});
  const [stubsExpanded, setStubsExpanded] = useState(false);
  const [scoringMode, setScoringMode] = useState<'acm' | 'oi'>('acm');
  const [maxScore, setMaxScore] = useState(100);
  const [editorial, setEditorial] = useState('');
  const [editorialVisibleAt, setEditorialVisibleAt] = useState('');
  const [editorialExpanded, setEditorialExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  // Special judge / custom checker
  const [usesChecker, setUsesChecker] = useState(false);
  const [checkerLanguageId, setCheckerLanguageId] = useState<number>(STUB_LANGUAGES[0].id);
  const [checkerCode, setCheckerCode] = useState('');
  const [checkerExpanded, setCheckerExpanded] = useState(false);

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };


  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/faculty/problems');
      if (res.data?.success) setProblems(res.data.data);
    } catch { toast('Failed to load problems', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProblems(); }, []);

  const openCreate = () => {
    setEditingProblem(null);
    setTitle(''); setDescription(''); setDifficulty('easy');
    setTagsInput(''); setTestCases([{ input: '', output: '', is_public: true }]);
    setStubs({}); setStubsExpanded(false); setAiExpanded(false);
    setScoringMode('acm'); setMaxScore(100);
    setEditorial(''); setEditorialVisibleAt(''); setEditorialExpanded(false);
    setUsesChecker(false); setCheckerLanguageId(STUB_LANGUAGES[0].id);
    setCheckerCode(''); setCheckerExpanded(false);
    setShowModal(true);
  };

  const openEdit = (p: Problem) => {
    setEditingProblem(p);
    setTitle(p.title); setDescription(''); setDifficulty(p.difficulty.toLowerCase());
    setTagsInput((p.tags || []).join(', ')); setTestCases([{ input: '', output: '', is_public: true }]);
    setStubs({}); setStubsExpanded(false); setAiExpanded(false);
    setScoringMode('acm'); setMaxScore(100);
    setEditorial(''); setEditorialVisibleAt(''); setEditorialExpanded(false);
    setUsesChecker(false); setCheckerLanguageId(STUB_LANGUAGES[0].id);
    setCheckerCode(''); setCheckerExpanded(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast('Title and description are required', 'error'); return;
    }
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        title, description, difficulty,
        tags,
        test_cases: testCases.filter(tc => tc.input.trim() && tc.output.trim()),
        stubs,
        scoring_mode: scoringMode,
        max_score: maxScore,
        editorial: editorial.trim() || undefined,
        editorial_visible_at: editorialVisibleAt || undefined,
        uses_checker: usesChecker,
        checker_code: usesChecker ? checkerCode : '',
        checker_language_id: usesChecker ? checkerLanguageId : null,
      };

      if (editingProblem) {
        await api.put(`/api/faculty/problems/${editingProblem.id}`, payload);
        toast('Problem updated');
      } else {
        await api.post('/api/faculty/problems', payload);
        toast('Problem created');
      }
      setShowModal(false);
      fetchProblems();
    } catch { toast('Failed to save problem', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/faculty/problems/${id}`);
      toast('Problem deleted');
      setDeleteConfirm(null);
      fetchProblems();
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleAIGenerate = async () => {
    if (!title.trim() || !description.trim()) {
      toast('Enter title and description first', 'error'); return;
    }
    setAiGenerating(true);
    try {
      const res = await api.post('/api/faculty/ai/generate-tests',
        { title, description }
      );
      if (res.data?.success && res.data.data?.testCases) {
        const aiCases: TestCase[] = res.data.data.testCases.map((tc: any) => ({
          input: tc.input, output: tc.output, is_public: false
        }));
        setTestCases(aiCases);
        if (res.data.data.suggestedDifficulty) {
          setDifficulty(res.data.data.suggestedDifficulty);
        }
        toast(`Generated ${aiCases.length} test cases`);
      }
    } catch { toast('AI generation failed', 'error'); }
    finally { setAiGenerating(false); }
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const problems = Array.isArray(data) ? data : [data];
        let created = 0;
        for (const p of problems) {
          await api.post('/api/faculty/problems', p);
          created++;
        }
        toast(`Imported ${created} problem${created > 1 ? 's' : ''}`);
        fetchProblems();
      } catch { toast('Import failed — check JSON format', 'error'); }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleExportPaper = async () => {
    if (selectedIds.size === 0) return;
    setExportingPaper(true);
    try {
      const res = await api.post('/api/pdf/question-paper',
        { problem_ids: Array.from(selectedIds), title: paperTitle.trim() || 'Question Paper' },
        { responseType: 'blob' }
      );
      let filename = 'question_paper.pdf';
      const disp = res.headers?.['content-disposition'] as string | undefined;
      const m = disp?.match(/filename="?([^"]+)"?/);
      if (m?.[1]) filename = m[1];
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast(`Exported paper with ${selectedIds.size} problem${selectedIds.size === 1 ? '' : 's'}`);
      setPaperMode(false); setSelectedIds(new Set()); setPaperTitle('');
    } catch {
      toast('Failed to export question paper', 'error');
    } finally {
      setExportingPaper(false);
    }
  };

  const updateTC = (i: number, field: keyof TestCase, val: string | boolean | number) => {
    setTestCases(tcs => tcs.map((tc, idx) => idx === i ? { ...tc, [field]: val } : tc));
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <ToastStack toasts={toasts} />
      {heatmapProblem && (
        <TestHeatmapModal
          problemId={heatmapProblem.id}
          problemTitle={heatmapProblem.title}
          onClose={() => setHeatmapProblem(null)}
        />
      )}
      {randomTestsProblem && (
        <RandomTestsModal
          problemId={randomTestsProblem.id}
          problemTitle={randomTestsProblem.title}
          onClose={() => setRandomTestsProblem(null)}
        />
      )}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleBulkImport} />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Problems</h1>
              <p className="text-muted-foreground text-sm mt-1">{problems.length} problems created</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-border bg-card text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" /> Bulk Import JSON
              </button>
              <ZipImportButton onImported={fetchProblems} />
              <button
                onClick={() => { setPaperMode(m => !m); setSelectedIds(new Set()); }}
                className={`flex items-center gap-2 px-4 py-2 border text-sm font-medium transition-colors ${
                  paperMode
                    ? 'border-purple bg-purple/10 text-purple'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" /> Question Paper
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Add Problem
              </button>
            </div>
          </div>

          {/* Question-paper action bar */}
          {paperMode && (
            <div className="flex items-center gap-3 bg-purple/8 border border-purple/30 px-4 py-3 flex-wrap">
              <span className="text-sm text-purple font-medium">{selectedIds.size} selected</span>
              <input
                value={paperTitle}
                onChange={e => setPaperTitle(e.target.value)}
                placeholder="Paper title (e.g. Midterm Exam — Set A)"
                className="flex-1 min-w-[200px] bg-background border border-border text-foreground text-sm px-3 py-2 outline-none focus:border-purple transition-colors"
              />
              <button
                onClick={handleExportPaper}
                disabled={exportingPaper || selectedIds.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple text-white text-sm font-medium hover:bg-purple disabled:opacity-50 transition-colors"
              >
                {exportingPaper ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Export Paper PDF
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-card border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Difficulty</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 text-right">Submissions</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 text-right">AC Rate</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="bg-card">
                      {[1,2,3,4,5].map(j => (
                        <td key={j} className="py-3.5 px-5">
                          <div className="h-4 bg-border animate-pulse rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : problems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No problems yet. Click "Add Problem" to create one.
                    </td>
                  </tr>
                ) : problems.map(p => (
                  <tr key={p.id}
                    className={`hover:bg-accent transition-colors bg-card group ${paperMode ? 'cursor-pointer' : ''} ${paperMode && selectedIds.has(p.id) ? 'bg-purple/10' : ''}`}
                    onClick={paperMode ? () => toggleSelect(p.id) : undefined}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        {paperMode && (
                          selectedIds.has(p.id)
                            ? <CheckSquare className="w-4 h-4 text-purple flex-shrink-0" />
                            : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="text-foreground text-sm font-medium">{p.title}</div>
                      </div>
                      {p.tags?.length > 0 && (
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {p.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] bg-background border border-border text-muted-foreground px-2 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`py-3.5 px-5 text-sm font-medium ${diffColor(p.difficulty)}`}>{p.difficulty}</td>
                    <td className="py-3.5 px-5 text-sm text-foreground font-mono text-right">{p.totalSubmissions}</td>
                    <td className="py-3.5 px-5 text-sm text-foreground font-mono text-right">{p.acceptanceRate}%</td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setHeatmapProblem({ id: p.id, title: p.title })}
                          className="p-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                          title="Concept heatmap"
                        >
                          <Flame className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRandomTestsProblem({ id: p.id, title: p.title })}
                          className="p-1.5 text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors"
                          title="Generate random tests"
                        >
                          <Dice5 className="w-4 h-4" />
                        </button>
                        <ExportPdfButton problemId={p.id} />
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <span className="text-xs text-destructive">Confirm?</span>
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-destructive hover:underline">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-muted-foreground hover:underline">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-card border border-border w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editingProblem ? 'Edit Problem' : 'Create New Problem'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Two Sum"
                  className="w-full bg-background border border-border text-foreground px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                />
              </div>

              {/* Difficulty + Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full bg-background border border-border text-foreground px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                  >
                    {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags (comma-separated)</label>
                  <input
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                    placeholder="array, hashmap, sorting"
                    className="w-full bg-background border border-border text-foreground px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Given an array of integers, return indices of two numbers that add up to target..."
                  rows={5}
                  className="w-full bg-background border border-border text-foreground px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors resize-none"
                />
              </div>

              {/* Scoring Mode */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scoring Mode</label>
                <div className="flex gap-2">
                  {(['acm', 'oi'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setScoringMode(mode)}
                      className={`px-4 py-1.5 text-xs font-medium border rounded transition-colors ${
                        scoringMode === mode
                          ? 'bg-brand border-brand text-white'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                  {scoringMode === 'oi' && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-xs text-muted-foreground">Max score:</span>
                      <input
                        type="number" min={1} max={1000}
                        value={maxScore}
                        onChange={e => setMaxScore(Math.max(1, parseInt(e.target.value) || 100))}
                        className="w-20 bg-background border border-border rounded px-2 py-1 text-xs text-foreground text-center focus:outline-none focus:border-link"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {scoringMode === 'acm'
                    ? 'ACM: binary verdict — first accepted counts, penalties for wrong submissions.'
                    : 'OI: partial score — students earn points per passing test case.'}
                </p>
              </div>

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test Cases</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple/10 border border-purple/40 text-purple text-xs font-medium hover:bg-purple/20 transition-colors disabled:opacity-50"
                    >
                      {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      AI Generate (15)
                    </button>
                    <button
                      onClick={() => setTestCases(tcs => [...tcs, { input: '', output: '', is_public: false }])}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>

                {/* AI toggle */}
                {testCases.length > 3 && (
                  <button
                    onClick={() => setAiExpanded(e => !e)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border text-muted-foreground text-xs mb-2 hover:text-foreground transition-colors"
                  >
                    <span>{testCases.length} test cases</span>
                    {aiExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}

                <div className={`space-y-2 ${testCases.length > 3 && !aiExpanded ? 'max-h-[180px]' : ''} overflow-y-auto`}>
                  {testCases.map((tc, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 items-start">
                      <textarea
                        value={tc.input}
                        onChange={e => updateTC(i, 'input', e.target.value)}
                        placeholder={`Input ${i + 1}`}
                        rows={2}
                        className="bg-background border border-border text-foreground px-3 py-2 text-xs font-mono outline-none focus:border-brand resize-none transition-colors"
                      />
                      <div className="flex gap-1">
                        <textarea
                          value={tc.output}
                          onChange={e => updateTC(i, 'output', e.target.value)}
                          placeholder={`Expected ${i + 1}`}
                          rows={2}
                          className="flex-1 bg-background border border-border text-foreground px-3 py-2 text-xs font-mono outline-none focus:border-brand resize-none transition-colors"
                        />
                        {scoringMode === 'oi' && (
                          <input
                            type="number" min={0} max={1000}
                            value={tc.score ?? 0}
                            onChange={e => updateTC(i, 'score', parseInt(e.target.value) || 0)}
                            title="Points for this test case"
                            className="w-12 bg-background border border-border rounded px-1 py-1 text-xs text-warning text-center focus:outline-none focus:border-warning flex-shrink-0"
                          />
                        )}
                        <button
                          onClick={() => setTestCases(tcs => tcs.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editorial */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setEditorialExpanded(v => !v)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer">
                    Editorial (optional)
                  </label>
                  {editorialExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {editorialExpanded && (
                  <div className="space-y-3">
                    <textarea
                      rows={6}
                      value={editorial}
                      onChange={e => setEditorial(e.target.value)}
                      placeholder="Explain the solution approach, time/space complexity, and key insights…"
                      className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-link resize-y"
                    />
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Auto-publish at (optional)</label>
                      <input
                        type="datetime-local"
                        value={editorialVisibleAt}
                        onChange={e => setEditorialVisibleAt(e.target.value)}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-link"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank to keep editorial hidden. Students see it after this time.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Starter Code / Stubs */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStubsExpanded(v => !v)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer">
                    Starter Code (optional)
                  </label>
                  {stubsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {stubsExpanded && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Provide per-language starter code. Students see this in the editor instead of a blank template.
                    </p>
                    {STUB_LANGUAGES.map(lang => (
                      <div key={lang.id}>
                        <label className="block text-xs text-muted-foreground mb-1 font-mono">{lang.name}</label>
                        <textarea
                          rows={4}
                          value={stubs[lang.id] ?? ''}
                          onChange={e => setStubs(prev => ({ ...prev, [lang.id]: e.target.value }))}
                          placeholder={lang.placeholder}
                          className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-link resize-y"
                          spellCheck={false}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Judge / Custom Checker */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCheckerExpanded(v => !v)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer">
                    Special Judge / Custom Checker (optional)
                  </label>
                  {checkerExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {checkerExpanded && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      For problems with multiple correct outputs, run a checker program instead of an exact string compare.
                      The checker reads the test input, expected output, and the contestant output from stdin and prints
                      <span className="text-foreground font-mono"> AC </span> on the first line to accept (anything else = Wrong Answer).
                    </p>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={usesChecker}
                        onChange={e => setUsesChecker(e.target.checked)}
                        className="accent-brand w-4 h-4"
                      />
                      <span className="text-xs text-foreground">Enable special judge for this problem</span>
                    </label>

                    {usesChecker && (
                      <>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Checker language</label>
                          <select
                            value={checkerLanguageId}
                            onChange={e => setCheckerLanguageId(parseInt(e.target.value, 10))}
                            className="w-full bg-background border border-border text-foreground px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                          >
                            {STUB_LANGUAGES.map(lang => (
                              <option key={lang.id} value={lang.id}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1 font-mono">Checker code</label>
                          <textarea
                            rows={8}
                            value={checkerCode}
                            onChange={e => setCheckerCode(e.target.value)}
                            placeholder={'# stdin layout:\n#   ---INPUT---\n#   <test input>\n#   ---EXPECTED---\n#   <expected output>\n#   ---ACTUAL---\n#   <contestant output>\n# print "AC" to accept, anything else = WA'}
                            className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-link resize-y"
                            spellCheck={false}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingProblem ? 'Update Problem' : 'Create Problem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
