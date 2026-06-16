import { useEffect, useRef } from 'react';
import katex from 'katex';

interface Props {
  content: string;
  className?: string;
}

function renderLatex(text: string): string {
  let html = text;

  // Block math: \[ ... \]
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => {
    try { return katex.renderToString(eq.trim(), { displayMode: true, throwOnError: false }); }
    catch { return `<span class="text-destructive">${eq}</span>`; }
  });

  // Inline math: \( ... \)
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => {
    try { return katex.renderToString(eq.trim(), { displayMode: false, throwOnError: false }); }
    catch { return `<span class="text-destructive">${eq}</span>`; }
  });

  // Dollar inline: $...$ (avoid double-rendering)
  html = html.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (_, eq) => {
    try { return katex.renderToString(eq.trim(), { displayMode: false, throwOnError: false }); }
    catch { return `$${eq}$`; }
  });

  // Dollar block: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => {
    try { return katex.renderToString(eq.trim(), { displayMode: true, throwOnError: false }); }
    catch { return `<span class="text-destructive">${eq}</span>`; }
  });

  return html;
}

export default function LatexRenderer({ content, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = renderLatex(content);
    }
  }, [content]);

  return <div ref={ref} className={`latex-content ${className}`} />;
}
