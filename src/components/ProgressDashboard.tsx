import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, BookOpen, Video, FileText, Target, CheckCircle, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTextbookProgress, getActivityStats } from '@/services/textbookProgressService';

interface ActivityStats {
  skillQuizzes: { started: number; completed: number };
  exercises: { started: number; completed: number };
  tests: { started: number; completed: number };
  topicTests: { started: number; completed: number };
  midTests: { started: number; completed: number };
  exams: { started: number; completed: number };
  videos: { watched: number; finished: number };
  articles: { read: number };
}

interface ProgressEntry {
  id: string;
  time: string;
  activity_type: string;
  activity: string;
  work_done: string;
}

const ProgressDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProgressData();
    }
  }, [user?.id]);

  const loadProgressData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load stats
      const statsResult = await getActivityStats(user.id);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }

      // Load recent activity
      const activityResult = await getTextbookProgress(user.id);
      if (activityResult.success && activityResult.data) {
        setRecentActivity(activityResult.data.slice(0, 10)); // Last 10 activities
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'skill_quiz': return <Sparkles className="w-4 h-4" />;
      case 'exercise': return <Target className="w-4 h-4" />;
      case 'topic_test': return <Sparkles className="w-4 h-4" />;
      case 'mid_test': return <Zap className="w-4 h-4" />;
      case 'test': return <CheckCircle className="w-4 h-4" />;
      case 'exam': return <Trophy className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'article': return <FileText className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'skill_quiz': return 'text-emerald-600 bg-emerald-50';
      case 'exercise': return 'text-blue-600 bg-blue-50';
      case 'topic_test': return 'text-amber-600 bg-amber-50';
      case 'mid_test': return 'text-green-600 bg-green-50';
      case 'test': return 'text-green-600 bg-green-50';
      case 'exam': return 'text-purple-600 bg-purple-50';
      case 'video': return 'text-red-600 bg-red-50';
      case 'article': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="h-32">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-yellow-600" />
        <h2 className="text-2xl font-bold text-gray-900">Ваш прогресс</h2>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">Навык дня</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.skillQuizzes.completed}</p>
                  <p className="text-xs text-emerald-500">из {stats.skillQuizzes.started} начатых</p>
                </div>
                <Sparkles className="w-8 h-8 text-emerald-600" />
              </div>
              {stats.skillQuizzes.started > 0 && (
                <Progress 
                  value={(stats.skillQuizzes.completed / Math.max(stats.skillQuizzes.started, 1)) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Упражнения</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.exercises.completed}</p>
                  <p className="text-xs text-blue-500">из {stats.exercises.started} начатых</p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              {stats.exercises.started > 0 && (
                <Progress 
                  value={(stats.exercises.completed / stats.exercises.started) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Тесты темы</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.topicTests.completed}</p>
                  <p className="text-xs text-amber-500">из {stats.topicTests.started} начатых</p>
                </div>
                <Sparkles className="w-8 h-8 text-amber-600" />
              </div>
              {stats.topicTests.started > 0 && (
                <Progress 
                  value={(stats.topicTests.completed / stats.topicTests.started) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Тесты модуля</p>
                  <p className="text-2xl font-bold text-green-700">{stats.midTests.completed}</p>
                  <p className="text-xs text-green-500">из {stats.midTests.started} начатых</p>
                </div>
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              {stats.midTests.started > 0 && (
                <Progress 
                  value={(stats.midTests.completed / stats.midTests.started) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Экзамены</p>
                  <p className="text-2xl font-bold text-purple-700">{stats.exams.completed}</p>
                  <p className="text-xs text-purple-500">из {stats.exams.started} начатых</p>
                </div>
                <Trophy className="w-8 h-8 text-purple-600" />
              </div>
              {stats.exams.started > 0 && (
                <Progress 
                  value={(stats.exams.completed / stats.exams.started) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Видео</p>
                  <p className="text-2xl font-bold text-red-700">{stats.videos.finished}</p>
                  <p className="text-xs text-red-500">из {stats.videos.watched} просмотренных</p>
                </div>
                <Video className="w-8 h-8 text-red-600" />
              </div>
              {stats.videos.watched > 0 && (
                <Progress 
                  value={(stats.videos.finished / stats.videos.watched) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Статьи</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.articles.read}</p>
                  <p className="text-xs text-orange-500">прочитано</p>
                </div>
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Последние активности
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Пока нет активности. Начните изучение материалов!
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.activity}</p>
                      <p className="text-sm text-gray-600">{activity.work_done}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{formatTime(activity.time)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressDashboard;