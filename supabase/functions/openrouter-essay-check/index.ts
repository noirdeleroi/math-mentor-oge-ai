// deno-lint-ignore-file no-explicit-any
/**
 * Deno server for essay analysis with Supabase + OpenRouter (JSON output + errors).
 * - Strict CORS incl. OPTIONS preflight
 * - Healthcheck on GET
 * - Subject-aware prompts & JSON schemas:
 *    * EGE: K1–K10, max 22
 *    * OGE: CK1–CK4, GK1–GK4, FK1, max 20
 * - Adds nested error structures: `errors[]` and `errors_summary{}`
 * - Parses/validates JSON; safe fallback
 * - Score taken from JSON.total_score (fallback to regex; subject-aware range)
 * - Student text is taken from latest row of table `student_essay1` (column `text_scan`) by `created_at` for the user_id
 * - Writes analysis + score back into `student_essay1` for BOTH subjects
 */ import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
console.log("[INIT] Starting server...");
// ---------- ENV ----------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
console.log("[ENV] SUPABASE_URL:", !!SUPABASE_URL);
console.log("[ENV] SUPABASE_SERVICE_ROLE_KEY:", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("[ENV] OPENROUTER_API_KEY:", !!OPENROUTER_API_KEY);
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENROUTER_API_KEY) {
  console.error("[ENV] Missing required environment variables.");
}
// ---------- SUPABASE ----------
const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: {
    persistSession: false
  }
});
console.log("[INIT] Supabase client initialized.");
// ---------- CONSTANTS ----------
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";
// ---------- CORS HELPERS ----------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
};
function jsonResponse(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders
    }
  });
}
// ---------- UTILS ----------
function parseScoreFromText(text, maxAllowed) {
  console.log("[parseScoreFromText] Fallback parse...");
  const m = text.match(/\b(?:[0-9]|1\d|2[0-9])\b/); // wide match, we clamp later
  if (!m) return null;
  const n = parseInt(m[0], 10);
  if (Number.isNaN(n) || n < 0 || n > maxAllowed) return null;
  return n;
}
function parseScoreFromJson(obj, maxAllowed) {
  if (obj && typeof obj.total_score === "number") {
    const n = obj.total_score;
    if (Number.isInteger(n) && n >= 0 && n <= maxAllowed) return n;
  }
  return null;
}
function computeContextSnippet(text, original) {
  if (!text || !original) return "";
  const cleanText = text.replace(/\s+/g, " ").trim();
  const cleanOriginal = original.replace(/\s+/g, " ").trim();
  if (!cleanOriginal) return "";
  const idx = cleanText.toLowerCase().indexOf(cleanOriginal.toLowerCase());
  if (idx < 0) return cleanOriginal;
  const tokens = Array.from(cleanText.matchAll(/\p{L}[\p{L}\p{N}'’-]*|\d+|\S/gu)).map((m, i)=>({
      i,
      t: m[0],
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length
    }));
  const startTok = tokens.findIndex((tok)=>tok.start <= idx && idx < tok.end);
  if (startTok === -1) return cleanOriginal;
  const endPos = idx + cleanOriginal.length;
  let endTok = startTok;
  while(endTok + 1 < tokens.length && tokens[endTok].end < endPos)endTok++;
  const beforeTok = startTok > 0 ? tokens[startTok - 1] : null;
  const afterTok = endTok + 1 < tokens.length ? tokens[endTok + 1] : null;
  const isWord = (s)=>/\p{L}|\d/u.test(s);
  const parts = [];
  if (beforeTok && isWord(beforeTok.t)) parts.push(beforeTok.t);
  parts.push(cleanText.slice(tokens[startTok].start, tokens[endTok].end));
  if (afterTok && isWord(afterTok.t)) parts.push(afterTok.t);
  return parts.join(" ").trim();
}
function safeJsonParse(maybeJson) {
  try {
    return JSON.parse(maybeJson);
  } catch  {
    const start = maybeJson.indexOf("{");
    const end = maybeJson.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = maybeJson.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch  {
        return null;
      }
    }
    return null;
  }
}
// ---------- SHARED ERROR TYPES ----------
const ERROR_TYPES = [
  "орфография",
  "пунктуация",
  "грамматика",
  "факты",
  "логика",
  "этика",
  "стиль",
  "другое"
];
// ---------- FIXED JSON KEYS (by subject) ----------
// EGE keys (unchanged)
const FIXED_KEYS_EGE = [
  "errors",
  "errors_summary",
  "overall_quality",
  "total_score_text",
  "total_score",
  "max_score",
  "section_I_title",
  "k1_title",
  "k1_comment",
  "k1_score",
  "k1_max",
  "k2_title",
  "k2_comment",
  "k2_score",
  "k2_max",
  "k3_title",
  "k3_comment",
  "k3_score",
  "k3_max",
  "section_II_title",
  "k4_title",
  "k4_comment",
  "k4_score",
  "k4_max",
  "k5_title",
  "k5_comment",
  "k5_score",
  "k5_max",
  "k6_title",
  "k6_comment",
  "k6_score",
  "k6_max",
  "section_III_title",
  "k7_title",
  "k7_comment",
  "k7_score",
  "k7_max",
  "k8_title",
  "k8_comment",
  "k8_score",
  "k8_max",
  "k9_title",
  "k9_comment",
  "k9_score",
  "k9_max",
  "k10_title",
  "k10_comment",
  "k10_score",
  "k10_max"
];
// OGE keys: sections/criteria from your description
const FIXED_KEYS_OGE = [
  "errors",
  "errors_summary",
  "overall_quality",
  "total_score_text",
  "total_score",
  "max_score",
  "section_A_title",
  "ck1_title",
  "ck1_comment",
  "ck1_score",
  "ck1_max",
  "ck2_title",
  "ck2_comment",
  "ck2_score",
  "ck2_max",
  "ck3_title",
  "ck3_comment",
  "ck3_score",
  "ck3_max",
  "ck4_title",
  "ck4_comment",
  "ck4_score",
  "ck4_max",
  "section_B_title",
  "gk1_title",
  "gk1_comment",
  "gk1_score",
  "gk1_max",
  "gk2_title",
  "gk2_comment",
  "gk2_score",
  "gk2_max",
  "gk3_title",
  "gk3_comment",
  "gk3_score",
  "gk3_max",
  "gk4_title",
  "gk4_comment",
  "gk4_score",
  "gk4_max",
  "fk1_title",
  "fk1_comment",
  "fk1_score",
  "fk1_max"
];
// ---------- PROMPT BUILDERS ----------
function buildPromptEGE(topic_essay, student_essay) {
  const baseTask = `Ты преподаватель по русскму языку. Твоя задача оценить сочинение
студента по критериям ЕГЭ (Задание 27). Формат ответа — СТРОГО один JSON-объект.`;
  const criteriaBlock = `
Критерии оценивания выполнения задания с развёрнутым ответом (ЕГЭ: Задание 27).
Критерии оценки сочинения студента:
**Критерии оценивания выполнения задания с развёрнутым ответом (Задание 27)**
---

**I. Содержание сочинения**

---

**К1: Отражение позиции автора (рассказчика) по указанной проблеме
исходного текста**

* **1 балл:**
* Позиция автора (рассказчика) по указанной проблеме исходного текста
сформулирована в одной из частей сочинения верно.
* **0 баллов:**
* Позиция автора (рассказчика) по указанной проблеме исходного текста
не сформулирована или сформулирована неверно.
* *(Указание к оцениванию: Если экзаменуемый не сформулировал или
сформулировал неверно позицию автора, то такая работа по критериям К2
и К3 оценивается 0 баллов).* 

---

**К2: Комментарий к позиции автора (рассказчика) по указанной проблеме
исходного текста**

* **3 балла:**
* Позиция автора прокомментирована с опорой на исходный текст.
* Приведено 2 примера-иллюстрации из текста, важных для понимания
позиции автора.
* Дано пояснение к каждому из примеров.
* Указана смысловая связь между примерами и дано пояснение к ней.
* **2 балла:**
* Позиция автора прокомментирована с опорой на исходный текст.
* Приведено 2 примера-иллюстрации из текста с пояснениями.
* Смысловая связь между примерами не указана, или указана неверно, или
не пояснена.
* **1 балл:**
* Позиция автора прокомментирована с опорой на исходный текст.
* Приведён 1 пример-иллюстрация из текста с пояснением.
* **0 баллов:**
* Приведён 1 пример-иллюстрация, но пояснение к нему отсутствует.
* ИЛИ: Ни одного примера-иллюстрации не приведено.
* ИЛИ: Комментарий дан без опоры на исходный текст.
* ИЛИ: Вместо комментария дан простой пересказ.
* ИЛИ: Вместо комментария процитирован большой фрагмент текста.
* ИЛИ: Позиция автора не прокомментирована.
* *(Указания к оцениванию:*
* *1. Если пример-иллюстрация приведён без пояснения, он не засчитывается.*
* *2. Если допущена фактическая ошибка, она учитывается по критерию К4).* 

---

**К3: Собственное отношение экзаменуемого к позиции автора
(рассказчика) по указанной проблеме исходного текста**

* **2 балла:**
* Собственное отношение сформулировано и обосновано. Приведён пример-аргумент.
* **1 балл:**
* Собственное отношение сформулировано и обосновано, но
пример-аргумент не приведён.
* ИЛИ: Приведён пример-аргумент, но собственное отношение не заявлено.
* **0 баллов:**
* Собственное отношение заявлено лишь формально (например, «Я согласен
/ не согласен с автором»).
* ИЛИ: Собственное отношение не сформулировано и не обосновано,
пример-аргумент не приведён.
* ИЛИ: Формулировка и/или обоснование не соответствуют проблеме текста.

---
**II. Речевое оформление сочинения**
---

**К4: Фактическая точность речи**

* **1 балл:** Фактические ошибки отсутствуют.
* **0 баллов:** Допущена одна фактическая ошибка или более.

**К5: Логичность речи**

* **2 балла:** Логические ошибки отсутствуют.
* **1 балл:** Допущены одна-две логические ошибки.
* **0 баллов:** Допущено три логические ошибки или более.

**К6: Соблюдение этических норм**

* **1 балл:** Этические ошибки отсутствуют.
* **0 баллов:** В работе приводятся примеры экстремистских материалов,
социально неприемлемого поведения, высказывания, нарушающие
законодательство РФ, и т.д.

---
**III. Грамотность сочинения**
---

**К7: Соблюдение орфографических норм**

* **3 балла:** Ошибок нет.
* **2 балла:** Допущены 1-2 ошибки.
* **1 балл:** Допущены 3-4 ошибки.
* **0 баллов:** Допущено 5 ошибок или более.

**К8: Соблюдение пунктуационных норм**

* **3 балла:** Ошибок нет.
* **2 балла:** Допущены 1-2 ошибки.
* **1 балл:** Допущены 3-4 ошибки.
* **0 баллов:** Допущено 5 ошибок или более.

**К9: Соблюдение грамматических норм**

* **3 балла:** Ошибок нет.
* **2 балла:** Допущены 1-2 ошибки.
* **1 балл:** Допущены 3-4 ошибки.
* **0 баллов:** Допущено 5 ошибок или более.

**К10: Соблюдение речевых норм**

* **3 балла:** Ошибок нет.
* **2 балла:** Допущены 1-2 ошибки.
* **1 балл:** Допущены 3-4 ошибки.
* **0 баллов:** Допущено 5 ошибок или более.

---
**Максимальное количество баллов за выполнение задания 27 (К1–К10): 22**
---

****************************************
**ОБЩИЕ ПОЛОЖЕНИЯ И ПРАВИЛА ОЦЕНКИ**
****************************************

При оценке грамотности (К7–К10) следует учитывать объём сочинения (1).
Нормы в таблице разработаны для сочинения объёмом 150 слов или более
(2).

* Если в сочинении 149 слов или менее, работа не засчитывается и
оценивается по всем критериям нулём баллов.
* Работа, написанная без опоры на прочитанный текст, не оценивается.
* Если сочинение — это полностью переписанный или пересказанный текст
без комментариев, работа оценивается нулём баллов по всем критериям
(К1–К10).`;
  const structuredDirective = `
СТРОГО ВЕРНИ ОДИН JSON-ОБЪЕКТ UTF-8. Без Markdown/комментариев/троичных кавычек.

Требуемая структура (заполни все поля; баллы — целые числа):
{
  "errors": [{
    "type": "orthography" | "punctuation" | "grammar" | "factual" | "logic" | "ethics" | "style" | "other",
    "category": string,
    "original": string,
    "correction": string,
    "explanation": string,
    "context_snippet": string,
    "criterion": "K4" | "K5" | "K6" | "K7" | "K8" | "K9" | "K10" | ""
  }],
  "errors_summary": {
    "total": number,
    "by_type": {
      "орфография": number, "пунктуация": number, "грамматика": number,
      "фактические": number, "логика": number, "этика": number, "стиль": number, "другое": number
    }
  },
  "overall_quality": string,
  "total_score_text": string,
  "total_score": number,      // 0–22
  "max_score": number,        // 22

  "section_I_title": string,
  "k1_title": string, "k1_comment": string, "k1_score": number, "k1_max": number,
  "k2_title": string, "k2_comment": string, "k2_score": number, "k2_max": number,
  "k3_title": string, "k3_comment": string, "k3_score": number, "k3_max": number,

  "section_II_title": string,
  "k4_title": string, "k4_comment": string, "k4_score": number, "k4_max": number,
  "k5_title": string, "k5_comment": string, "k5_score": number, "k5_max": number,
  "k6_title": string, "k6_comment": string, "k6_score": number, "k6_max": number,

  "section_III_title": string,
  "k7_title": string, "k7_comment": string, "k7_score": number, "k7_max": number,
  "k8_title": string, "k8_comment": string, "k8_score": number, "k8_max": number,
  "k9_title": string, "k9_comment": string, "k9_score": number, "k9_max": number,
  "k10_title": string, "k10_comment": string, "k10_score": number, "k10_max": number
}

Правила:
- "errors" — массив (может быть пустым). "errors_summary.by_type" содержит все ключи, даже с нулём.
- "context_snippet": первое вхождение "original" в сочинении + слово до/после (если есть), без лишних символов.
- Только перечисленные ключи, без дополнительных.
- Верни ТОЛЬКО JSON.`;
  return `${baseTask}

Текст и задание:
${topic_essay}

Сочинение студента:
${student_essay}

${criteriaBlock}

${structuredDirective}`.trim();
}
function buildPromptOGE(topic_essay, student_essay) {
  const baseTask = `Ты преподаватель по русскому языку. Оцени сочинение по критериям ОГЭ ниже. Верни СТРОГО один JSON-объект.`;
  const criteriaFromUser = `
КРИТЕРИИ ОЦЕНКИ СОЧИНЕНИЯ ОГЭ:
# Критерии оценки сочинения

## Критерий СК1: Наличие ответа на вопрос
- **Категория**: Сочинение-рассуждение
- **Макс. балл**: 1
- **Описание**:
  - **1**: Экзаменуемый дал ответ на вопрос, сформулированный в теме сочинения.
  - **0**: Экзаменуемый не ответил на вопрос, сформулированный в теме сочинения, или ответил неправильно.

## Критерий СК2: Наличие примеров
- **Категория**: Сочинение-рассуждение
- **Макс. балл**: 3
- **Описание**:
  - **3**: Приведены два примера из прочитанного текста, подтверждающих рассуждения экзаменуемого.
  - **2**: Приведён один пример из прочитанного текста, подтверждающий рассуждения экзаменуемого.
  - **1**: Приведён пример (или примеры) из жизненного или читательского опыта, подтверждающий(-ие) рассуждения экзаменуемого.
  - **0**: Ни одного примера, подтверждающего рассуждения экзаменуемого, не приведено.

## Критерий СК3: Логичность речи
- **Категория**: Сочинение-рассуждение
- **Макс. балл**: 2
- **Описание**:
  - **2**: Логические ошибки отсутствуют.
  - **1**: Допущены одна–две логические ошибки.
  - **0**: Допущено три логические ошибки или более.

## Критерий СК4: Композиционная стройность
- **Категория**: Сочинение-рассуждение
- **Макс. балл**: 1
- **Описание**:
  - **1**: Работа характеризуется трёхчастной композицией, ошибки в построении текста отсутствуют.
  - **0**: Нарушена трёхчастная композиция или допущена одна ошибка (или более) в построении текста.

## Критерий ГК1: Соблюдение орфографических норм
- **Категория**: Грамотность и фактическая точность
- **Макс. балл**: 3
- **Описание**:
  - **3**: Орфографических ошибок нет.
  - **2**: Допущены одна–две ошибки.
  - **1**: Допущены три–четыре ошибки.
  - **0**: Допущено пять ошибок или более.

## Критерий ГК2: Соблюдение пунктуационных норм
- **Категория**: Грамотность и фактическая точность
- **Макс. балл**: 3
- **Описание**:
  - **3**: Пунктуационных ошибок нет.
  - **2**: Допущены одна–две ошибки.
  - **1**: Допущены три–четыре ошибки.
  - **0**: Допущено пять ошибок или более.

## Критерий ГК3: Соблюдение грамматических норм
- **Категория**: Грамотность и фактическая точность
- **Макс. балл**: 3
- **Описание**:
  - **3**: Грамматических ошибок нет.
  - **2**: Допущены одна–две ошибки.
  - **1**: Допущены три–четыре ошибки.
  - **0**: Допущено пять ошибок или более.

## Критерий ГК4: Соблюдение речевых норм
- **Категория**: Грамотность и фактическая точность
- **Макс. балл**: 3
- **Описание**:
  - **3**: Речевых ошибок нет.
  - **2**: Допущены одна–две ошибки.
  - **1**: Допущены три–четыре ошибки.
  - **0**: Допущено пять ошибок или более.

## Критерий ФК1: Фактическая точность речи
- **Категория**: Грамотность и фактическая точность
- **Макс. балл**: 1
- **Описание**:
  - **1**: Фактические ошибки отсутствуют.
  - **0**: Допущена одна фактическая ошибка или более.

# Категории

## Категория: Сочинение-рассуждение
- **Метка**: 🧠 Сочинение-рассуждение
- **Критерии**: СК1, СК2, СК3, СК4
- **Максимум баллов**: 7

## Категория: Грамотность и фактическая точность
- **Метка**: ✍️ Грамотность и фактическая точность речи
- **Критерии**: ГК1, ГК2, ГК3, ГК4, ФК1
- **Максимум баллов**: 13

# Сноска
При подсчёте слов учитываются как самостоятельные, так и служебные части речи. Сокращённые слова и служебные выражения не учитываются. Инициалы с фамилией считаются одним словом. Цифры и знаки препинания не считаются словами.
Суммарный максимум: 20 баллов.`;
  const structuredDirective = `
СТРОГО ВЕРНИ ОДИН JSON-ОБЪЕКТ UTF-8. Без Markdown/комментариев/троичных кавычек.

Требуемая структура (заполни все поля; баллы — целые числа):
{
  "errors": [{
    "type": "orthography" | "punctuation" | "grammar" | "factual" | "logic" | "ethics" | "style" | "other",
    "category": string,
    "original": string,
    "correction": string,
    "explanation": string,
    "context_snippet": string,
    "criterion": "ГК1" | "ГК2" | "ГК3" | "ГК4" | "ФК1" | "СК3" | ""   // укажи связанный критерий, если применимо
  }],
  "errors_summary": {
    "total": number,
    "by_type": {
      "орфография": number, "пунктуация": number, "грамматика": number,
      "фактические": number, "логика": number, "этика": number, "стиль": number, "другое": number
    }
  },
  "overall_quality": string,
  "total_score_text": string,     // например: "Суммарный балл: 18 из 20"
  "total_score": number,          // 0–20
  "max_score": number,            // 20

  "section_A_title": string,      // "Сочинение-рассуждение"
  "ck1_title": string, "ck1_comment": string, "ck1_score": number, "ck1_max": number,
  "ck2_title": string, "ck2_comment": string, "ck2_score": number, "ck2_max": number,
  "ck3_title": string, "ck3_comment": string, "ck3_score": number, "ck3_max": number,
  "ck4_title": string, "ck4_comment": string, "ck4_score": number, "ck4_max": number,

  "section_B_title": string,      // "Грамотность и фактическая точность"
  "gk1_title": string, "gk1_comment": string, "gk1_score": number, "gk1_max": number,
  "gk2_title": string, "gk2_comment": string, "gk2_score": number, "gk2_max": number,
  "gk3_title": string, "gk3_comment": string, "gk3_score": number, "gk3_max": number,
  "gk4_title": string, "gk4_comment": string, "gk4_score": number, "gk4_max": number,
  "fk1_title": string, "fk1_comment": string, "fk1_score": number, "fk1_max": number
}

Правила:
- "errors" — массив (может быть пустым). "errors_summary.by_type" содержит все ключи, даже если ноль.
- "context_snippet": первое вхождение "original" в сочинении + слово до/после (если есть), без лишних символов.
- Для ck1..ck4, gk1..gk4, fk1 выставляй баллы по шкалам из описания (максимумы указаны).
- Только перечисленные ключи, без дополнительных.
- Верни ТОЛЬКО JSON.`;
  return `${baseTask}

Текст и задание:
${topic_essay}

Сочинение студента:
${student_essay}

${criteriaFromUser}

${structuredDirective}`.trim();
}
function buildPrompt(subject, topic_essay, student_essay) {
  return subject === "ege" ? buildPromptEGE(topic_essay, student_essay) : buildPromptOGE(topic_essay, student_essay);
}
// ---------- SERVER ----------
Deno.serve(async (req)=>{
  const startTime = Date.now();
  console.log("[SERVER] Request received:", req.method, req.url);
  // CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[SERVER] OPTIONS preflight accepted.");
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Healthcheck
  if (req.method === "GET") {
    console.log("[SERVER] Healthcheck GET.");
    return jsonResponse({
      ok: true,
      service: "openrouter-essay-check-json-errors"
    }, 200);
  }
  if (req.method !== "POST") {
    console.warn("[SERVER] Non-POST request received. Rejecting.");
    return jsonResponse({
      error: "Ошибка в сети... Попробуй позже"
    }, 405);
  }
  try {
    console.log("[STEP 0] Parsing JSON body...");
    const body = await req.json().catch(()=>null);
    console.log("[STEP 0] Parsed body:", body);
    if (!body || !body.user_id || body.subject !== "ege" && body.subject !== "oge") {
      console.warn("[VALIDATION] Invalid body or subject:", body);
      return jsonResponse({
        error: "Ошибка в сети... Попробуй позже"
      }, 400);
    }
    const userId = body.user_id;
    const subject = body.subject;
    const MAX_SCORE = subject === "ege" ? 22 : 20;
    console.log(`[INFO] Processing user_id=${userId}, subject=${subject}, MAX=${MAX_SCORE}`);
    // 1) Fetch latest student text from table `student_essay1` (text_scan)
    console.log("[STEP 1] Fetching latest text_scan from `student_essay1`...");
    const { data: scanRows, error: scanErr } = await supabase.from("student_essay1").select("id, text_scan, created_at").eq("user_id", userId).order("created_at", {
      ascending: false
    }).limit(1);
    console.log("[STEP 1] Query result:", {
      scanRows,
      scanErr
    });
    if (scanErr) throw scanErr;
    if (!scanRows || scanRows.length === 0) {
      console.warn("[STEP 1] No text_scan rows found for user.");
      throw new Error("no_student_text_scan");
    }
    const latestScan = (scanRows[0]?.text_scan ?? "").toString();
    console.log("[STEP 1] text_scan (first 100 chars):", latestScan.slice(0, 100));
    // 2) Find most recent student_essay1 row for user (for topic id and to update analysis/score)
    console.log("[STEP 2] Fetching most recent student_essay1...");
    const { data: essayRows, error: essayErr } = await supabase.from("student_essay1").select("id, essay_topic_id, created_at").eq("user_id", userId).order("created_at", {
      ascending: false
    }).limit(1);
    console.log("[STEP 2] Query result:", {
      essayRows,
      essayErr
    });
    if (essayErr) throw essayErr;
    if (!essayRows || essayRows.length === 0) {
      console.warn("[STEP 2] No essays found for user.");
      throw new Error("no_essay");
    }
    const essayRow = essayRows[0];
    console.log("[STEP 2] Latest essay row:", essayRow);
    // 3) Fetch topic text
    console.log("[STEP 3] Fetching essay topic...");
    const { data: topicRow, error: topicErr } = await supabase.from("essay_topics").select("essay_topic").eq("id", essayRow.essay_topic_id).maybeSingle();
    console.log("[STEP 3] Query result:", {
      topicRow,
      topicErr
    });
    if (topicErr) throw topicErr;
    const topicEssay = (topicRow?.essay_topic ?? "").toString();
    console.log("[STEP 3] topicEssay (first 100 chars):", topicEssay.slice(0, 100));
    // 4) Build prompt (strict JSON + errors), using latestScan as student_essay
    console.log("[STEP 4] Building prompt (subject-aware)...");
    const prompt = buildPrompt(subject, topicEssay, latestScan);
    console.log("[STEP 4] Prompt built (first 200 chars):", prompt.slice(0, 200));
    // 5) Call OpenRouter
    console.log("[STEP 5] Sending request to OpenRouter...");
    const orRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });
    console.log("[STEP 5] OpenRouter response status:", orRes.status);
    const orJson = await orRes.json().catch(()=>null);
    console.log("[STEP 5] OpenRouter JSON snippet:", JSON.stringify(orJson)?.slice(0, 300));
    // === [STEP 5.1] Extract token usage and calculate cost ===
    try {
      const { prompt_tokens, completion_tokens } = orJson?.usage || {};
      const model = orJson?.model || MODEL;
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
      const [priceIn, priceOut] = pricingTable[model] || [
        0,
        0
      ];
      const price = (prompt_tokens || 0) / 1_000_000 * priceIn + (completion_tokens || 0) / 1_000_000 * priceOut;
      const { error: insertError } = await supabase.from("user_credits").insert({
        user_id: userId,
        tokens_in: prompt_tokens || 0,
        tokens_out: completion_tokens || 0,
        price: price,
        model,
        created_at: new Date().toISOString()
      });
      if (insertError) {
        console.error("❌ Failed to insert user credits:", insertError.message);
      } else {
        console.log(`✅ Stored usage for ${model}: ${prompt_tokens} in, ${completion_tokens} out, $${price.toFixed(6)} total`);
      }
    } catch (usageErr) {
      console.error("⚠️ Failed to record usage:", usageErr);
    }
    const raw = orJson?.choices?.[0]?.message?.content ?? null;
    if (!raw) {
      console.warn("[STEP 5] No text returned from OpenRouter.");
      throw new Error("no_or_text");
    }
    // 6) Validate/parse JSON
    console.log("[STEP 6] Parsing JSON payload from model...");
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== "object") {
      console.warn("[STEP 6] Model did not return valid JSON. Raw starts with:", raw.slice(0, 60));
      throw new Error("invalid_json_from_model");
    }
    // Ensure errors is an array + normalize
    if (!Array.isArray(parsed.errors)) {
      parsed.errors = [];
    } else {
      parsed.errors = parsed.errors.map((e)=>({
          type: typeof e?.type === "string" ? e.type : "other",
          category: typeof e?.category === "string" ? e.category : "",
          original: typeof e?.original === "string" ? e.original : "",
          correction: typeof e?.correction === "string" ? e.correction : "",
          explanation: typeof e?.explanation === "string" ? e.explanation : "",
          context_snippet: typeof e?.context_snippet === "string" && e.context_snippet.trim() ? e.context_snippet.trim() : computeContextSnippet(latestScan, typeof e?.original === "string" ? e.original : ""),
          criterion: typeof e?.criterion === "string" ? e.criterion : ""
        }));
    }
    // Ensure errors_summary with counts
    if (!parsed.errors_summary || typeof parsed.errors_summary !== "object") {
      parsed.errors_summary = {};
    }
    if (typeof parsed.errors_summary.total !== "number") {
      parsed.errors_summary.total = Array.isArray(parsed.errors) ? parsed.errors.length : 0;
    }
    if (!parsed.errors_summary.by_type || typeof parsed.errors_summary.by_type !== "object") {
      parsed.errors_summary.by_type = {};
    }
    const computedCounts = ERROR_TYPES.reduce((acc, t)=>{
      acc[t] = 0;
      return acc;
    }, {});
    for (const e of parsed.errors){
      const t = ERROR_TYPES.includes(e.type) ? e.type : "other";
      computedCounts[t] += 1;
    }
    for (const t of ERROR_TYPES){
      if (typeof parsed.errors_summary.by_type[t] !== "number") {
        parsed.errors_summary.by_type[t] = computedCounts[t];
      }
    }
    if (!parsed.errors_summary.total) {
      parsed.errors_summary.total = parsed.errors.length;
    }
    // Subject-specific fixed keys injection (fill missing)
    const FIXED = subject === "ege" ? FIXED_KEYS_EGE : FIXED_KEYS_OGE;
    for (const k of FIXED){
      if (!(k in parsed)) {
        // sensible defaults: scores -> 0; max -> 0; titles/comments -> ""
        if (k.endsWith("_score") || k.endsWith("_max") || k === "max_score" || k === "total_score") {
          parsed[k] = 0;
        } else if (k === "errors") {
          parsed[k] = [];
        } else if (k === "errors_summary") {
          parsed[k] = {
            total: parsed.errors?.length ?? 0,
            by_type: {}
          };
        } else {
          parsed[k] = "";
        }
      }
    }
    // Ensure OGE/EGE max_score is set correctly
    parsed.max_score = MAX_SCORE;
    // 7) Extract score (subject-aware)
    console.log("[STEP 7] Extracting score (subject-aware)...");
    const score = parseScoreFromJson(parsed, MAX_SCORE) ?? parseScoreFromText(raw, MAX_SCORE);
    const analysisToStore = JSON.stringify(parsed, null, 2);
    // 8) Update Supabase for BOTH subjects
    console.log("[STEP 8] Updating Supabase (student_essay1)...");
    const { error: updErr } = await supabase.from("student_essay1").update({
      analysis: analysisToStore,
      score: score ?? null
    }).eq("id", essayRow.id);
    console.log("[STEP 8] Update result:", {
      updErr
    });
    if (updErr) throw updErr;
    // 9) Return JSON to client
    console.log("[STEP 9] Returning JSON to client...");
    const totalTime = Date.now() - startTime;
    console.log(`[COMPLETE] Execution finished in ${totalTime}ms for user_id=${userId}`);
    return jsonResponse({
      analysis: parsed,
      raw
    });
  } catch (e) {
    console.error("[ERROR] openrouter-essay-check-json-errors failed:", e);
    const totalTime = Date.now() - startTime;
    console.error(`[ERROR] Execution failed after ${totalTime}ms`);
    return jsonResponse({
      error: "Ошибка в сети... Попробуй позже"
    }, 503);
  }
});
