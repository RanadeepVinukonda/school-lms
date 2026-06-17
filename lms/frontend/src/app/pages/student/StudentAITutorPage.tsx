import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { sendChatMessage } from '@/services/aiService';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  'Explain the concept of photosynthesis',
  'Help me solve this math problem: 2x + 5 = 15',
  'What is the quadratic formula?',
  'Explain Newton\'s laws of motion',
];

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-outline-variant bg-[#0d1117]">
      {language && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-outline-variant">
          <span className="text-label-sm text-on-surface-variant font-mono">{language}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="content_copy" size={14} />
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-[#e6edf3] leading-relaxed whitespace-pre-wrap">{code}</code>
      </pre>
    </div>
  );
}

function MathBlock({ formula }: { formula: string }) {
  return (
    <div className="my-3 p-4 rounded-xl bg-primary-container/20 border border-primary-container/40 text-center overflow-x-auto">
      <code className="text-lg font-mono text-primary">{formula}</code>
    </div>
  );
}

function InlineMath({ formula }: { formula: string }) {
  return (
    <code className="px-1 py-0.5 rounded bg-primary-container/20 text-primary text-sm font-mono">{formula}</code>
  );
}

function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length < 2) return null;
  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-primary-container/40">
            {rows[0].map((h, i) => (
              <th key={i} className="px-4 py-2 text-left text-label-sm font-semibold text-on-surface border-b border-outline-variant">{h.trim()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className={cn(ri % 2 === 0 ? 'bg-surface' : 'bg-surface-variant/30', 'border-b border-outline-variant/50 last:border-0')}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-body-sm text-on-surface">{cell.trim()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Segment {
  type: 'text' | 'bold' | 'italic' | 'inlineCode' | 'link' | 'inlineMath';
  content: string;
  href?: string;
}

function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = text;
  const regex = /(\$\$(.*?)\$\$)|(\$(.*?)\$)|(`[^`]+`)|(\*\*(.*?)\*\*)|(\*(.*?)\*)|(\[(.*?)\]\((.*?)\))/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: remaining.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      segments.push({ type: 'inlineMath', content: match[2] });
    } else if (match[3]) {
      segments.push({ type: 'inlineMath', content: match[4] });
    } else if (match[5]) {
      segments.push({ type: 'inlineCode', content: match[5].slice(1, -1) });
    } else if (match[6]) {
      segments.push({ type: 'bold', content: match[7] });
    } else if (match[8]) {
      segments.push({ type: 'italic', content: match[9] });
    } else if (match[10]) {
      segments.push({ type: 'link', content: match[11], href: match[12] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < remaining.length) {
    segments.push({ type: 'text', content: remaining.slice(lastIndex) });
  }
  return segments;
}

function InlineRenderer({ text }: { text: string }) {
  const segments = parseInline(text);
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'bold':
            return <strong key={i} className="font-semibold">{seg.content}</strong>;
          case 'italic':
            return <em key={i}>{seg.content}</em>;
          case 'inlineCode':
            return <code key={i} className="px-1.5 py-0.5 rounded bg-surface-variant text-error text-sm font-mono">{seg.content}</code>;
          case 'link':
            return <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{seg.content}</a>;
          case 'inlineMath':
            return <InlineMath key={i} formula={seg.content} />;
          default:
            return <span key={i}>{seg.content}</span>;
        }
      })}
    </>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  function flushList() {
    if (listItems.length === 0 || !listType) return;
    const Tag = listType === 'ul' ? 'ul' : 'ol';
    const listClass = listType === 'ul' ? 'list-disc' : 'list-decimal';
    elements.push(
      <Tag key={`${listType}-${elements.length}`} className={cn(listClass, 'pl-6 my-2 space-y-1')}>
        {listItems.map((item, idx) => (
          <li key={idx} className="text-body-md text-on-surface"><InlineRenderer text={item} /></li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  }

  function flushCode() {
    if (codeLines.length > 0) {
      elements.push(
        <CodeBlock key={`code-${elements.length}`} language={codeLanguage} code={codeLines.join('\n')} />
      );
      codeLines = [];
      codeLanguage = '';
    }
  }

  function flushTable() {
    if (tableRows.length > 0) {
      elements.push(<MarkdownTable key={`table-${elements.length}`} rows={tableRows} />);
      tableRows = [];
    }
  }

  function processParagraph(text: string) {
    const blockMathMatch = text.match(/^\$\$([\s\S]*?)\$\$$/);
    if (blockMathMatch) {
      flushList();
      elements.push(<MathBlock key={`math-${elements.length}`} formula={blockMathMatch[1].trim()} />);
      return;
    }
    if (/^#{1,6}\s/.test(text)) {
      flushList();
      const level = text.match(/^(#{1,6})\s/)?.[1].length || 1;
      const headingText = text.replace(/^#{1,6}\s/, '');
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const sizeClass = level === 1 ? 'text-headline-sm font-bold mt-6 mb-3' :
        level === 2 ? 'text-title-md font-bold mt-5 mb-2' :
        level === 3 ? 'text-title-sm font-semibold mt-4 mb-2' :
        'text-body-md font-semibold mt-3 mb-1';
      elements.push(
        <Tag key={`h-${elements.length}`} className={cn(sizeClass, 'text-on-surface')}>
          <InlineRenderer text={headingText} />
        </Tag>
      );
      return;
    }
    if (/^---/.test(text)) {
      flushList();
      elements.push(<hr key={`hr-${elements.length}`} className="my-4 border-outline-variant" />);
      return;
    }
    const ulMatch = text.match(/^[-*]\s(.+)/);
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(ulMatch[1]);
      return;
    }
    const olMatch = text.match(/^\d+\.\s(.+)/);
    if (olMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(olMatch[1]);
      return;
    }
    flushList();
    if (text.trim()) {
      elements.push(
        <p key={`p-${elements.length}`} className="text-body-md text-on-surface my-1.5 leading-relaxed">
          <InlineRenderer text={text} />
        </p>
      );
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const tableMatch = line.match(/^\|(.+)\|$/);
    if (tableMatch) {
      flushList();
      if (!inTable) {
        flushTable();
        inTable = true;
        tableRows = [];
      }
      const cells = tableMatch[1].split('|').map(c => c.trim());
      if (tableRows.length !== 1 || !/^[-:\s]+$/.test(cells.join(''))) {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
    }

    if (line.trim() === '') {
      flushList();
      continue;
    }

    processParagraph(line);
  }

  flushList();
  flushCode();
  flushTable();

  return <div className="space-y-0.5">{elements}</div>;
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default function StudentAITutorPage() {
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const saved = localStorage.getItem('ai-tutor-chat');
      if (saved) return JSON.parse(saved, (key, val) => key === 'timestamp' ? new Date(val) : val);
    } catch { /* ignore */ }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    try {
      localStorage.setItem('ai-tutor-chat', JSON.stringify(messages));
    } catch { /* ignore */ }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    try {
      const { reply } = await sendChatMessage(trimmed, history);
      const aiMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError('Voice recognition failed. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string, messageId: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, '').replace(/```[\s\S]*?```/g, '').replace(/\$\$[\s\S]*?\$\$/g, ''));
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    localStorage.removeItem('ai-tutor-chat');
  }, []);

  return (
    <>
      <SEOHead title="AI Tutor" description="24/7 AI Tutor Chatbot" />
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-container flex items-center justify-center">
              <Icon name="smart_toy" size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-title-md font-bold">AI Tutor</h1>
              <p className="text-label-sm text-on-surface-variant">24/7 learning assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="icon-sm" onClick={clearChat} aria-label="Clear chat">
                <Icon name="delete" size={18} />
              </Button>
            )}
            <Badge variant="success" className="text-[10px] gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Online
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="h-20 w-20 rounded-2xl bg-primary-container/40 flex items-center justify-center mb-6">
                <Icon name="smart_toy" size={48} className="text-primary/60" />
              </div>
              <h2 className="text-headline-sm font-bold mb-2">Hi, I'm your AI Tutor</h2>
              <p className="text-body-md text-on-surface-variant max-w-md mb-8">
                Ask me anything about your studies. I can help with math, science, programming, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedQuestions.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-3 px-4 text-left text-label-sm"
                    onClick={() => sendMessage(q)}
                  >
                    <Icon name="bolt" size={14} className="shrink-0 mr-2 text-primary" />
                    <span className="line-clamp-2">{q}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.05, 0, 0.133333, 0.06] }}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn('max-w-[90%] sm:max-w-[85%] md:max-w-[75%]', msg.role === 'user' && 'order-1')}>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-surface-variant/60 text-on-surface rounded-bl-md border border-outline-variant/40'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <p className="text-body-md whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-2 mt-1 px-1', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <span className="text-[10px] text-on-surface-variant/50">{formatTime(msg.timestamp)}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => speakingId === msg.id ? stopSpeaking() : speak(msg.content, msg.id)}
                        className="text-on-surface-variant/50 hover:text-primary transition-colors"
                        aria-label={speakingId === msg.id ? 'Stop' : 'Read aloud'}
                      >
                        <Icon name={speakingId === msg.id ? 'stop_circle' : 'volume_up'} size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl bg-surface-variant/60 border border-outline-variant/40 rounded-bl-md">
                <LoadingDots />
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error-container/30 text-error text-label-sm">
                <Icon name="error_outline" size={16} />
                {error}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-outline-variant px-4 py-3 shrink-0">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="min-h-[48px] max-h-[120px] pr-12 resize-none rounded-xl bg-surface-variant/30 border-outline-variant/60 focus-visible:ring-primary"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={isListening ? stopListening : startListening}
                  className={cn(isListening && 'text-error animate-pulse')}
                  aria-label={isListening ? 'Stop listening' : 'Voice input'}
                >
                  <Icon name={isListening ? 'mic_off' : 'mic'} size={18} />
                </Button>
              </div>
            </div>
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[48px] w-[48px] rounded-xl"
            >
              <Icon name="send" size={20} />
            </Button>
          </div>
          <p className="text-[10px] text-on-surface-variant/40 text-center mt-2">
            AI responses are generated by an AI model and may not always be accurate
          </p>
        </div>
      </div>
    </>
  );
}
