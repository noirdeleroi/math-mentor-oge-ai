// deno-lint-ignore-file no-explicit-any
/**
 * Deno server for essay analysis with Supabase + OpenRouter (JSON output + errors).
 * - Strict CORS incl. OPTIONS preflight
 * - Healthcheck on GET
 * - Prompt enforces deterministic JSON structure with fixed keys
 * - Adds nested error structures: `errors[]` and `errors_summary{}`
 * - Parses/validates JSON; safe fallback
 * - Score taken from JSON.total_score (fallback to regex)
 * - Student text is taken from latest row of table `student_essay1` (column `text_scan`) by `created_at` for the user_id
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
function parseScoreFromText(text) {
  console.log("[parseScoreFromText] Fallback parse...");
  // Accept 0–22
  const m = text.match(/\b(?:[0-9]|1\d|2[0-2])\b/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  if (Number.isNaN(n) || n < 0 || n > 22) return null;
  return n;
}
function parseScoreFromJson(obj) {
  if (obj && typeof obj.total_score === "number") {
    const n = obj.total_score;
    if (Number.isInteger(n) && n >= 0 && n <= 22) return n;
  }
  return null;
}
function computeContextSnippet(text, original) {
  if (!text || !original) return "";
  // Normalize spaces
  const cleanText = text.replace(/\s+/g, " ").trim();
  const cleanOriginal = original.replace(/\s+/g, " ").trim();
  if (!cleanOriginal) return "";
  // Try to find the first occurrence (case-insensitive)
  const idx = cleanText.toLowerCase().indexOf(cleanOriginal.toLowerCase());
  if (idx < 0) return cleanOriginal;
  // Tokenize into words while preserving indices
  // "word" = sequence of letters/digits/’/- (Unicode aware), everything else is a separator
  const tokens = Array.from(cleanText.matchAll(/\p{L}[\p{L}\p{N}'’-]*|\d+|\S/gu)).map((m, i)=>({
      i,
      t: m[0],
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length
    }));
  // Find the token where the original starts
  const startTok = tokens.findIndex((tok)=>tok.start <= idx && idx < tok.end);
  if (startTok === -1) return cleanOriginal;
  // Figure out how many tokens the original spans
  const endPos = idx + cleanOriginal.length;
  let endTok = startTok;
  while(endTok + 1 < tokens.length && tokens[endTok].end < endPos)endTok++;
  // Pick one token before and one after (if they exist) as "words"
  const beforeTok = startTok > 0 ? tokens[startTok - 1] : null;
  const afterTok = endTok + 1 < tokens.length ? tokens[endTok + 1] : null;
  // Use only tokens that look like words (filter out pure punctuation)
  const isWord = (s)=>/\p{L}|\d/u.test(s);
  const parts = [];
  if (beforeTok && isWord(beforeTok.t)) parts.push(beforeTok.t);
  parts.push(cleanText.slice(tokens[startTok].start, tokens[endTok].end)); // original as-is from text
  if (afterTok && isWord(afterTok.t)) parts.push(afterTok.t);
  return parts.join(" ").trim();
}
function safeJsonParse(maybeJson) {
  try {
    return JSON.parse(maybeJson);
  } catch  {
    // Try extracting first {...} block
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
// ---------- FIXED JSON KEYS ----------
const FIXED_KEYS = [
  // Error reporting containers
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
const ERROR_SUMMARY_KEYS = [
  "total",
  "by_type"
];
const ERROR_TYPES = [
  "orthography",
  "punctuation",
  "grammar",
  "factual",
  "logic",
  "ethics",
  "style",
  "other"
];
// ---------- PROMPT BUILDER ----------
function buildPrompt(subject, topic_essay, student_essay) {
  const baseTask = subject === "oge" ? `OGE criteria to be provided later

Тема:
${topic_essay}

Сочинение:
${student_essay}` : `Ты преподаватель по русскму языку. Твоя задача оценить сочинение
студента. Формат ответа: суммарный балл, объяснение оценки по
критериям.

Текст и задание для сочинения:
${topic_essay}

Сочинение студента:
${student_essay}

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
Только СТРОГОЕ СТРУКТУРИРОВАННОЕ ВОЗВРАЩЕНИЕ ДАННЫХ В ВИДЕ ОДНОГО JSON-ОБЪЕКТА.
НЕ используй Markdown, не добавляй пояснения, не заключай в тройные кавычки.
Только валидный JSON utf-8.

Требуемая структура и фиксированные ключи (заполняй все строки; баллы — целые числа):

{
  // Собранная информация об ошибках (JSON внутри JSON)
  "errors": [
    {
      "type": "orthography" | "punctuation" | "grammar" | "factual" | "logic" | "ethics" | "style" | "other",
      "category": string,                 // уточнение типа, напр. "паронимы", "род.падеж"
      "original": string,                 // как было в сочинении
      "correction": string,               // правильный вариант
      "explanation": string,              // почему так
      "context_snippet": string,          // одно слово до «original» в сочинении студента, затем «original», и одно слово после (если есть)
      "criterion": "K4" | "K5" | "K6" | "K7" | "K8" | "K9" | "K10" | "" // к какому критерию относится
    }
  ],
  "errors_summary": {
    "total": number,
    "by_type": {
    "орфография": number,
    "пунктуация": number,
    "грамматика": number,
    "фактические": number,
    "логика": number,
    "этика": number,
    "стиль": number,
    "другое": number
    }
  },
  "overall_quality": string,
  "total_score_text": string,         // например: "Суммарный балл: 21 из 22"
  "total_score": number,              // 0–22
  "max_score": number,                // всегда 22

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
  "k10_title": string,"k10_comment": string,"k10_score": number,"k10_max": number

}

Ограничения:
- Заполни ВСЕ ключи. Если раздел не применим, ставь пустую строку и ноль там, где число.
- "errors" всегда массив (возможно пустой []). "errors_summary.by_type" содержит все перечисленные ключи с нулевыми значениями при отсутствии ошибок.
- Значения *score* и *max* — только целые числа.
+ - Поле "context_snippet" формируй так: возьми первое вхождение "original" в сочинении и верни строку
+   из трёх частей: [слово_до] + [original] + [слово_после]. Если слова до/после отсутствуют — опусти их.
+   Не добавляй кавычек дополнительных символов, нужно только то что в оригинальном тексте сочинения.
- Не добавляй НИКАКИХ дополнительных ключей.
- Верни ТОЛЬКО JSON-объект.
`;
  return `${baseTask}

${structuredDirective}`.trim();
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
    console.log(`[INFO] Processing user_id=${userId}, subject=${subject}`);
    // 1) NEW: Fetch latest student text from table `student)essay1` (text_scan), most recent by created_at
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
    // 2) Find most recent student_essay1 for user (for topic id and to update analysis/score)
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
    console.log("[STEP 4] Building prompt with strict JSON schema + errors...");
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
    // Ensure all fixed top-level keys exist
    for (const k of FIXED_KEYS){
      if (!(k in parsed)) {
        parsed[k] = 0;
        if (typeof parsed[k] !== "number") parsed[k] = "";
      }
    }
    // Ensure errors is an array
    if (!Array.isArray(parsed.errors)) {
      parsed.errors = [];
    } else {
      // Normalize errors
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
    // 7) Persist analysis (store JSON string) + score into `student_essay1`
    console.log("[STEP 7] Extract score and update Supabase...");
    const score = parseScoreFromJson(parsed) ?? parseScoreFromText(raw);
    const analysisToStore = JSON.stringify(parsed, null, 2);
    const { error: updErr } = await supabase.from("student_essay1").update({
      analysis: analysisToStore,
      score: score ?? null
    }).eq("id", essayRow.id);
    console.log("[STEP 7] Update result:", {
      updErr
    });
    if (updErr) throw updErr;
    // 8) Return JSON to client
    console.log("[STEP 8] Returning JSON to client...");
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
