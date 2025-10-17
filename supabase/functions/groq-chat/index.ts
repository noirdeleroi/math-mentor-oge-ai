// supabase/functions/groq-chat-katex/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// ✅ Enhanced: detect Groq quota OR internal server errors
function isGroqLimitError(status, detail) {
  if (status === 429 || status === 403) return true; // rate or quota
  if (status >= 500 && status < 600) return true; // internal Groq error
  const text = JSON.stringify(detail || "").toLowerCase();
  return text.includes("limit") || text.includes("quota") || text.includes("exceed");
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // --- Extract API keys ---
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!groqApiKey && !openrouterApiKey) {
      throw new Error("Neither GROQ_API_KEY nor OPENROUTER_API_KEY are configured in Supabase secrets");
    }
    // --- Parse body ---
    const { messages = [], stream = false, ...rest } = await req.json();
    // --- Inject KaTeX system prompt ---
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
    // --- Primary: Groq API call ---
    console.log("🔹 Sending request to Groq API");
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: augmentedMessages,
        stream,
        ...rest
      })
    });
    // --- Handle Groq failure / quota / 5xx ---
    if (!groqResponse.ok) {
      const detail = await groqResponse.json().catch(()=>null);
      console.error("Groq API error:", detail || groqResponse.statusText);
      if (isGroqLimitError(groqResponse.status, detail)) {
        console.warn(`⚠️ Groq unavailable (status ${groqResponse.status}) — switching to OpenRouter`);
      } else {
        return new Response(JSON.stringify({
          error: "Groq API error",
          detail: detail || groqResponse.statusText
        }), {
          status: groqResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // --- Fallback: OpenRouter ---
      if (!openrouterApiKey) {
        throw new Error("Groq unavailable, but OPENROUTER_API_KEY not configured");
      }
      console.log("🔁 Sending request to OpenRouter fallback (Gemini 2.5 Flash Lite)");
      const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterApiKey}`,
          "HTTP-Referer": "https://egechat.ru",
          "X-Title": "EGEChat Math Tutor"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite-preview-09-2025",
          messages: augmentedMessages,
          ...rest
        })
      });
      if (!openrouterResponse.ok) {
        const orDetail = await openrouterResponse.json().catch(()=>null);
        console.error("❌ OpenRouter API error:", orDetail || openrouterResponse.statusText);
        return new Response(JSON.stringify({
          error: "OpenRouter API error",
          detail: orDetail || openrouterResponse.statusText
        }), {
          status: openrouterResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      const openrouterData = await openrouterResponse.json();
      return new Response(JSON.stringify(openrouterData), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // --- GROQ OK ---
    const data = await groqResponse.json();
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
