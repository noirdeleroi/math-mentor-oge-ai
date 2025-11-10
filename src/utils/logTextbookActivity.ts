import { supabase } from "@/integrations/supabase/client";

type ActivityType =
  | "skill_quiz"
  | "exercise"
  | "topic_test"
  | "mid_test"
  | "test"
  | "exam"
  | "video"
  | "article";

export async function logTextbookActivity(payload: {
  activity_type: ActivityType;
  activity: string;
  status?: "started" | "finished" | "opened" | "read";
  solved_count?: number;
  correct_count?: number;
  total_questions?: number; // default: 4/6/10 handled server-side
  skills_involved?: string;
  module_id?: string;
  item_id?: string;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { ok: false, error: "no-session" };

    const res = await fetch(
      `https://kbaazksvkvnafrwtmkcw.supabase.co/functions/v1/log-textbook-activity`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("logTextbookActivity error", err);
      return { ok: false, error: err?.error ?? res.statusText };
    }
    return await res.json();
  } catch (e: any) {
    console.warn("logTextbookActivity exception", e);
    return { ok: false, error: String(e) };
  }
}