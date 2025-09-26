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
    const { user_id, entity_type, entity_id, course_id } = await req.json();
    // Validate required parameters
    if (!user_id || !entity_type || entity_id === undefined || !course_id) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: user_id, entity_type, entity_id, course_id'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validate entity_type
    if (![
      'skill',
      'problem_number_type'
    ].includes(entity_type)) {
      return new Response(JSON.stringify({
        error: 'entity_type must be either "skill" or "problem_number_type"'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Getting alpha/beta for user ${user_id}, ${entity_type} ${entity_id}, course ${course_id}`);
    // Query the student_mastery table
    const { data, error } = await supabaseClient.from('student_mastery').select('alpha, beta').eq('user_id', user_id).eq('entity_type', entity_type).eq('entity_id', entity_id).eq('course_id', course_id).maybeSingle();
    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve alpha/beta values',
        details: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Return the data or null if not found (replicating Python's (None, None) behavior)
    const result = data ? {
      alpha: data.alpha,
      beta: data.beta
    } : {
      alpha: null,
      beta: null
    };
    console.log(`Retrieved alpha/beta for user ${user_id}, ${entity_type} ${entity_id}, course ${course_id}:`, result);
    return new Response(JSON.stringify({
      success: true,
      data: result
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
