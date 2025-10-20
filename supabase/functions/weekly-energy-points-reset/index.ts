import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly energy points reset check...');
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate the cutoff time: exactly 7 days (168 hours) before now
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Looking for users with weekly_goal_set_at <= ${sevenDaysAgo.toISOString()}`);

    // Get all users whose weekly cycle has completed (7 days since last goal set)
    const { data: usersToReset, error: fetchError } = await supabaseClient
      .from('user_statistics')
      .select('user_id, energy_points, weekly_goal_set_at, energy_points_history')
      .lte('weekly_goal_set_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching users to reset:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!usersToReset || usersToReset.length === 0) {
      console.log('No users need weekly reset at this time');
      return new Response(
        JSON.stringify({ success: true, message: 'No users need reset', usersReset: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${usersToReset.length} users to reset`);
    let resetCount = 0;

    // Process each user
    for (const user of usersToReset) {
      try {
        // Prepare history entry
        const historyEntry = {
          timestamp: new Date().toISOString(),
          points: user.energy_points || 0,
          week_start: user.weekly_goal_set_at,
          week_end: new Date().toISOString()
        };

        // Get existing history
        const existingHistory = user.energy_points_history || [];
        const updatedHistory = [...existingHistory, historyEntry];

        // Reset energy points and update weekly_goal_set_at
        const { error: updateError } = await supabaseClient
          .from('user_statistics')
          .update({
            energy_points: 0,
            weekly_goal_set_at: new Date().toISOString(),
            energy_points_history: updatedHistory,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        if (updateError) {
          console.error(`Error resetting user ${user.user_id}:`, updateError);
        } else {
          resetCount++;
          console.log(`Reset energy points for user ${user.user_id}: ${user.energy_points} points saved to history`);
        }
      } catch (err) {
        console.error(`Error processing user ${user.user_id}:`, err);
      }
    }

    console.log(`Successfully reset ${resetCount} out of ${usersToReset.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset ${resetCount} users`,
        usersReset: resetCount,
        totalChecked: usersToReset.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
