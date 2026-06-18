import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import {
  Bot, Send, User, Sparkles, Code2, Bug, BookOpen,
  Loader2, Copy, Check, ChevronRight
} from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';

interface Message {
  id: number;
  role: 'user' | 'ai';
  content: string;
  mode?: Mode;
}

type Mode = 'tutor' | 'explain' | 'review';

const MODES: { key: Mode; label: string; icon: typeof Bot; color: string; desc: string }[] = [
  { key: 'tutor',   label: 'AI Tutor',    icon: Bot,     color: 'var(--purple)', desc: 'Socratic guidance — never gives direct answers' },
  { key: 'explain', label: 'Explain Error', icon: Bug,   color: 'var(--destructive)', desc: 'Explains why your code failed in plain English' },
  { key: 'review',  label: 'Code Review',  icon: Code2,  color: 'var(--success)', desc: 'Reviews quality, complexity, and code smells' },
];

const QUICK_PROMPTS = [
  'What is Dynamic Programming?',
  'Explain BFS vs DFS with examples',
  'When should I use a hash map?',
  'How do I detect a cycle in a linked list?',
  'Explain Big O notation',
  'What is memoization?',
  'Sliding window technique explained',
  'Two pointers pattern explained',
];


// ─── Code block renderer ──────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="my-2 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-background border-b border-border">
        <span className="text-[10px] text-muted-foreground font-mono uppercase">{lang || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-foreground overflow-x-auto bg-background leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Split on ```lang\ncode\n``` blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-sm leading-relaxed space-y-1">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          const lang = lines[0].trim();
          const code = lines.slice(1).join('\n').trimEnd();
          return <CodeBlock key={i} code={code} lang={lang} />;
        }
        return (
          <div key={i}>
            {part.split('\n').map((line, j) => (
              <p key={j} className={line === '' ? 'h-2' : ''}>{line}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Review Result card ───────────────────────────────────────────────────

function ReviewCard({ content }: { content: string }) {
  try {
    const review = JSON.parse(content);
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-foreground font-mono">{review.qualityScore}/100</div>
          <div>
            <div className="text-xs text-muted-foreground">Quality Score</div>
            <div className="w-32 h-1.5 bg-border mt-1 overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${review.qualityScore}%` }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card border border-border p-2.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Time</div>
            <div className="text-brand font-mono font-semibold">{review.timeComplexity}</div>
          </div>
          <div className="bg-card border border-border p-2.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Space</div>
            <div className="text-purple font-mono font-semibold">{review.spaceComplexity}</div>
          </div>
        </div>
        {review.codeSmells?.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Code Smells</div>
            {review.codeSmells.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-warning mb-1">
                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" /> {s}
              </div>
            ))}
          </div>
        )}
        {review.improvementSuggestions?.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Suggestions</div>
            {review.improvementSuggestions.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-success mb-1">
                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" /> {s}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch {
    return <MessageContent content={content} />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────

export default function AITutorPage() {
  const [mode, setMode] = useState<Mode>('tutor');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, role: 'ai', mode: 'tutor',
      content: "Hello! I'm your CodeSphere AI Tutor powered by Gemini 2.5 Flash.\n\nI use the Socratic method — I'll guide you to the answer through questions rather than giving it to you directly.\n\nAsk me anything about data structures, algorithms, or paste your code for a review!"
    }
  ]);
  const [input, setInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: text, mode };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let aiText = '';

      if (mode === 'tutor') {
        const res = await api.post('/api/ai/tutor', {
          problemId: 'general',
          problemDescription: 'General coding/algorithm question',
          code: codeInput || '',
          message: text,
        });
        aiText = res.data?.response || res.data?.data?.response || "I couldn't process that. Try again.";

      } else if (mode === 'explain') {
        const res = await api.post('/api/ai/explain-error', {
          problemDescription: 'User-provided code context',
          code: codeInput || text,
          errorTrace: text,
        });
        aiText = res.data?.explanation || "I couldn't explain that error.";

      } else if (mode === 'review') {
        const res = await api.post('/api/ai/review-code', {
          problemDescription: 'User-submitted code for review',
          code: codeInput || text,
        });
        // Return JSON string so ReviewCard can parse it
        aiText = JSON.stringify(res.data?.review || {});
      }

      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', content: aiText, mode }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'ai',
        content: "Sorry, I couldn't connect to the AI service right now. Please try again.",
        mode
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const activeMode = MODES.find(m => m.key === mode)!;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />

      <main className="flex-1 flex gap-0 overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>

        {/* ── Sidebar ── */}
        <aside className="w-64 flex-shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto hidden lg:flex">
          <div className="p-4 border-b border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Mode</p>
            <div className="space-y-1.5">
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      mode === m.key
                        ? 'bg-card border border-border'
                        : 'hover:bg-card border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: m.color }} />
                    <div>
                      <div className="text-xs font-semibold text-foreground">{m.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Quick Asks</p>
            <div className="space-y-1">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q}
                  onClick={() => { setMode('tutor'); handleSend(q); }}
                  disabled={isTyping}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 hover:bg-card transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Sparkles className="w-3 h-3 flex-shrink-0 text-purple" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 border border-purple/30 bg-card flex items-center justify-center flex-shrink-0">
              <activeMode.icon className="w-4 h-4" style={{ color: activeMode.color }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{activeMode.label}</h2>
              <p className="text-[10px] text-muted-foreground font-mono">GEMINI 2.5 FLASH · ONLINE</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowCodePanel(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium transition-colors ${
                  showCodePanel
                    ? 'bg-brand/10 border-brand/40 text-brand'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code Panel
              </button>
            </div>
          </div>

          <div className="flex-1 flex min-h-0">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
              {messages.map(msg => {
                const msgMode = MODES.find(m => m.key === msg.mode);
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      isUser
                        ? 'bg-brand border-brand'
                        : 'bg-card border-border'
                    }`}>
                      {isUser
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4" style={{ color: msgMode?.color || 'var(--purple)' }} />
                      }
                    </div>
                    <div className={`max-w-[75%] px-4 py-3 border ${
                      isUser
                        ? 'bg-brand/10 border-brand/30 text-foreground'
                        : 'bg-card border-border text-foreground'
                    }`}>
                      {!isUser && msg.mode === 'review'
                        ? <ReviewCard content={msg.content} />
                        : <MessageContent content={msg.content} />
                      }
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-card border border-border flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-purple" />
                  </div>
                  <div className="bg-card border border-border px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <Loader2 className="w-3.5 h-3.5 text-purple animate-spin" />
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Code panel */}
            {showCodePanel && (
              <div className="w-80 flex-shrink-0 border-l border-border flex flex-col">
                <div className="px-4 py-2.5 border-b border-border bg-background flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code Context</span>
                  <span className="text-[10px] text-muted-foreground">Sent with every message</span>
                </div>
                <textarea
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  placeholder="Paste your code here..."
                  className="flex-1 bg-background text-foreground text-xs font-mono p-4 outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-background border-t border-border flex-shrink-0">
            {/* Mobile mode pills */}
            <div className="flex gap-2 mb-3 lg:hidden overflow-x-auto pb-1">
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                      mode === m.key
                        ? 'border-border bg-card text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-end gap-2 bg-card border border-border p-2 focus-within:border-brand transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={
                  mode === 'tutor'   ? 'Ask a question about algorithms or your approach...' :
                  mode === 'explain' ? 'Paste your error trace or describe what went wrong...' :
                  'Describe what your code does, then click send...'
                }
                className="flex-1 bg-transparent text-foreground text-sm resize-none outline-none max-h-32 min-h-[40px] p-2 placeholder-muted-foreground"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-2 bg-brand text-white hover:bg-brand-hover disabled:opacity-40 transition-colors mb-1 mr-1 flex-shrink-0"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center mt-2 text-muted-foreground text-[10px] font-mono tracking-wider">
              SHIFT+ENTER FOR NEW LINE · AI CAN MAKE MISTAKES
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
