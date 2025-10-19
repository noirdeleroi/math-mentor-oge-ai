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
    let { user_id, course_id = '1' } = await req.json();
    course_id = String(course_id);
    if (!user_id) {
      return new Response(JSON.stringify({
        error: 'user_id is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Calculating progress for user: ${user_id}, course: ${course_id}`);
    const result = [];
    // ------------------ Problem Types ------------------
    let problemTypes;
    if (course_id === '1') {
      problemTypes = [
        1,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25
      ];
    } else if (course_id === '2') {
      problemTypes = [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21
      ];
    } else if (course_id === '3') {
      problemTypes = [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19
      ];
    } else {
      return new Response(JSON.stringify({
        error: 'Invalid course_id. Must be "1", "2", or "3"'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Calculating problem type progress...');
    try {
      const { data: problemData, error: problemError } = await supabase.functions.invoke('compute-problem-number-type-progress-bars', {
        body: {
          user_id,
          problem_number_types: problemTypes,
          course_id
        }
      });
      if (problemError) {
        console.error('Error computing problem type progress:', problemError);
        problemTypes.forEach((problemType)=>{
          result.push({
            "задача ФИПИ": problemType.toString(),
            prob: 0.02
          });
        });
      } else {
        const progressBars = problemData?.data?.progress_bars || [];
        const progressMap = {};
        progressBars.forEach((item)=>{
          const problemType = Object.keys(item)[0];
          const probability = item[problemType];
          progressMap[problemType] = probability;
        });
        problemTypes.forEach((problemType)=>{
          const probability = progressMap[problemType.toString()] || 0.02;
          result.push({
            "задача ФИПИ": problemType.toString(),
            prob: Math.round(probability * 100) / 100
          });
        });
      }
    } catch (error) {
      console.error('Error processing problem types:', error);
      problemTypes.forEach((problemType)=>{
        result.push({
          "задача ФИПИ": problemType.toString(),
          prob: 0.02
        });
      });
    }
    // ------------------ Skills ------------------
    console.log('Calculating skill mastery (from student_mastery)...');
    let numSkills = course_id === '1' ? 200 : 550;
    const { data: skillsData, error: skillsError } = await supabase.from('student_mastery').select('entity_id, alpha, beta').eq('user_id', user_id).eq('course_id', course_id).eq('entity_type', 'skill').in('entity_id', Array.from({
      length: numSkills
    }, (_, i)=>i + 1));
    if (skillsError) {
      console.error('Error fetching skills from student_mastery:', skillsError);
    }
    const skillMap = {};
    if (skillsData) {
      for (const row of skillsData){
        const { entity_id, alpha, beta } = row;
        const a = typeof alpha === 'number' ? alpha : 0;
        const b = typeof beta === 'number' ? beta : 0;
        let prob = 0.02;
        if (a + b > 0) {
          prob = a / (a + b);
        }
        skillMap[entity_id.toString()] = Math.round(prob * 100) / 100;
      }
    }
    for(let skillId = 1; skillId <= numSkills; skillId++){
      const probability = skillMap[skillId.toString()] ?? 0.02;
      result.push({
        "навык": skillId.toString(),
        prob: probability
      });
    }
    // ------------------ Topics ------------------
    console.log('Calculating topic mastery from skill probabilities...');
    let topicSkillMappings = {};
    try {
      let mappingFileId;
      if (course_id === '1') mappingFileId = 1;
      else if (course_id === '2') mappingFileId = 3;
      else if (course_id === '3') mappingFileId = 5;
      const { data, error } = await supabase.from('json_files').select('content').eq('id', mappingFileId).eq('course_id', course_id).maybeSingle();
      if (error) {
        console.error('Error fetching topic-skill mappings:', error);
      } else if (!data) {
        console.warn(`No topic-skill mapping found for course ${course_id}`);
      } else if (data?.content) {
        topicSkillMappings = data.content;
        console.log(`Loaded topic-skill mappings for ${Object.keys(topicSkillMappings).length} topics`);
      }
    } catch (error) {
      console.error('Error loading topic-skill mappings:', error);
    }
    // Fetch topic names
    let topicMappings = [];
    let fileId;
    if (course_id === '1') fileId = 2;
    else if (course_id === '2') fileId = 4;
    else if (course_id === '3') fileId = 6;
    try {
      const { data, error } = await supabase.from('json_files').select('content').eq('id', fileId).eq('course_id', course_id).single();
      if (!error && data?.content) {
        topicMappings = data.content;
        console.log(`Loaded ${topicMappings.length} topic names for display`);
      }
    } catch (error) {
      console.error('Error loading topic names:', error);
    }
    // Calculate topic probabilities
    for (const topicMapping of topicMappings){
      try {
        const topicNumber = topicMapping.topic_number;
        const topicName = topicMapping.topic_name;
        const fullTopicLabel = `${topicNumber} ${topicName}`;
        let topicProbability = 0.02;
        if (topicSkillMappings[topicNumber]) {
          const skillIdsForTopic = topicSkillMappings[topicNumber];
          const validProbabilities = [];
          skillIdsForTopic.forEach((skillId)=>{
            const skillProb = skillMap[skillId.toString()] ?? 0.02;
            if (typeof skillProb === 'number' && !isNaN(skillProb)) {
              validProbabilities.push(skillProb);
            }
          });
          if (validProbabilities.length > 0) {
            const sum = validProbabilities.reduce((a, b)=>a + b, 0);
            topicProbability = sum / validProbabilities.length;
            topicProbability = Math.round(topicProbability * 100) / 100;
          }
        }
        result.push({
          topic: fullTopicLabel,
          prob: topicProbability
        });
      } catch (error) {
        console.error(`Error processing topic ${topicMapping.topic_number}:`, error);
        result.push({
          topic: `${topicMapping.topic_number} ${topicMapping.topic_name || 'Unknown Topic'}`,
          prob: 0.02
        });
      }
    }
    console.log(`Successfully calculated progress for user ${user_id}, returning ${result.length} items`);
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in student-progress-calculate function:', error);
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
