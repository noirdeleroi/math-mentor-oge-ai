import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { goal, hours_per_week, school_grade, days_to_exam, progress } = body;
    // --- Normalize course_id ---
    let course_id = String(body.course_id || "1");
    console.log("course_id received:", course_id);
    // --- Ordered topic codes by course_id ---
    let orderedTopicCodes = [];
    if (course_id === "1") {
      orderedTopicCodes = [
        "1.1",
        "1.2",
        "1.3",
        "1.4",
        "1.5",
        "2.1",
        "2.2",
        "2.3",
        "2.4",
        "2.5",
        "3.1",
        "3.2",
        "3.3",
        "4.1",
        "4.2",
        "5.1",
        "6.1",
        "6.2",
        "7.1",
        "7.2",
        "7.3",
        "7.4",
        "7.5",
        "7.6",
        "7.7",
        "8.1",
        "8.2",
        "8.3",
        "8.4",
        "8.5",
        "9.1",
        "9.2"
      ];
    } else if (course_id === "2") {
      orderedTopicCodes = [
        "1.1E",
        "1.2E",
        "1.3E",
        "1.4E",
        "1.5E",
        "1.6E",
        "1.7E",
        "1.8E",
        "2.1E",
        "2.2E",
        "2.3E",
        "2.4E",
        "2.5E",
        "2.6E",
        "2.7E",
        "2.9E",
        "3.1E",
        "3.2E",
        "3.3E",
        "3.4E",
        "3.5E",
        "3.7E",
        "3.8E",
        "4.1E",
        "4.2E",
        "4.3E",
        "5.1E",
        "5.2E",
        "6.1E",
        "6.2E",
        "7.1E",
        "7.2E",
        "7.3E",
        "8.1E",
        "8.2E"
      ];
    } else if (course_id === "3") {
      orderedTopicCodes = [
        "1.1E",
        "1.2E",
        "1.3E",
        "1.4E",
        "1.5E",
        "1.6E",
        "1.7E",
        "1.8E",
        "1.9E",
        "2.1E",
        "2.2E",
        "2.3E",
        "2.4E",
        "2.5E",
        "2.6E",
        "2.7E",
        "2.8E",
        "2.9E",
        "2.10E",
        "2.11E",
        "2.12E",
        "3.1E",
        "3.2E",
        "3.3E",
        "3.4E",
        "3.5E",
        "3.6E",
        "3.7E",
        "3.8E",
        "4.1E",
        "4.2E",
        "4.3E",
        "5.1E",
        "5.2E",
        "6.1E",
        "6.2E",
        "6.3E",
        "7.1E",
        "7.2E",
        "7.3E",
        "7.4E",
        "7.5E",
        "8.1E",
        "8.2E"
      ];
    } else {
      course_id = "1";
      orderedTopicCodes = [
        "1.1E",
        "1.2E",
        "1.3E",
        "1.4E",
        "1.5E",
        "2.1E",
        "2.2E",
        "2.3E",
        "2.4E",
        "2.5E",
        "3.1E",
        "3.2E",
        "3.3E",
        "4.1E",
        "4.2E",
        "5.1E",
        "6.1E",
        "6.2E",
        "7.1E",
        "7.2E",
        "7.3E",
        "7.4E",
        "7.5E",
        "7.6E",
        "7.7E",
        "8.1E",
        "8.2E",
        "8.3E",
        "8.4E",
        "8.5E",
        "9.1E",
        "9.2E"
      ];
    }
    // --- fipiTopicsData by course_id ---
    let fipiTopicsData = "";
    if (course_id === "1") {
      fipiTopicsData = `1,"9.1 Работа с данными и графиками, 9.2 Прикладная геометрия / Чтение и анализ графических схем"
6,"1.1 Натуральные и целые числа, 1.2 Дроби и проценты, 1.3 Рациональные числа и арифметические действия, 1.4 Действительные числа"
7,"1.1 Натуральные и целые числа, 1.2 Дроби и проценты, 1.3 Рациональные числа и арифметические действия, 1.4 Действительные числа, 6.1 Координатная прямая"
8,"2.1 Буквенные выражения, 2.2 Степени, 2.4 Алгебраические дроби, 2.5 Арифметические корни"
9,"3.1 Уравнения и системы"
10,"8.1 Описательная статистика, 8.2 Вероятность"
11,"5.1 Свойства и графики функций"
12,"2.1 Буквенные выражения, 2.2 Степени, 2.4 Алгебраические дроби, 2.5 Арифметические корни"
13,"3.2 Неравенства и системы"
14,"4.1 Последовательности, 4.2 Арифметическая и геометрическая прогрессии. Формула сложных процентов"
15,"7.2 Треугольники"
16,"7.4 Окружность и круг"
17,"7.1 Геометрические фигуры, 7.3 Многоугольники"
18,"7.1 Геометрические фигуры, 7.2 Треугольники, 7.3 Многоугольники, 7.5 Измерения"
19,"7.1 Геометрические фигуры, 7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"
20,"2.1 Буквенные выражения, 3.1 Уравнения и системы, 3.2 Неравенства и системы, 6.1 Координатная прямая, 6.2 Декартовы координаты"
21,"1.2 Дроби и проценты, 1.5 Приближённые вычисления, 3.1 Уравнения и системы, 3.2 Неравенства и системы, 3.3 Текстовые задачи"
22,"5.1 Свойства и графики функций, 6.2 Декартовы координаты"
23,"7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"
24,"7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"
25,"7.1 Геометрические фигуры, 7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"`;
    } else if (course_id === "2") {
      fipiTopicsData = `1,"1.1E, 1.2E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.5E, 2.9E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
2,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.4E, 3.3E, 3.5E, 4.1E, 4.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
3,"1.1E, 1.2E, 1.7E, 1.8E, 3.2E, 4.2E, 6.1E, 7.1E, 8.1E, 8.2E"
4,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 8.1E, 8.2E"
5,"1.1E, 1.2E, 1.7E, 1.8E, 2.1E, 2.3E, 3.8E, 6.2E, 8.2E"
6,"1.1E, 1.2E, 1.4E, 1.5E, 1.7E, 1.8E, 2.1E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
7,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.7E, 1.8E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.4E, 3.5E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
8,"1.1E, 1.2E, 1.7E, 1.8E, 5.1E, 5.2E, 8.1E, 8.2E"
9,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
10,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
11,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
12,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
13,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
14,"1.1E, 1.2E, 1.3E, 1.4E, 1.7E, 1.8E, 2.1E, 6.1E, 8.2E"
15,"1.1E, 1.2E, 1.7E, 1.8E, 2.1E, 6.1E, 8.1E, 8.2E"
16,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.3E, 3.1E, 3.4E, 6.1E, 7.1E, 8.2E"
17,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
18,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
19,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.7E, 1.8E, 2.1E, 2.2E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"
20,"1.1E, 1.2E, 1.4E, 1.5E, 1.7E, 1.8E, 2.1E, 7.1E, 8.1E, 8.2E"
21,"1.1E, 1.2E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 3.7E, 3.8E, 4.1E, 4.2E, 4.3E, 5.1E, 5.2E, 6.1E, 6.2E, 7.1E, 7.2E, 7.3E, 8.1E, 8.2E"`;
    } else if (course_id === "3") {
      fipiTopicsData = `1,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.7E, 1.8E, 2.1E, 2.3E, 2.9E, 7.1E, 8.2E"
2,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.7E, 1.8E, 7.1E, 7.5E"
3,"1.1E, 1.2E, 1.3E, 1.4E, 1.7E, 1.8E, 2.1E, 2.3E, 4.3E, 7.1E, 7.2E, 7.3E, 7.4E, 7.5E, 8.2E"
4,"1.1E, 1.2E, 1.4E, 1.7E, 1.8E, 2.1E, 5.1E, 6.2E, 6.3E, 8.2E"
5,"1.1E, 1.2E, 1.4E, 1.7E, 1.8E, 2.1E, 2.7E, 5.1E, 6.2E, 6.3E, 8.2E"
6,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 2.7E, 2.9E, 3.1E, 3.2E, 3.3E, 3.4E, 3.5E, 4.1E, 4.2E, 5.1E, 8.2E"
7,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.5E, 3.2E, 3.4E, 7.1E"
8,"1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.9E, 3.1E, 3.2E, 3.4E, 3.5E, 4.1E, 4.2E, 7.5E, 8.1E, 8.2E"
9,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.4E, 2.5E, 3.1E, 3.2E, 4.1E, 4.2E, 8.2E"
10,"1.1E, 1.2E, 1.3E, 1.7E, 1.8E, 2.1E, 2.10E, 2.2E, 2.3E, 2.9E, 3.7E, 6.1E, 8.2E"
11,"1.2E, 1.3E, 1.4E, 1.6E, 1.7E, 1.8E, 2.1E, 2.12E, 2.2E, 2.3E, 2.4E, 2.9E, 3.1E, 3.2E, 3.3E, 3.5E, 7.5E, 8.1E, 8.2E"
12,"1.1E, 1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.3E, 2.5E, 2.9E, 3.1E, 3.2E, 3.4E, 3.5E, 3.6E, 4.1E, 4.2E, 4.3E, 8.1E"
13,"1.2E, 1.3E, 1.4E, 1.6E, 1.7E, 1.8E, 2.1E, 2.2E, 2.4E, 2.5E, 2.7E, 2.9E, 3.2E, 3.3E"
14,"1.2E, 1.3E, 1.5E, 1.7E, 1.8E, 2.1E, 2.11E, 2.3E, 2.9E, 3.4E, 7.1E, 7.2E, 7.3E, 7.4E, 7.5E, 8.2E"
16,"1.1E, 1.2E, 1.3E, 1.4E, 1.7E, 1.8E, 2.1E, 2.2E, 2.4E, 2.5E, 2.9E, 3.1E, 3.2E, 3.3E, 3.7E, 3.8E, 4.1E, 4.2E, 8.2E"
17,"1.1E, 1.2E, 1.3E, 1.4E, 1.5E, 1.7E, 1.8E, 2.1E, 2.3E, 2.9E, 3.2E, 7.1E, 7.5E, 8.2E"
18,"1.3E, 1.4E, 1.5E, 1.6E, 1.7E, 1.8E, 2.1E, 2.10E, 2.12E, 2.2E, 2.3E, 2.4E, 2.5E, 2.6E, 2.8E, 2.9E, 3.1E, 3.2E, 4.1E, 4.2E, 7.1E, 7.5E, 8.2E"
19,"1.1E, 1.2E, 1.4E, 1.7E, 1.8E, 2.1E, 2.2E, 2.5E, 2.7E, 2.9E, 3.1E, 3.2E, 3.7E, 3.8E, 4.2E, 6.1E, 6.3E, 8.2E"`;
    } else {
      fipiTopicsData = `1,"9.1 Работа с данными и графиками"`;
    }
    // --- Load textbook content from Supabase ---
    let textbookId = 10;
    if (course_id === "2") textbookId = 9;
    else if (course_id === "3") textbookId = 11;
    let textbook = {};
    const { data, error } = await supabase.from("json_files").select("content").eq("id", textbookId).single();
    if (error) {
      console.error("Error fetching textbook:", error);
    } else if (data?.content) {
      textbook = data.content;
      console.log(`Loaded textbook for course ${course_id}:`, Object.keys(textbook));
    }
    // --- Derive topicName dictionary from textbook ---
    const topicName = {};
    for (const [section, topics] of Object.entries(textbook)){
      for (const [code, topicObj] of Object.entries(topics)){
        topicName[code] = topicObj["Темы"];
      }
    }
    // --- Parse progress data ---
    const topicMastery = {};
    const fipiMastery = {};
    const skillMastery = {};
    for (const item of progress){
      if (item.topic) {
        topicMastery[item.topic] = item.prob;
      } else if (item["задача ФИПИ"]) {
        fipiMastery[item["задача ФИПИ"]] = item.prob;
      } else if (item["навык"]) {
        skillMastery[item["навык"]] = item.prob;
      }
    }
    // --- Your original logic preserved exactly ---
    const fipiTopics = {};
    for (const line of fipiTopicsData.trim().split("\n")){
      if (line) {
        const parts = line.split(',"');
        const task = parts[0].trim();
        const topicsStr = parts[1].slice(0, -1);
        const topicsList = topicsStr.split(", ").map((t)=>t.trim().replace("/", " ").replace(/\s+/g, " "));
        fipiTopics[task] = topicsList;
      }
    }
    // Find topics for study: sequential from the first <0.2, limit to 2
    const studyTopics = [];
    let foundFirst = false;
    const maxStudyTopics = 2;
    for (const code of orderedTopicCodes){
      const fullName = `${code} ${topicName[code] || ""}`.trim();
      const prob = topicMastery[fullName] || 0.0;
      if (prob < 0.2) {
        if (!foundFirst) {
          foundFirst = true;
        }
        if (foundFirst) {
          studyTopics.push(code);
          if (studyTopics.length >= maxStudyTopics) {
            break;
          }
        }
      }
    }
    // Skills with highest importance (0,1,2) for selected topics
    const highImpSkills = [];
    for (const code of studyTopics){
      for (const section of Object.values(textbook)){
        if (code in section) {
          const skills = section[code]["навыки"];
          for (const skill of skills){
            if (skill.importance <= 2) {
              highImpSkills.push(skill.number);
            }
          }
        }
      }
    }
    // FIPI tasks for training
    const fipiForTraining = [];
    for (const [task, topics] of Object.entries(fipiTopics)){
      const totalTopics = topics.length;
      const masteredCount = topics.filter((t)=>(topicMastery[t] || 0.0) >= 0.2).length;
      if (masteredCount > totalTopics / 2) {
        fipiForTraining.push(parseInt(task));
      }
    }
    // Skills for pulling up
    const thresholds = {
      0: 0.7,
      1: 0.6,
      2: 0.5,
      3: 0.2
    };
    const pullUpSkills = [];
    for (const code of orderedTopicCodes){
      const fullName = `${code} ${topicName[code] || ""}`.trim();
      const topicProb = topicMastery[fullName] || 0.0;
      if (topicProb >= 0.2) {
        for (const section of Object.values(textbook)){
          if (code in section) {
            const skills = section[code]["навыки"];
            for (const skill of skills){
              const imp = skill.importance;
              if (imp > 3) continue;
              const skillProb = skillMastery[skill.number.toString()] || 0.0;
              if (skillProb < (thresholds[imp] || 0.0)) {
                pullUpSkills.push(skill.number);
              }
            }
          }
        }
      }
    }
    // Output JSON identical to original
    const output = {
      "темы для изучения": studyTopics,
      "навыки с наибольшей важностью для выбранных тем": highImpSkills,
      "Задачи ФИПИ для тренировки": fipiForTraining,
      "навыки для подтягивания": pullUpSkills
    };
    console.log("Generated study plan:", output);
    return new Response(JSON.stringify(output), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error in ogemath-task-hardcode:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
