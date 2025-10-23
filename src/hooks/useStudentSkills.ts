
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import topicMappingData from '../../documentation/topic_skill_mapping_with_names.json';

interface TopicProgress {
  topic: string;
  name: string;
  averageScore: number;
}

interface SkillData {
  topicProgress: TopicProgress[];
  generalPreparedness: number;
  isLoading: boolean;
  error: string | null;
}

export const useStudentSkills = (): SkillData => {
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [generalPreparedness, setGeneralPreparedness] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSkillData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Legacy - student_skills table doesn't exist
        console.warn('student_skills table does not exist');
        setTopicProgress([]);
        setGeneralPreparedness(0);
        setIsLoading(false);
        return;
      } catch (err) {
        console.error('Error fetching skill data:', err);
        setError('Ошибка загрузки данных о навыках');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSkillData();
  }, [user]);

  return {
    topicProgress,
    generalPreparedness,
    isLoading,
    error
  };
};
