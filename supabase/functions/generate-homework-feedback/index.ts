// supabase/functions/generate-homework-feedback/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isGroqLimitError(status: number, bodyText?: string | null) {
  if (status === 429 || status === 403) return true;
  const text = (bodyText || "").toLowerCase();
  return text.includes("limit") || text.includes("quota") || text.includes("exceed");
}

/**
 * Resolve MCQ user/correct answers into pretty option text (LaTeX/HTML) using q.options.
 * Supports Cyrillic letters ("А","Б","В","Г","Д","Е"), Latin letters ("A","B","C","D","E","F"),
 * strings like "option1", and plain digits "1","2","3","4".
 */
function resolveMcqAnswerTexts(q: any) {
  let resolvedUser = q?.userAnswer ?? null;
  let resolvedCorrect = q?.correctAnswer ?? null;

  if (q?.questionType === "mcq" && Array.isArray(q?.options)) {
    const LETTERS_CYR = ["А", "Б", "В", "Г", "Д", "Е"];
    const LETTERS_LAT = ["A", "B", "C", "D", "E", "F"];

    const indexFromLetter = (s: any) => {
      if (typeof s !== "string") return -1;
      const ch = s.trim().toUpperCase();
      let idx = LETTERS_CYR.indexOf(ch);
      if (idx !== -1) return idx;
      idx = LETTERS_LAT.indexOf(ch);
      return idx;
    };

    const indexFromOptionId = (s: any) => {
      if (typeof s !== "string") return null;
      const m = s.match(/option\s*(\d+)/i);
      if (!m) return null;
      const num = parseInt(m[1], 10);
      if (isNaN(num)) return null;
      return num - 1; // convert 1-based to 0-based
    };

    const indexFromDigit = (s: any) => {
      if (typeof s !== "string") return null;
      const m = s.match(/^\s*(\d+)\s*$/);
      if (!m) return null;
      const num = parseInt(m[1], 10);
      if (isNaN(num)) return null;
      return num - 1;
    };

    // --- resolve userAnswer ---
    let userIdx = indexFromLetter(q.userAnswer);
    if (userIdx === -1) userIdx = indexFromOptionId(q.userAnswer) ?? -1;
    if (userIdx === -1) userIdx = indexFromDigit(q.userAnswer) ?? -1;
    if (userIdx >= 0 && userIdx < q.options.length) {
      resolvedUser = q.options[userIdx];
    }

    // --- resolve correctAnswer ---
    let correctIdx = indexFromLetter(q.correctAnswer);
    if (correctIdx === -1) correctIdx = indexFromOptionId(q.correctAnswer) ?? -1;
    if (correctIdx === -1) correctIdx = indexFromDigit(q.correctAnswer) ?? -1;
    if (correctIdx >= 0 && correctIdx < q.options.length) {
      resolvedCorrect = q.options[correctIdx];
    }
  }

  return {
    resolvedUserAnswerText: resolvedUser,
    resolvedCorrectAnswerText: resolvedCorrect,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // We'll parse the body once and keep pending_feedback_id available to the catch block
  let parsedBody: any = null;

  try {
    parsedBody = await req.json();
    const { pending_feedback_id } = parsedBody;
    console.log("📋 Processing feedback request:", pending_feedback_id);
    if (!pending_feedback_id) {
      throw new Error("Missing pending_feedback_id");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    let user_id: string | null = null;

    // 1. Get the pending feedback record
    const { data: feedbackRecord, error: fetchError } = await supabase
      .from("pending_homework_feedback")
      .select("*")
      .eq("id", pending_feedback_id)
      .single();

    if (fetchError || !feedbackRecord) {
      console.error("❌  Failed to fetch feedback record:", fetchError);
      throw new Error("Feedback record not found");
    }

    // ✅ Assign user_id safely
    user_id = feedbackRecord.user_id;
    console.log("User ID:", user_id);
    console.log("✅ Feedback record found:", feedbackRecord);

    // Mark as processing started
    await supabase
      .from("pending_homework_feedback")
      .update({
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", pending_feedback_id);

    // 2. Use the rich context_data instead of querying homework_progress
    const contextData = feedbackRecord.context_data;
    if (!contextData || !contextData.questions) {
      console.error("❌ No context data found");
      await supabase
        .from("pending_homework_feedback")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: "No context data found in feedback record",
        })
        .eq("id", pending_feedback_id);
      throw new Error("No context data found");
    }
    console.log(`📊 Using rich context data with ${contextData.questions.length} detailed questions`);

    // 3. Create homework summary from context_data
    const totalQuestions = contextData.totalQuestions;
    const correctAnswers = contextData.correctAnswers;
    const accuracy = contextData.accuracyPercentage;
    const totalTime = contextData.totalTimeSeconds;
    const avgTime = contextData.averageTimePerQuestion;

    // Get failed questions
    const failedQuestions = contextData.questions.filter((q: any) => !q.isCorrect);

    const questionsByType: Record<string, any[]> = {};
    contextData.questions.forEach((q: any) => {
      const qType = q.questionType || "unknown";
      if (!questionsByType[qType]) questionsByType[qType] = [];
      questionsByType[qType].push(q);
    });

    // Time statistics
    const fastQuestions = contextData.questions.filter((q: any) => q.responseTimeSeconds && q.responseTimeSeconds < 30);
    const slowQuestions = contextData.questions.filter((q: any) => q.responseTimeSeconds && q.responseTimeSeconds > 120);
    const showedSolutions = contextData.questions.filter((q: any) => q.showedSolution).length;

    // 4. Prompt (unchanged)
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
${Object.entries(questionsByType)
  .map(([type, qs]) => {
    const correct = qs.filter((q: any) => q.isCorrect).length;
    const avgTimeForType = qs.reduce((sum: number, q: any) => sum + (q.responseTimeSeconds || 0), 0) / qs.length;
    return `- ${type}: ${correct}/${qs.length} правильно (${Math.round((correct / qs.length) * 100)}%), среднее время: ${Math.round(
      avgTimeForType,
    )} сек`;
  })
  .join("\n")}

${failedQuestions.length > 0 ? `**ДЕТАЛЬНЫЙ АНАЛИЗ ОШИБОК**:
${failedQuestions
  .slice(0, 8)
  .map((q: any, i: number) => `
${i + 1}. **Вопрос ${q.questionNumber}**: ${q.questionText || "Нет текста"}
   **Ответ ученика**: "${q.userAnswer || "Не ответил"}"
   **Правильный ответ**: "${q.correctAnswer}"
   **Время решения**: ${q.responseTimeSeconds || "?"} сек
   **Сложность**: ${q.difficulty || "не указана"}
   **Навыки**: ${q.skills || "не указаны"}
   ${q.showedSolution ? "📖 _Просмотрено решение_" : ""}`)
  .join("\n")}` : ""}

**СТАТИСТИКА ПО ВРЕМЕНИ**:
- Быстрые ответы (<30 сек): ${fastQuestions.length} вопросов
- Медленные ответы (>2 мин): ${slowQuestions.length} вопросов
${slowQuestions.length > 0 ? `- Самые сложные вопросы: ${slowQuestions.map((q: any) => `№${q.questionNumber}`).join(", ")}` : ""}

**ЗАДАНИЕ**:
1. Проанализируйте ошибки и выявите закономерности в неправильных ответах
2. Укажите сильные стороны ученика на основе времени и точности
3. Определите конкретные темы/навыки для улучшения на основе ошибок
4. Дайте рекомендации по управлению временем на основе статистики
5. Предложите конкретные упражнения для улучшения слабых мест
6. Поддержите мотивацию ученика

Будьте конструктивны, мотивирующи и используйте эмодзи для визуальной привлекательности. Обращайте внимание на взаимосвязь между временем решения и точностью ответов.`;

    console.log("🤖 Generating AI feedback with Groq...");
    // 5. Primary: Groq API call (unchanged payload)
    const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(groqApiKey ? { Authorization: `Bearer ${groqApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "Вы опытный учитель математики, который дает конструктивную и мотивирующую обратную связь на русском языке. Используйте KaTeX для формул: $...$ для inline, $$...$$ для display. Анализируйте закономерности в ошибках и давайте конкретные рекомендации.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    let feedbackMessage: string | null = null;

    if (!groqResp.ok) {
      const groqErrText = await groqResp.text().catch(() => null);
      console.error("❌ Groq API error:", groqErrText || groqResp.statusText);

      // Fallback only when limit/quota reached
      if (isGroqLimitError(groqResp.status, groqErrText || null)) {
        if (!openrouterApiKey) {
          throw new Error("Groq quota reached, but OPENROUTER_API_KEY is not configured");
        }
        console.warn("⚠️ Groq limit reached — falling back to OpenRouter (Gemini 2.5 Flash Lite)");

        const orResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterApiKey}`,
            "HTTP-Referer": "https://egechat.ru",
            "X-Title": "EGEChat Homework Feedback",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite-preview-09-2025",
            messages: [
              {
                role: "system",
                content:
                  "Вы опытный учитель математики, который дает конструктивную и мотивирующую обратную связь на русском языке. Используйте KaTeX для формул: $...$ для inline, $$...$$ для display. Анализируйте закономерности в ошибках и давайте конкретные рекомендации.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!orResp.ok) {
          const orErrText = await orResp.text().catch(() => null);
          console.error("❌ OpenRouter API error:", orErrText || orResp.statusText);
          throw new Error(`OpenRouter API error: ${orResp.status}`);
        }

        const orData = await orResp.json();

        // === Extract token usage and calculate cost ===
        const { prompt_tokens, completion_tokens } = orData.usage || {};
        const model = orData.model;

        const pricingTable: Record<string, [number, number]> = {
          "google/gemini-2.5-flash-lite-preview-09-2025": [0.3, 2.5],
          "google/gemini-2.5-flash-lite-preview-06-17": [0.1, 0.4],
          "google/gemini-2.5-flash-lite": [0.1, 0.4],
          "google/gemini-2.5-flash": [0.3, 2.5],
          "google/gemini-2.5-flash-preview-09-2025": [0.3, 2.5],
          "x-ai/grok-3-mini": [0.3, 0.5],
          "x-ai/grok-4-fast": [0.2, 0.5],
          "x-ai/grok-code-fast-1": [0.2, 1.5],
          "qwen/qwen3-coder-flash": [0.3, 1.5],
          "openai/o4-mini": [1.1, 4.4],
          "anthropic/claude-haiku-4.5": [1.0, 5.0],
        };

        const [priceIn, priceOut] = pricingTable[model] || [0, 0];
        const price =
          (prompt_tokens || 0) / 1_000_000 * priceIn +
          (completion_tokens || 0) / 1_000_000 * priceOut;

        // === Insert into Supabase user_credits table ===
        const { error: insertError } = await supabase.from("user_credits").insert({
          user_id: user_id,
          tokens_in: prompt_tokens,
          tokens_out: completion_tokens,
          price: price,
        });
        if (insertError) {
          console.error("❌ Failed to insert user credits:", insertError.message);
        } else {
          console.log(
            `✅ Stored usage for ${model}: ${prompt_tokens} in, ${completion_tokens} out, $${price.toFixed(
              6,
            )} total`,
          );
        }

        feedbackMessage = orData.choices?.[0]?.message?.content || "Не удалось сгенерировать обратную связь";
      } else {
        // Not a limit/quota error — bubble it up as before
        throw new Error(`Groq API error: ${groqResp.status}`);
      }
    } else {
      // Groq OK
      const groqData = await groqResp.json();
      feedbackMessage = groqData.choices?.[0]?.message?.content || "Не удалось сгенерировать обратную связь";
    }

    console.log("✨ AI feedback generated successfully");

    // Store chat context for follow-up discussions (UPDATED: richer + resolved MCQ answers)
    const chatContext = {
      homework_name: feedbackRecord.homework_name,
      total_questions: totalQuestions,
      completed_questions: contextData.completedQuestions,
      correct_answers: correctAnswers,
      accuracy: accuracy,
      total_time_sec: contextData.totalTimeSeconds,
      avg_time_per_question_sec: contextData.averageTimePerQuestion,
      timestamp: contextData.timestamp,
      questions: contextData.questions.map((q: any) => {
        const { resolvedUserAnswerText, resolvedCorrectAnswerText } = resolveMcqAnswerTexts(q);
        return {
          number: q.questionNumber,
          problem_number: q.problemNumber,
          question_id: q.questionId,
          type: q.questionType,
          text: q.questionText,           // keep HTML/KaTeX
          options: Array.isArray(q.options) ? q.options : null,

          // Pretty/semantic answers:
          user_answer: resolvedUserAnswerText,
          correct_answer: resolvedCorrectAnswerText,

          // Raw codes as fallback/debug info:
          raw_user_answer: q.userAnswer ?? null,      // e.g. "В", "option1", "3"
          raw_correct_answer: q.correctAnswer ?? null, // e.g. "А", "option2"

          is_correct: !!q.isCorrect,
          difficulty: q.difficulty ?? null,
          skills: q.skills ?? null,
          response_time_sec: q.responseTimeSeconds ?? null,
          showed_solution: q.showedSolution ?? false,
        };
      }),
    };

    // 6. Update record with result
    const { error: updateError } = await supabase
      .from("pending_homework_feedback")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        feedback_message: feedbackMessage,
        chat_context: chatContext,
      })
      .eq("id", pending_feedback_id);

    if (updateError) {
      console.error("❌ Failed to update feedback record:", updateError);
      throw updateError;
    }

    console.log("💾 Feedback and chat context saved to database");
    return new Response(
      JSON.stringify({
        success: true,
        feedback_id: pending_feedback_id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error("❌ Error in generate-homework-feedback:", error);

    // Try to save error to database using the body we already parsed
    try {
      const pending_feedback_id = parsedBody?.pending_feedback_id;
      if (pending_feedback_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
        await supabase
          .from("pending_homework_feedback")
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            error_message: error?.message || "Unknown error",
          })
          .eq("id", pending_feedback_id);
      }
    } catch (saveError) {
      console.error("Failed to save error to database:", saveError);
    }

    return new Response(
      JSON.stringify({
        error: error?.message || "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
