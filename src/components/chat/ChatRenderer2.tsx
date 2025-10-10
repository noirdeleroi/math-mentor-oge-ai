import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

// Math delimiter normalization functions (safe: function replacers so `$` isn't special)
const normalizeMathDelimiters = (input: string): string => {
  let s = input;

  const toDisplay = (_: string, m: string) => `$$${m}$$`;
  const toInline  = (_: string, m: string) => `$${m}$`;

  // \[...\]  →  $$...$$
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, toDisplay);

  // \(...\)  →  $...$
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, toInline);

  // [math]...[/math] → $$...$$
  s = s.replace(/\[math\]([\s\S]*?)\[\/math\]/g, toDisplay);

  // (math)...(math) → $$...$$
  s = s.replace(/\(math\)([\s\S]*?)\(math\)/g, toDisplay);

  // {math}...{/math} → $$...$$
  s = s.replace(/\{math\}([\s\S]*?)\{\/math\}/g, toDisplay);

  // <math>...</math> → $$...$$
  s = s.replace(/<math>([\s\S]*?)<\/math>/g, toDisplay);

  // <m>...</m> → $...$  (inline)
  s = s.replace(/<m>([\s\S]*?)<\/m>/g, toInline);

  // Optional heuristic: [...] → $$...$$ when it looks like LaTeX
  s = s.replace(/\[([^\]]*(?:frac|sqrt|sum|int|lim)[^\]]*)\]/g, toDisplay);

  return s;
};

// LaTeX content sanitization
const sanitizeLatex = (input: string): string => {
  // Remove extra braces and escape percentage signs
  return input.replace(/\\%/g, '%').replace(/\{\{/g, '{').replace(/\}\}/g, '}');
};

interface ChatRenderer2Props {
  text: string;
  isUserMessage?: boolean;
  className?: string;
}

const ChatRenderer2 = ({
  text,
  isUserMessage = false,
  className = ""
}: ChatRenderer2Props) => {
  // Preprocess the text to normalize delimiters and sanitize LaTeX
  const processedText = useMemo(() => {
    let processed = normalizeMathDelimiters(text);
    processed = sanitizeLatex(processed);
    return processed;
  }, [text]);

  return (
    <div className={className} data-message="chat-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
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
              <code className={`px-1 py-0.5 rounded text-sm font-mono ${
                isUserMessage
                  ? 'bg-white/20 text-blue-100'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {children}
              </code>
            ) : (
              <pre className={`p-3 rounded-lg text-sm overflow-x-auto ${
                isUserMessage
                  ? 'bg-white/20 text-blue-100'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <code>{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className={`pl-4 border-l-4 italic my-2 ${
              isUserMessage
                ? 'border-blue-200 text-blue-100'
                : 'border-gray-300 text-gray-600'
            }`}>
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
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

export default ChatRenderer2;
