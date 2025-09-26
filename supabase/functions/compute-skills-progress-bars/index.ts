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
    const { user_id, skill_ids, course_id } = await req.json();
    // Validate required parameters
    if (!user_id || !skill_ids || !Array.isArray(skill_ids)) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: user_id, skill_ids (array)'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Computing skills progress bars for user ${user_id}, skills: ${skill_ids.join(', ')}`);
    const t_current = new Date().toISOString();
    const progress_list = [];
    // Get latest attempt times for all skills in one batch
    console.log('Getting latest attempt times for all skills...');
    const latestAttemptResponse = await supabaseClient.functions.invoke('get-latest-attempt-time', {
      body: {
        user_id,
        entity_type: 'skill',
        entity_ids: skill_ids
      }
    });
    const latestAttemptTimes = latestAttemptResponse.data?.data?.latest_attempt_times || {};
    // Process skills in parallel batches of 20 to avoid overwhelming the system
    const batchSize = 20;
    const batches = [];
    for(let i = 0; i < skill_ids.length; i += batchSize){
      batches.push(skill_ids.slice(i, i + batchSize));
    }
    console.log(`Processing ${skill_ids.length} skills in ${batches.length} parallel batches of ${batchSize}`);
    // Process each batch in parallel
    const batchPromises = batches.map(async (batch)=>{
      const skillPromises = batch.map(async (skill_id)=>{
        try {
          const t_attempt = latestAttemptTimes[skill_id];
          // Apply time decay to parameters
          const timeDecayResponse = await supabaseClient.functions.invoke('apply-time-decay-to-params', {
            body: {
              user_id,
              entity_type: 'skill',
              entity_id: skill_id,
              t_current,
              t_attempt,
              lambda_decay: 0.01,
              course_id: course_id
            }
          });
          if (timeDecayResponse.error) {
            console.error(`Error applying time decay for skill ${skill_id}:`, timeDecayResponse.error);
            return {
              [skill_id.toString()]: 0.0
            };
          }
          const { alpha_decayed, beta_decayed } = timeDecayResponse.data?.data || {};
          // Compute mastery probability
          const masteryProbResponse = await supabaseClient.functions.invoke('compute-mastery-probability', {
            body: {
              alpha: alpha_decayed || 0.0,
              beta: beta_decayed || 0.0
            }
          });
          if (masteryProbResponse.error) {
            console.error(`Error computing mastery probability for skill ${skill_id}:`, masteryProbResponse.error);
            return {
              [skill_id.toString()]: 0.0
            };
          }
          const probability = masteryProbResponse.data?.data?.mastery_probability || 0.0;
          console.log(`Skill ${skill_id} probability: ${probability}`);
          return {
            [skill_id.toString()]: probability
          };
        } catch (skillError) {
          console.error(`Error processing skill ${skill_id}:`, skillError);
          return {
            [skill_id.toString()]: 0.0
          };
        }
      });
      return Promise.all(skillPromises);
    });
    // Wait for all batches to complete and flatten results
    const batchResults = await Promise.all(batchPromises);
    const allResults = batchResults.flat();
    progress_list.push(...allResults);
    console.log(`Computed progress bars for ${progress_list.length} skills`);
    return new Response(JSON.stringify({
      success: true,
      data: {
        user_id,
        progress_bars: progress_list
      }
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
