import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { codingService } from '@/services/codingService';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'python' | 'html';
  onLanguageChange: (lang: 'javascript' | 'python' | 'html') => void;
  onRun?: (output: string) => void;
  readOnly?: boolean;
}

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
] as const;

function highlightSyntax(code: string, language: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    let formatted: React.ReactNode = line;
    if (language === 'javascript' || language === 'html') {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      const rules: [RegExp, string][] = [
        [/(\/\/.*)/g, 'text-green-500'],
        [/(["'`])(?:(?!\1|\\).|\\.)*\1/g, 'text-amber-600'],
        [/(\b(?:const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b)/g, 'text-purple-600'],
        [/(\b(?:true|false|null|undefined|NaN)\b)/g, 'text-blue-600'],
        [/(\/\*[\s\S]*?\*\/)/g, 'text-green-500'],
      ];
      for (const [regex, className] of rules) {
        remaining = remaining.replace(regex, (match) => {
          parts.push(match);
          return '';
        });
      }
      if (remaining) parts.push(remaining);
      formatted = parts.length > 0 ? parts : line;
    } else if (language === 'python') {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      const rules: [RegExp, string][] = [
        [/(#.*)/g, 'text-green-500'],
        [/(["'])(?:(?!\1|\\).|\\.)*\1/g, 'text-amber-600'],
        [/(\b(?:def|class|if|elif|else|for|while|import|from|return|yield|try|except|finally|with|as|pass|break|continue|and|or|not|in|is|lambda|async|await|print|range|len|int|str|float|list|dict|set|True|False|None)\b)/g, 'text-purple-600'],
        [/(\b(?:self|cls)\b)/g, 'text-blue-600'],
      ];
      for (const [regex, className] of rules) {
        remaining = remaining.replace(regex, (match) => {
          parts.push(match);
          return '';
        });
      }
      if (remaining) parts.push(remaining);
      formatted = parts.length > 0 ? parts : line;
    }
    return <span key={i}>{formatted}{'\n'}</span>;
  });
}

export default function CodeEditor({ value, onChange, language, onLanguageChange, onRun, readOnly }: CodeEditorProps) {
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = value.split('\n');
  const lineCount = lines.length;

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput('');
    setError('');

    try {
      if (language === 'javascript') {
        // ponytail: sandbox JS execution instead of new Function() in main context
        const code = `
          try {
            const logs = [];
            const origLog = console.log;
            console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
            const result = (function() { ${value} })();
            console.log = origLog;
            const output = logs.join('\\n') + (result !== undefined ? '\\n=> ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)) : '');
            parent.postMessage({ type: '__sandbox_result__', output: output || '(no output)' }, '*');
          } catch(e) {
            parent.postMessage({ type: '__sandbox_result__', error: e.message }, '*');
          }
        `;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.setAttribute('sandbox', 'allow-scripts');
        document.body.appendChild(iframe);
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

  return (
    <div className="flex flex-col h-full rounded-xl border border-outline-variant bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant bg-surface-variant/30">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as 'javascript' | 'python' | 'html')}
            className="text-sm bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={readOnly}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRun}
          disabled={running || !value.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Icon name="play_arrow" size={16} />
          {running ? 'Running...' : 'Run'}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 font-mono text-sm leading-relaxed">
          <div className="absolute inset-0 flex">
            <div className="w-12 shrink-0 bg-surface-variant/20 text-right pr-3 pt-3 text-on-surface-variant/50 select-none text-sm leading-relaxed border-r border-outline-variant/30 overflow-hidden">
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>
            <pre className="flex-1 p-3 m-0 overflow-auto whitespace-pre text-sm leading-relaxed">
              <code className="text-on-surface">
                {highlightSyntax(value, language)}
              </code>
            </pre>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-primary font-mono text-sm leading-relaxed p-3 pl-[3.75rem] outline-none overflow-auto"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      </div>

      {language === 'html' && value.trim() && (
        <div className="border-t border-outline-variant">
          <div className="px-4 py-1.5 bg-surface-variant/30 text-label-sm font-medium text-on-surface-variant border-b border-outline-variant/50">
            Preview
          </div>
          <iframe
            srcDoc={value}
            className="w-full bg-white"
            style={{ height: 200, border: 'none' }}
            title="HTML Preview"
            sandbox="allow-scripts"
          />
        </div>
      )}

      {(output || error) && (
        <div className="border-t border-outline-variant">
          <div className="px-4 py-1.5 bg-surface-variant/30 text-label-sm font-medium text-on-surface-variant border-b border-outline-variant/50 flex items-center gap-2">
            <Icon name="terminal" size={14} />
            Output
          </div>
          <pre className={`p-4 text-sm font-mono leading-relaxed max-h-40 overflow-auto ${error ? 'text-red-600 bg-red-50' : 'text-on-surface bg-surface'}`}>
            {error || output}
          </pre>
        </div>
      )}
    </div>
  );
}
