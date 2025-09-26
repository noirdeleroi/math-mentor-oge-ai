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
    // Define problem types based on course_id
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
    // Calculate problem type progress FIRST
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
    // Calculate skill mastery SECOND
    console.log('Calculating skill mastery...');
    let allSkills;
    if (course_id === '1') {
      allSkills = Array.from({
        length: 200
      }, (_, i)=>i + 1);
    } else if (course_id === '2') {
      allSkills = Array.from({
        length: 550
      }, (_, i)=>i + 1);
    } else if (course_id === '3') {
      allSkills = Array.from({
        length: 550
      }, (_, i)=>i + 1);
    } else {
      allSkills = Array.from({
        length: 200
      }, (_, i)=>i + 1);
    }
    let skillProgressMap = {}; // Store skill probabilities for topic calculation
    try {
      const { data: skillData, error: skillError } = await supabase.functions.invoke('compute-skills-progress-bars', {
        body: {
          user_id,
          skill_ids: allSkills,
          course_id: course_id // Add course_id here
        }
      });
      if (skillError) {
        console.error('Error computing skill progress:', skillError);
        allSkills.forEach((skillId)=>{
          const probability = 0.02;
          skillProgressMap[skillId.toString()] = probability;
          result.push({
            "навык": skillId.toString(),
            prob: probability
          });
        });
      } else {
        const progressBars = skillData?.data?.progress_bars || [];
        progressBars.forEach((item)=>{
          const skillId = Object.keys(item)[0];
          const probability = item[skillId];
          skillProgressMap[skillId] = probability;
        });
        allSkills.forEach((skillId)=>{
          const probability = skillProgressMap[skillId.toString()] || 0.02;
          result.push({
            "навык": skillId.toString(),
            prob: Math.round(probability * 100) / 100
          });
        });
      }
    } catch (error) {
      console.error('Error processing skills:', error);
      allSkills.forEach((skillId)=>{
        const probability = 0.02;
        skillProgressMap[skillId.toString()] = probability;
        result.push({
          "навык": skillId.toString(),
          prob: probability
        });
      });
    }
    // Calculate topic mastery LAST (using pre-computed skill probabilities)
    console.log('Calculating topic mastery from skill probabilities...');
    // Fetch topic-skill mappings from json_files table (id=1 for course_id=1)
    let topicSkillMappings = {};
    try {
      const { data, error } = await supabase.from('json_files').select('content').eq('id', 1).eq('course_id', course_id).single();
      if (error) {
        console.error('Error fetching topic-skill mappings:', error);
        throw new Error(`Failed to fetch topic mappings: ${error.message}`);
      }
      if (data?.content) {
        topicSkillMappings = data.content;
        console.log(`Loaded topic-skill mappings for ${Object.keys(topicSkillMappings).length} topics`);
      } else {
        throw new Error('No topic-skill mappings found');
      }
    } catch (error) {
      console.error('Error loading topic-skill mappings:', error);
    // Continue without topic mastery - we'll use the topic names file as fallback
    }
    // Fetch topic names for display
    let topicMappings = [];
    let fileId;
    if (course_id === '1') {
      fileId = 2;
    } else if (course_id === '2') {
      fileId = 4;
    } else if (course_id === '3') {
      fileId = 6;
    }
    try {
      const { data, error } = await supabase.from('json_files').select('content').eq('id', fileId).eq('course_id', course_id).single();
      if (!error && data?.content) {
        topicMappings = data.content;
        console.log(`Loaded ${topicMappings.length} topic names for display`);
      }
    } catch (error) {
      console.error('Error loading topic names:', error);
    }
    // Calculate topic mastery by averaging skill probabilities
    for (const topicMapping of topicMappings){
      try {
        const topicNumber = topicMapping.topic_number;
        const topicName = topicMapping.topic_name;
        const fullTopicLabel = `${topicNumber} ${topicName}`;
        let topicProbability = 0.02; // Default
        // Check if we have skill mappings for this topic
        if (topicSkillMappings[topicNumber]) {
          const skillIdsForTopic = topicSkillMappings[topicNumber];
          const validProbabilities = [];
          // Collect probabilities for all skills in this topic
          skillIdsForTopic.forEach((skillId)=>{
            const skillProb = skillProgressMap[skillId.toString()];
            if (skillProb !== undefined && skillProb !== null) {
              validProbabilities.push(skillProb);
            }
          });
          // Calculate average if we have valid probabilities
          if (validProbabilities.length > 0) {
            const sum = validProbabilities.reduce((a, b)=>a + b, 0);
            topicProbability = sum / validProbabilities.length;
            console.log(`Topic ${topicNumber} (${validProbabilities.length}/${skillIdsForTopic.length} skills): ${topicProbability}`);
          } else {
            console.log(`Topic ${topicNumber}: No valid skill probabilities found`);
          }
        } else {
          console.log(`Topic ${topicNumber}: No skill mapping found`);
        }
        result.push({
          topic: fullTopicLabel,
          prob: Math.round(topicProbability * 100) / 100
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
