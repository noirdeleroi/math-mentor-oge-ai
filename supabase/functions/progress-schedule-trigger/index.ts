import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Starting progress schedule trigger...');
    // Get all users with their courses
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('user_id, courses').not('courses', 'is', null);
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch profiles'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let processedCount = 0;
    let eligibleCount = 0;
    const results = [];
    for (const profile of profiles || []){
      const { user_id, courses } = profile;
      if (!courses || courses.length === 0) {
        console.log(`User ${user_id} has no courses, skipping`);
        continue;
      }
      for (const course_id of courses){
        const courseIdString = String(course_id);
        console.log(`Checking conditions for user ${user_id}, course ${courseIdString}`);
        const isEligible = await checkEligibilityConditions(supabase, user_id, courseIdString);
        if (isEligible) {
          eligibleCount++;
          console.log(`Processing user ${user_id}, course ${courseIdString}`);
          try {
            const { data: progressData, error: progressError } = await supabase.functions.invoke('student-progress-calculate', {
              body: {
                user_id,
                course_id: courseIdString
              },
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              }
            });
            if (progressError) {
              console.error(`Error calling student-progress-calculate for user ${user_id}, course ${courseIdString}:`, progressError);
              results.push({
                user_id,
                course_id: courseIdString,
                status: 'error',
                error: progressError.message
              });
              continue;
            }
            await storeProgressSnapshot(supabase, user_id, courseIdString, progressData);
            processedCount++;
            results.push({
              user_id,
              course_id: courseIdString,
              status: 'success'
            });
            console.log(`Successfully processed user ${user_id}, course ${courseIdString}`);
            await new Promise((resolve)=>setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error processing user ${user_id}, course ${courseIdString}:`, error);
            results.push({
              user_id,
              course_id: courseIdString,
              status: 'error',
              error: error.message
            });
          }
        } else {
          console.log(`User ${user_id}, course ${courseIdString} not eligible, skipping`);
        }
      }
    }
    console.log(`Progress schedule trigger completed. Processed: ${processedCount}, Eligible: ${eligibleCount}, Total profiles: ${profiles?.length || 0}`);
    return new Response(JSON.stringify({
      success: true,
      total_profiles: profiles?.length || 0,
      eligible_pairs: eligibleCount,
      processed_pairs: processedCount,
      results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in progress-schedule-trigger:', error);
    return new Response(JSON.stringify({
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
async function checkEligibilityConditions(supabase, user_id, course_id) {
  try {
    const { data: masteryData, error: masteryError } = await supabase.from('student_mastery').select('updated_at').eq('user_id', user_id).eq('course_id', course_id).order('updated_at', {
      ascending: false
    }).limit(1).single();
    if (masteryError && masteryError.code !== 'PGRST116') {
      console.error('Error checking student_mastery:', masteryError);
      return false;
    }
    const { data: snapshotData, error: snapshotError } = await supabase.from('mastery_snapshots').select('run_timestamp').eq('user_id', user_id).eq('course_id', course_id).order('run_timestamp', {
      ascending: false
    }).limit(1).single();
    if (snapshotError && snapshotError.code !== 'PGRST116') {
      console.error('Error checking mastery_snapshots:', snapshotError);
      return false;
    }
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    let condition1 = true;
    if (masteryData && snapshotData) {
      const masteryTime = new Date(masteryData.updated_at);
      const snapshotTime = new Date(snapshotData.run_timestamp);
      condition1 = masteryTime > snapshotTime;
    } else if (!masteryData || masteryError?.code === 'PGRST116') {
      return false;
    }
    let condition2 = true;
    if (snapshotData) {
      const snapshotTime = new Date(snapshotData.run_timestamp);
      condition2 = now > new Date(snapshotTime.getTime() + 30 * 60 * 1000);
    }
    console.log(`User ${user_id}, course ${course_id}: Condition1=${condition1}, Condition2=${condition2}`);
    return condition1 && condition2;
  } catch (error) {
    console.error('Error checking eligibility conditions:', error);
    return false;
  }
}
async function storeProgressSnapshot(supabase, user_id, course_id, progressData) {
  try {
    const raw_data = progressData;
    const computed_summary = computeSummary(progressData);
    // 🔹 NEW FEATURE: compute stats from student_activity
    const { data: data_questions, error: questionsError } = await supabase.from('student_activity').select('question_id, is_correct, duration_answer, created_at').eq('user_id', user_id).eq('course_id', course_id || '1').not('is_correct', 'is', null);
    if (questionsError) {
      console.error('Error fetching student_activity:', questionsError);
    }
    let stats = {
      "Решено задач": 0,
      "Правильных ответов": 0,
      "Время обучения": 0,
      "Дней подряд": 0
    };
    if (data_questions && data_questions.length > 0) {
      const total = data_questions.length;
      const correctCount = data_questions.filter((q)=>q.is_correct === true).length;
      const totalDurationSec = data_questions.reduce((sum, q)=>sum + (q.duration_answer || 0), 0);
      const totalDurationHours = +(totalDurationSec / 3600).toFixed(2);
      // Compute streak ("Дней подряд")
      const uniqueDays = Array.from(new Set(data_questions.map((q)=>q.created_at.split('T')[0]))).sort(); // ascending order
      let streak = 0;
      if (uniqueDays.length > 0) {
        const today = new Date(uniqueDays[uniqueDays.length - 1]);
        streak = 1;
        for(let i = uniqueDays.length - 2; i >= 0; i--){
          const prev = new Date(uniqueDays[i]);
          const diffDays = Math.floor((today - prev) / (1000 * 60 * 60 * 24));
          if (diffDays === streak) {
            streak++;
          } else if (diffDays > streak) {
            break;
          }
        }
      }
      stats = {
        "Решено задач": total,
        "Правильных ответов": +(correctCount / total * 100).toFixed(2),
        "Время обучения": totalDurationHours,
        "Дней подряд": streak
      };
    }
    // 🧮 Expected exam score calculation (based on Bayesian probabilities)
    let expected_score = null;
    try {
      // Extract FIPI problems from raw_data
      const fipiProblems = raw_data.filter((item)=>item["задача ФИПИ"]);
      const probs = fipiProblems.map((item)=>item.prob || 0);
      if (probs.length > 0) {
        let weights = [];
        // Select scoring rules based on course_id
        if (course_id === '1') {
          // Problem 1 → 5 pts, problems 6–19 → 1 pt, problems 20–25 → 2 pts
          weights = probs.map((_, i)=>{
            const n = i + 1;
            if (n === 1) return 5;
            if (n >= 6 && n <= 19) return 1;
            if (n >= 20 && n <= 25) return 2;
            return 0;
          });
        } else if (course_id === '2') {
          // Problems 1–21 → 1 pt each
          weights = probs.map((_, i)=>i + 1 <= 21 ? 1 : 0);
        } else if (course_id === '3') {
          // Problems 1–12 → 1, 13→2, 14→3, 15→2, 16→2, 17→3, 18→4, 19→4
          const pointMap = {
            13: 2,
            14: 3,
            15: 2,
            16: 2,
            17: 3,
            18: 4,
            19: 4
          };
          weights = probs.map((_, i)=>{
            const n = i + 1;
            if (n <= 12) return 1;
            return pointMap[n] || 0;
          });
        }
        // Step 1: compute naive and calibrated expected scores
        function logistic(x) {
          return 1 / (1 + Math.exp(-x));
        }
        const a = 5, b = 0.6, g = 0.25;
        const naive = probs.reduce((sum, p, i)=>sum + p * weights[i], 0);
        const calibrated = probs.reduce((sum, p, i)=>{
          const z = a * (p - b);
          const q = g + (1 - g) * logistic(z);
          return sum + q * weights[i];
        }, 0);
        let raw_expected = 0.3 * naive + 0.7 * calibrated;
        // Step 2: convert to 0–100 scale for course_id === '3'
        if (course_id === '3') {
          const scaleTable = [
            [
              1,
              6
            ],
            [
              2,
              11
            ],
            [
              3,
              17
            ],
            [
              4,
              22
            ],
            [
              5,
              27
            ],
            [
              6,
              34
            ],
            [
              7,
              40
            ],
            [
              8,
              46
            ],
            [
              9,
              52
            ],
            [
              10,
              58
            ],
            [
              11,
              64
            ],
            [
              12,
              70
            ],
            [
              13,
              72
            ],
            [
              14,
              74
            ],
            [
              15,
              76
            ],
            [
              16,
              78
            ],
            [
              17,
              80
            ],
            [
              18,
              82
            ],
            [
              19,
              84
            ],
            [
              20,
              86
            ],
            [
              21,
              88
            ],
            [
              22,
              90
            ],
            [
              23,
              92
            ],
            [
              24,
              94
            ],
            [
              25,
              95
            ],
            [
              26,
              96
            ],
            [
              27,
              97
            ],
            [
              28,
              98
            ],
            [
              29,
              99
            ],
            [
              30,
              100
            ],
            [
              31,
              100
            ],
            [
              32,
              100
            ]
          ];
          // interpolate between nearest table points
          const floorRow = scaleTable.findLast(([p])=>p <= raw_expected);
          const ceilRow = scaleTable.find(([p])=>p >= raw_expected);
          if (!floorRow) {
            expected_score = scaleTable[0][1]; // below min
          } else if (!ceilRow) {
            expected_score = scaleTable.at(-1)[1]; // above max
          } else if (floorRow[0] === ceilRow[0]) {
            expected_score = floorRow[1];
          } else {
            // linear interpolation between points
            const [x1, y1] = floorRow;
            const [x2, y2] = ceilRow;
            const t = (raw_expected - x1) / (x2 - x1);
            expected_score = +(y1 + t * (y2 - y1)).toFixed(2);
          }
        } else {
          expected_score = +raw_expected.toFixed(2);
        }
      }
    } catch (error) {
      console.error("Error calculating expected score:", error);
      expected_score = null;
    }
    const { error } = await supabase.from('mastery_snapshots').insert({
      user_id,
      course_id,
      raw_data,
      computed_summary,
      stats,
      expected_score,
      run_timestamp: new Date().toISOString()
    });
    if (error) {
      console.error('Error storing snapshot:', error);
      throw error;
    }
    console.log(`Stored snapshot for user ${user_id}, course ${course_id}`);
  } catch (error) {
    console.error('Error in storeProgressSnapshot:', error);
    throw error;
  }
}
function computeSummary(progressData) {
  try {
    const summary = [];
    const probabilities = [];
    if (Array.isArray(progressData)) {
      for (const item of progressData){
        if (item.topic && typeof item.prob === 'number') {
          summary.push({
            topic: item.topic,
            prob: item.prob
          });
          probabilities.push(item.prob);
        }
      }
    }
    const general_progress = probabilities.length > 0 ? probabilities.reduce((sum, prob)=>sum + prob, 0) / probabilities.length : 0;
    summary.unshift({
      general_progress
    });
    return summary;
  } catch (error) {
    console.error('Error computing summary:', error);
    return [
      {
        general_progress: 0
      }
    ];
  }
}
