import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CourseStats {
  courseId: string;
  courseName: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
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
    '3': 'ЕГЭ Математика Профильная',
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);

      try {
        // Fetch current streak
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .maybeSingle();

        setCurrentStreak(streakData?.current_streak || 0);

        // Fetch user's enrolled courses
        const { data: profileData } = await supabase
          .from('profiles')
          .select('courses')
          .eq('user_id', user.id)
          .maybeSingle();

        const userCourses: string[] = (profileData?.courses || []).map(String);

        // Build base query
        let query = supabase
          .from('student_activity')
          .select(
            `
            course_id,
            total_attempts:count(*),
            correct_attempts:count_if(is_correct),
            unique_questions:count(distinct question_id),
            last_activity:max(updated_at)
          `,
            { count: 'exact', head: false }
          )
          .eq('user_id', user.id)
          .in('course_id', userCourses);

        // Apply date filter if needed
        if (days !== null) {
          const dateThreshold = new Date();
          dateThreshold.setDate(dateThreshold.getDate() - days);
          query = query.gte('updated_at', dateThreshold.toISOString());
        }

        // Run query
        const { data: statsData, error } = await query.group('course_id');

        if (error) throw error;

        const stats: CourseStats[] = (statsData || []).map((item: any) => {
          const total = item.total_attempts || 0;
          const correct = item.correct_attempts || 0;
          const accuracy = total > 0 ? (correct / total) * 100 : 0;
          return {
            courseId: item.course_id,
            courseName: courseIdToName[item.course_id] || `Курс ${item.course_id}`,
            totalAttempts: total,
            correctAttempts: correct,
            accuracy,
            uniqueQuestions: item.unique_questions || 0,
            lastActivity: item.last_activity,
          };
        });

        // Sort by last activity
        stats.sort((a, b) => {
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });

        setCourseStats(stats);
      } catch (error) {
        console.error('Error fetching activity stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, days]);

  return { currentStreak, courseStats, loading };
};
