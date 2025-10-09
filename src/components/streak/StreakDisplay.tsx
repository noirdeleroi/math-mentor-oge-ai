
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { User, ChevronDown } from 'lucide-react';
import { EnergyPointsHeaderAnimation } from './EnergyPointsHeaderAnimation';
import { getCurrentEnergyPoints } from '@/services/energyPoints';
import { getBadgeForPoints, getPointsLabel } from '@/utils/streakBadges';

interface StreakData {
  dailyGoalMinutes: number;
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
    dailyGoalMinutes: 30,
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
      // Get user streak preferences
      const { data: streakInfo } = await supabase
        .from('user_streaks')
        .select('daily_goal_minutes, current_streak')
        .eq('user_id', user.id)
        .single();

      // Get today's activities
      const today = new Date().toISOString().split('T')[0];
      const { data: todayActivities } = await supabase
        .from('daily_activities')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .eq('activity_date', today);

      const todayProgress = todayActivities?.reduce((sum, activity) => sum + (activity.duration_minutes || 0), 0) || 0;
      const goalMinutes = streakInfo?.daily_goal_minutes || 30;
      
      // Get current energy points
      const currentEnergyPoints = await getCurrentEnergyPoints(user.id);
      
      // Get earned energy points from user_statistics
      const { data: userStats } = await supabase
        .from('user_statistics')
        .select('energy_points')
        .eq('user_id', user.id)
        .single();
      
      setStreakData({
        dailyGoalMinutes: goalMinutes,
        todayProgress,
        currentStreak: streakInfo?.current_streak || 0,
        energyPoints: currentEnergyPoints,
        earnedEnergyPoints: userStats?.energy_points || 0
      });

      // Show celebration if goal is reached
      if (todayProgress >= goalMinutes && todayProgress > 0) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    }
  };

  // Calculate progress based on both time and energy points (weighted)
  const timeProgress = (streakData.todayProgress / streakData.dailyGoalMinutes) * 100;
  const energyProgress = Math.min((streakData.energyPoints / 500) * 100, 100); // 500 points = 100%
  const progressPercentage = Math.min((timeProgress * 0.6 + energyProgress * 0.4), 100);
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
      {/* Progress Ring - Made Bigger */}
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
          {/* Background circle */}
          <circle
            cx="28"
            cy="28"
            r="22"
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.2)"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="28"
            cy="28"
            r="22"
            fill="none"
            stroke={isCompleted ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.7)"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - progressPercentage / 100)}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* User Profile Picture - Clickable */}
        <button 
          onClick={() => navigate("/profile")}
          className="absolute inset-0 flex items-center justify-center hover:scale-105 transition-transform duration-200"
        >
          {getAvatarUrl() ? (
            <img 
              src={getAvatarUrl()!} 
              alt={getDisplayName()}
              className="w-8 h-8 object-cover rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </button>

        {/* Energy Points Animation */}
        <EnergyPointsHeaderAnimation
          points={energyPointsAnimation.points}
          isVisible={energyPointsAnimation.isVisible}
          onAnimationComplete={() => setEnergyPointsAnimation({ isVisible: false, points: 0 })}
        />
      </div>

      {/* Clickable Streak Info */}
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 text-sm bg-gradient-to-r from-yellow-200 to-yellow-300 hover:from-yellow-300 hover:to-yellow-400 text-black shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 rounded-md px-3 py-2"
      >
        <div className="flex items-center gap-1">
          <span className="font-medium">{streakData.currentStreak}</span>
          <span className="text-base">🔥</span>
        </div>
        <div className="font-medium">
          {Math.round(streakData.todayProgress)}м
        </div>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

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
              <span className="text-sm text-muted-foreground">{streakData.dailyGoalMinutes} {getPointsLabel(streakData.dailyGoalMinutes)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Занятия на неделе</span>
              <span className="text-sm text-muted-foreground">{Math.round(streakData.todayProgress)} {getPointsLabel(Math.round(streakData.todayProgress))}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Энергетические очки</span>
              <span className="text-sm text-muted-foreground">{streakData.energyPoints}</span>
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
                  ✓ Цель на сегодня выполнена!
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
