import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Legacy types - tables don't exist
type UserMastery = any;
type UserActivity = any;

export type { UserMastery, UserActivity };

// Points system like Khan Academy
const POINTS_SYSTEM = {
  video: 10,        // Watching a video
  article: 15,      // Reading an article
  practice: 20,     // Completing a practice exercise
  quiz: 50,         // Completing a quiz
  unit_test: 100    // Completing a unit test
};

const MASTERY_THRESHOLDS = {
  not_started: 0,
  attempted: 20,
  familiar: 40,
  proficient: 70,
  mastered: 90
};

export const useMasterySystem = () => {
  const { user } = useAuth();
  const [userMastery] = useState<UserMastery[]>([]);
  const [userActivities] = useState<UserActivity[]>([]);
  const [loading] = useState(false);

  // Legacy hook - tables don't exist, functions disabled
  const fetchUserMastery = async () => {
    if (!user) return;
    console.warn('user_mastery table does not exist');
  };

  const fetchUserActivities = async () => {
    if (!user) return;
    console.warn('user_activities table does not exist');
  };

  const logActivity = async (_activityType: string, _skillId: string, _points: number) => {
    if (!user) return;
    console.warn('user_activities table does not exist');
  };

  const updateMastery = async (_skillId: string, _points: number, _totalPossible: number) => {
    if (!user) return;
    console.warn('user_mastery table does not exist');
  };

  const awardPoints = async (
    _activityType: UserActivity['activity_type'],
    _unitNumber: number,
    _subunitNumber: number | null,
    _activityId: string,
    _timeSpentMinutes: number = 0
  ) => {
    console.warn('user_mastery table does not exist');
    return 0;
  };

  const getUserMastery = (_unitNumber: number, _subunitNumber?: number): UserMastery | null => {
    return null;
  };

  const calculateUnitProgress = (_unitNumber: number, _subunitId?: string): number => {
    return 0;
  };

  const getMasteryLevel = (_progressPercentage: number): string => {
    return 'not_started';
  };

  const getTotalPoints = (): number => {
    return 0;
  };

  const getRecentActivities = (_limit: number = 10): UserActivity[] => {
    return [];
  };

  return {
    userMastery,
    userActivities,
    loading,
    awardPoints,
    getUserMastery,
    calculateUnitProgress,
    getMasteryLevel,
    getTotalPoints,
    getRecentActivities,
    POINTS_SYSTEM
  };
};
