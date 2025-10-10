import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ChatRenderer2Props {
  text: string;
  isUserMessage?: boolean;
  className?: string;
}

/**
 * Normalize LaTeX delimiters for KaTeX/remark-math:
 *  - \[ ... \]   -> $$ ... $$
 *  - \( ... \)   -> $ ... $
 *
 * IMPORTANT: use function replacers to avoid "$1" style bugs.
 */
const normalizeForKaTeX = (input: string): string => {
  if (!input) return '';
  let s = input;

  // If your LLM sometimes HTML-escapes ampersands, unescape them
  // so things like \log_{2} don’t become \log_{2} with &amp;.
  s = s.replace(/&amp;/g, '&');

  // Display math: \[...\] -> $$...$$ (surround with newlines so remark-math treats it as block)
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_m, g1) => `\n\n$$${g1}$$\n\n`);
  // Inline math: \(...\) -> $...$
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_m, g1) => `$${g1}$`);

  // DO NOT add any other heuristics. They cause "$1" issues.
  return s;
};

const ChatRenderer2 = ({
  text,
  isUserMessage = false,
  className = '',
}: ChatRenderer2Props) => {
  const processed = useMemo(() => normalizeForKaTeX(text || ''), [text]);

  return (
    <div className={className} data-message="chat-content">
      <ReactMarkdown
        // Parse markdown & math. singleDollarTextMath allows $...$ inline.
        remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
        // Render the math with KaTeX. Do not throw; just render what we can.
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
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
