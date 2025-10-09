import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const PromptBar = () => {
  const [userQuery, setUserQuery] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isLoading) return;

    setIsLoading(true);
    setResponse("");

    try {
      console.log('🚀 Starting request to Supabase function with:', userQuery);
      
      // Use direct fetch with proper environment variables
      const supabaseUrl = "https://kbaazksvkvnafrwtmkcw.supabase.co";
      const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiYWF6a3N2a3ZuYWZyd3Rta2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTg2NTAsImV4cCI6MjA2MjMzNDY1MH0.aSyfch6PX1fr9wyWSGpUPNzT6jjIdfu9eA3E3J4uqzs";
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-user-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ userQuery }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse JSON response
      const data = await response.json();
      console.log('📦 Received response data:', data);
      
      // Extract the content from the response
      const content = data.response || '';
      setResponse(content);

      console.log('✅ Response set successfully');
    } catch (error) {
      console.error('Error processing query:', error);
      setResponse('Произошла ошибка при обработке вашего запроса. Попробуйте позже.');
    } finally {
      setIsLoading(false);
      setUserQuery("");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-4 border-2 border-yellow-500/20 rounded-xl bg-gradient-to-r from-yellow-500/20 via-emerald-500/20 to-yellow-500/20">
      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Задайте любой вопрос о платформе"
          className="flex-1 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={!userQuery.trim() || isLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Response box */}
      {(response || isLoading) && (
        <div className="rounded-xl border border-border bg-card p-4 min-h-[100px]">
          {isLoading && !response && (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-white" 
                   style={{
                     animation: 'colorTransition 0.5s ease-in-out infinite alternate'
                   }}>
              </div>
            </div>
          )}
          {response && (
            <div className="text-card-foreground prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  )
                }}
              >
                {response}
              </ReactMarkdown>
              {isLoading && <span className="animate-pulse">|</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptBar;