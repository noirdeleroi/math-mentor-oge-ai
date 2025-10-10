// supabase/functions/groq-chat-katex/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) throw new Error("GROQ_API_KEY is not configured in Supabase secrets");
    const { messages = [], stream = false, ...rest } = await req.json();
    const systemPrompt = `
Return ONLY Markdown (no HTML tags, no code fences).
For math, use KaTeX delimiters:
- Inline: $ ... $
- Display: $$ ... $$
Do NOT use \\[...\\] or \\(...\\).
Do NOT HTML-escape math symbols; write <, >, ≤, ≥ as-is inside math.
    `.trim();
    const augmentedMessages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...messages
    ];
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: augmentedMessages,
        stream,
        ...rest
      })
    });
    if (!response.ok) {
      const detail = await response.json().catch(()=>null);
      console.error("Groq API error:", detail || response.statusText);
      return new Response(JSON.stringify({
        error: "Groq API error",
        detail: detail || response.statusText
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive"
        }
      });
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in groq-chat-katex function:", error);
    return new Response(JSON.stringify({
      error: error?.message || "Unexpected server error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
