
import { getRandomMathProblem, getMathProblemById } from "@/services/mathProblemsService";
import { supabase } from "@/integrations/supabase/client";

// Groq API service for chat completions
export interface Message {
  role: 'system' | 'user' | 'assistant'; 
  content: string;
}

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

export async function streamChatCompletion(messages: Message[]): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const fullMessages = [SYSTEM_PROMPT, ...messages];

    const { data, error } = await supabase.functions.invoke('groq-chat', {
      body: { messages: fullMessages, stream: true }
    });

    if (error) {
      console.error('Groq function error:', error);
      throw new Error(`Groq function error: ${error.message}`);
    }

    // The response should be a stream
    return data;
  } catch (error) {
    console.error('Error streaming from Groq:', error);
    return null;
  }
}

function extractLastQuestionId(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const match = messages[i].content.match(/ID задачи: ([\w-]+)/);
    if (match) return match[1];
  }
  return null;
}

export async function getChatCompletion(messages: Message[], homeworkContext?: any): Promise<string> {
  try {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase();

    // Step 1: Handle follow-up (answer/solution/details)
    if (lastMessage.includes('показать ответ') || lastMessage.includes('покажи решение') || lastMessage.includes('не понял')) {
      const questionId = extractLastQuestionId(messages);
      if (!questionId) return "Я не могу найти последнюю задачу. Пожалуйста, запроси новую.";

      const problem = await getMathProblemById(questionId);
      if (!problem) return "Не удалось найти задачу по ID.";

      if (lastMessage.includes('показать ответ')) {
        return `📌 Ответ: **${problem.answer}**`;
      }

      if (lastMessage.includes('покажи решение')) {
        return problem.solution_text || "Решение пока недоступно.";
      }

      if (lastMessage.includes('не понял')) {
        return problem.solutiontextexpanded || "Подробного объяснения нет.";
      }
    }

    // Step 2: Handle new problem request
    if (lastMessage.includes('задачу')) {
      let category: string | undefined = undefined;

      if (lastMessage.includes('алгебр')) category = 'алгебра';
      else if (lastMessage.includes('арифметик')) category = 'арифметика';
      else if (lastMessage.includes('геометр')) category = 'геометрия';
      else if (lastMessage.includes('практич')) category = 'практическая математика';

      const problem = await getRandomMathProblem(category);

      if (problem) {
       
        const rawImage = problem.problem_image?.replace(/^\/+/, '');
        const imageUrl = rawImage?.startsWith('http')
          ? rawImage
          : `https://casohrqgydyyvcclqwqm.supabase.co/storage/v1/object/public/images/${rawImage}`;

        
        const imagePart = problem.problem_image ? `🖼️ ![изображение](${imageUrl})\n\n` : "";

        return `Вот задача по категории *${category ?? 'Общее'}*:\n\n${imagePart}${problem.problem_text}\n\n(📌 ID задачи: ${problem.question_id})\n\nНапиши *показать ответ* или *покажи решение*, если хочешь продолжить.`;
      }

      return "Не удалось найти задачу. Попробуй ещё раз позже.";
    }

    // Step 3: Default to Groq completion
    let fullMessages: Message[] = [SYSTEM_PROMPT, ...messages];
    
    // Inject homework context if available
    if (homeworkContext) {
      console.log('💬 Injecting homework context into AI prompt');
      
      const contextPrompt: Message = {
        role: 'system',
        content: `
КОНТЕКСТ ДОМАШНЕГО ЗАДАНИЯ (Доступен для обсуждения):

Название: ${homeworkContext.homeworkName || 'Домашнее задание'}
Выполнено: ${homeworkContext.completedQuestions || 0}/${homeworkContext.totalQuestions || 0} вопросов
Правильных ответов: ${homeworkContext.correctAnswers || 0}
Точность: ${homeworkContext.accuracyPercentage || 0}%
Общее время: ${homeworkContext.totalTimeSeconds || 0} секунд
Среднее время на вопрос: ${homeworkContext.averageTimePerQuestion || 0} секунд

ДЕТАЛИ ВОПРОСОВ:
${homeworkContext.questions?.map((q: any, i: number) => `
Вопрос ${i + 1} (ID: ${q.questionId}):
  Текст: ${q.questionText || 'Текст недоступен'}
  Ответ ученика: ${q.userAnswer || 'Не отвечено'}
  Правильный ответ: ${q.correctAnswer}
  Результат: ${q.isCorrect ? '✅ Правильно' : '❌ Неправильно'}
  Время ответа: ${q.responseTimeSeconds || 0}с
  Тип: ${q.questionType}
  Сложность: ${q.difficulty}
  Навыки: ${q.skills?.join(', ') || 'Не указаны'}
  ${q.showedSolution ? '⚠️ Показывалось решение' : ''}
`).join('\n') || 'Нет данных о вопросах'}

ИНСТРУКЦИИ ДЛЯ ОТВЕТОВ:
- Когда ученик упоминает "вопрос 3" или "задача 5", используй данные выше
- Объясняй ПОЧЕМУ его ответ был неправильным, если он спрашивает
- Показывай пошаговые решения когда просят
- Ссылайся на конкретные вопросы по номеру
- Будь ободряющим и образовательным
- Помни, что у тебя есть полный доступ ко всем деталям выполненного ДЗ
- Если ученик спрашивает про конкретную задачу, покажи ее текст, его ответ и правильный ответ
`
      };
      
      fullMessages = [SYSTEM_PROMPT, contextPrompt, ...messages];
    }
    
    const { data, error } = await supabase.functions.invoke('groq-chat', {
      body: { messages: fullMessages, stream: false }
    });

    if (error) {
      console.error('Groq function error:', error);
      throw new Error(`Groq function error: ${error.message}`);
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Chat completion error:', error);
    return 'Произошла ошибка. Попробуй позже.';
  }
}
