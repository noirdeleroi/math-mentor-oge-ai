import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { question_id, origin: originOverride, course_id } = await req.json();
    // Derive origin for fallback fetching of public assets
    let originHeader = req.headers.get('origin') || req.headers.get('referer') || '';
    if (originOverride && typeof originOverride === 'string') {
      originHeader = originOverride;
    }
    // Validate required parameters
    if (!question_id) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: question_id'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Fetching question details for question_id: ${question_id}`);
    // Determine which table to query based on question_id format
    let tableName = 'oge_math_fipi_bank' // default
    ;
    if (question_id.startsWith('EGEBASIC_')) {
      tableName = 'egemathbase';
    } else if (question_id.startsWith('EGEPROF_')) {
      tableName = 'egemathprof';
    } else if (question_id.startsWith('OGEMATH_SKILLS_')) {
      tableName = 'oge_math_skills_questions';
    }
    console.log(`Querying table: ${tableName}`);
    // Fetch question details from the appropriate table
    const { data: questionData, error } = await supabaseClient.from(tableName).select('skills, problem_number_type, difficulty').eq('question_id', question_id).maybeSingle();
    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch question details',
        details: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!questionData) {
      return new Response(JSON.stringify({
        error: `Question ID ${question_id} not found`
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse skills string to array if it exists
    let skillsArray = [];
    if (questionData.skills) {
      try {
        // Skills might be stored as comma-separated string or JSON
        if (typeof questionData.skills === 'string') {
          skillsArray = questionData.skills.split(',').map((s)=>{
            const num = parseInt(s.trim(), 10);
            return isNaN(num) ? null : num;
          }).filter((n)=>n !== null);
        } else if (Array.isArray(questionData.skills)) {
          // If already an array, ensure all elements are integers
          skillsArray = questionData.skills.map((s)=>parseInt(s, 10)).filter((n)=>!isNaN(n));
        }
      } catch (e) {
        console.warn('Error parsing skills:', e);
      }
    }
    // Function to fetch topic-skill mapping; supports hardcoded map when course_id = 1
    async function getTopicSkillMapping(courseType, origin, courseId) {
      try {
        const cid = String(courseId ?? '').trim();
        if (cid === '1') {
          // Hardcoded mapping for OGE Math (course_id = 1)
          const HARD_CODED_MAPPING = {
            "1.1": [
              1,
              2,
              3,
              4,
              5
            ],
            "1.2": [
              6,
              7,
              8,
              9,
              10,
              195
            ],
            "1.3": [
              11,
              12,
              13,
              14,
              15,
              16,
              17,
              180
            ],
            "1.4": [
              18,
              19,
              20,
              197
            ],
            "1.5": [
              21,
              22,
              23
            ],
            "2.1": [
              35,
              36,
              37,
              38
            ],
            "2.2": [
              39,
              40,
              41,
              42,
              43,
              44
            ],
            "2.3": [
              45,
              46,
              47,
              48,
              49,
              179
            ],
            "2.4": [
              50,
              51,
              52,
              53
            ],
            "2.5": [
              54,
              55,
              56,
              57
            ],
            "3.1": [
              58,
              59,
              60,
              61,
              62,
              188,
              190,
              191
            ],
            "3.2": [
              63,
              64,
              65,
              66,
              67,
              68
            ],
            "3.3": [
              69,
              70,
              71,
              72,
              73,
              74,
              75,
              184,
              185
            ],
            "4.1": [
              76,
              77,
              78,
              79
            ],
            "4.2": [
              80,
              81,
              82,
              83,
              84,
              85,
              86,
              87,
              88
            ],
            "5.1": [
              89,
              90,
              91,
              92,
              93,
              94,
              95,
              96,
              97,
              98,
              99,
              100,
              101,
              102,
              186,
              187
            ],
            "6.1": [
              103,
              104,
              105,
              106,
              107,
              108,
              109
            ],
            "6.2": [
              110,
              111
            ],
            "7.1": [
              112,
              113,
              114,
              115,
              116
            ],
            "7.2": [
              117,
              118,
              119,
              120,
              121,
              122,
              123,
              124
            ],
            "7.3": [
              125,
              126,
              127,
              128,
              129,
              130,
              131,
              132,
              133,
              134
            ],
            "7.4": [
              135,
              136,
              137,
              138
            ],
            "7.5": [
              139,
              140,
              141,
              142,
              143,
              144,
              145,
              146,
              147,
              148,
              149,
              150,
              151,
              152,
              153
            ],
            "7.6": [
              154,
              155,
              156,
              157,
              196
            ],
            "7.7": [
              158,
              159,
              160,
              161
            ],
            "8.1": [
              162,
              163,
              164,
              165
            ],
            "8.2": [
              166,
              167,
              168
            ],
            "8.3": [
              169,
              170,
              171,
              172
            ],
            "8.4": [
              173,
              174
            ],
            "8.5": [
              175,
              176,
              177,
              178
            ],
            "9.1": [
              24,
              25,
              181,
              182,
              183,
              192,
              198,
              199,
              200
            ],
            "9.2": [
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33,
              34
            ]
          };
          return Object.entries(HARD_CODED_MAPPING).map(([topic, skills])=>({
              topic,
              skills
            }));
        }
        const cidd = String(courseId ?? '').trim();
        if (cidd === '2' || cidd === '3') {
          const targetId = cidd === '2' ? 3 : 5;
          const { data, error } = await supabaseClient.from('json_files').select('content').eq('id', targetId).maybeSingle();
          if (error || !data?.content) {
            console.warn(`Failed to fetch mapping for course_id=${cidd}`, error);
            return [];
          }
          const mapping = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          return Object.entries(mapping).map(([topic, skills])=>({
              topic,
              skills
            }));
        }
        // 2) Fallback to app's public assets using request origin
        if (origin) {
          const appAssetUrl = `${origin.replace(/\/$/, '')}/${fileName}`;
          const fallbackResp = await fetch(appAssetUrl);
          if (fallbackResp.ok) {
            const mapping = await fallbackResp.json();
            return Object.entries(mapping).map(([topic, skills])=>({
                topic,
                skills: skills
              }));
          }
          console.warn(`Failed to fetch mapping from app assets at ${appAssetUrl}`);
        }
        console.warn('Failed to fetch topic-skill mapping from storage and app assets, returning empty mapping');
        return [];
      } catch (error) {
        console.error('Error fetching topic-skill mapping:', error);
        return [];
      }
    }
    // Determine course type based on question_id
    let courseType = 'ogemath' // default
    ;
    if (question_id.startsWith('EGEBASIC_')) {
      courseType = 'egebasic';
    } else if (question_id.startsWith('EGEPROF_')) {
      courseType = 'egeprof';
    }
    // Get topic-skill mapping from external file (with robust fallbacks)
    const topicSkillMapping = await getTopicSkillMapping(courseType, originHeader, course_id);
    // Derive topics from skills
    const topicsArray = [];
    for (const mapping of topicSkillMapping){
      // Check if any skill from this question matches skills in this topic
      if (skillsArray.some((skill)=>mapping.skills.includes(skill))) {
        topicsArray.push(mapping.topic);
      }
    }
    const questionDetails = {
      skills_list: skillsArray,
      topics_list: topicsArray,
      problem_number_type: questionData.problem_number_type ? parseInt(questionData.problem_number_type.toString()) : null,
      difficulty: questionData.difficulty ? parseInt(questionData.difficulty.toString()) : 1
    };
    console.log(`Successfully fetched question details for ${question_id}:`, questionDetails);
    return new Response(JSON.stringify({
      success: true,
      data: questionDetails
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
