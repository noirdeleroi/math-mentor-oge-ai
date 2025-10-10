import React, { useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { mathJaxManager } from '@/hooks/useMathJaxManager';

interface ChatRenderer2Props {
  text: string;
  isUserMessage?: boolean;
  className?: string;
}

/** Minimal decode so &amp; in model output doesn’t break LaTeX like \log_{2} */
const decodeBasicEntities = (s: string) =>
  s
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

/** Optional light sanitization that won’t touch $ or backslashes */
const sanitize = (s: string) =>
  s
    .replace(/\\%/g, '%')
    .replace(/\{\{/g, '{')
    .replace(/\}\}/g, '}');

const ChatRenderer2 = ({
  text,
  isUserMessage = false,
  className = '',
}: ChatRenderer2Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Don’t normalize math delimiters; MathJax understands \(...\), \[...\], and $$...$$ natively.
  const processed = useMemo(() => sanitize(decodeBasicEntities(text || '')), [text]);

  // After React renders the markdown/HTML, let MathJax typeset in-place.
  useEffect(() => {
    if (!containerRef.current) return;
    // queue typesetting on next microtask to ensure DOM is fully painted
    const id = setTimeout(() => {
      try {
        mathJaxManager.renderMath(containerRef.current!);
      } catch (e) {
        // keep UI alive even if MathJax hiccups
        console.error('MathJax render error:', e);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [processed]);

  // A changing key forces React to remount the subtree when content changes,
  // which avoids rare React/MathJax DOM reconciliation conflicts.
  const remountKey = useMemo(() => String(processed.length) + ':' + processed.slice(0, 64), [processed]);

  return (
    <div ref={containerRef} className={className} data-message="chat-content">
      <ReactMarkdown
        key={remountKey}
        // Parse markdown + GitHub tables/lists
        remarkPlugins={[remarkGfm, remarkMath]}
        // Allow raw HTML in the message (the LLM often returns <p>, <blockquote>, <ol>, etc.)
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline hover:no-underline ${
                isUserMessage ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className?.includes('language-');
            return isInline ? (
              <code
                className={`px-1 py-0.5 rounded text-sm font-mono ${
                  isUserMessage ? 'bg-white/20 text-blue-100' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {children}
              </code>
            ) : (
              <pre
                className={`p-3 rounded-lg text-sm overflow-x-auto ${
                  isUserMessage ? 'bg-white/20 text-blue-100' : 'bg-gray-100 text-gray-800'
                }`}
              >
                <code>{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote
              className={`pl-4 border-l-4 italic my-2 ${
                isUserMessage ? 'border-blue-200 text-blue-100' : 'border-gray-300 text-gray-600'
              }`}
            >
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mb-2">{children}</h3>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
};

export default ChatRenderer2;
