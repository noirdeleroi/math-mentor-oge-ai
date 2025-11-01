// supabase/functions/groq-chat-katex/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
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
    // --- Create Supabase client ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // --- Parse body ---
    const { messages = [], stream = false, user_id, ...rest } = await req.json();
    if (!user_id) {
      throw new Error("user_id is required");
    }
    // --- Inject KaTeX system prompt ---
    const systemPrompt = `
All mathematical expressions MUST use LaTeX syntax wrapped in KaTeX delimiters:
- Inline: $ ... $
- Display: $$ ... $$

Use Markdown for text only (no HTML, no code fences).

Rules:
- Always write math in pure LaTeX (e.g. $\\log_3(x)$, $x^2 = 4$).
- Never use Unicode subscripts/superscripts (₃, ², etc.).
- Do not HTML-escape symbols (<, >, ≤, ≥).
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
      // === Extract token usage and calculate cost ===
      const { prompt_tokens, completion_tokens } = openrouterData.usage || {};
      const model = openrouterData.model;
      const pricingTable = {
        "google/gemini-2.5-flash-lite-preview-09-2025": [
          0.30,
          2.50
        ],
        "google/gemini-2.5-flash-lite-preview-06-17": [
          0.10,
          0.40
        ],
        "google/gemini-2.5-flash-lite": [
          0.10,
          0.40
        ],
        "google/gemini-2.5-flash": [
          0.30,
          2.50
        ],
        "google/gemini-2.5-flash-preview-09-2025": [
          0.30,
          2.50
        ],
        "x-ai/grok-3-mini": [
          0.30,
          0.50
        ],
        "x-ai/grok-4-fast": [
          0.20,
          0.50
        ],
        "x-ai/grok-code-fast-1": [
          0.20,
          1.50
        ],
        "qwen/qwen3-coder-flash": [
          0.30,
          1.50
        ],
        "openai/o4-mini": [
          1.10,
          4.40
        ],
        "anthropic/claude-haiku-4.5": [
          1.00,
          5.00
        ]
      };
      // Get prices per million tokens
      const [priceIn, priceOut] = pricingTable[model] || [
        0,
        0
      ];
      const price = prompt_tokens / 1_000_000 * priceIn + completion_tokens / 1_000_000 * priceOut;
      // === Insert into Supabase user_credits table ===
      const { error: insertError } = await supabase.from('user_credits').insert({
        user_id: user_id,
        tokens_in: prompt_tokens,
        tokens_out: completion_tokens,
        price: price
      });
      if (insertError) {
        console.error('❌ Failed to insert user credits:', insertError.message);
      } else {
        console.log(`✅ Stored usage for ${model}: ${prompt_tokens} in, ${completion_tokens} out, $${price.toFixed(6)} total`);
      }
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
