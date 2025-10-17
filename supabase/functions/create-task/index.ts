import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Helper functions to provide default values when profile data is missing
function getDefaultTargetScore(course_id) {
  switch(Number(course_id)){
    case 1:
      return 18;
    case 2:
      return 15;
    case 3:
      return 12;
    default:
      return 15;
  }
}
function getDefaultSchoolGrade(_course_id) {
  return 4;
}
// Telegram notification function
async function sendTelegramNotification(telegramUserId, message) {
  try {
    const telegramToken = Deno.env.get('TELEGRAM_TOKEN');
    if (!telegramToken) {
      console.warn('TELEGRAM_TOKEN not found in environment variables');
      return false;
    }
    const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: telegramUserId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Telegram API error: ${response.status} - ${errorData}`);
      return false;
    }
    const responseData = await response.json();
    console.log(`Notification sent to Telegram user ${telegramUserId}: ${message}`);
    return true;
  } catch (error) {
    console.error(`Failed to send Telegram notification to user ${telegramUserId}:`, error);
    return false;
  }
}
// Background task to send notification
async function sendNotificationBackground(supabase, userId) {
  try {
    console.log(`Starting background notification task for user: ${userId}`);
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('telegram_user_id').eq('user_id', userId).single();
    if (profileError) {
      console.warn(`Error fetching profile for notification: ${profileError.message}`);
      return;
    }
    if (!profileData?.telegram_user_id) {
      console.log(`No telegram_user_id found for user ${userId}, skipping notification`);
      return;
    }
    const notifications = [
      "🆕 Новое задание создано! Заходи на платформу заниматься!",
      "📚 Новое задание на платформе! Заходи!",
      "✅ Задание добавлено! Время заниматься!"
    ];
    const randomMessage = notifications[Math.floor(Math.random() * notifications.length)];
    const success = await sendTelegramNotification(profileData.telegram_user_id, randomMessage);
    if (success) {
      console.log(`Telegram notification sent successfully to user ${userId}`);
    } else {
      console.warn(`Failed to send Telegram notification to user ${userId}`);
    }
    await new Promise((resolve)=>setTimeout(resolve, 50));
  } catch (error) {
    console.error(`Background notification task failed for user ${userId}:`, error);
  }
}
// Function to shuffle an array (Fisher-Yates shuffle)
function shuffle(array) {
  for(let i = array.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [
      array[j],
      array[i]
    ];
  }
  return array;
}
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
    const { user_id, course_id = 1, date_string = '29 may 2026', number_of_words = 500 } = await req.json();
    console.log(`Creating task for user: ${user_id}, course: ${course_id}`);
    // Resolve course string once (used for dynamic column names below)
    const courseStr = String(course_id);
    // Profile columns that depend on course
    const targetScoreColumn = `course_${courseStr}_goal`;
    const schoolGradeColumn = `schoolmark${courseStr}`;
    const { data: profileData, error: profileError } = await supabase.from('profiles').select(`${targetScoreColumn}, ${schoolGradeColumn}`).eq('user_id', user_id).single();
    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      throw new Error('Failed to fetch user profile data');
    }
    const target_score = profileData?.[targetScoreColumn] ?? getDefaultTargetScore(courseStr);
    const school_grade = profileData?.[schoolGradeColumn] ?? getDefaultSchoolGrade(courseStr);
    console.log(`Target score: ${target_score}, School grade: ${school_grade}`);
    // Call your LLM task generator
    const { data: taskData, error: taskError } = await supabase.functions.invoke('openrouter-task-call', {
      body: {
        user_id,
        course_id,
        target_score,
        weekly_hours: 8,
        school_grade,
        date_string,
        number_of_words
      }
    });
    if (taskError) {
      console.error('Error calling openrouter-task-call:', taskError);
      throw new Error('Failed to generate task');
    }
    const task = taskData.task;
    const hardcode_task = taskData.hardcode_task;
    const previously_failed_topics = taskData.previously_failed_topics;
    const previous_homework_question_ids = taskData.previous_homework_question_ids;
    const result_of_prev_homework_completion = taskData.result_of_prev_homework_completion;
    const student_activity_session_results = taskData.student_activity_session_results;
    console.log('Generated task, hardcode_task, previously_failed_topics, previous_homework_question_ids, result_of_prev_homework_completion, and student_activity_session_results successfully');
    console.log(`[HOMEWORK TRACK] hardcode_task type: ${typeof hardcode_task}, length: ${hardcode_task ? hardcode_task.length : 0}, preview: ${hardcode_task ? hardcode_task.substring(0, 100) + '...' : 'empty'}`);
    // --- NEW FEATURE: Generate homework from hardcode_task ---
    try {
      let hardcodeTaskObj = hardcode_task;
      if (typeof hardcode_task === 'string') {
        try {
          hardcodeTaskObj = JSON.parse(hardcode_task);
          console.log('[HOMEWORK TRACK] Successfully parsed hardcode_task to object');
          console.log(`[HOMEWORK TRACK] Parsed object keys: ${Object.keys(hardcodeTaskObj).join(', ')}`);
        } catch (parseError) {
          console.error('[HOMEWORK TRACK] Error parsing hardcode_task JSON:', parseError);
          hardcodeTaskObj = null;
        }
      }
      if (hardcodeTaskObj && typeof hardcodeTaskObj === 'object' && !Array.isArray(hardcodeTaskObj)) {
        console.log('[HOMEWORK TRACK] Entering homework generation - valid object');
        console.log('Processing hardcode_task for homework generation...');
        // Collect MCQ list by skills
        const importantSkills = hardcodeTaskObj['навыки с наибольшей важностью для выбранных тем'] || [];
        const limitedImportantSkills = importantSkills.slice(0, 10);
        console.log(`[HOMEWORK TRACK] Processing important skills: ${limitedImportantSkills.length} items (e.g., ${limitedImportantSkills.slice(0, 3).join(', ')})`);
        let mcqlist = [];
        for (const skillNumber of limitedImportantSkills){
          try {
            const { data: mcqQuestions, error: mcqError } = await supabase.from('oge_math_skills_questions').select('question_id').eq('skills', skillNumber);
            if (mcqError) {
              console.error(`[HOMEWORK TRACK] Error fetching MCQ questions for skill ${skillNumber}:`, mcqError);
              continue;
            }
            if (mcqQuestions && mcqQuestions.length > 0) {
              const shuffled = shuffle([
                ...mcqQuestions
              ]);
              const selected = shuffled.slice(0, 2);
              const questionIds = selected.map((q)=>q.question_id);
              mcqlist.push(...questionIds);
              console.log(`[HOMEWORK TRACK] Added ${questionIds.length} MCQ questions for skill ${skillNumber}`);
            } else {
              console.log(`[HOMEWORK TRACK] No MCQ questions found for skill ${skillNumber}`);
            }
          } catch (skillError) {
            console.error(`[HOMEWORK TRACK] Unexpected error fetching MCQ questions for skill ${skillNumber}:`, skillError);
            continue;
          }
        }
        mcqlist = [
          ...new Set(mcqlist)
        ];
        console.log(`[HOMEWORK TRACK] Final MCQ list has ${mcqlist.length} unique questions`);
        // Collect FIPI list by problem types
        const fipiProblems = hardcodeTaskObj['Задачи ФИПИ для тренировки'] || [];
        const limitedFipiProblems = fipiProblems.slice(0, 10);
        console.log(`[HOMEWORK TRACK] Processing FIPI problems: ${limitedFipiProblems.length} items (e.g., ${limitedFipiProblems.slice(0, 3).join(', ')})`);
        let fipilist = [];
        for (const problemNumber of limitedFipiProblems){
          try {
            const { data: fipiQuestions, error: fipiError } = await supabase.from('oge_math_fipi_bank').select('question_id').eq('problem_number_type', problemNumber);
            if (fipiError) {
              console.error(`[HOMEWORK TRACK] Error fetching FIPI questions for problem type ${problemNumber}:`, fipiError);
              continue;
            }
            if (fipiQuestions && fipiQuestions.length > 0) {
              const shuffled = shuffle([
                ...fipiQuestions
              ]);
              const selected = shuffled.slice(0, 2);
              const questionIds = selected.map((q)=>q.question_id);
              fipilist.push(...questionIds);
              console.log(`[HOMEWORK TRACK] Added ${questionIds.length} FIPI questions for problem type ${problemNumber}`);
            } else {
              console.log(`[HOMEWORK TRACK] No FIPI questions found for problem type ${problemNumber}`);
            }
          } catch (problemError) {
            console.error(`[HOMEWORK TRACK] Unexpected error fetching FIPI questions for problem type ${problemNumber}:`, problemError);
            continue;
          }
        }
        fipilist = [
          ...new Set(fipilist)
        ];
        console.log(`[HOMEWORK TRACK] Final FIPI list has ${fipilist.length} unique questions`);
        const homeworkJson = {
          homework_name: crypto.randomUUID(),
          MCQ: mcqlist,
          FIPI: fipilist
        };
        console.log('[HOMEWORK TRACK] Generated homework JSON:', JSON.stringify(homeworkJson, null, 2));
        // --- NEW: choose the homework column based on course_id ---
        const homeworkColumnMap = {
          '1': 'homework',
          '2': 'homework2',
          '3': 'homework3'
        };
        const homeworkColumn = homeworkColumnMap[courseStr] ?? 'homework';
        console.log(`[HOMEWORK TRACK] Attempting to update profiles.${homeworkColumn} for user_id: ${user_id}`);
        const { error: updateError, count } = await supabase.from('profiles').update({
          [homeworkColumn]: JSON.stringify(homeworkJson)
        }, {
          count: 'exact'
        }).eq('user_id', user_id);
        console.log(`[HOMEWORK TRACK] Update query returned count: ${count ?? 'unknown'}`);
        if (updateError) {
          console.error('[HOMEWORK TRACK] Error updating profiles with homework:', updateError);
          console.error(`[HOMEWORK TRACK] Update error details: code=${updateError.code}, message=${updateError.message}, hint=${updateError.hint || 'none'}`);
        } else {
          console.log(`[HOMEWORK TRACK] Successfully saved homework to profiles.${homeworkColumn} for user: ${user_id}`);
        }
      } else {
        console.log('[HOMEWORK TRACK] Skipping homework generation - invalid after parse');
      }
    } catch (homeworkError) {
      console.error('[HOMEWORK TRACK] Error in homework generation process:', homeworkError);
      console.error(`[HOMEWORK TRACK] Homework error stack: ${homeworkError.stack || 'no stack'}`);
    }
    // Insert into stories_and_telegram with all required fields
    console.log('Inserting new row with task, hardcode_task, previously_failed_topics, previous_homework_question_ids, result_of_prev_homework_completion, and student_activity_session_results...');
    const { data: insertData, error: insertError } = await supabase.from('stories_and_telegram').insert({
      user_id,
      task,
      hardcode_task,
      previously_failed_topics,
      previous_homework_question_ids,
      result_of_prev_homework_completion,
      student_activity_session_results,
      seen: 0,
      upload_id: Math.floor(Math.random() * 1000000),
      course_id: String(course_id)
    }).select().single();
    if (insertError) {
      console.error('Error inserting new task row:', insertError);
      throw new Error('Failed to save task');
    }
    console.log('New task row created successfully');
    // Fire-and-forget notification
    sendNotificationBackground(supabase, user_id).catch((error)=>{
      console.error('Background notification task error:', error);
    });
    return new Response(JSON.stringify({
      success: true,
      task_id: insertData.upload_id,
      task: task
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in create-task function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
