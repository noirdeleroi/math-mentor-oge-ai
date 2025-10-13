
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { User, ChevronDown } from 'lucide-react';
import { EnergyPointsHeaderAnimation } from './EnergyPointsHeaderAnimation';
import { getCurrentEnergyPoints } from '@/services/energyPoints';
import { getBadgeForPoints, getPointsLabel } from '@/utils/streakBadges';
import { Link, useNavigate } from 'react-router-dom'; // add Link

interface StreakData {
  weeklyGoalPoints: number;
  todayProgress: number;
  currentStreak: number;
  energyPoints: number;
  earnedEnergyPoints: number; // Actual earned points from user_statistics
}

export const StreakDisplay = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getAvatarUrl, getDisplayName } = useProfile();
  const [streakData, setStreakData] = useState<StreakData>({
    weeklyGoalPoints: 60,
    todayProgress: 0,
    currentStreak: 0,
    energyPoints: 0,
    earnedEnergyPoints: 0
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [energyPointsAnimation, setEnergyPointsAnimation] = useState({ isVisible: false, points: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchStreakData();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStreakData = async () => {
    if (!user) return;

    try {
      // Get user streak preferences (weekly goal points)
      const { data: streakInfo } = await supabase
        .from('user_streaks')
        .select('daily_goal_minutes, current_streak')
        .eq('user_id', user.id)
        .single();

      // Get today's activities for display
      const today = new Date().toISOString().split('T')[0];
      const { data: todayActivities } = await supabase
        .from('daily_activities')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .eq('activity_date', today);

      const todayProgress = todayActivities?.reduce((sum, activity) => sum + (activity.duration_minutes || 0), 0) || 0;
      const weeklyGoalPoints = streakInfo?.daily_goal_minutes || 60;
      
      // Get current energy points from user_statistics
      const currentEnergyPoints = await getCurrentEnergyPoints(user.id);
      
      setStreakData({
        weeklyGoalPoints,
        todayProgress,
        currentStreak: streakInfo?.current_streak || 0,
        energyPoints: currentEnergyPoints,
        earnedEnergyPoints: currentEnergyPoints
      });

      // Show celebration if weekly goal is reached (only once per day)
      if (currentEnergyPoints >= weeklyGoalPoints && weeklyGoalPoints > 0) {
        const lastCelebrationDate = localStorage.getItem('goal_celebration_date');
        const today = new Date().toISOString().split('T')[0];
        
        if (lastCelebrationDate !== today) {
          setShowCelebration(true);
          localStorage.setItem('goal_celebration_date', today);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    }
  };

  // Calculate progress: energy points / weekly goal
  const progressPercentage = streakData.weeklyGoalPoints > 0 
    ? Math.min((streakData.energyPoints / streakData.weeklyGoalPoints) * 100, 100)
    : 0;
  const isCompleted = progressPercentage >= 100;
  
  const earnedBadge = getBadgeForPoints(streakData.earnedEnergyPoints);

  // Method to trigger energy points animation and update progress
  const triggerEnergyPointsAnimation = async (points: number) => {
    setEnergyPointsAnimation({ isVisible: true, points });
    
    // Update energy points immediately for real-time progress bar update
    setStreakData(prev => ({
      ...prev,
      energyPoints: prev.energyPoints + points
    }));
  };

  // Expose this method globally for other components to use
  React.useEffect(() => {
    (window as any).triggerEnergyPointsAnimation = triggerEnergyPointsAnimation;
    return () => {
      delete (window as any).triggerEnergyPointsAnimation;
    };
  }, []);

  return (
    <div className="relative flex items-center gap-3 group -ml-3" ref={dropdownRef}>
      {/* Energy Points Animation Container */}
      <div className="relative">
        <EnergyPointsHeaderAnimation
          points={energyPointsAnimation.points}
          isVisible={energyPointsAnimation.isVisible}
          onAnimationComplete={() => setEnergyPointsAnimation({ isVisible: false, points: 0 })}
        />
      </div>

      {/* Clickable Streak Info with Linear Progress Bar */}
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 text-sm text-white hover:opacity-80 transition-opacity duration-200 px-2"
        >
          <div className="flex items-center gap-1">
            <span className="text-base">📅</span>
            <span className="font-medium">{streakData.currentStreak}</span>

          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">🔥</span>
            <span className="font-medium">{Math.round(streakData.energyPoints)}</span>
          </div>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Linear Progress Bar */}
        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium text-foreground">Ваш уровень</span>
              <div className="flex items-center gap-2">
                <span className="text-xl">{earnedBadge.emoji}</span>
                <span className="text-sm font-semibold text-primary">{earnedBadge.name}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Заработано очков</span>
              <span className="text-sm text-muted-foreground">{streakData.earnedEnergyPoints} {getPointsLabel(streakData.earnedEnergyPoints)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Текущая серия</span>
              <span className="text-sm text-muted-foreground">{streakData.currentStreak} дней</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Недельная цель</span>
              <span className="text-sm text-muted-foreground">{streakData.weeklyGoalPoints} {getPointsLabel(streakData.weeklyGoalPoints)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Энергетические очки</span>
              <span className="text-sm text-muted-foreground">{streakData.energyPoints} / {streakData.weeklyGoalPoints}</span>
            </div>
            
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Прогресс</span>
                <span className="text-xs text-muted-foreground">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              {isCompleted && (
                <div className="text-xs text-primary font-medium mt-2">
                  ✓ Недельная цель выполнена!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Celebration Message */}
      {showCelebration && (
        <div className="absolute top-12 left-0 bg-primary text-primary-foreground px-2 py-1 rounded text-xs animate-fade-in z-50">
          🎉 Цель достигнута!
        </div>
      )}
    </div>
  );
};
