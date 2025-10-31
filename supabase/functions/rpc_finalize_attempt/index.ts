import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  user_id: string
  question_id: string
  is_correct: boolean
  scores_fipi: number
  course_id: string
  attempt_id?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      user_id, 
      question_id, 
      is_correct, 
      scores_fipi, 
      course_id, 
      attempt_id 
    }: RequestBody = await req.json()

    // Validate required parameters
    if (!user_id || !question_id || is_correct === undefined || scores_fipi === undefined || !course_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: user_id, question_id, is_correct, scores_fipi, course_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate scores_fipi range
    if (scores_fipi < 0 || scores_fipi > 2) {
      return new Response(
        JSON.stringify({ 
          error: 'scores_fipi must be between 0 and 2' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Finalizing attempt for user ${user_id}, question ${question_id}, course ${course_id}`)

    // Step 1: Find the latest unfinished attempt for this (user_id, question_id, course_id)
    let targetAttemptId = attempt_id

    if (!targetAttemptId) {
      const { data: latestAttempt, error: findError } = await supabaseClient
        .from('student_activity')
        .select('attempt_id, answer_time_start')
        .eq('user_id', user_id)
        .eq('question_id', question_id)
        .eq('course_id', course_id)
        .eq('finished_or_not', false)
        .order('answer_time_start', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (findError) {
        console.error('Error finding latest attempt:', findError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to find attempt', 
            details: findError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!latestAttempt) {
        return new Response(
          JSON.stringify({ 
            error: 'No unfinished attempt found for this user/question/course combination' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      targetAttemptId = latestAttempt.attempt_id
      console.log(`Found latest unfinished attempt: ${targetAttemptId}`)
    }

    // Step 2: Get the attempt to calculate duration
    const { data: currentAttempt, error: fetchError } = await supabaseClient
      .from('student_activity')
      .select('answer_time_start, finished_or_not')
      .eq('attempt_id', targetAttemptId)
      .single()

    if (fetchError || !currentAttempt) {
      console.error('Failed to fetch attempt:', fetchError)
      return new Response(
        JSON.stringify({ 
          error: 'Attempt not found', 
          details: fetchError?.message 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 3: Check if already finalized (idempotency)
    if (currentAttempt.finished_or_not === true) {
      console.log(`Attempt ${targetAttemptId} already finalized, skipping`)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Attempt already finalized',
          attempt_id: targetAttemptId,
          idempotent: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 4: Calculate duration in seconds
    const startTime = new Date(currentAttempt.answer_time_start)
    const currentTime = new Date()
    const durationSeconds = (currentTime.getTime() - startTime.getTime()) / 1000

    // Step 5: Finalize the attempt atomically
    const { data: updatedAttempt, error: updateError } = await supabaseClient
      .from('student_activity')
      .update({
        finished_or_not: true,
        is_correct,
        scores_fipi,
        duration_answer: durationSeconds
      })
      .eq('attempt_id', targetAttemptId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error updating attempt:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to finalize attempt', 
          details: updateError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully finalized attempt ${targetAttemptId} with duration ${durationSeconds}s`)

    return new Response(
      JSON.stringify({ 
        success: true,
        attempt_id: targetAttemptId,
        duration_seconds: durationSeconds,
        updated_attempt: updatedAttempt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
