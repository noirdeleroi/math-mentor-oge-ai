import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { pending_feedback_id } = await req.json();
    console.log('📋 Processing feedback request:', pending_feedback_id);
    
    if (!pending_feedback_id) {
      throw new Error('Missing pending_feedback_id');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
      .update({
        processing_started_at: new Date().toISOString()
      })
      .eq('id', pending_feedback_id);

    // 2. Use the rich context_data instead of querying homework_progress
    const contextData = feedbackRecord.context_data;

    if (!contextData || !contextData.questions) {
      console.error('❌ No context data found');
      await supabase
        .from('pending_homework_feedback')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: 'No context data found in feedback record'
        })
        .eq('id', pending_feedback_id);
      throw new Error('No context data found');
    }

    console.log(`📊 Using rich context data with ${contextData.questions.length} detailed questions`);

    // 3. Create homework summary from context_data
    const totalQuestions = contextData.totalQuestions;
    const correctAnswers = contextData.correctAnswers;
    const accuracy = contextData.accuracyPercentage;
    const totalTime = contextData.totalTimeSeconds;
    const avgTime = contextData.averageTimePerQuestion;

    // Get failed questions from context_data (all of them, not just 5)
    const failedQuestions = contextData.questions.filter(q => !q.isCorrect);
    const questionsByType = {};

    contextData.questions.forEach(q => {
      const qType = q.questionType || 'unknown';
      if (!questionsByType[qType]) questionsByType[qType] = [];
      questionsByType[qType].push(q);
    });

    // Calculate time statistics
    const fastQuestions = contextData.questions.filter(q => q.responseTimeSeconds && q.responseTimeSeconds < 30);
    const slowQuestions = contextData.questions.filter(q => q.responseTimeSeconds && q.responseTimeSeconds > 120);
    const showedSolutions = contextData.questions.filter(q => q.showedSolution).length;

    // 4. Create enhanced prompt with rich data
    const prompt = `Вы опытный учитель математики. Проанализируйте результаты домашнего задания ученика и дайте конструктивную обратную связь на русском языке.

**ДОМАШНЕЕ ЗАДАНИЕ**: ${feedbackRecord.homework_name}

**ОБЩИЕ РЕЗУЛЬТАТЫ**:
- Всего вопросов: ${totalQuestions}
- Правильных ответов: ${correctAnswers}
- Точность: ${accuracy}%
- Общее время: ${Math.floor(totalTime / 60)} мин ${totalTime % 60} сек
- Среднее время на вопрос: ${avgTime} сек
- Просмотрено решений: ${showedSolutions}

**РАЗБИВКА ПО ТИПАМ ВОПРОСОВ**:
${Object.entries(questionsByType).map(([type, qs]) => {
  const correct = qs.filter(q => q.isCorrect).length;
  const avgTimeForType = qs.reduce((sum, q) => sum + (q.responseTimeSeconds || 0), 0) / qs.length;
  return `- ${type}: ${correct}/${qs.length} правильно (${Math.round(correct / qs.length * 100)}%), среднее время: ${Math.round(avgTimeForType)} сек`;
}).join('\n')}

${failedQuestions.length > 0 ? `**ДЕТАЛЬНЫЙ АНАЛИЗ ОШИБОК**:
${failedQuestions.slice(0, 8).map((q, i) => `
${i + 1}. **Вопрос ${q.questionNumber}**: ${q.questionText || 'Нет текста'}
   **Ответ ученика**: "${q.userAnswer || 'Не ответил'}"
   **Правильный ответ**: "${q.correctAnswer}"
   **Время решения**: ${q.responseTimeSeconds || '?'} сек
   **Сложность**: ${q.difficulty || 'не указана'}
   **Навыки**: ${q.skills || 'не указаны'}
   ${q.showedSolution ? '📖 _Просмотрено решение_' : ''}
`).join('\n')}` : ''}

**СТАТИСТИКА ПО ВРЕМЕНИ**:
- Быстрые ответы (<30 сек): ${fastQuestions.length} вопросов
- Медленные ответы (>2 мин): ${slowQuestions.length} вопросов
${slowQuestions.length > 0 ? `- Самые сложные вопросы: ${slowQuestions.map(q => `№${q.questionNumber}`).join(', ')}` : ''}

**ЗАДАНИЕ**:
1. Проанализируйте ошибки и выявите закономерности в неправильных ответах
2. Укажите сильные стороны ученика на основе времени и точности
3. Определите конкретные темы/навыки для улучшения на основе ошибок
4. Дайте рекомендации по управлению временем на основе статистики
5. Предложите конкретные упражнения для улучшения слабых мест
6. Поддержите мотивацию ученика

Будьте конструктивны, мотивирующи и используйте эмодзи для визуальной привлекательности. Обращайте внимание на взаимосвязь между временем решения и точностью ответов.`;

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
            content: 'Вы опытный учитель математики, который дает конструктивную и мотивирующую обратную связь на русском языке. Используйте KaTeX для формул: $...$ для inline, $$...$$ для display. Анализируйте закономерности в ошибках и давайте конкретные рекомендации.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
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

    return new Response(JSON.stringify({
      success: true,
      feedback_id: pending_feedback_id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error in generate-homework-feedback:', error);
    
    // Try to save error to database
    try {
      const { pending_feedback_id } = await req.json();
      if (pending_feedback_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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

    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
