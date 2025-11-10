import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'skill_quiz' | 'exercise' | 'topic_test' | 'mid_test' | 'test' | 'exam' | 'video' | 'article';

export interface TextbookProgressEntry {
  user_id: string;
  activity_type: ActivityType;
  activity: string;
  work_done: string;
}

export const trackTextbookProgress = async (
  userId: string,
  activityType: ActivityType,
  activity: string,
  workDone: string
) => {
  try {
    const { data, error } = await (supabase as any)
      .from('textbook_progress')
      .insert({
        user_id: userId,
        activity_type: activityType,
        activity: activity,
        work_done: workDone
      });

    if (error) {
      console.error('Error tracking textbook progress:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in trackTextbookProgress:', error);
    return { success: false, error };
  }
};

export const getTextbookProgress = async (userId: string, activityType?: ActivityType) => {
  try {
    let query = (supabase as any)
      .from('textbook_progress')
      .select('*')
      .eq('user_id', userId)
      .order('time', { ascending: false });

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching textbook progress:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getTextbookProgress:', error);
    return { success: false, error };
  }
};

export const getActivityStats = async (userId: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('textbook_progress')
      .select('activity_type, work_done')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching activity stats:', error);
      return { success: false, error };
    }

    // Process stats
    const stats = {
      skillQuizzes: { started: 0, completed: 0 },
      exercises: { started: 0, completed: 0 },
      topicTests: { started: 0, completed: 0 },
      midTests: { started: 0, completed: 0 },
      tests: { started: 0, completed: 0 },
      exams: { started: 0, completed: 0 },
      videos: { watched: 0, finished: 0 },
      articles: { read: 0 }
    };

    data?.forEach(item => {
      switch (item.activity_type) {
        case 'skill_quiz':
          if (item.work_done.includes('started')) stats.skillQuizzes.started++;
          if (item.work_done.includes('solved') && item.work_done.includes('/') &&
              item.work_done.split('/')[0] === item.work_done.split('/')[1]) {
            stats.skillQuizzes.completed++;
          }
          break;
        case 'exercise':
          if (item.work_done.includes('started')) stats.exercises.started++;
          if (item.work_done.includes('solved') && item.work_done.includes('/') && 
              item.work_done.split('/')[0] === item.work_done.split('/')[1]) {
            stats.exercises.completed++;
          }
          break;
        case 'topic_test':
          if (item.work_done.includes('started')) stats.topicTests.started++;
          if (item.work_done.includes('solved') && item.work_done.includes('/') &&
              item.work_done.split('/')[0] === item.work_done.split('/')[1]) {
            stats.topicTests.completed++;
          }
          break;
        case 'mid_test':
          if (item.work_done.includes('started')) stats.midTests.started++;
          if (item.work_done.includes('solved') && item.work_done.includes('/') &&
              item.work_done.split('/')[0] === item.work_done.split('/')[1]) {
            stats.midTests.completed++;
          }
          break;
        case 'test':
          if (item.work_done.includes('started')) stats.tests.started++;
          if (item.work_done.includes('solved') && item.work_done.includes('/') &&
              item.work_done.split('/')[0] === item.work_done.split('/')[1]) {
            stats.tests.completed++;
          }
          break;
        case 'exam':
          if (item.work_done.includes('started')) stats.exams.started++;
          if (item.work_done.includes('solved') && item.work_done.includes('/') &&
              item.work_done.split('/')[0] === item.work_done.split('/')[1]) {
            stats.exams.completed++;
          }
          break;
        case 'video':
          if (item.work_done.includes('watched')) stats.videos.watched++;
          if (item.work_done === 'video finished') stats.videos.finished++;
          break;
        case 'article':
          if (item.work_done === 'article read') stats.articles.read++;
          break;
      }
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error in getActivityStats:', error);
    return { success: false, error };
  }
};