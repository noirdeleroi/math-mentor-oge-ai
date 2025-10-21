// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type InputBody = {
  subject: 'ege' | 'oge';
  user_id: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash-preview-09-2025';

function parseScore(text: string): number | null {
  const m = text.match(/\b(1?\d|20|21|0)\b/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  if (Number.isNaN(n)) return null;
  if (n < 0 || n > 21) return null;
  return n;
}

async function fetchWithRetry(req: RequestInfo, init: RequestInit, retries = 2, backoffMs = 800): Promise<Response> {
  let lastErr: any = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(req, init);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < retries) await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
  }
  throw lastErr;
}

function buildPrompt(subject: 'ege' | 'oge', topic_essay: string, student_essay: string): string {
  if (subject === 'oge') {
    return `OGE criteria to be provided later\n\nТема:\n${topic_essay}\n\nСочинение:\n${student_essay}`;
  }
  // ege prompt (exact, with interpolations)
  return `Ты преподаватель по русскму языку. Твоя задача оценить сочинение
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
* *(Указания к оцениванию:*
* *1. Источником примера-аргумента служит читательский,
историко-культурный или жизненный опыт.*
* *2. Не учитываются примеры-аргументы из комиксов, аниме, манги,
фанфиков, графических романов, компьютерных игр и т.п.)* 

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
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Ошибка в сети... Попробуй позже' }), { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as InputBody | null;
    if (!body || !body.user_id || (body.subject !== 'ege' && body.subject !== 'oge')) {
      return new Response(JSON.stringify({ error: 'Ошибка в сети... Попробуй позже' }), { status: 503 });
    }

    const userId = body.user_id;
    const subject = body.subject;

    // 1) Fetch profiles.telegram_input
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('telegram_input')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const telegramInput = (prof?.telegram_input ?? '').toString();

    // 2) Find most recent student_essay for user
    const { data: essayRows, error: essayErr } = await supabase
      .from('student_essay')
      .select('id, essay_topic_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (essayErr) throw essayErr;
    if (!essayRows || essayRows.length === 0) throw new Error('no_essay');
    const essayRow = essayRows[0];

    // 3) Fetch topic text
    const { data: topicRow, error: topicErr } = await supabase
      .from('rus_essay_topics')
      .select('essay_topic')
      .eq('id', essayRow.essay_topic_id)
      .maybeSingle();
    if (topicErr) throw topicErr;
    const topicEssay = (topicRow?.essay_topic ?? '').toString();

    // 4) Build prompt
    const prompt = buildPrompt(subject, topicEssay, telegramInput);

    // 5) Call OpenRouter
    const orRes = await fetchWithRetry(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const orJson = await orRes.json().catch(() => null) as any;
    const text: string | null = orJson?.choices?.[0]?.message?.content ?? null;
    if (!text) throw new Error('no_or_text');

    // 6) Persist analysis + score
    const score = parseScore(text);
    const { error: updErr } = await supabase
      .from('student_essay')
      .update({ analysis: text, score: score ?? null })
      .eq('id', essayRow.id);
    if (updErr) throw updErr;

    // 7) Return to client
    return new Response(JSON.stringify({ analysis: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('openrouter-essay-check error:', e);
    return new Response(JSON.stringify({ error: 'Ошибка в сети... Попробуй позже' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
