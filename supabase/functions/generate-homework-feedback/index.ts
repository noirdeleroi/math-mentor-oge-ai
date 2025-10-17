import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pending_feedback_id } = await req.json();
    console.log('📋 Processing feedback request:', pending_feedback_id);

    if (!pending_feedback_id) {
      throw new Error('Missing pending_feedback_id');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get the pending feedback record
    const { data: feedbackRecord, error: fetchError } = await supabase
      .from('pending_homework_feedback')
      .select('*')
      .eq('id', pending_feedback_id)
      .single();

    if (fetchError || !feedbackRecord) {
      console.error('❌ Failed to fetch feedback record:', fetchError);
      throw new Error('Feedback record not found');
    }

    console.log('✅ Feedback record found:', feedbackRecord);

    // Mark as processing started
    await supabase
      .from('pending_homework_feedback')
      .update({ processing_started_at: new Date().toISOString() })
      .eq('id', pending_feedback_id);

    // 2. Query homework_progress for session data
    const { data: sessionRows, error: sessionError } = await supabase
      .from('homework_progress')
      .select('*')
      .eq('user_id', feedbackRecord.user_id)
      .eq('homework_name', feedbackRecord.homework_name)
      .order('created_at', { ascending: true });

    if (sessionError || !sessionRows || sessionRows.length === 0) {
      console.error('❌ No homework data found:', sessionError);
      await supabase
        .from('pending_homework_feedback')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: 'No homework data found for this session'
        })
        .eq('id', pending_feedback_id);
      
      throw new Error('No homework data found');
    }

    console.log(`📊 Found ${sessionRows.length} homework records`);

    // 3. Create homework summary (similar to homeworkAIFeedbackService)
    const totalQuestions = sessionRows.length;
    const correctAnswers = sessionRows.filter(row => row.is_correct).length;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    
    const questionsByType: Record<string, any[]> = {};
    sessionRows.forEach(row => {
      const qType = row.question_type || 'unknown';
      if (!questionsByType[qType]) questionsByType[qType] = [];
      questionsByType[qType].push(row);
    });

    // Get question details for failed questions
    const failedQuestionIds = sessionRows
      .filter(row => !row.is_correct)
      .map(row => row.question_id)
      .slice(0, 5); // Limit to 5 to avoid huge prompts

    let questionDetails = [];
    if (failedQuestionIds.length > 0) {
      const { data: details } = await supabase.functions.invoke('get-homework-questions-details', {
        body: { question_ids: failedQuestionIds }
      });
      questionDetails = details?.questions || [];
    }

    // 4. Create prompt for Groq
    const prompt = `Вы опытный учитель математики. Проанализируйте результаты домашнего задания ученика и дайте конструктивную обратную связь на русском языке.

**ДОМАШНЕЕ ЗАДАНИЕ**: ${feedbackRecord.homework_name}

**ОБЩИЕ РЕЗУЛЬТАТЫ**:
- Всего вопросов: ${totalQuestions}
- Правильных ответов: ${correctAnswers}
- Точность: ${accuracy}%

**РАЗБИВКА ПО ТИПАМ ВОПРОСОВ**:
${Object.entries(questionsByType).map(([type, qs]) => {
  const correct = qs.filter(q => q.is_correct).length;
  return `- ${type}: ${correct}/${qs.length} правильно (${Math.round(correct/qs.length*100)}%)`;
}).join('\n')}

${questionDetails.length > 0 ? `**ПРИМЕРЫ ОШИБОК**:
${questionDetails.map((q, i) => `
${i + 1}. **Вопрос**: ${q.problem_text || 'Нет текста'}
   **Правильный ответ**: ${q.answer}
   **Навыки**: ${q.skills || 'не указаны'}
   **Сложность**: ${q.difficulty || 'не указана'}
`).join('\n')}` : ''}

**ЗАДАНИЕ**:
1. Дайте общую оценку работы (1-2 предложения)
2. Укажите сильные стороны ученика
3. Определите конкретные темы/навыки для улучшения
4. Дайте 2-3 конкретные рекомендации по подготовке
5. Поддержите мотивацию ученика

Используйте эмодзи для визуальной привлекательности. Будьте конструктивны и мотивирующи.`;

    console.log('🤖 Generating AI feedback with Groq...');

    // 5. Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Вы опытный учитель математики, который дает конструктивную и мотивирующую обратную связь на русском языке. Используйте KaTeX для формул: $...$ для inline, $$...$$ для display.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('❌ Groq API error:', errorText);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const feedbackMessage = groqData.choices?.[0]?.message?.content || 'Не удалось сгенерировать обратную связь';

    console.log('✨ AI feedback generated successfully');

    // 6. Update pending_homework_feedback with result
    const { error: updateError } = await supabase
      .from('pending_homework_feedback')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        feedback_message: feedbackMessage
      })
      .eq('id', pending_feedback_id);

    if (updateError) {
      console.error('❌ Failed to update feedback record:', updateError);
      throw updateError;
    }

    console.log('💾 Feedback saved to database');

    return new Response(
      JSON.stringify({ success: true, feedback_id: pending_feedback_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in generate-homework-feedback:', error);

    // Try to save error to database
    try {
      const { pending_feedback_id } = await req.json();
      if (pending_feedback_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from('pending_homework_feedback')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            error_message: error.message || 'Unknown error'
          })
          .eq('id', pending_feedback_id);
      }
    } catch (saveError) {
      console.error('Failed to save error to database:', saveError);
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
