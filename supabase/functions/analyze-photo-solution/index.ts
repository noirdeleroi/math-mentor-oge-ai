import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// ---------- JSON hardening helpers ----------
const cleanAndExtractJsonBlock = (raw)=>{
  if (!raw) return null;
  let s = raw.trim().replace(/^\uFEFF/, "");
  // Unwrap "double-encoded" JSON strings
  if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
    try {
      const unwrapped = JSON.parse(s);
      if (typeof unwrapped === "string") s = unwrapped.trim();
    } catch  {}
  }
  // Strip code fences ```json ... ```
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  // Normalize smart quotes
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // Keep outermost {...}
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i !== -1 && j !== -1 && j > i) s = s.slice(i, j + 1).trim();
  else return null;
  return s;
};
const parseModelJsonSafe = (raw)=>{
  const block = cleanAndExtractJsonBlock(raw);
  if (!block) return null;
  try {
    const obj = JSON.parse(block);
    if (typeof obj === "string") {
      const block2 = cleanAndExtractJsonBlock(obj);
      if (!block2) return null;
      return JSON.parse(block2);
    }
    return obj;
  } catch  {
    return null;
  }
};
const clampScore = (x)=>{
  const n = typeof x === "number" ? x : Number(String(x ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(2, n));
};
const sanitizeReviewHtml = (s)=>{
  let t = String(s ?? "");
  // Make it single-line-ish: collapse newlines to spaces
  t = t.replace(/\r?\n+/g, " ");
  // Replace $$..$$ with \(..\) to avoid MathJax issues
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, (_m, p1)=>`\\(${p1}\\)`);
  // Ensure allowed tags only (very light pass)
  // (We trust model to keep <p>,<b>,<i>,<span>,<code>,<br/>; you can add a stricter sanitizer if needed.)
  return t.trim();
};
const normalizePayload = (obj)=>{
  const scores = clampScore(obj?.scores);
  const review = sanitizeReviewHtml(obj?.review);
  return {
    scores,
    review
  };
};
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  try {
    // Supabase client (service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase env vars are missing");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterApiKey) throw new Error("OPENROUTER_API_KEY is not configured");
    const { student_solution, problem_text, solution_text, user_id, question_id, exam_id, problem_number } = await req.json();
    if (!student_solution || !problem_text || !solution_text) {
      return new Response(JSON.stringify({
        error: "Missing required parameters"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ---------- First call: analysis ----------
    const prompt = `Ты строгий, но справедливый учитель математики. Проанализируй решение ученика по условию задачи, СРАВНИВАЯ его с "Правильным решением". Используй OCR-текст (возможны опечатки), но постарайся сохранить математический смысл.

Входные данные:
- Условие задачи:
${problem_text}

- Правильное решение (эталонное):
${solution_text}

- Решение ученика (OCR):
${student_solution}

Твоя задача:
1. Сравни шаги "Правильного решения" с текстом OCR-решения ученика.
2. Определи ошибки ученика: арифметические, алгебраические, логические, неверные данные, пропуски шагов, ошибки в оформлении и т. п.
3. Сформируй понятные объяснения для каждой найденной ошибки (кратко и по делу). Используй MathJax-совместимую разметку для формул: \\( ... \\) для встроенной математики и \\[ ... \\] для блочной.
4. Определи итоговый числовой балл по правилам:
   - **2** — решение корректное, без критичных ошибок;
   - **1** — решение доведено до конца, но есть локальная ошибка (например, арифметическая);
   - **0** — ответ неверен, решение не завершено, или ошибка фундаментальна.

Формат вывода:
Верни **ТОЛЬКО один валидный JSON-объект UTF-8** такого вида:
{
  "scores": <0|1|2>,
  "review": "<p><b>Ошибка 1:</b> краткое объяснение первой ошибки; при необходимости включай фрагменты OCR в теге <code>...</code>; формулы оформляй через \\( ... \\) или \\[ ... \\].</p>
             <p><b>Ошибка 2:</b> краткое объяснение второй ошибки ...</p>
             ...
             <p><b>Оценка:</b> лаконичное резюме с мотивацией выставленного балла (например: Оценка: X — причина).</p>"
}

Требования к полю "review":
- Это **одна строка HTML**, совместимая с MathJax (используй только обычные HTML-теги: <p>, <b>, <i>, <span>, <code>, <br/>).
- Каждая ошибка — отдельный абзац вида: <p><b>Ошибка N:</b> ...</p>, нумерация с 1.
- Итоговая сводка — отдельный абзац, начинающийся с <b>Оценка:</b>.
- Если ошибок нет, не добавляй абзацы «Ошибка N», укажи только абзац «<b>Оценка:</b> Решение верно ...».

Обязательные ограничения:
- Не добавляй Markdown, комментарии или текст вне JSON.
- Не заключай JSON в тройные кавычки.
- Пиши «review» на русском языке, кратко и ясно.`;
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        // Try to enforce JSON if the router/provider supports it
        response_format: {
          type: "json_object"
        }
      })
    });
    if (!response.ok) {
      let err = null;
      try {
        err = await response.json();
      } catch  {}
      console.error("OpenRouter API error:", err || response.statusText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    const data = await response.json();
    const usage = data?.usage || {};
    const model = data?.model;
    // Log credits for first call (if usage available)
    if (typeof usage.prompt_tokens === "number" || typeof usage.completion_tokens === "number") {
      const { error: insertError } = await supabase.from("user_credits").insert({
        user_id,
        tokens_in: usage.prompt_tokens || 0,
        tokens_out: usage.completion_tokens || 0,
        price: (()=>{
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
          const [pin, pout] = pricingTable[model] || [
            0,
            0
          ];
          return (usage.prompt_tokens || 0) / 1_000_000 * pin + (usage.completion_tokens || 0) / 1_000_000 * pout;
        })()
      });
      if (insertError) console.error("❌ Failed to insert user credits (call 1):", insertError.message);
    }
    let feedback = data?.choices?.[0]?.message?.content;
    if (!feedback) throw new Error("No feedback received from OpenRouter API");
    // ---------- (Optional) second call: polish ONLY the review string ----------
    const polishPrompt = `You are given a JSON string called feedback:

FEEDBACK_START
${feedback}
FEEDBACK_END

Your task: return the EXACT SAME JSON structure and meaning, but with fixes applied **ONLY** inside the string value of the key "review". DO NOT add or remove keys. DO NOT reorder arrays. DO NOT change numbers or booleans. DO NOT add comments or Markdown. Return ONLY the corrected JSON.

### Invariants (MUST NOT break)
- Keep the top-level shape: {"scores": <0|1|2>, "review": "<HTML>"}.
- Preserve all keys, nesting, and array lengths exactly as in the input.
- Preserve all numeric and boolean values exactly (including "scores").
- Do not invent or delete fields, steps, or errors.
- Do not wrap the entire JSON in backticks or code fences. Output must be valid JSON UTF-8.

### What to change (inside "review" ONLY)
- Make the HTML **MathJax-compatible**:
  - Use only simple HTML tags: <p>, <b>, <i>, <span>, <code>, <br/>.
  - Inline math must be wrapped as \\( ... \\); block math as \\[ ... \\]. **Do not use** $$ ... $$.
  - Do not use Markdown.
- Ensure the review is structured as paragraphs in Russian:
  - Each error in its own paragraph: \`<p><b>Ошибка N:</b> ...</p>\` with consecutive numbering starting at 1.
  - Final summary paragraph: \`<p><b>Оценка:</b> ...</p>\`.
  - If there are no errors, omit all "Ошибка N" paragraphs and include only the "Оценка" paragraph.
- Improve clarity, spelling, and punctuation in Russian **without changing the mathematical meaning**.
- Normalize whitespace, close all tags, and HTML-escape special characters that are not part of MathJax math.
- Keep the original intent and conclusions; do not alter facts, results, or the assigned score.

### JSON validity
- Ensure the output is valid JSON.
- Keep all existing keys even if empty strings/arrays.

### IMPORTANT
- **Do not wrap the entire JSON in backticks or code fences.**
- **CHANGE NOTHING EXCEPT the string content of "review".**
- DO NOT change any numbers, booleans, indices, IDs, or array orders.
- DO NOT add explanations. Return ONLY the corrected JSON.`;
    let finalText = feedback; // fallback to first output
    try {
      const polishResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "x-ai/grok-code-fast-1",
          messages: [
            {
              role: "user",
              content: polishPrompt
            }
          ],
          temperature: 0,
          response_format: {
            type: "json_object"
          }
        })
      });
      if (polishResp.ok) {
        const polishData = await polishResp.json();
        const usage2 = polishData?.usage || {};
        const model2 = polishData?.model;
        // Log credits for second call — FIXED (uses prompt_tokens1/completion_tokens1 equivalents)
        if (typeof usage2.prompt_tokens === "number" || typeof usage2.completion_tokens === "number") {
          const { error: insertError2 } = await supabase.from("user_credits").insert({
            user_id,
            tokens_in: usage2.prompt_tokens || 0,
            tokens_out: usage2.completion_tokens || 0,
            price: (()=>{
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
              const [pin, pout] = pricingTable[model2] || [
                0,
                0
              ];
              return (usage2.prompt_tokens || 0) / 1_000_000 * pin + (usage2.completion_tokens || 0) / 1_000_000 * pout;
            })()
          });
          if (insertError2) console.error("❌ Failed to insert user credits (call 2):", insertError2.message);
        }
        const polished = polishData?.choices?.[0]?.message?.content;
        if (polished) finalText = polished;
      } else {
        console.error("Polish API failed, using original feedback");
      }
    } catch (e) {
      console.error("Polish step error, using original feedback:", e);
    }
    // ---------- Harden & normalize the final payload (critical) ----------
    const parsed = parseModelJsonSafe(finalText);
    if (!parsed) throw new Error("Model output is not valid JSON after normalization");
    const normalized = normalizePayload(parsed);
    // Re-stringify ONCE for storage/return
    const json = JSON.stringify(normalized);
    // --- Fetch student's telegram input ---
    let telegram_input = null;
    if (user_id) {
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("telegram_input").eq("user_id", user_id).maybeSingle();
      if (profileError) {
        console.error("Error fetching telegram_input:", profileError);
      } else {
        telegram_input = profileData?.telegram_input || null;
      }
    }
    // Save to DB for your poller
    if (user_id) {
      const { error: saveErr } = await supabase.from("photo_analysis_outputs").insert({
        user_id,
        question_id: question_id || null,
        exam_id: exam_id || null,
        problem_number: problem_number ? String(problem_number) : null,
        raw_output: json,
        analysis_type: "photo_solution",
        student_solution: telegram_input
      });
      if (saveErr) console.error("Error saving raw output:", saveErr);
    }
    // Return the same clean JSON text as `feedback`
    return new Response(JSON.stringify({
      feedback: json
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in analyze-photo-solution function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({
      error: "Ошибка API. Попробуйте ввести решение снова.",
      retry_message: "Произошла ошибка при обработке. Пожалуйста, попробуйте снова.",
      details: errorMessage
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
