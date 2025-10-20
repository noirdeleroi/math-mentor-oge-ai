import { useState } from "react";
import { Calendar, Target, Trophy, Activity as ActivityIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useActivityStats } from "@/hooks/useActivityStats";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export const ActivityTab = () => {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { currentStreak, courseStats, loading } = useActivityStats(showAllHistory ? null : 30);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Недавняя активность
      </h2>
      
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-medium text-primary">
            <Trophy className="h-5 w-5" />
            <span>Текущая серия:</span>
            <span className="text-lg font-bold">{currentStreak} дней</span>
          </div>
          <div className="text-sm text-gray-600">Продолжайте заниматься каждый день!</div>
        </div>
        <Progress value={currentStreak > 30 ? 100 : currentStreak / 30 * 100} className="h-2" />
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : courseStats.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Нет активности за {showAllHistory ? 'всё время' : 'последние 30 дней'}
        </div>
      ) : (
        <div className="space-y-6">
          {courseStats.map((stats) => (
            <div 
              key={stats.courseId} 
              className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
                    <ActivityIcon className="h-5 w-5 text-yellow-500" />
                    {stats.courseName}
                  </h3>
                  {stats.lastActivity && (
                    <p className="text-sm text-white/70 mt-1">
                      Последняя активность: {format(new Date(stats.lastActivity), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 p-4 rounded-xl">
                  <div className="text-sm text-blue-300 font-medium mb-2">Всего попыток</div>
                  <div className="text-3xl font-bold text-blue-200">{stats.totalAttempts}</div>
                </div>
                
                <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 p-4 rounded-xl">
                  <div className="text-sm text-green-300 font-medium mb-2">Правильных</div>
                  <div className="text-3xl font-bold text-green-200">{stats.correctAttempts}</div>
                </div>
                
                <div className="bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 p-4 rounded-xl">
                  <div className="text-sm text-purple-300 font-medium mb-2">Точность</div>
                  <div className="text-3xl font-bold text-purple-200">{stats.accuracy.toFixed(1)}%</div>
                </div>
                
                <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 p-4 rounded-xl">
                  <div className="text-sm text-orange-300 font-medium mb-2">Уникальных задач</div>
                  <div className="text-3xl font-bold text-orange-200">{stats.uniqueQuestions}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-white/80 mb-2">
                  <span>Прогресс точности</span>
                  <span>{stats.accuracy.toFixed(0)}%</span>
                </div>
                <Progress value={stats.accuracy} className="h-3 bg-white/20" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <Button 
        variant="ghost" 
        className="w-full mt-6 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 transition-all rounded-xl h-12 text-base"
        onClick={() => setShowAllHistory(!showAllHistory)}
      >
        {showAllHistory ? 'Показать последние 30 дней' : 'Показать всю историю активности'}
      </Button>
    </div>
  );
};
