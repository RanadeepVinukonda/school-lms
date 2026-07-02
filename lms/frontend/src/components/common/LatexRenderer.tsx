import { useEffect, useRef } from 'react';
import katex from 'katex';

interface Props {
  content: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

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

  // Dollar block: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => {
    try { return katex.renderToString(eq.trim(), { displayMode: true, throwOnError: false }); }
    catch { return `<span class="text-destructive">${eq}</span>`; }
  });

  // Dollar inline: $...$
  html = html.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (_, eq) => {
    try { return katex.renderToString(eq.trim(), { displayMode: false, throwOnError: false }); }
    catch { return `$${eq}$`; }
  });

  // Headers: ### text or ## text or # text
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-title-sm font-bold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-title-md font-bold mt-4 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-title-lg font-bold mt-4 mb-2">$1</h1>');

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (only if not inside a word)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

  // Unordered lists: lines starting with * or -
  html = html.replace(/^(\s*)[*\-] (.+)$/gm, '$1<li class="ml-4 list-disc text-body-md">$2</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="space-y-1 my-2">$&</ul>');

  // Ordered lists: lines starting with 1. 2. etc.
  html = html.replace(/^(\s*)(\d+)\. (.+)$/gm, '$1<li class="ml-4 list-decimal text-body-md">$3</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, (match) => {
    if (!match.startsWith('<ul')) return '<ol class="space-y-1 my-2">' + match + '</ol>';
    return match;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Line breaks: double newline = paragraph
  html = html.replace(/\n\n/g, '</p><p class="text-body-md leading-relaxed">');

  // Single newline = <br>
  html = html.replace(/\n/g, '<br />');

  return '<p class="text-body-md leading-relaxed">' + html + '</p>';
}

export default function LatexRenderer({ content, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = renderMarkdown(content);
    }
  }, [content]);

  return <div ref={ref} className={`latex-content ${className}`} />;
}
