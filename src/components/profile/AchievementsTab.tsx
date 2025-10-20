
import { Star, CheckCircle, Zap, Flame, TrendingUp, Calendar, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Achievement {
  id: number;
  name: string;
  description: string;
  date: string;
  completed: boolean;
}

interface AchievementsTabProps {
  achievements: Achievement[];
}

interface EnergyPointsHistory {
  timestamp: string;
  points: number;
  week_start: string;
  week_end: string;
}

interface UserStats {
  energy_points: number;
  energy_points_history: EnergyPointsHistory[];
}

interface UserStreaks {
  current_streak: number;
  longest_streak: number;
}

export const AchievementsTab = ({ achievements }: AchievementsTabProps) => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStreaks, setUserStreaks] = useState<UserStreaks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [statsRes, streaksRes] = await Promise.all([
          supabase
            .from('user_statistics')
            .select('energy_points, energy_points_history')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_streaks')
            .select('current_streak, longest_streak')
            .eq('user_id', user.id)
            .maybeSingle()
        ]);

        if (statsRes.data) {
          setUserStats({
            energy_points: statsRes.data.energy_points || 0,
            energy_points_history: Array.isArray(statsRes.data.energy_points_history) 
              ? statsRes.data.energy_points_history 
              : []
          });
        }

        if (streaksRes.data) {
          setUserStreaks({
            current_streak: streaksRes.data.current_streak || 0,
            longest_streak: streaksRes.data.longest_streak || 0
          });
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('ru-RU', { month: 'short' })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Award className="h-8 w-8 text-yellow-400" />
          Ваши достижения
        </h2>
        <p className="text-gray-300">Отслеживайте свой прогресс и достижения</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Energy Points Card */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur border border-yellow-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <Zap className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Энергия</h3>
              <p className="text-sm text-gray-300">Текущие очки</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-2">
            {userStats?.energy_points || 0}
          </div>
          <div className="text-sm text-gray-300">
            очков накоплено
          </div>
        </div>

        {/* Current Streak Card */}
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur border border-orange-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Flame className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Серия</h3>
              <p className="text-sm text-gray-300">Текущая</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-400 mb-2">
            {userStreaks?.current_streak || 0}
          </div>
          <div className="text-sm text-gray-300">
            дней подряд
          </div>
        </div>

        {/* Longest Streak Card */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Рекорд</h3>
              <p className="text-sm text-gray-300">Лучшая серия</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {userStreaks?.longest_streak || 0}
          </div>
          <div className="text-sm text-gray-300">
            дней подряд
          </div>
        </div>
      </div>

      {/* Energy Points History */}
      {userStats?.energy_points_history && userStats.energy_points_history.length > 0 && (
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Calendar className="h-5 w-5 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">История энергии</h3>
          </div>
          
          <div className="space-y-4">
            {userStats.energy_points_history
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 8)
              .map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-full flex items-center justify-center">
                      <Zap className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {formatWeekRange(entry.week_start, entry.week_end)}
                      </div>
                      <div className="text-sm text-gray-300">
                        {formatDate(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-yellow-400">
                      +{entry.points}
                    </div>
                    <div className="text-sm text-gray-300">очков</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Achievements Grid */}
      <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Star className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Достижения</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`p-4 rounded-xl border transition-all ${
                achievement.completed 
                  ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  achievement.completed 
                    ? 'bg-emerald-500/20' 
                    : 'bg-gray-500/20'
                }`}>
                  {achievement.completed ? (
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <Star className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <h4 className={`font-semibold ${
                  achievement.completed ? 'text-white' : 'text-gray-300'
                }`}>
                  {achievement.name}
                </h4>
              </div>
              <p className="text-sm text-gray-300 mb-2">{achievement.description}</p>
              <div className="text-xs text-gray-400">
                {achievement.completed ? `Получено: ${achievement.date}` : achievement.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
