import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressItem {
  activity: string;
  activity_type: string;
  solved_count: string;
  correct_count: string;
  total_questions: string;
  item_id: string | null;
}

export const useModuleProgress = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [topicTestStatusMap, setTopicTestStatusMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('textbook_progress')
        .select('activity, activity_type, solved_count, correct_count, total_questions, item_id')
        .eq('user_id', user.id)
        .in('activity_type', ['exercise', 'skill_quiz', 'topic_test', 'mid_test', 'test', 'exam']);

      if (error) {
        console.error('Error fetching progress:', error);
        return;
      }

      const parsed = (data as unknown as ProgressItem[]) || [];
      setProgressData(parsed);

      const topicMap: Record<string, boolean> = {};
      parsed.forEach((item) => {
        if (!item?.item_id) return;
        if (item.activity_type === 'topic_test' || item.activity_type === 'test') {
          const match = item.item_id.match(/^[^\-]+-([^\-]+)-topic-test$/);
          if (!match) return;
          const topicId = match[1];
          const correct = parseInt(item.correct_count || '0');
          const total = parseInt(item.total_questions || '0');
          if (total >= 1 && correct >= Math.ceil(total * 0.67)) {
            topicMap[topicId] = true;
          }
        }
      });
      setTopicTestStatusMap(topicMap);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [user?.id]);

  const getProgressStatus = (itemId: string, activityType: 'exercise' | 'skill_quiz' | 'topic_test' | 'mid_test' | 'exam' | 'test') => {
    const matchingItems = progressData.filter(p => {
      if (p.item_id !== itemId) return false;
      if (p.activity_type === activityType) return true;
      if (activityType === 'topic_test' && p.activity_type === 'test') return true;
      if (activityType === 'mid_test' && p.activity_type === 'test') return true;
      return false;
    });
    
    console.log('getProgressStatus called with:', { itemId, activityType });
    console.log('Found matching items:', matchingItems);
    
    if (matchingItems.length === 0) return 'not_started';

    // Find the item with the highest correct_count
    const item = matchingItems.reduce((max, current) => {
      const currentCorrect = parseInt(current.correct_count || '0');
      const maxCorrect = parseInt(max.correct_count || '0');
      return currentCorrect > maxCorrect ? current : max;
    });

    const correctCount = parseInt(item.correct_count || '0');
    const total = parseInt(item.total_questions);
    
    console.log('Using item with highest correct_count:', { item, correct: correctCount, total });

    if (activityType === 'exercise') {
      if (correctCount === 4) return 'mastered'; // Освоено
      if (correctCount === 3) return 'proficient'; // Владею
      if (correctCount === 2) return 'familiar'; // Знаком
      if (correctCount >= 1) return 'attempted'; // Попытался

      const topicMatch = itemId.match(/^[^\-]+-([^\-]+)-ex\d+$/);
      if (topicMatch) {
        const topicId = topicMatch[1];
        if (topicTestStatusMap[topicId]) {
          return 'proficient';
        }
      }
    } else if (activityType === 'test' || activityType === 'topic_test' || activityType === 'mid_test') {
      if (correctCount >= 5) return 'completed'; // 5/6 or 6/6
      if (correctCount >= 1) return 'attempted'; // Started but not completed
    } else if (activityType === 'exam') {
      if (correctCount >= 9) return 'completed'; // 9/10 or 10/10
      if (correctCount >= 1) return 'attempted'; // Started but not completed
    }

    return 'not_started';
  };

  return {
    progressData,
    isLoading,
    getProgressStatus,
    topicTestStatusMap,
    refetch: fetchProgress
  };
};