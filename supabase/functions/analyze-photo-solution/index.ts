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
    const prompt = `Ты строгий, но справедливый учитель математики. Оцени решение ученика (из OCR-текста, с возможными опечатками) по условию задачи. Входные данные:

Решение ученика: ${student_solution}

Правильное решение: ${solution_text}

Условие задачи: ${problem_text}

**Критерии баллов (макс. 2)**:
- 2: Обоснованно получен верный ответ.
- 1: Решение доведено до конца, но арифметическая ошибка; дальнейшие шаги верны с учётом ошибки.
- 0: Не соответствует вышеуказанному.

**Вывод**: JSON-объект с ключами:
- "scores": n (где n = 0,1,2),
- "review": {
  "errors": [
    {
      "type": "Арифметические ошибки" | "Алгебраические ошибки" | "Логические ошибки" | "Нотационные ошибки" | "Ошибки копирования" | "Неполные решения" | "Другие",
      "message": "детальное описание ошибки (plain text с MathJax LaTeX в формате \$...\$ для математики)",
      "student_latex": "что написал ученик",
      "expected_latex": "как должно было быть правильно",
      "context_snippet": "фрагмент из решения ученика где ошибка (точная копия)"
    }
  ]
}

**ВАЖНО**: 
- Массив "errors" должен содержать ВСЕ найденные ошибки
- Для каждой ошибки указывай РЕАЛЬНЫЕ фрагменты из решения ученика
- context_snippet должен быть ТОЧНОЙ копией того что написал ученик
- message должен быть понятным объяснением на русском языке
- Можно использовать MathJax LaTeX в формате \$...\$ внутри message, student_latex, expected_latex
- Если ошибок нет, верни пустой массив errors: []

Пример:
{
  "scores": 0,
  "review": {
    "errors": [
      {
        "type": "Алгебраические ошибки",
        "message": "Ошибка при раскрытии скобок. Правая часть $(x-2)^2$ раскрывается как $x^2 - 4x + 4$, но ученик неправильно перенёс члены в левую часть.",
        "student_latex": "x^4 - x^2 + 4x - 4 = 0",
        "expected_latex": "x^4 - (x-2)^2 = 0",
        "context_snippet": "$$x^4 - x^2 + 4x - 4 = 0$$"
      }
    ]
  }
}`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-3-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5
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
    // Second API call to polish LaTeX
    const polishPrompt = `You are given a JSON output: ${feedback}. 

The structure is:
{
  "scores": 0|1|2,
  "review": {
    "errors": [
      {
        "type": "...",
        "message": "...",
        "student_latex": "...",
        "expected_latex": "...",
        "context_snippet": "..."
      }
    ]
  }
}

Your task: Return the SAME JSON structure, but ensure:
1. **IMPORTANT**: Preserve original meaning and structure. Only fix syntax if needed.
2. **IMPORTANT**: Validate that all LaTeX in message, student_latex, expected_latex, and context_snippet is properly formatted
3. **IMPORTANT**: If context_snippet contains $$...$$, preserve it. If it contains $...$, preserve it.

**IMPORTANT**: Return ONLY the corrected JSON. No explanations.`;
    const polishResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-coder-flash',
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
