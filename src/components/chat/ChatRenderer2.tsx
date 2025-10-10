import React, { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// --- Helpers for math delimiters (optional) ---
const normalizeMathDelimiters = (input: string): string => {
  let s = input;
  const toDisplay = (_: string, m: string) => `$$${m}$$`;
  const toInline = (_: string, m: string) => `$${m}$`;
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, toDisplay);
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, toInline);
  return s;
};
const sanitizeLatex = (input: string): string =>
  input.replace(/\\%/g, "%").replace(/\{\{/g, "{").replace(/\}\}/g, "}");

// --- Component ---
interface ChatRenderer2Props {
  text: string;
  isUserMessage?: boolean;
  className?: string;
}

const ChatRenderer2 = ({
  text,
  isUserMessage = false,
  className = "",
}: ChatRenderer2Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // normalize text once
  const processedText = useMemo(() => {
    let processed = normalizeMathDelimiters(text);
    processed = sanitizeLatex(processed);
    return processed;
  }, [text]);

  // ⬇️ Safely typeset after React paints
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // wait a microtick so React finishes all commits
    const handle = setTimeout(() => {
      // @ts-ignore
      if (window.MathJax?.typesetPromise) {
        // only typeset this subtree
        // @ts-ignore
        window.MathJax.typesetPromise([root]).catch((err: any) =>
          console.error("MathJax typeset error:", err)
        );
      }
    }, 10);

    return () => clearTimeout(handle);
  }, [processedText]);

  return (
    <div ref={containerRef} className={className} data-message="chat-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline hover:no-underline ${
                isUserMessage
                  ? "text-blue-100 hover:text-white"
                  : "text-blue-600 hover:text-blue-800"
              }`}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className?.includes("language-");
            return isInline ? (
              <code
                className={`px-1 py-0.5 rounded text-sm font-mono ${
                  isUserMessage
                    ? "bg-white/20 text-blue-100"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {children}
              </code>
            ) : (
              <pre
                className={`p-3 rounded-lg text-sm overflow-x-auto ${
                  isUserMessage
                    ? "bg-white/20 text-blue-100"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <code>{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote
              className={`pl-4 border-l-4 italic my-2 ${
                isUserMessage
                  ? "border-blue-200 text-blue-100"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-md font-bold mb-2">{children}</h3>
          ),
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
