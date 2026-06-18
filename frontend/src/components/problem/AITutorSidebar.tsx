import { useState, useEffect, useRef } from "react";
import api from "../../lib/api";
import { X, Send, Bot, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
}

const GREETING: Message = {
  role: "ai",
  content: "I'm your AI Tutor! I'll guide you with questions rather than giving away the solution. What aspect of this problem are you stuck on?",
};

const SUGGESTIONS = [
  "I'm getting a wrong answer",
  "How do I make it faster?",
  "What's the time complexity?",
  "Give me a smaller hint",
];

const FALLBACK_REPLIES = [
  "Good instinct. What would you need to remember about each number as you scan the array once?",
  "Think about lookups: which data structure gives you O(1) membership checks?",
  "Try tracing your code on a small example by hand. Which line produces the wrong result?",
  "You're close. For each element, what single value are you really searching for?",
];

export function AITutorSidebar({
  onClose,
  contextNote,
  problemTitle,
  problemId,
  code,
  language,
  problemDescription,
  failingTest,
}: {
  onClose: () => void;
  contextNote?: string;
  problemTitle?: string;
  problemId?: string | number;
  code?: string;
  language?: string;
  problemDescription?: string;
  failingTest?: { input: string | null; expected: string | null; output: string; hidden: boolean } | null;
}) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const replyIdx = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Restore saved conversation when the tutor opens for a real problem.
  useEffect(() => {
    if (!problemId || problemId === 'general') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/api/ai/tutor/${problemId}`);
        const hist = res.data?.history || res.data?.data?.history || [];
        if (!cancelled && hist.length) {
          setMessages([
            GREETING,
            ...hist.map((m: { role: string; content: string }) => ({
              role: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
              content: m.content,
            })),
          ]);
        }
      } catch {
        /* keep the greeting on failure */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  useEffect(() => {
    if (contextNote) {
      const content = failingTest && !failingTest.hidden
        ? `I see your submission failed on the input \`${failingTest.input}\` — your code returned \`${failingTest.output}\` but the expected answer was \`${failingTest.expected}\`. Before changing anything, can you trace your logic by hand on that input and tell me where it diverges?`
        : failingTest && failingTest.hidden
          ? `Your submission failed on a hidden test. The public samples passed, so think about edge cases — empty input, the largest values, duplicates, or boundaries. Which edge case do you think your code might not handle?`
          : `I see your submission failed on a test. Let's not jump to the fix — what does your code currently return for that input, and what did you expect instead?`;
      setMessages((prev) => [...prev, { role: "ai", content }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextNote]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      let failContext: string | null = null;
      if (failingTest) {
        failContext = failingTest.hidden
          ? `\n\n[The student's latest submission failed on a HIDDEN test case. The specific input/expected output are withheld — guide them to reason about edge cases without revealing answers.]`
          : `\n\n[The student's latest submission failed on this test]\nInput: ${failingTest.input}\nExpected output: ${failingTest.expected}\nTheir output: ${failingTest.output}\nGuide them to find the discrepancy themselves — do NOT give the corrected code.`;
      }
      const descParts = [
        problemTitle ? `Title: ${problemTitle}` : null,
        problemDescription || null,
        failContext,
      ].filter(Boolean);
      const res = await api.post(
        "/api/ai/tutor",
        {
          problemId: problemId || 'general',
          problemDescription: descParts.length ? descParts.join('\n\n') : 'General coding question',
          code: code && code.trim()
            ? `Language: ${language || 'unknown'}\n\n${code}`
            : '(the student has not written any code yet)',
          message: text,
        },
        { timeout: 15000 }
      );
      const reply = res.data?.data?.response || res.data?.response || FALLBACK_REPLIES[replyIdx.current % FALLBACK_REPLIES.length];
      setMessages((prev) => [...prev, { role: "ai", content: reply }]);
    } catch {
      const reply = FALLBACK_REPLIES[replyIdx.current % FALLBACK_REPLIES.length];
      setMessages((prev) => [...prev, { role: "ai", content: reply }]);
    } finally {
      replyIdx.current += 1;
      setIsTyping(false);
    }
  };

  return (
    <div className="w-80 h-full bg-background border-l border-border flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple/15 border border-purple/40 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-purple" />
          </div>
          <span className="text-foreground text-sm font-semibold">AI Tutor</span>
          {problemTitle && <span className="text-muted-foreground text-xs truncate max-w-[120px]">— {problemTitle}</span>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-card transition-colors" title="Close tutor">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && (
              <div className="w-5 h-5 bg-purple/15 border border-purple/30 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-purple" />
              </div>
            )}
            <div className={`max-w-[82%] px-3 py-2 text-sm leading-relaxed ${m.role === "ai" ? "bg-card border border-border text-foreground" : "bg-purple text-white"}`}>
              {m.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="w-5 h-5 bg-purple/15 border border-purple/30 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-purple" />
            </div>
            <div className="bg-card border border-border px-3 py-2.5">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-purple animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 2 && !isTyping && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 border border-purple/30 bg-purple/8 text-purple hover:bg-purple/15 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask a guiding question…"
            className="flex-1 px-3 py-2 bg-card text-foreground text-sm border border-border outline-none focus-visible:ring-2 focus-visible:ring-purple transition-colors placeholder-muted-foreground"
          />
          <button onClick={() => send(input)} className="p-2 bg-purple text-white hover:bg-purple transition-colors" title="Send">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">The tutor guides with questions — it won't hand over the full solution.</p>
      </div>
    </div>
  );
}
