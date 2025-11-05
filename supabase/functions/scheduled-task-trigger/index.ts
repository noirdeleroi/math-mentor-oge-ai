import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Starting scheduled task trigger execution with per-course story/activity filters");
    // Fetch all users with their courses
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("user_id, courses");
    if (profilesError) throw new Error("Failed to fetch user profiles");
    console.log(`Found ${profiles.length} users to process`);
    let seenResets = 0;
    // user-level summary counters
    let eligibleUsers = 0; // users with at least one eligible (user,course) pair
    let processedUsers = 0; // users for whom at least one task was created
    // pair-level summary counters
    let eligiblePairs = 0; // number of (user,course) pairs that passed all checks
    let processedPairs = 0; // number of (user,course) pairs for which a task was created
    // Helper: Sleep
    const sleep = (ms)=>new Promise((r)=>setTimeout(r, ms));
    for (const profile of profiles){
      const userId = profile.user_id;
      console.log(`\n🔍 Checking user ${userId}`);
      // Normalize/Filter courses: remove "4", allow only "1","2","3"
      const rawCourses = Array.isArray(profile.courses) ? profile.courses : [];
      const normalized = rawCourses.map((c)=>String(c));
      const filteredCourses = normalized.filter((c)=>c !== "4").filter((c)=>[
          "1",
          "2",
          "3"
        ].includes(c));
      if (filteredCourses.length === 0) {
        console.log(`User ${userId}: No eligible courses ("1","2","3") after filtering`);
        continue;
      }
      let userHadEligibleCourse = false;
      let userHadProcessedCourse = false;
      for (const courseId of filteredCourses){
        try {
          console.log(`\n  📚 Course ${courseId}: begin checks for user ${userId}`);
          // 1️⃣ Get most recent story for this user & course
          const { data: recentStory, error: storyError } = await supabase.from("stories_and_telegram").select("upload_id, seen, created_at, course_id").eq("user_id", userId).eq("course_id", courseId) // <<-- Filter by course
          .order("created_at", {
            ascending: false
          }).limit(1).maybeSingle();
          if (storyError) {
            console.error(`  Error fetching story for user ${userId}, course ${courseId}`, storyError);
            continue; // next course
          }
          if (!recentStory) {
            console.log(`  User ${userId}, course ${courseId}: No story found`);
            continue; // next course
          }
          // 2️⃣ Most recent student activity with is_correct NOT NULL (for this course)
          const { data: lastActivity, error: activityError } = await supabase.from("student_activity").select("updated_at, course_id").eq("user_id", userId).eq("course_id", courseId) // <<-- Filter by course
          .not("is_correct", "is", null).order("updated_at", {
            ascending: false
          }).limit(1).maybeSingle();
          if (activityError) {
            console.error(`  Error fetching activity (is_correct not null) for user ${userId}, course ${courseId}`, activityError);
            continue; // next course
          }
          const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
          const lastActive = lastActivity ? new Date(lastActivity.updated_at) : null;
          const storyCreated = new Date(recentStory.created_at);
          const noRecentActivity = !lastActive || lastActive < sixHoursAgo;
          const noActivityAfterStory = !lastActive || lastActive <= storyCreated;
          // 🧩 Reset 'seen' if conditions are met (per course)
          if (recentStory.seen === 1 && noRecentActivity && noActivityAfterStory) {
            const { error: resetError } = await supabase.from("stories_and_telegram").update({
              seen: 0
            }).eq("upload_id", recentStory.upload_id).eq("course_id", courseId); // <<-- Ensure the update matches the same course
            if (resetError) {
              console.error(`  ❌ Failed to reset seen for user ${userId}, course ${courseId}`, resetError);
            } else {
              seenResets++;
              console.log(`  ✅ User ${userId}, course ${courseId}: Story seen reset to 0`);
            }
          }
          // 3️⃣ Proceed to task-creation eligibility check (per course)
          if (recentStory.seen !== 1) {
            console.log(`  User ${userId}, course ${courseId}: Story not seen, skipping task`);
            continue; // next course
          }
          // Get most recent activity (any type), still per-course
          const { data: recentActivity } = await supabase.from("student_activity").select("updated_at, course_id").eq("user_id", userId).eq("course_id", courseId) // <<-- Filter by course
          .order("updated_at", {
            ascending: false
          }).limit(1).maybeSingle();
          if (!recentActivity) {
            console.log(`  User ${userId}, course ${courseId}: No activity found`);
            continue; // next course
          }
          const lastActivityTime = new Date(recentActivity.updated_at);
          if (lastActivityTime > sixHoursAgo) {
            console.log(`  User ${userId}, course ${courseId}: Activity within 6 hours`);
            continue; // next course
          }
          // Skip if story was created today
          const today = new Date();
          if (storyCreated.toDateString() === today.toDateString()) {
            console.log(`  User ${userId}, course ${courseId}: Story created today`);
            continue; // next course
          }
          // ✅ All conditions met for this (user, course)
          console.log(`  🚀 User ${userId}, course ${courseId}: All task conditions met`);
          userHadEligibleCourse = true;
          eligiblePairs++;
          const { data: taskResult, error: taskError } = await supabase.functions.invoke("create-task", {
            body: {
              user_id: userId,
              course_id: courseId,
              date_string: "29 may 2026",
              number_of_words: 500
            }
          });
          if (taskError) {
            console.error(`  Error calling create-task for user ${userId}, course ${courseId}:`, taskError);
          } else {
            processedPairs++;
            userHadProcessedCourse = true;
            console.log(`  ✅ Created task for user ${userId}, course ${courseId}`);
          }
          // rate limit between (user,course) task invocations
          await sleep(1000);
        } catch (err) {
          console.error(`  Error processing user ${userId}, course ${courseId}:`, err);
        // continue with next course
        }
      }
      if (userHadEligibleCourse) eligibleUsers++;
      if (userHadProcessedCourse) processedUsers++;
    }
    console.log("\n✅ Scheduled task completed.");
    console.log(`Eligible users: ${eligibleUsers}, Processed users: ${processedUsers}, ` + `Eligible pairs: ${eligiblePairs}, Processed pairs: ${processedPairs}, ` + `Seen resets: ${seenResets}`);
    return new Response(JSON.stringify({
      success: true,
      total_users: profiles.length,
      eligible_users: eligibleUsers,
      processed_users: processedUsers,
      eligible_pairs: eligiblePairs,
      processed_pairs: processedPairs,
      seen_resets: seenResets,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
