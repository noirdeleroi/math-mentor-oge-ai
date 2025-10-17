import { getRandomMathProblem, getMathProblemById } from "@/services/mathProblemsService";
import { supabase } from "@/integrations/supabase/client";

// Groq API service for chat completions
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Helper: normalize text (ё→е, lowercased)
const norm = (s: string) => (s || "").toLowerCase().replace(/ё/g, "е");

// Enhanced system prompt for the math tutor
const SYSTEM_PROMPT: Message = {
  role: 'system',
  content: `You are "Ёжик" (Hedgehog), a helpful and patient high school math teacher specializing in Russian OGE (ОГЭ) exam preparation. You explain math concepts step-by-step and adapt to the student's level. 

Key capabilities:
- Use LaTeX notation for mathematical expressions: inline math with \\(...\\) or $...$ and block math with \\[...\\] or $$...$$
- Keep responses in Russian language
- Break down complex topics into simple steps
- Answer general math questions and provide explanations
- Help students understand mathematical concepts

When user asks you to explain something "коротко и по делу" (short and to the point), provide concise, focused explanations in 1-3 sentences maximum. Be direct and essential, avoiding lengthy elaborations.

You can discuss any math-related topics, explain formulas, solve problems, and provide educational guidance. When students need practice problems, they will be provided automatically from our database.

Remember: You are a patient, encouraging teacher who helps students learn mathematics effectively through conversation and explanation.`
};

// ---- Streaming path (OPTIONALLY with homeworkContext) ----
export async function streamChatCompletion(
  messages: Message[],
  homeworkContext?: any
): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const fullMessages = buildMessagesWithContext(messages, homeworkContext, /*isStream*/ true);
    // Diagnostics (optional)
    try {
      console.log('[groq:stream] context?', Boolean(homeworkContext), 'payload bytes:', JSON.stringify(fullMessages).length);
    } catch { /* ignore */ }

    const { data, error } = await supabase.functions.invoke('groq-chat', {
      body: { messages: fullMessages, stream: true }
    });
    if (error) {
      console.error('Groq function error (stream):', error);
      throw new Error(`Groq function error (stream): ${error.message}`);
    }
    return data;
  } catch (error) {
    console.error('Error streaming from Groq:', error);
    return null;
  }
}

// Extract last question ID like "(📌 ID задачи: xxx)" or "ID задачи: xxx"
function extractLastQuestionId(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]?.content ?? "";
    const match = m.match(/id\s*задачи\s*:\s*([\w-]+)/i);
    if (match) return match[1];
  }
  return null;
}

export async function getChatCompletion(messages: Message[], homeworkContext?: any): Promise<string> {
  try {
    const lastMessageRaw = messages[messages.length - 1]?.content || "";
    const lastMessage = norm(lastMessageRaw);

    // ---- Step 1: Handle follow-up (answer/solution/details) locally ----
    const asksAnswer =
      lastMessage.includes('показать ответ') || lastMessage.includes('покажи ответ');
    const asksSolution =
      lastMessage.includes('покажи решение') || lastMessage.includes('показать решение');
    const asksExplain =
      lastMessage.includes('не понял') || lastMessage.includes('объясни') || lastMessage.includes('подробнее');

    if (asksAnswer || asksSolution || asksExplain) {
      const questionId = extractLastQuestionId(messages);
      if (!questionId) return "Я не могу найти последнюю задачу. Пожалуйста, запроси новую.";

      const problem = await getMathProblemById(questionId);
      if (!problem) return "Не удалось найти задачу по ID.";

      if (asksAnswer) {
        return `📌 Ответ: **${problem.answer}**`;
      }
      if (asksSolution) {
        return problem.solution_text || "Решение пока недоступно.";
      }
      if (asksExplain) {
        // убедитесь, что ключ совпадает с БД
        return (problem as any).solutiontextexpanded || problem.solution_text || "Подробного объяснения нет.";
      }
    }

    // ---- Step 2: Handle new problem request locally ----
    const wantsProblem = ['задачу', 'задачку', 'задачи', 'упражнен', 'практик', 'трениров']
      .some(s => lastMessage.includes(s));

    if (wantsProblem) {
      const catMap: Record<string, string> = {
        'алгебр': 'алгебра',
        'арифметик': 'арифметика',
        'геометр': 'геометрия',
        'практич': 'практическая математика',
      };
      const catKey = Object.keys(catMap).find(k => lastMessage.includes(k));
      const category = catKey ? catMap[catKey] : undefined;

      const problem = await getRandomMathProblem(category);
      if (problem) {
        const rawImage = typeof problem.problem_image === 'string'
          ? problem.problem_image.replace(/^\/+/, '')
          : undefined;

        const imageUrl = rawImage?.startsWith('http')
          ? rawImage
          : (rawImage ? `https://casohrqgydyyvcclqwqm.supabase.co/storage/v1/object/public/images/${rawImage}` : undefined);

        const imagePart = imageUrl ? `🖼️ ![изображение](${imageUrl})\n\n` : "";

        return `Вот задача по категории *${category ?? 'Общее'}*:\n\n${imagePart}${problem.problem_text}\n\n(📌 ID задачи: ${problem.question_id})\n\nНапиши *показать ответ* или *покажи решение*, если хочешь продолжить.`;
      }
      return "Не удалось найти задачу. Попробуй ещё раз позже.";
    }

    // ---- Step 3: Default to Groq completion (with optional homework context) ----
    const fullMessages = buildMessagesWithContext(messages, homeworkContext, /*isStream*/ false);

    // Diagnostics
    let payloadBytes = -1;
    try { payloadBytes = JSON.stringify(fullMessages).length; } catch { /* ignore */ }
    console.log('[groq] payload bytes:', payloadBytes, 'context?', Boolean(homeworkContext));

    // Call with context first
    let data, error;
    try {
      const res = await supabase.functions.invoke('groq-chat', {
        body: { messages: fullMessages, stream: false }
      });
      data = res.data;
      error = res.error;
    } catch (e: any) {
      console.error('[groq] invoke threw:', e);
      // Fallback: try without context
      const fallbackMessages: Message[] = [SYSTEM_PROMPT, ...messages];
      let fbBytes = -1;
      try { fbBytes = JSON.stringify(fallbackMessages).length; } catch { /* ignore */ }
      console.log('[groq] fallback payload bytes:', fbBytes);

      const fb = await supabase.functions.invoke('groq-chat', {
        body: { messages: fallbackMessages, stream: false }
      });
      if (fb.error) {
        console.error('[groq] fallback error:', fb.error);
        return `Произошла ошибка (fallback): ${fb.error.message ?? 'unknown'}. Попробуй позже.`;
      }
      const fbContent = fb?.data?.choices?.[0]?.message?.content;
      return fbContent ?? 'Произошла ошибка (fallback контент пуст). Попробуй позже.';
    }

    if (error) {
      console.error('[groq] function error:', error);
      // Surface the function error back to the user (useful while debugging)
      return `Произошла ошибка: ${error.message ?? 'unknown'}. Попробуй позже.`;
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[groq] empty content:', data);
      return 'Произошла ошибка: пустой ответ модели. Попробуй ещё раз.';
    }
    return content;

  } catch (error: any) {
    console.error('Chat completion error:', error);
    const msg = typeof error?.message === 'string' ? error.message : String(error ?? 'unknown');
    return `Произошла ошибка: ${msg}. Попробуй позже.`;
  }
}

/* -------------------- helpers -------------------- */

// Safely build messages with optional homeworkContext
function buildMessagesWithContext(messages: Message[], homeworkContext?: any, isStream: boolean = false): Message[] {
  // Always start with SYSTEM_PROMPT
  let fullMessages: Message[] = [SYSTEM_PROMPT, ...messages];

  if (!homeworkContext) return fullMessages;

  // Defensive copy to avoid non-serializable stuff
  let safeContext: any;
  try {
    safeContext = JSON.parse(JSON.stringify(homeworkContext));
  } catch (e) {
    console.warn('[groq] context JSON clone failed:', e);
    return fullMessages; // skip context if not serializable
  }

  // Limit questions (avoid token overflow)
  const questions: any[] = Array.isArray(safeContext.questions) ? safeContext.questions.slice(-10) : [];
  console.log('[groq] context summary:', {
    hasContext: true,
    questionsCount: questions.length,
    name: safeContext.homeworkName,
    acc: safeContext.accuracyPercentage
  });

  // Build questions block safely
  const questionsBlock = questions.length
    ? questions.map((q: any, i: number) => `
Вопрос ${i + 1} (ID: ${q?.questionId ?? 'N/A'}):
  Текст: ${truncate(q?.questionText, 400) || 'Текст недоступен'}
  Ответ ученика: ${String(q?.userAnswer ?? 'Не отвечено')}
  Правильный ответ: ${String(q?.correctAnswer ?? '—')}
  Результат: ${q?.isCorrect ? '✅ Правильно' : '❌ Неправильно'}
  Время ответа: ${Number(q?.responseTimeSeconds ?? 0)}с
  Тип: ${String(q?.questionType ?? '—')}
  Сложность: ${String(q?.difficulty ?? '—')}
  Навыки: ${Array.isArray(q?.skills) && q.skills.length ? q.skills.join(', ') : 'Не указаны'}
  ${q?.showedSolution ? '⚠️ Показывалось решение' : ''}`.trim()).join('\n')
    : 'Нет данных о вопросах';

  const contextPrompt: Message = {
    role: 'system',
    content: `
КОНТЕКСТ ДОМАШНЕГО ЗАДАНИЯ (Доступен для обсуждения):

Название: ${String(safeContext.homeworkName ?? 'Домашнее задание')}
Выполнено: ${Number(safeContext.completedQuestions ?? 0)}/${Number(safeContext.totalQuestions ?? 0)} вопросов
Правильных ответов: ${Number(safeContext.correctAnswers ?? 0)}
Точность: ${Number(safeContext.accuracyPercentage ?? 0)}%
Общее время: ${Number(safeContext.totalTimeSeconds ?? 0)} секунд
Среднее время на вопрос: ${Number(safeContext.averageTimePerQuestion ?? 0)} секунд

ДЕТАЛИ ВОПРОСОВ:
${questionsBlock}

ИНСТРУКЦИИ ДЛЯ ОТВЕТОВ:
- Когда ученик упоминает "вопрос 3" или "задача 5", используй данные выше
- Объясняй ПОЧЕМУ его ответ был неправильным, если он спрашивает
- Показывай пошаговые решения когда просят
- Ссылайся на конкретные вопросы по номеру
- Будь ободряющим и образовательным
- Помни, что у тебя есть полный доступ ко всем деталям выполненного ДЗ
- Если ученик спрашивает про конкретную задачу, покажи ее текст, его ответ и правильный ответ
`.trim()
  };

  // Insert SYSTEM_PROMPT, then context, then the rest of messages
  fullMessages = [SYSTEM_PROMPT, contextPrompt, ...messages];

  // Optional: guard final payload size (useful for debugging/hard limits)
  // const payloadSize = JSON.stringify(fullMessages).length;
  // console.log('LLM payload bytes:', payloadSize);

  return fullMessages;
}

// Truncate helper for long strings
function truncate(s: any, maxLen: number): string {
  const str = typeof s === 'string' ? s : String(s ?? '');
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
