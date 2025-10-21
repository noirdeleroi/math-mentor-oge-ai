import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { user_id, question_id, submitted_answer } = await req.json();
    // Validate required parameters
    if (!user_id || !question_id || submitted_answer === undefined) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: user_id, question_id, submitted_answer'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Checking answer for question ${question_id}, user ${user_id}`);
    // Determine which table to query based on question_id format
    let tableName = 'oge_math_fipi_bank'; // default
    if (question_id.startsWith('EGEBASIC_')) {
      tableName = 'egemathbase';
    } else if (question_id.startsWith('EGEPROF_')) {
      tableName = 'egemathprof';
    }
    console.log(`Querying table: ${tableName}`);
    // Step 1: Query the appropriate table for answer and problem_text
    const { data: questionData, error: questionError } = await supabaseClient.from(tableName).select('answer, problem_text').eq('question_id', question_id).maybeSingle();
    if (questionError) {
      console.error('Error fetching question data:', questionError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch question data',
        details: questionError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!questionData) {
      return new Response(JSON.stringify({
        error: `Question ID ${question_id} not found`
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { answer: correct_answer, problem_text } = questionData;
    // Step 2: Determine if the answer is correct
    let is_correct = false;
    try {
      /**
       * ✅ Enhanced normalization for math-equivalent answers
       * Handles:
       *  - commas/dots ("17,25" == "17.25")
       *  - spaces/thousand separators ("1 000" == "1000")
       *  - fractions ("1/2" == "0.5")
       *  - trailing zeros ("17.250" == "17.25")
       *  - small floating-point differences (0.333 ≈ 1/3)
       */ function normalizeNumericString(value) {
        if (value === null || value === undefined) return null;
        let str = String(value).trim();
        // Replace comma with dot
        str = str.replace(',', '.');
        // Remove spaces and thousand separators
        str = str.replace(/\s+/g, '').replace(/(?<=\d)\.(?=\d{3,})/g, '');
        // Handle simple fractions like "1/2" or "3/4"
        if (/^-?\d+\/\d+$/.test(str)) {
          const [num, den] = str.split('/').map(Number);
          if (den !== 0) return num / den;
        }
        // Try to parse as float
        const parsed = parseFloat(str);
        if (isNaN(parsed)) return null;
        // Round to 4 decimal places for fair comparison
        return Math.round(parsed * 10000) / 10000;
      }
      const correctNum = normalizeNumericString(correct_answer);
      const submittedNum = normalizeNumericString(submitted_answer);
      if (correctNum !== null && submittedNum !== null) {
        const epsilon = 1e-4; // allow for rounding tolerance
        is_correct = Math.abs(correctNum - submittedNum) < epsilon;
        console.log(`Normalized numeric comparison: ${correctNum} ≈ ${submittedNum} = ${is_correct}`);
      } else {
        throw new Error('Not numeric answers');
      }
    } catch  {
      // Non-numeric fallback — use OpenRouter API for semantic comparison
      const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
      if (!openrouterApiKey) {
        return new Response(JSON.stringify({
          error: 'OPENROUTER_API_KEY not configured'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      const prompt = `Given the problem: ${problem_text}. The correct answer is: ${correct_answer}. Is the submitted answer '${submitted_answer}' correct? Respond with True or False only.`;
      console.log('Making OpenRouter API call for text comparison');
      const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite-preview-06-17',
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });
      if (!openrouterResponse.ok) {
        console.error('OpenRouter API error:', await openrouterResponse.text());
        return new Response(JSON.stringify({
          error: 'OpenRouter API error',
          details: await openrouterResponse.text()
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      const apiResult111 = await openrouterResponse.json();
      const apiOutput = apiResult111.choices[0].message.content.trim();
      is_correct = apiOutput.toLowerCase() === 'true';
      console.log(`OpenRouter API result: ${apiOutput}, is_correct: ${is_correct}`);
      // === Extract token usage and calculate cost ===
      const { prompt_tokens, completion_tokens } = apiResult111.usage || {};
      const model = apiResult111.model;
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
      const { error: insertError } = await supabaseClient.from('user_credits').insert({
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
    }
    // Step 3: Get the latest attempt for this user
    const { data: latestAttempt, error: attemptError } = await supabaseClient.from('student_activity').select('attempt_id, answer_time_start, problem_number_type').eq('user_id', user_id).order('updated_at', {
      ascending: false
    }).limit(1).maybeSingle();
    if (attemptError) {
      console.error('Error fetching latest attempt:', attemptError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch latest attempt',
        details: attemptError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!latestAttempt) {
      return new Response(JSON.stringify({
        error: `No recent attempt found for user_id ${user_id}`
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Step 4: Calculate duration and scores
    const { attempt_id, answer_time_start, problem_number_type } = latestAttempt;
    const startTime = new Date(answer_time_start);
    const currentTime = new Date();
    const duration_answer = (currentTime.getTime() - startTime.getTime()) / 1000;
    // Determine scores_fipi
    let scores_fipi = null;
    if (problem_number_type >= 20 && problem_number_type <= 25) {
      scores_fipi = is_correct ? 2 : 0;
    }
    console.log(`Updating attempt ${attempt_id}: correct=${is_correct}, duration=${duration_answer}s, scores=${scores_fipi}`);
    // Step 5: Update the student_activity record
    const { error: updateError } = await supabaseClient.from('student_activity').update({
      finished_or_not: true,
      is_correct: is_correct,
      duration_answer: duration_answer,
      scores_fipi: scores_fipi
    }).eq('attempt_id', attempt_id);
    if (updateError) {
      console.error('Error updating student activity:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update student activity',
        details: updateError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Successfully checked answer for question ${question_id}`);
    return new Response(JSON.stringify({
      success: true,
      is_correct: is_correct,
      duration_seconds: duration_answer,
      scores_fipi: scores_fipi,
      attempt_id: attempt_id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
