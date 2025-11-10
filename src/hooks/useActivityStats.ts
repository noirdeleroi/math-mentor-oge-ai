import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CourseStats {
  courseId: string;
  courseName: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;          // percentage, 0..100 with 2 decimals
  uniqueQuestions: number;
  lastActivity: string | null;
}

export const useActivityStats = (days: number | null = 30) => {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);

  const courseIdToName: Record<string, string> = {
    '1': 'ОГЭ Математика',
    '2': 'ЕГЭ Математика Базовая',
    '3': 'ЕГЭ Математика Профильная'
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // 1) Current streak (unchanged)
        const { data: streakData, error: streakErr } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!streakErr) {
          setCurrentStreak(streakData?.current_streak ?? 0);
        } else {
          console.error('Streak fetch error:', streakErr);
        }

        // 2) We still read enrolled courses to keep parity with your logic
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('courses')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileErr) {
          console.error('Profiles fetch error:', profileErr);
        }

        const enrolledCourses: string[] = (profileData?.courses ?? []).map((c: any) => String(c));

        if (enrolledCourses.length === 0) {
          setCourseStats([]);
          return;
        }

        // 3) Single aggregate query via RPC
        //    Pass days as provided (null => no date filter inside SQL)
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_activity_stats', {
          p_user: user.id,
          p_days: days
        });

        if (rpcErr) {
          console.error('get_activity_stats RPC error:', rpcErr);
          setCourseStats([]);
          return;
        }

        // rpcData is already filtered to enrolled courses and (if days != null) date range
        // It also already excludes unfinished and NULL is_correct attempts.
        const stats: CourseStats[] = (rpcData ?? []).map((row: any) => ({
          courseId: row.course_id,
          courseName: courseIdToName[row.course_id] ?? `Курс ${row.course_id}`,
          totalAttempts: Number(row.total_attempts ?? 0),
          correctAttempts: Number(row.correct_attempts ?? 0),
          accuracy: Number(row.accuracy ?? 0),
          uniqueQuestions: Number(row.unique_questions ?? 0),
          lastActivity: row.last_activity ?? null
        }));

        // Defensive: if RPC returns nothing for some enrolled course, ensure we keep it out (same as old code)
        // Already sorted by last_activity in SQL, but we can preserve sort here too if needed:
        stats.sort((a, b) => {
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });

        setCourseStats(stats);
      } catch (e) {
        console.error('Error fetching activity stats:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, days]);

  return { currentStreak, courseStats, loading };
};
