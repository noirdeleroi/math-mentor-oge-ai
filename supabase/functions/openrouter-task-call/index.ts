import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get OpenRouter API key from Supabase secrets
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment variables');
    }
    
    // Parse request body
    const { user_id, course_id = 1, target_score, weekly_hours, school_grade, date_string = '29 may 2026', number_of_words } = await req.json();
    console.log(`Processing task call for user: ${user_id}`);
    
    // Calculate days to exam
    const examDate = new Date(date_string);
    const today = new Date();
    const daysToExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let studentProgress = '';
    
    // Get student progress if course_id is 1
    if (course_id === 1) {
      console.log('Fetching student progress...');
      try {
        const { data: progressData, error: progressError } = await supabase.functions.invoke('student-progress-calculate', {
          body: { user_id }
        });
        if (progressError) {
          console.error('Error fetching student progress:', progressError);
          console.log('Using fallback for student progress');
          studentProgress = '[]'; // Use empty array as fallback
        } else if (!progressData) {
          console.error('No progress data returned from student-progress-calculate');
          console.log('Using fallback for student progress');
          studentProgress = '[]'; // Use empty array as fallback
        } else {
          console.log('Progress data received successfully');
          console.log('Progress data type:', typeof progressData);
          console.log('Progress data length:', Array.isArray(progressData) ? progressData.length : 'not array');
          studentProgress = JSON.stringify(progressData, null, 2);
        }
      } catch (error) {
        console.error('Exception while fetching student progress:', error);
        console.log('Error details:', error.name, error.message);
        console.log('Using fallback for student progress due to exception');
        studentProgress = '[]'; // Use empty array as fallback
      }
    }
    
    // Get student hardcoded task
    let student_hardcoded_task = '';
    console.log(`Checking conditions for ogemath-task-hardcode: course_id=${course_id}, studentProgress exists=${!!studentProgress}, studentProgress length=${typeof studentProgress === 'string' ? studentProgress.length : 'undefined'}`);
    if (course_id === 1 && studentProgress) {
      console.log('Calling ogemath-task-hardcode function...');
      try {
        let progressArray;
        try {
          progressArray = JSON.parse(studentProgress);
        } catch (parseError) {
          console.error('Failed to parse studentProgress JSON:', parseError);
          progressArray = []; // Use empty array as fallback
        }
        console.log('Progress array parsed, type:', typeof progressArray, 'is array:', Array.isArray(progressArray));
        // Extract progress_bars if it exists, otherwise use the array directly, or empty array as fallback
        let progressData;
        if (progressArray && typeof progressArray === 'object') {
          progressData = progressArray.progress_bars || progressArray;
        } else {
          progressData = [];
        }
        // Ensure progressData is an array
        if (!Array.isArray(progressData)) {
          console.log('progressData is not an array, converting to empty array');
          progressData = [];
        }
        console.log('Using progress ', `Array with ${progressData.length} items`);
        const { taskData, error: taskError } = await supabase.functions.invoke('ogemath-task-hardcode', {
          body: {
            goal: target_score,
            hours_per_week: weekly_hours,
            school_grade: school_grade,
            days_to_exam: daysToExam,
            progress: progressData
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
    } else {
      console.log('Conditions not met for ogemath-task-hardcode. Reasons:');
      console.log(`- course_id !== 1: ${course_id !== 1}`);
      console.log(`- no studentProgress: ${!studentProgress}`);
      console.log(`- studentProgress is error: ${studentProgress === 'Не удалось загрузить прогресс студента' || studentProgress === 'Ошибка при загрузке прогресса студента'}`);
    }
    
    // NEW: Get progress difference logic with null checks
    let final_json: any[] | null = null;
    let retrieved_hardcode_task: string | null = null;

    // Get progress difference for any course_id (not just course_id === 1)
    try {
      // 1. Get most recent hardcode_task from stories_and_telegram
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories_and_telegram')
        .select('hardcode_task, created_at')
        .eq('user_id', user_id)
        .eq('course_id', course_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (storiesError) {
        console.error(`Error fetching stories_and_telegram: ${storiesError.message}`);
        // Set both variables to null if we can't get hardcode_task
        final_json = null;
        retrieved_hardcode_task = null;
      } else if (!storiesData) {
        // No data found in stories_and_telegram
        final_json = null;
        retrieved_hardcode_task = null;
      } else {
        retrieved_hardcode_task = storiesData.hardcode_task;
        
        if (!storiesData.created_at) {
          // No timestamp available
          final_json = null;
          retrieved_hardcode_task = null;
        } else {
          const task_timestamp = new Date(storiesData.created_at);
          
          // 2. Get most recent raw_data from mastery_snapshots
          const { data: recentMasteryData, error: recentMasteryError } = await supabase
            .from('mastery_snapshots')
            .select('raw_data, run_timestamp')
            .eq('user_id', user_id)
            .eq('course_id', course_id)
            .order('run_timestamp', { ascending: false })
            .limit(1)
            .single();

          if (recentMasteryError) {
            console.error(`Error fetching recent mastery_snapshot: ${recentMasteryError.message}`);
            final_json = null;
            retrieved_hardcode_task = null;
          } else if (!recentMasteryData) {
            // No recent mastery snapshot found
            final_json = null;
            retrieved_hardcode_task = null;
          } else {
            const recentRawData: any[] = recentMasteryData.raw_data || [];

            // 3. Get most recent raw_data before task_timestamp from mastery_snapshots
            const { data: previousMasteryData, error: previousMasteryError } = await supabase
              .from('mastery_snapshots')
              .select('raw_data, run_timestamp')
              .eq('user_id', user_id)
              .eq('course_id', course_id)
              .lt('run_timestamp', task_timestamp.toISOString())
              .order('run_timestamp', { ascending: false })
              .limit(1)
              .single();

            if (previousMasteryError) {
              console.error(`Error fetching previous mastery_snapshot: ${previousMasteryError.message}`);
              final_json = null;
              retrieved_hardcode_task = null;
            } else if (!previousMasteryData) {
              // No previous mastery snapshot found before task timestamp
              final_json = null;
              retrieved_hardcode_task = null;
            } else {
              const previousRawData: any[] = previousMasteryData.raw_data || [];

              // Calculate progress_diff by subtracting values
              const progress_diff: any[] = [];
              
              // Create a map of previous data for quick lookup
              const previousMap = new Map<string, any>();
              previousRawData.forEach(item => {
                // Create a unique key based on the non-prob properties
                const key = Object.keys(item)
                  .filter(k => k !== 'prob')
                  .map(k => `${k}:${item[k]}`)
                  .join('|');
                previousMap.set(key, item);
              });

              // Calculate differences
              recentRawData.forEach(recentItem => {
                const key = Object.keys(recentItem)
                  .filter(k => k !== 'prob')
                  .map(k => `${k}:${recentItem[k]}`)
                  .join('|');
                
                const previousItem = previousMap.get(key);
                const diffItem = { ...recentItem }; // Copy all properties
                
                if (previousItem) {
                  diffItem.prob = recentItem.prob - previousItem.prob;
                } else {
                  diffItem.prob = recentItem.prob; // If no previous value, use current value
                }
                
                progress_diff.push(diffItem);
              });

              // Add items that were in previous but not in recent (with negative values)
              previousRawData.forEach(prevItem => {
                const key = Object.keys(prevItem)
                  .filter(k => k !== 'prob')
                  .map(k => `${k}:${prevItem[k]}`)
                  .join('|');
                
                if (!recentRawData.some(recentItem => 
                  Object.keys(recentItem)
                    .filter(k => k !== 'prob')
                    .map(k => `${k}:${recentItem[k]}`)
                    .join('|') === key
                )) {
                  const newItem = { ...prevItem, prob: 0 - prevItem.prob };
                  progress_diff.push(newItem);
                }
              });

              // Sort by absolute value of prob in descending order and take top 30
              const sorted_progress_diff = progress_diff
                .sort((a, b) => Math.abs(b.prob) - Math.abs(a.prob))
                .slice(0, 30);

              final_json = sorted_progress_diff;
            }
          }
        }
      }
    } catch (progressDiffError) {
      console.error('Error in progress difference calculation:', progressDiffError);
      // Set both variables to null on any error
      final_json = null;
      retrieved_hardcode_task = null;
    }
    // END NEW: Progress difference logic with null checks
    
    // NEW: Log the content of final_json for debugging
    if (final_json) {
      console.log('Final JSON content (top 10 items):', JSON.stringify(final_json.slice(0, 10), null, 2));
      console.log(`Total items in final_json: ${final_json.length}`);
    } else {
      console.log('Final JSON is null - no progress difference data available');
    }
    // END NEW: Log final_json content
    
    // Get task context from oge_entrypage_rag table
    console.log(`Fetching task context for course_id: ${course_id}`);
    const { data: ragData, error: ragError } = await supabase.from('oge_entrypage_rag').select('task_context').eq('id', course_id).single();
    if (ragError) {
      console.error('Error fetching task context:', ragError);
      throw new Error('Failed to fetch task context');
    }
    const prompt1 = ragData.task_context || '';
    
    // Filter student progress to remove skill elements
    let filteredStudentProgress = studentProgress;
    if (studentProgress && course_id === 1) {
      try {
        const progressArray = JSON.parse(studentProgress);
        const filteredProgress = progressArray.filter((item) => !item.hasOwnProperty('навык'));
        filteredStudentProgress = JSON.stringify(filteredProgress, null, 2);
      } catch (error) {
        console.error('Error filtering student progress:', error);
        // Keep original if filtering fails
      }
    }
    
    // Construct the full prompt
    const prompt = prompt1 + `
Твой ответ должен иметь длину до ${number_of_words} слов.

### Задание студента

{ЗАДАНИЕ_ДЛЯ_СТУДЕНТА}:
${student_hardcoded_task}

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
    // Make OpenRouter API call
    const headers = {
      "Authorization": `Bearer ${openrouterApiKey}`,
      "Content-Type": "application/json"
    };
    const data = {
      "model": "x-ai/grok-3-mini",
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
      "temperature": 0.6
    };
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    const aiResponse = responseData.choices?.[0]?.message?.content || "Не удалось получить ответ от ИИ";
    console.log('Successfully generated AI response');
    
    // Insert hardcode_task to stories_and_telegram table if it exists
    if (student_hardcoded_task && course_id === 1) {
      console.log('Saving hardcode task to database...');
      const { data: insertData, error: insertError } = await supabase.from('stories_and_telegram').insert({
        user_id,
        hardcode_task: student_hardcoded_task,
        course_id,
        seen: 0,
        upload_id: Math.floor(Math.random() * 1000000)
      }).select().single();
      if (insertError) {
        console.error('Error inserting hardcode task:', insertError);
      } else {
        console.log('Hardcode task saved successfully');
      }
    }
    
    return new Response(JSON.stringify({
      response: aiResponse,
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
      retrieved_hardcode_task
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
