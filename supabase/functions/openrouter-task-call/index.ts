import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment variables');
    }
    const { user_id, course_id = 1, target_score, weekly_hours, school_grade, date_string = '29 may 2026', number_of_words } = await req.json();
    console.log(`Processing task call for user: ${user_id}, course_id: ${course_id}`);
    // === Fetch student full name ===
    let student_name = "Студент";
    try {
      const { data: nameData, error: nameError } = await supabase.from("profiles").select("full_name").eq("user_id", user_id).single();
      if (nameError) {
        console.error("Error fetching student name:", nameError.message);
      } else if (nameData?.full_name) {
        student_name = nameData.full_name;
      }
    } catch (e) {
      console.error("Exception fetching student full_name:", e);
    }
    const examDate = new Date(date_string);
    const today = new Date();
    const daysToExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let studentProgress = '';
    if (course_id === 1 || course_id === 2 || course_id === 3) {
      console.log('Fetching student progress...');
      try {
        const { data: progressData, error: progressError } = await supabase.functions.invoke('student-progress-calculate', {
          body: {
            user_id,
            course_id
          }
        });
        if (progressError) {
          console.error('Error fetching student progress:', progressError);
          studentProgress = '[]';
        } else if (!progressData) {
          console.error('No progress data returned from student-progress-calculate');
          studentProgress = '[]';
        } else {
          console.log('Progress data received successfully');
          console.log('Progress data type:', typeof progressData);
          console.log('Progress data length:', Array.isArray(progressData) ? progressData.length : 'not array');
          studentProgress = JSON.stringify(progressData, null, 2);
        }
      } catch (error) {
        console.error('Exception while fetching student progress:', error);
        studentProgress = '[]';
      }
    }
    let previously_failed_topics = {
      time_task: null,
      time_mastery: null,
      "темы с ошибками": []
    };
    let student_activity_session_results = [];
    try {
      console.log('Fetching latest student activity and task timestamps...');
      const { data: activityRow, error: activityError } = await supabase.from('student_activity').select('updated_at').eq('user_id', user_id).eq('course_id', String(course_id)).order('updated_at', {
        ascending: false
      }).limit(1).single();
      const { data: taskRow, error: taskError } = await supabase.from('stories_and_telegram').select('created_at').eq('user_id', user_id).eq('course_id', String(course_id)).order('created_at', {
        ascending: false
      }).limit(1).single();
      if (activityError) console.error('Student activity error:', activityError);
      if (taskError) console.error('Task row error:', taskError);
      if (activityRow && taskRow) {
        console.log('Activity and task rows found');
        const time_mastery = new Date(activityRow.updated_at);
        const time_task = new Date(taskRow.created_at);
        previously_failed_topics.time_task = time_task.toISOString();
        previously_failed_topics.time_mastery = time_mastery.toISOString();
        console.log(`Timestamps - time_task: ${previously_failed_topics.time_task}, time_mastery: ${previously_failed_topics.time_mastery}`);
        const olderTime = new Date(Math.min(time_task.getTime(), time_mastery.getTime()));
        const newerTime = new Date(Math.max(time_task.getTime(), time_mastery.getTime()));
        console.log(`Time window - older: ${olderTime.toISOString()}, newer: ${newerTime.toISOString()}`);
        const { data: activitySessionData, error: activitySessionError } = await supabase.from('student_activity').select('question_id, is_correct, created_at').eq('user_id', user_id).eq('course_id', String(course_id)).gt('created_at', olderTime.toISOString()).lt('created_at', newerTime.toISOString());
        if (activitySessionError) {
          console.error('Student activity session error:', activitySessionError);
        } else {
          console.log(`Fetched student activity session, found ${activitySessionData?.length || 0} records`);
          student_activity_session_results = activitySessionData ? activitySessionData.map((row)=>({
              question_id: row.question_id,
              is_correct: row.is_correct,
              created_at: row.created_at
            })) : [];
          console.log('Fetched student_activity_session_results:', JSON.stringify(student_activity_session_results, null, 2));
        }
        const { data: activityData, error: activityError } = await supabase.from('student_activity').select('question_id').eq('user_id', user_id).eq('course_id', String(course_id)).eq('is_correct', false).gt('created_at', olderTime.toISOString()).lt('created_at', newerTime.toISOString());
        if (activityError) console.error('Student activity error:', activityError);
        console.log(`Fetched student activity, found ${activityData?.length || 0} failed questions`);
        if (activityData && activityData.length > 0) {
          const qids = activityData.map((a)=>a.question_id);
          console.log('Failed question IDs:', JSON.stringify(qids, null, 2));
          const { data: fipiData, error: fipiError } = await supabase.from('oge_math_fipi_bank').select('topics, question_id').in('question_id', qids);
          if (fipiError) console.error('FIPI bank error:', fipiError);
          console.log(`Fetched topics from oge_math_fipi_bank, found ${fipiData?.length || 0} records`);
          if (fipiData && fipiData.length > 0) {
            console.log('Raw topics data:', JSON.stringify(fipiData.map((row)=>({
                question_id: row.question_id,
                topics: row.topics
              })), null, 2));
            const topicsFlat = fipiData.flatMap((row)=>{
              if (Array.isArray(row.topics)) return row.topics;
              return row.topics ? row.topics.split(',').map((t)=>t.trim()) : [];
            });
            console.log('Flattened topics before deduplication:', JSON.stringify(topicsFlat, null, 2));
            previously_failed_topics["темы с ошибками"] = [
              ...new Set(topicsFlat)
            ];
            console.log('Final previously_failed_topics:', JSON.stringify(previously_failed_topics, null, 2));
          } else {
            console.log('No topics found for question IDs');
          }
        } else {
          console.log('No failed questions found in the time window');
        }
      } else {
        console.log('Missing activity or task row:', {
          activityRowExists: !!activityRow,
          taskRowExists: !!taskRow
        });
      }
    } catch (e) {
      console.error('Error calculating failed topics or student activity session:', e);
    }
    console.log('Final previously_failed_topics:', JSON.stringify(previously_failed_topics, null, 2));
    let student_hardcoded_task = '';
    console.log(`Checking conditions for ogemath-task-hardcode: course_id=${course_id}, studentProgress exists=${!!studentProgress}`);
    if ((course_id === 1 || course_id === 2 || course_id === 3) && studentProgress) {
      console.log('Calling ogemath-task-hardcode function...');
      try {
        let progressArray = JSON.parse(studentProgress);
        let progressData = Array.isArray(progressArray) ? progressArray : progressArray.progress_bars || [];
        if (!Array.isArray(progressData)) progressData = [];
        console.log('Using progress Array with', progressData.length, 'items');
        const { data: taskData, error: taskError } = await supabase.functions.invoke('ogemath-task-hardcode', {
          body: {
            goal: target_score,
            hours_per_week: weekly_hours,
            school_grade: school_grade,
            days_to_exam: daysToExam,
            progress: progressData,
            course_id
          }
        });
        if (taskError) {
          console.error('Error generating student task:', taskError);
          student_hardcoded_task = 'Не удалось сгенерировать задание';
        } else {
          console.log('ogemath-task-hardcode completed successfully');
          student_hardcoded_task = JSON.stringify(taskData, null, 2);
        }
      } catch (error) {
        console.error('Error parsing student progress for task generation:', error);
        student_hardcoded_task = 'Ошибка при обработке прогресса';
      }
    }
    const { data: ragData, error: ragError } = await supabase.from('oge_entrypage_rag').select('task_context').eq('id', String(course_id)).single();
    if (ragError) {
      console.error('Error fetching task context:', ragError);
      throw new Error('Failed to fetch task context');
    }
    let filteredStudentProgress = studentProgress;
    if (studentProgress && (course_id === 1 || course_id === 2 || course_id === 3)) {
      try {
        const progressArray = JSON.parse(studentProgress);
        const filteredProgress = progressArray.filter((item)=>!item.hasOwnProperty('навык'));
        filteredStudentProgress = JSON.stringify(filteredProgress, null, 2);
      } catch (error) {
        console.error('Error filtering student progress:', error);
      }
    }
    let final_json = null;
    let retrieved_hardcode_task = null;
    try {
      const { data: storiesData, error: storiesError } = await supabase.from('stories_and_telegram').select('hardcode_task, created_at').eq('user_id', user_id).eq('course_id', String(course_id)).order('created_at', {
        ascending: false
      }).limit(1).single();
      if (storiesError) {
        console.error(`Error fetching stories_and_telegram: ${storiesError.message}`);
      } else if (storiesData && storiesData.created_at) {
        retrieved_hardcode_task = storiesData.hardcode_task;
        const task_timestamp = new Date(storiesData.created_at);
        const { data: recentMasteryData, error: recentMasteryError } = await supabase.from('mastery_snapshots').select('raw_data, run_timestamp').eq('user_id', user_id).eq('course_id', String(course_id)).order('run_timestamp', {
          ascending: false
        }).limit(1).single();
        if (recentMasteryError) {
          console.error(`Error fetching recent mastery_snapshot: ${recentMasteryError.message}`);
        } else if (recentMasteryData) {
          const recentRawData = recentMasteryData.raw_data || [];
          const { data: previousMasteryData, error: previousMasteryError } = await supabase.from('mastery_snapshots').select('raw_data, run_timestamp').eq('user_id', user_id).eq('course_id', String(course_id)).lt('run_timestamp', task_timestamp.toISOString()).order('run_timestamp', {
            ascending: false
          }).limit(1).single();
          if (previousMasteryError) {
            console.error(`Error fetching previous mastery_snapshot: ${previousMasteryError.message}`);
          } else if (previousMasteryData) {
            const previousRawData = previousMasteryData.raw_data || [];
            const progress_diff = [];
            const previousMap = new Map();
            previousRawData.forEach((item)=>{
              const key = Object.keys(item).filter((k)=>k !== 'prob').map((k)=>`${k}:${item[k]}`).join('|');
              previousMap.set(key, item);
            });
            recentRawData.forEach((recentItem)=>{
              const key = Object.keys(recentItem).filter((k)=>k !== 'prob').map((k)=>`${k}:${recentItem[k]}`).join('|');
              const previousItem = previousMap.get(key);
              const diffItem = {
                ...recentItem
              };
              if (previousItem) {
                diffItem.prob = recentItem.prob - previousItem.prob;
              } else {
                diffItem.prob = recentItem.prob;
              }
              progress_diff.push(diffItem);
            });
            previousRawData.forEach((prevItem)=>{
              const key = Object.keys(prevItem).filter((k)=>k !== 'prob').map((k)=>`${k}:${prevItem[k]}`).join('|');
              if (!recentRawData.some((recentItem)=>Object.keys(recentItem).filter((k)=>k !== 'prob').map((k)=>`${k}:${recentItem[k]}`).join('|') === key)) {
                const newItem = {
                  ...prevItem,
                  prob: 0 - prevItem.prob
                };
                progress_diff.push(newItem);
              }
            });
            final_json = progress_diff.sort((a, b)=>Math.abs(b.prob) - Math.abs(a.prob)).slice(0, 30);
          }
        }
      }
    } catch (progressDiffError) {
      console.error('Error in progress difference calculation:', progressDiffError);
    }
    let previous_homework_question_ids = {
      MCQ: [],
      FIPI: []
    };
    let result_of_prev_homework_completion = [];
    try {
      console.log('Fetching homework from profiles table...');
      let homeworkColumn = 'homework';
      if (String(course_id) === '2') {
        homeworkColumn = 'homework2';
      } else if (String(course_id) === '3') {
        homeworkColumn = 'homework3';
      }
      const { data: profileData, error: profileError } = await supabase.from('profiles').select(homeworkColumn).eq('user_id', user_id).single();
      if (profileError) {
        console.error('Error fetching homework from profiles:', profileError);
      } else if (profileData && profileData.homework) {
        console.log('Homework data found in profiles');
        console.log('Raw homework data:', JSON.stringify(profileData.homework, null, 2));
        try {
          const homeworkJson = typeof profileData.homework === 'string' ? JSON.parse(profileData.homework) : profileData.homework;
          previous_homework_question_ids = {
            MCQ: homeworkJson.MCQ || [],
            FIPI: homeworkJson.FIPI || []
          };
          console.log('Extracted previous_homework_question_ids:', JSON.stringify(previous_homework_question_ids, null, 2));
          const homeworkName = homeworkJson.homework_name;
          if (homeworkName && typeof homeworkName === 'string' && homeworkName.trim() !== '') {
            console.log(`Fetching homework progress for homework_name: ${homeworkName}`);
            const { data: homeworkProgressData, error: homeworkProgressError } = await supabase.from('homework_progress').select('question_id, is_correct').eq('user_id', user_id).eq('homework_name', homeworkName);
            if (homeworkProgressError) {
              console.error('Error fetching homework progress:', homeworkProgressError);
            } else {
              const allHomeworkQids = [
                ...previous_homework_question_ids.MCQ,
                ...previous_homework_question_ids.FIPI
              ];
              console.log('All homework question IDs:', JSON.stringify(allHomeworkQids, null, 2));
              const progressQids = homeworkProgressData ? homeworkProgressData.map((row)=>row.question_id) : [];
              const missingQids = allHomeworkQids.filter((qid)=>!progressQids.includes(qid));
              console.log('Missing question IDs:', JSON.stringify(missingQids, null, 2));
              const allQids = [
                ...progressQids,
                ...missingQids
              ];
              const skillsQids = allQids.filter((qid)=>qid?.includes('SKILLS') ?? false);
              const fipiQids = allQids.filter((qid)=>qid && !(qid?.includes('SKILLS') ?? false));
              console.log('Skills question IDs:', JSON.stringify(skillsQids, null, 2));
              console.log('FIPI question IDs:', JSON.stringify(fipiQids, null, 2));
              let skillsMap = new Map();
              if (skillsQids.length > 0) {
                const { data: skillsData, error: skillsError } = await supabase.from('oge_math_skills_questions').select('question_id, skills').in('question_id', skillsQids);
                if (skillsError) {
                  console.error('Error fetching skills from oge_math_skills_questions:', skillsError);
                } else if (skillsData) {
                  skillsMap = new Map(skillsData.map((row)=>[
                      row.question_id,
                      row.skills !== null ? row.skills : 0
                    ]));
                  console.log('Fetched skills data:', JSON.stringify([
                    ...skillsMap
                  ], null, 2));
                }
              }
              let fipiMap = new Map();
              if (fipiQids.length > 0) {
                const { data: fipiData, error: fipiError } = await supabase.from('oge_math_fipi_bank').select('question_id, problem_number_type').in('question_id', fipiQids);
                if (fipiError) {
                  console.error('Error fetching problem_number_type from oge_math_fipi_bank:', fipiError);
                } else if (fipiData) {
                  fipiMap = new Map(fipiData.map((row)=>[
                      row.question_id,
                      row.problem_number_type !== null ? row.problem_number_type : 0
                    ]));
                  console.log('Fetched problem_number_type data:', JSON.stringify([
                    ...fipiMap
                  ], null, 2));
                }
              }
              console.log(`Skills map size: ${skillsMap.size}, FIPI map size: ${fipiMap.size}`);
              if (homeworkProgressData && homeworkProgressData.length > 0) {
                result_of_prev_homework_completion = homeworkProgressData.filter((row)=>{
                  if (!row.question_id) {
                    console.warn(`Skipping homework_progress row with null/undefined question_id: ${JSON.stringify(row)}`);
                    return false;
                  }
                  return true;
                }).map((row)=>{
                  const isSkillsQuestion = row.question_id?.includes('SKILLS') ?? false;
                  return {
                    question_id: row.question_id,
                    is_correct: row.is_correct,
                    [isSkillsQuestion ? 'навык' : 'номер задачи ФИПИ']: isSkillsQuestion ? skillsMap.get(row.question_id) ?? 0 : fipiMap.get(row.question_id) ?? 0
                  };
                });
              }
              if (missingQids.length > 0) {
                const missingEntries = missingQids.map((qid)=>{
                  const isSkillsQuestion = qid?.includes('SKILLS') ?? false;
                  return {
                    question_id: qid,
                    is_correct: null,
                    [isSkillsQuestion ? 'навык' : 'номер задачи ФИПИ']: isSkillsQuestion ? skillsMap.get(qid) ?? 0 : fipiMap.get(qid) ?? 0
                  };
                });
                result_of_prev_homework_completion = [
                  ...result_of_prev_homework_completion,
                  ...missingEntries
                ];
              }
              console.log('Fetched result_of_prev_homework_completion:', JSON.stringify(result_of_prev_homework_completion, null, 2));
            }
          } else {
            console.log('No valid homework_name found in homework JSON');
          }
        } catch (parseError) {
          console.error('Error parsing homework JSON:', parseError.message);
        }
      } else {
        console.log('No homework data found in profiles for user_id:', user_id);
      }
    } catch (error) {
      console.error('Error fetching homework-related data:', error.message);
    }
    const prompt1 = ragData.task_context || '';
    const homeworkSection = previous_homework_question_ids.MCQ.length || previous_homework_question_ids.FIPI.length || result_of_prev_homework_completion.length ? ` ###Имя студента:
${student_name}

### Задачи из Прошлого Домашнего Задания и как оно были решены учеником
{ЗАДАЧИ_ИЗ_ПРОШЛОГО_ДОМАШНЕГО_ЗАДАНИЯ}
${JSON.stringify(previous_homework_question_ids, null, 2)}

{ЗАДАЧИ_ИЗ_ПРОШЛОГО_ДОМАШНЕГО_ЗАДАНИЯ_КАК_РЕШЕНЫ}
${JSON.stringify(result_of_prev_homework_completion, null, 2)}` : `
### Задачи из Прошлого Домашнего Задания и как оно были решены учеником
Нет данных о предыдущем домашнем задании или его выполнении`;
    const prompt = prompt1 + `
Твой ответ должен иметь длину до ${number_of_words} слов.

### Задание студента
{ЗАДАНИЕ_ДЛЯ_СТУДЕНТА}:
${student_hardcoded_task}

### Анализ Прошлой Активности
{АНАЛИЗ_ОШИБОК}
${JSON.stringify(previously_failed_topics["темы с ошибками"] || [])}

${homeworkSection}

### Динамика прогресса студента
{ПРОШЛОЕ_ЗАДАНИЕ}:
${retrieved_hardcode_task || 'Нет предыдущих заданий'}

{ИЗМЕНЕНИЯ_В_ПРОГРЕССЕ_СТУДЕНТА_С_ПРОШЛОГО_РАЗА}
${final_json ? JSON.stringify(final_json, null, 2) : 'Нет данных о прогрессе'}

### Данные студента
{ЦЕЛЬ_СТУДЕНТА}:
${target_score} балла

{КОЛИЧЕСТВО_ЧАСОВ_В_НЕДЕЛЮ}
${weekly_hours}

{ШКОЛЬНАЯ_ОЦЕНКА_СТУДЕНТА}
${school_grade}

{ДНЕЙ_ДО_ЭКЗАМЕНА}:
${daysToExam}

{ПРОГРЕСС_СТУДЕНТА}:
${filteredStudentProgress}
`;
    console.log('Making OpenRouter API call...');
    const headers = {
      "Authorization": `Bearer ${openrouterApiKey}`,
      "Content-Type": "application/json"
    };
    const data = {
      "model": "google/gemini-2.5-flash-lite-preview-09-2025",
      "messages": [
        {
          "role": "system",
          "content": "You are a math tutor."
        },
        {
          "role": "user",
          "content": prompt
        }
      ],
      "max_tokens": 40000,
      "temperature": 0.9
    };
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    const responseData = await response.json();
    // === Extract token usage and calculate cost ===
    const { prompt_tokens, completion_tokens } = responseData.usage || {};
    const model = responseData.model;
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
    // Get prices per million tokens
    const [priceIn, priceOut] = pricingTable[model] || [
      0,
      0
    ];
    const price = prompt_tokens / 1_000_000 * priceIn + completion_tokens / 1_000_000 * priceOut;
    // === Insert into Supabase user_credits table ===
    const { error: insertError } = await supabase.from('user_credits').insert({
      user_id: user_id,
      tokens_in: prompt_tokens,
      tokens_out: completion_tokens,
      price: price
    });
    if (insertError) {
      console.error('❌ Failed to insert user credits:', insertError.message);
    } else {
      console.log(`✅ Stored usage for ${model}: ${prompt_tokens} in, ${completion_tokens} out, $${price.toFixed(6)} total`);
    }
    const aiResponse = responseData.choices?.[0]?.message?.content || "Не удалось получить ответ от ИИ";
    console.log('Final previously_failed_topics in response:', JSON.stringify(previously_failed_topics, null, 2));
    console.log('Successfully generated AI response');
    return new Response(JSON.stringify({
      task: aiResponse,
      hardcode_task: student_hardcoded_task,
      previously_failed_topics,
      metadata: {
        user_id,
        course_id,
        target_score,
        weekly_hours,
        school_grade,
        days_to_exam: daysToExam,
        number_of_words
      },
      progress_diff: final_json,
      retrieved_hardcode_task,
      previous_homework_question_ids,
      result_of_prev_homework_completion,
      student_activity_session_results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in openrouter-task-call function:', error);
    return new Response(JSON.stringify({
      response: "Какие-то неполадки в сети. Попробуй позже 👀",
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
