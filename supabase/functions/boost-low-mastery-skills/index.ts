import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  user_id: string;
  topics?: string[];
  topic_id?: string;
  course_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, topics, topic_id, course_id }: RequestBody = await req.json();

    // Validate required parameters
    if (!user_id || (!topics && !topic_id) || !course_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: user_id, (topics or topic_id), course_id'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine which topics to process
    let topicsToProcess: string[] = [];
    if (topic_id) {
      topicsToProcess = [topic_id];
      console.log(`Boosting low mastery skills for user ${user_id}, topic ${topic_id}, course ${course_id}`);
    } else if (topics) {
      topicsToProcess = topics;
      console.log(`Boosting low mastery skills for user ${user_id}, topics ${topics.join(', ')}, course ${course_id}`);
    }

    // Step 1: Fetch topic-skill mapping from json_files table
    // Use id=10 for course_id="2" (OGE), id=1 for others
    const jsonFileId = course_id === "2" ? 10 : 1;
    const { data: jsonData, error: jsonError } = await supabaseClient
      .from('json_files')
      .select('content')
      .eq('id', jsonFileId)
      .single();

    if (jsonError || !jsonData) {
      console.error('Error fetching topic-skill mapping:', jsonError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch topic-skill mapping',
          details: jsonError?.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const topicSkillMapping = jsonData.content as Record<string, number[]>;
    console.log('Topic-skill mapping fetched:', topicSkillMapping);

    // Step 2: Get all skill IDs for the specified topics
    const allSkills = new Set<number>();
    for (const topic of topicsToProcess) {
      const skills = topicSkillMapping[topic];
      if (skills && Array.isArray(skills)) {
        skills.forEach(skill => allSkills.add(skill));
      }
    }

    const skillIds = Array.from(allSkills);
    console.log(`Found ${skillIds.length} unique skills for topics ${topicsToProcess.join(', ')}: ${skillIds.join(', ')}`);

    if (skillIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No skills found for specified topics',
          boosted_skills: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 3: Query alpha and beta for each skill from student_mastery
    const { data: masteryData, error: masteryError } = await supabaseClient
      .from('student_mastery')
      .select('entity_id, alpha, beta')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .eq('entity_type', 'skill')
      .in('entity_id', skillIds);

    if (masteryError) {
      console.error('Error fetching mastery data:', masteryError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch mastery data',
          details: masteryError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetched mastery data for ${masteryData?.length || 0} skills`);

    // Step 4: Identify skills with low mastery (alpha/(alpha+beta) <= 0.2) and update them
    const boostedSkills: number[] = [];
    const updatePromises: Promise<any>[] = [];

    for (const masteryRow of masteryData || []) {
      const { entity_id, alpha, beta } = masteryRow;
      const masteryProbability = alpha / (alpha + beta);
      
      console.log(`Skill ${entity_id}: alpha=${alpha}, beta=${beta}, mastery=${masteryProbability.toFixed(3)}`);

      if (masteryProbability <= 0.29) {
        console.log(`Boosting skill ${entity_id} (mastery=${masteryProbability.toFixed(3)} <= 0.29)`);
        
        const updatePromise = supabaseClient
          .from('student_mastery')
          .update({ alpha: 17, beta: 40, updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('course_id', course_id)
          .eq('entity_type', 'skill')
          .eq('entity_id', entity_id);
        
        updatePromises.push(updatePromise);
        boostedSkills.push(entity_id);
      }
    }

    // Execute all updates in parallel
    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      
      // Check for errors in any of the updates
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Some updates failed:', errors);
        return new Response(
          JSON.stringify({
            error: 'Some skill updates failed',
            details: errors.map(e => e.error?.message).join(', '),
            partial_success: true,
            boosted_skills: boostedSkills
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log(`Successfully boosted ${boostedSkills.length} skills: ${boostedSkills.join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Boosted ${boostedSkills.length} low-mastery skills`,
        boosted_skills: boostedSkills,
        total_skills_checked: masteryData?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
