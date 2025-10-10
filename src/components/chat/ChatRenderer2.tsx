import React, { useEffect, useRef } from "react";
import DOMPurify from "dompurify"; // sanitize incoming HTML
import { mathJaxManager } from "@/hooks/useMathJaxManager";

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

  // Sanitize model output
  const safeHTML = DOMPurify.sanitize(text || "", {
    USE_PROFILES: { html: true },
  });

  // Trigger MathJax typesetting after each render
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    // Wait a microtick to ensure DOM is painted
    const id = setTimeout(() => {
      try {
        mathJaxManager.renderMath(el);
      } catch (err) {
        console.error("MathJax render error:", err);
      }
    }, 10);

    return () => clearTimeout(id);
  }, [safeHTML]);

  return (
    <div
      ref={containerRef}
      className={`prose max-w-none ${className} ${
        isUserMessage ? "text-blue-100" : "text-gray-900"
      }`}
      data-message="chat-content"
      dangerouslySetInnerHTML={{ __html: safeHTML }}
    />
  );
};

export default ChatRenderer2;
