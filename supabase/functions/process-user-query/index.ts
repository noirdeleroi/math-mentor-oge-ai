import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userQuery } = await req.json();
    console.log('Processing user query:', userQuery);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Insert user query into entrypage_query_data table
    const { error: insertError } = await supabase
      .from('entrypage_query_data')
      .insert({
        userquery: userQuery,
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting user query:', insertError);
    }

    // Classification prompt
    const routerPrompt = `Ты — классификатор. У тебя есть список категорий с номерами (см. ниже). Определи, к какой категории относится вопрос школьника, и верни только номер категории (одно число).
Список категорий:
1. Общий вопрос по математике — вопрос о математических понятиях, формулах, теоремах, методах решения.
2. Вопрос по математике в контексте экзамена ОГЭ — вопрос о решении заданий ОГЭ, типах задач по номерам, типах задач по навыкам/скиллам, типах задач по темам, математических методах, применяемых именно в ОГЭ.
3. Вопрос по проверке и анализу решения. Ключевые маркеры: 'проверь', 'где ошибка', 'правильно ли я решил', 'засчитают ли', и тому подобное.
4. Вопрос с требованием дать задачу определенного типа - например задачу 12, задачу 21, и так далее разных номеров, или задачу на определенную тему ОГЭ.
5. Вопросы о распространенных ошибках в задачах или на экзамене. Вопрос о разборе ошибок или типичных ловушках.
6. Общий вопрос об экзамене ОГЭ по математике — вопрос о структуре экзамена, частях, типах задач, сложности задас, продолжительности экзамена, правилах проведения, без решения задач.
7. Вопрос о личном прогрессе в подготовке — какие темы нужно учить, насколько хорошо решаю задачи, какие задачи получаются хуже или лучше других, и тому подобное.
8. Вопрос о критериях оценивания и баллах — вопрос о том, сколько баллов нужно для сдачи, как переводятся баллы в оценки, как оценивают задания.
9. Вопрос об изменениях или новостях по ОГЭ — вопрос о новых правилах, изменениях КИМ, официальных распоряжениях.
10. Общий вопрос об учебе и подготовке — вопрос о методах подготовки, распределении времени, мотивации, не обязательно связанных с ОГЭ.
11. Вопрос о работе с платформой — вопрос о функциях платформы, интерфейсе, загрузке материалов, технических проблемах.
12. Вопрос об учебных материалах и источниках — вопрос о книгах, сайтах, видеоуроках, источниках задач.
13. Личные и мотивационные вопросы — вопрос о страхах, волнении, психологической поддержке, настрое перед экзаменом.
14. Вопрос, не относящийся к учебе — вопрос о темах, не связанных с математикой, ОГЭ или подготовкой.

Вопрос школьника: ${userQuery}

Ответь одним числом — номером категории.`;

    // Get category classification
    const classificationResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite-preview-06-17',
        messages: [
          {
            role: 'system',
            content: 'Ты — классификатор. У тебя есть список категорий с номерами (см. ниже). Определи, к какой категории относится вопрос школьника, и верни только номер категории (одно число).'
          },
          { role: 'user', content: routerPrompt }
        ],
        temperature: 0
      }),
    });

    const classificationData = await classificationResponse.json();
    const categoryId = parseInt(classificationData.choices[0].message.content.replace('\n', '').trim());
    console.log('Category classified as:', categoryId);

    // Get system prompt and context from oge_entrypage_rag table
    const { data: ragData, error: ragError } = await supabase
      .from('oge_entrypage_rag')
      .select('system_prompt, context')
      .eq('id', categoryId)
      .single();

    if (ragError) {
      console.error('Error fetching RAG data:', ragError);
      throw new Error('Failed to fetch context data');
    }

    const { system_prompt: systemMessage, context } = ragData;

    // Create streaming response
    const finalPrompt = `Вопрос школьника: ${userQuery}\n\nКонтекст: ${context}`;

    const streamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          {
            role: 'system',
            content: systemMessage + ' Give output using simple LaTeX syntax. *IMPORTATNT*: avoid environments enumerate, itemize'
          },
          { role: 'user', content: finalPrompt }
        ],
        temperature: 0.7,
        stream: true,
        max_tokens: 2000
      }),
    });

    // Create a readable stream to handle the streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = streamResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const payload = line.slice(6);
                if (payload.trim() === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const event = JSON.parse(payload);
                  const delta = event.choices?.[0]?.delta?.content;
                  if (delta) {
                    controller.enqueue(new TextEncoder().encode(delta));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in process-user-query function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
