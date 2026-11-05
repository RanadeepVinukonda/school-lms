import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { codingService } from '@/services/codingService';
import type { CodingLanguage } from '@/types/coding';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodingLanguage;
  onLanguageChange: (lang: CodingLanguage) => void;
  onRun?: (output: string) => void;
  readOnly?: boolean;
}

const LANGUAGE_OPTIONS: { value: CodingLanguage; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML' },
];

const KEYWORDS: Record<string, string[]> = {
  javascript: ['const','let','var','function','return','if','else','for','while','class','import','export','from','async','await','try','catch','throw','new','this','typeof','instanceof','switch','case','break','continue','do','in','of','yield','static','extends','super','delete','void'],
  python: ['def','class','if','elif','else','for','while','import','from','return','yield','try','except','finally','with','as','pass','break','continue','and','or','not','in','is','lambda','async','await','print','range','len','int','str','float','list','dict','set','True','False','None','self','cls','raise','global','nonlocal','del'],
  java: ['public','private','protected','class','interface','extends','implements','static','final','void','int','double','float','boolean','String','long','short','byte','char','if','else','for','while','do','switch','case','break','continue','return','new','this','super','try','catch','finally','throw','throws','import','package','abstract','synchronized','volatile','transient','instanceof','enum','var'],
  c: ['int','float','double','char','void','long','short','unsigned','signed','const','volatile','if','else','for','while','do','switch','case','break','continue','return','struct','union','enum','typedef','static','extern','register','auto','sizeof','goto'],
  cpp: ['int','float','double','char','void','long','short','unsigned','signed','const','if','else','for','while','do','switch','case','break','continue','return','class','struct','union','enum','typedef','static','extern','virtual','override','public','private','protected','template','typename','namespace','using','new','delete','this','friend','operator','inline','throw','try','catch'],
  html: [],
};

const TYPES: Record<string, string[]> = {
  javascript: ['true','false','null','undefined','NaN'],
  python: ['True','False','None'],
  java: ['true','false','null'],
  c: ['true','false','NULL'],
  cpp: ['true','false','nullptr','NULL'],
  html: [],
};

function highlightSyntax(code: string, language: string): React.ReactNode {
  const lines = code.split('\n');
  const keywords = KEYWORDS[language] || [];
  const types = TYPES[language] || [];
  const kwPattern = keywords.length > 0 ? `\\b(?:${keywords.join('|')})\\b` : null;
  const typePattern = types.length > 0 ? `\\b(?:${types.join('|')})\\b` : null;

  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    const rules: [RegExp, string][] = [
      [/(\/\/.*)/g, 'text-green-500'],
      [/(#.*)/g, 'text-green-500'],
      [/(["'`])(?:(?!\1|\\).|\\.)*\1/g, 'text-amber-600'],
      [/(\/\*[\s\S]*?\*\/)/g, 'text-green-500'],
    ];

    if (kwPattern) rules.push([new RegExp(`(${kwPattern})`, 'g'), 'text-purple-600']);
    if (typePattern) rules.push([new RegExp(`(${typePattern})`, 'g'), 'text-blue-600']);

    rules.push([(/\b(\d+\.?\d*)\b/g), 'text-teal-600']);

    for (const [regex, className] of rules) {
      remaining = remaining.replace(regex, (match) => {
        parts.push(<span className={className}>{match}</span>);
        return '\x00'.repeat(match.length);
      });
    }
    if (remaining) {
      const segs = remaining.split('\x00');
      for (let si = 0; si < segs.length; si++) {
        if (segs[si]) parts.push(segs[si]);
      }
    }
    return <div key={i} className="leading-relaxed">{parts.length > 0 ? parts : line}{'\n'}</div>;
  });
}

export default function CodeEditor({ value, onChange, language, onLanguageChange, onRun, readOnly }: CodeEditorProps) {
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [splitView, setSplitView] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const lineCount = lines.length;

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput('');
    setError('');

    try {
      if (language === 'javascript') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.setAttribute('sandbox', 'allow-scripts');
        document.body.appendChild(iframe);
        const outputLines: string[] = [];
        const fakeConsole = (...args: unknown[]) => {
          outputLines.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        };
        const code = `
          try {
            const results = [];
            const _log = console.log;
            console.log = function() { results.push(Array.from(arguments).map(function(a) { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }).join(' ')); };
            var __result__ = (function() { ${value} })();
            console.log = _log;
            var __output__ = results.join('\\\\n') + (__result__ !== undefined ? '\\\\n=> ' + (typeof __result__ === 'object' ? JSON.stringify(__result__, null, 2) : String(__result__)) : '');
            parent.postMessage({ type: '__sandbox_result__', output: __output__ || '(no output)' }, '*');
          } catch(e) {
            parent.postMessage({ type: '__sandbox_result__', error: e.message }, '*');
          }
        `;
        const msgHandler = (e: MessageEvent) => {
          if (e.data?.type === '__sandbox_result__' && e.source === iframe.contentWindow) {
            window.removeEventListener('message', msgHandler);
            document.body.removeChild(iframe);
            if (e.data.error) { setError(e.data.error); if (onRun) onRun(e.data.error); }
            else { setOutput(e.data.output); if (onRun) onRun(e.data.output); }
          }
        };
        window.addEventListener('message', msgHandler);
        iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent('<script>' + code.replace(/<\/script>/g, '<\\/script>') + '<\/script>');
        setTimeout(() => { if (document.body.contains(iframe)) { document.body.removeChild(iframe); window.removeEventListener('message', msgHandler); setError('Execution timed out'); } }, 10000);
      } else if (language === 'html') {
        setOutput('HTML rendered in preview below');
        if (onRun) onRun('HTML rendered in preview below');
      } else {
        try {
          const result = await codingService.executeCode(value, language);
          const output = result?.result?.output || '(no output)';
          setOutput(output);
          if (onRun) onRun(output);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          setError(errMsg);
          if (onRun) onRun(errMsg);
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setError(errMsg);
      if (onRun) onRun(errMsg);
    }
    setRunning(false);
  }, [value, language, onRun]);

  useEffect(() => {
    if (language === 'html' && value) {
      setOutput('HTML preview available');
    }
  }, [language, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const handleReset = () => {
    onChange('');
    setOutput('');
    setError('');
  };

  const toggleFullscreen = () => setFullscreen(!fullscreen);

  const editorContent = (
    <div className="flex flex-col h-full rounded-xl border border-outline-variant bg-surface overflow-hidden dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant bg-surface-variant/30 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as CodingLanguage)}
            className="text-sm bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            disabled={readOnly}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            disabled={!value && !output}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-variant/70 disabled:opacity-30 transition-colors"
            title="Reset"
          >
            <Icon name="refresh" size={15} />
          </button>
          <button
            onClick={() => setSplitView(!splitView)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${splitView ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/70'}`}
            title={splitView ? 'Single view' : 'Split view'}
          >
            <Icon name={splitView ? 'vertical_split' : 'horizontal_split'} size={15} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-variant/70 transition-colors"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={15} />
          </button>
          <button
            onClick={handleRun}
            disabled={running || !value.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors ml-2"
          >
            <Icon name="play_arrow" size={16} />
            {running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      <div className={`flex flex-1 min-h-0 ${splitView ? 'flex-row' : 'flex-col'} ${language === 'html' && value.trim() ? 'flex-col' : ''}`}>
        <div className={`relative font-mono text-sm leading-relaxed ${splitView && language !== 'html' ? 'flex-1' : 'flex-1'} ${!splitView && language !== 'html' ? 'h-1/2' : ''}`}>
          <div className="absolute inset-0 flex">
            <div className="w-12 shrink-0 bg-surface-variant/20 text-right pr-3 pt-3 text-on-surface-variant/50 select-none text-sm leading-relaxed border-r border-outline-variant/30 overflow-hidden dark:bg-gray-800/20 dark:border-gray-700/30">
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>
            <pre className="flex-1 p-3 m-0 overflow-auto whitespace-pre text-sm leading-relaxed dark:bg-gray-900">
              <code className="text-on-surface dark:text-gray-100">
                {highlightSyntax(value, language)}
              </code>
            </pre>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-primary font-mono text-sm leading-relaxed p-3 pl-[3.75rem] outline-none overflow-auto dark:caret-blue-400"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>

        {(splitView || language === 'html') && (output || error) && (
          <div className={`border-l border-outline-variant dark:border-gray-700 ${splitView && language !== 'html' ? 'w-1/2' : 'w-full'}`}>
            <div className="px-4 py-1.5 bg-surface-variant/30 text-label-sm font-medium text-on-surface-variant border-b border-outline-variant/50 dark:bg-gray-800 dark:border-gray-700 flex items-center gap-2">
              <Icon name="terminal" size={14} />
              Output
            </div>
            <pre className={`p-4 text-sm font-mono leading-relaxed max-h-60 overflow-auto h-full ${error ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' : 'text-on-surface bg-surface dark:bg-gray-900 dark:text-gray-100'}`}>
              {error || output || '(no output)'}
            </pre>
          </div>
        )}
      </div>

      {language === 'html' && value.trim() && (
        <div className="border-t border-outline-variant dark:border-gray-700">
          <div className="px-4 py-1.5 bg-surface-variant/30 text-label-sm font-medium text-on-surface-variant border-b border-outline-variant/50 dark:bg-gray-800 dark:border-gray-700">
            Preview
          </div>
          <iframe
            srcDoc={value}
            className="w-full bg-white dark:bg-white"
            style={{ height: 200, border: 'none' }}
            title="HTML Preview"
            sandbox="allow-scripts"
          />
        </div>
      )}

      {!splitView && !error && output && language !== 'html' && (
        <div className="border-t border-outline-variant dark:border-gray-700">
          <div className="px-4 py-1.5 bg-surface-variant/30 text-label-sm font-medium text-on-surface-variant border-b border-outline-variant/50 dark:bg-gray-800 dark:border-gray-700 flex items-center gap-2">
            <Icon name="terminal" size={14} />
            Output
          </div>
          <pre className="p-4 text-sm font-mono leading-relaxed max-h-40 overflow-auto text-on-surface bg-surface dark:bg-gray-900 dark:text-gray-100">
            {output}
          </pre>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-background dark:bg-gray-950 p-4">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-label-sm text-muted-foreground">{language.toUpperCase()} - {lineCount} lines</p>
            <button onClick={toggleFullscreen} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-variant/70 transition-colors">
              <Icon name="fullscreen_exit" size={16} />
              Exit Fullscreen
            </button>
          </div>
          <div className="flex-1 min-h-0">{editorContent}</div>
        </div>
      </div>
    );
  }

  return editorContent;
}
