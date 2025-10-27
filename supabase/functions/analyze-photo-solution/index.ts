import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    const { student_solution, problem_text, solution_text, user_id, question_id, exam_id, problem_number } = await req.json();
    if (!student_solution || !problem_text || !solution_text) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
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
2. Определи ошибки ученика: арифметические, алгебраические, логические, неверные данные, пропуски шагов, ошибки в оформлении, и т. п.
3. Для каждой ошибки верни объект с такими полями:
   - **type** — тип ошибки: "Арифметические ошибки", "Алгебраические ошибки", "Логические ошибки", "Нотационные ошибки", "Ошибки копирования", "Неполные решения", "Другие";
   - **message** — краткое понятное объяснение ошибки;
   - **student_latex** — математическое выражение ученика (The LaTeX should be in MathJax-compatible HTML. Use <p> and <span> tags where needed. Inline math should be wrapped in \( ... \) and block math in $$ ... $$.);
   - **expected_latex** — правильное выражение (The LaTeX should be in MathJax-compatible HTML. Use <p> and <span> tags where needed. Inline math should be wrapped in \( ... \) and block math in $$ ... $$.);
   - **context_snippet** — короткий участок текста ИЗ OCR-РЕШЕНИЯ, содержащий ошибку, ДОСЛОВНО взятый из входного текста, без малейших изменений символов, пробелов или форматирования.  
     Этот фрагмент должен быть точным подстрочным совпадением в исходном тексте "Решение ученика".  
     Не переформатируй, не добавляй и не убирай символы. Просто скопируй тот участок, где обнаружена ошибка.
     При возможности — включай несколько символов ДО и ПОСЛЕ ошибки, чтобы контекст был уникальным, но всё равно из того же OCR-текста.
4. Определи итоговый числовой балл по правилам:
   - **2** — решение корректное, без критичных ошибок;
   - **1** — решение доведено до конца, но есть локальная ошибка (например, арифметическая);
   - **0** — ответ неверен, решение не завершено, или ошибка фундаментальна.

Формат вывода:
Верни **ТОЛЬКО один валидный JSON-объект UTF-8** такого вида:
{
  "scores": <0|1|2>,
  "review": {
    "errors": [
      {
        "type": string,
        "message": string,
        "student_latex": string,
        "expected_latex": string,
        "context_snippet": string
      }
    ],
    "summary": very concise text of verdict including scores, example: Оценка: X (explanation)
  }
}

Требования:
- Не добавляй Markdown, комментарии или текст вне JSON.
- Не заключай JSON в тройные кавычки.
- Если ошибок нет — верни "errors": [].
- Все "context_snippet" должны быть **точно такими, как в исходном OCR-тексте**, без малейших изменений.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    const data = await response.json();
    // === Extract token usage and calculate cost ===
    const { prompt_tokens, completion_tokens } = data.usage || {};
    const model = data.model;
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
    const feedback = data.choices?.[0]?.message?.content;
    if (!feedback) {
      throw new Error('No feedback received from OpenRouter API');
    }
    // Second API call to polish & validate LaTeX WITHOUT changing structure or meaning
    const polishPrompt = `You are given a JSON string called feedback:

    FEEDBACK_START
    ${feedback}
    FEEDBACK_END

    Your task: return the EXACT SAME JSON structure and meaning, but with the following fixes applied **ONLY** inside content of keys "student_latex", "expected_latex", "message". DO NOT add or remove keys. DO NOT reorder arrays. DO NOT change numbers or booleans. DO NOT add comments or Markdown. Return ONLY the corrected JSON.

    ### Invariants (MUST NOT break)
    - Keep the top-level shape: {"scores": <0|1|2>, "review": { ... }}.
    - Preserve all keys, nesting, and array lengths exactly as in the input.
    - Preserve all numeric and boolean values exactly (including "scores").
    - Do not invent or delete errors, steps, marks, or fields.
    - Do not wrap the entire JSON in backticks or code fences. Output must be valid JSON UTF-8.

    For content of keys "student_latex", "expected_latex", "message":
      - Ensure the value content LaTeX should be in MathJax-compatible HTML. Use <p> and <span> tags where needed. Inline math should be wrapped in \( ... \) and block math in $$ ... $$.. I should be able to render values of keys "student_latex", "expected_latex", "message" straight away.
      - Do NOT change the mathematical meaning.
      
    **JSON validity**
      - Ensure output is valid JSON.
      - Keep all existing keys even if empty strings/arrays.

    ### IMPORTANT
    - **Do not wrap the entire JSON in backticks or code fences.**
    - **CHANGE NOTHING EXCEPT CONTENT of keys "student_latex", "expected_latex", "message".**
    - DO NOT change any numbers, booleans, indices, IDs, or array orders.
    - DO NOT add or remove keys.
    - DO NOT add explanations. Return ONLY the corrected JSON.`;
    const polishResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-code-fast-1',
        messages: [
          {
            role: 'user',
            content: polishPrompt
          }
        ],
        temperature: 0
      })
    });
    let finalFeedback = feedback;
    if (polishResponse.ok) {
      const polishData = await polishResponse.json();
      // === Extract token usage and calculate cost ===
      const { prompt_tokens: prompt_tokens1, completion_tokens: completion_tokens1 } = polishData.usage || {};
      const model1 = polishData.model;
      const pricingTable1 = {
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
      const [priceIn1, priceOut1] = pricingTable1[model1] || [
        0,
        0
      ];
      const price1 = prompt_tokens1 / 1_000_000 * priceIn1 + completion_tokens1 / 1_000_000 * priceOut1;
      // === Insert into Supabase user_credits table ===
      const { error: insertError1 } = await supabase.from('user_credits').insert({
        user_id: user_id,
        tokens_in: prompt_tokens,
        tokens_out: completion_tokens,
        price: price1
      });
      if (insertError1) {
        console.error('❌ Failed to insert user credits:', insertError1.message);
      } else {
        console.log(`✅ Stored usage for ${model1}: ${prompt_tokens1} in, ${completion_tokens1} out, $${price1.toFixed(6)} total`);
      }
      finalFeedback = polishData.choices?.[0]?.message?.content || feedback;
    } else {
      console.error('Polish API failed, using original feedback');
    }
    // Save raw output to photo_analysis_outputs table if user_id is provided
    if (user_id) {
      const { error: insertError2 } = await supabase.from('photo_analysis_outputs').insert({
        user_id: user_id,
        question_id: question_id || null,
        exam_id: exam_id || null,
        problem_number: problem_number ? problem_number.toString() : null,
        raw_output: finalFeedback,
        analysis_type: 'photo_solution'
      });
      if (insertError2) {
        console.error('Error saving raw output:', insertError2);
      // Don't fail the request if we can't save to database
      }
    }
    return new Response(JSON.stringify({
      feedback: finalFeedback
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in analyze-photo-solution function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      error: 'Ошибка API. Попробуйте ввести решение снова.',
      retry_message: 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.',
      details: errorMessage
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
