import { useState, useEffect } from "react";
import { Target, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface CourseGoal {
  course_id: number;
  name: string;
  course_1_goal?: number;
  course_2_goal?: number;
  course_3_goal?: number;
  schoolmark1?: number;
  schoolmark2?: number;
  schoolmark3?: number;
  selfestimation1?: number;
  selfestimation2?: number;
  selfestimation3?: number;
  testmark1?: number;
  testmark2?: number;
  testmark3?: number;
}

const courses = [
  {
    name: "Математика ОГЭ",
    course_id: 1
  },
  {
    name: "Математика ЕГЭ (Базовый уровень)",
    course_id: 2
  },
  {
    name: "Математика ЕГЭ (Профильный уровень)",
    course_id: 3
  }
];

export const GoalsTab = () => {
  const [userCourses, setUserCourses] = useState<number[]>([]);
  const [goals, setGoals] = useState<CourseGoal[]>([]);
  const [editingCourse, setEditingCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  // Fetch user's courses and goals
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Get user's courses from profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("courses")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          return;
        }

        const userCourseIds = profile?.courses || [];
        setUserCourses(userCourseIds);

        // Get goals data
        const { data: goalsData, error: goalsError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (goalsError) {
          console.error("Error fetching goals:", goalsError);
          return;
        }

        // Create course goals array
        const courseGoals: CourseGoal[] = userCourseIds.map((courseId: number) => {
          const course = courses.find(c => c.course_id === courseId);
          return {
            course_id: courseId,
            name: course?.name || `Курс ${courseId}`,
            course_1_goal: goalsData?.course_1_goal,
            course_2_goal: goalsData?.course_2_goal,
            course_3_goal: goalsData?.course_3_goal,
            schoolmark1: goalsData?.schoolmark1,
            schoolmark2: goalsData?.schoolmark2,
            schoolmark3: goalsData?.schoolmark3,
            selfestimation1: goalsData?.selfestimation1,
            selfestimation2: goalsData?.selfestimation2,
            selfestimation3: goalsData?.selfestimation3,
            testmark1: goalsData?.testmark1,
            testmark2: goalsData?.testmark2,
            testmark3: goalsData?.testmark3,
          };
        });

        setGoals(courseGoals);
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const getGoalValue = (courseId: number, field: string): number => {
    const goal = goals.find(g => g.course_id === courseId);
    return goal?.[field as keyof CourseGoal] as number || 0;
  };

  const updateGoalValue = (courseId: number, field: string, value: number) => {
    setGoals(prev => prev.map(goal => 
      goal.course_id === courseId 
        ? { ...goal, [field]: value }
        : goal
    ));
  };

  const handleSave = async (courseId: number) => {
    if (!user) return;

    setSaving(true);
    try {
      const goal = goals.find(g => g.course_id === courseId);
      if (!goal) return;

      const updateData: any = {};
      
      // Map course-specific fields
      if (courseId === 1) {
        updateData.course_1_goal = goal.course_1_goal;
        updateData.schoolmark1 = goal.schoolmark1;
        updateData.selfestimation1 = goal.selfestimation1;
        updateData.testmark1 = goal.testmark1;
      } else if (courseId === 2) {
        updateData.course_2_goal = goal.course_2_goal;
        updateData.schoolmark2 = goal.schoolmark2;
        updateData.selfestimation2 = goal.selfestimation2;
        updateData.testmark2 = goal.testmark2;
      } else if (courseId === 3) {
        updateData.course_3_goal = goal.course_3_goal;
        updateData.schoolmark3 = goal.schoolmark3;
        updateData.selfestimation3 = goal.selfestimation3;
        updateData.testmark3 = goal.testmark3;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating goals:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить цели",
          variant: "destructive",
        });
        return;
      }

      setEditingCourse(null);
      toast({
        title: "Успешно!",
        description: "Цели сохранены",
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Ошибка",
        description: "Произошла неожиданная ошибка",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getMaxScore = (courseId: number): number => {
    switch (courseId) {
      case 1: return 31; // OGE
      case 2: return 21; // EGE Basic
      case 3: return 100; // EGE Prof
      default: return 100;
    }
  };

  const getGradeTranslation = (courseId: number, score: number): string => {
    if (courseId === 1) { // OGE
      if (score >= 22) return "5";
      if (score >= 15) return "4";
      if (score >= 8) return "3";
      return "2";
    } else if (courseId === 2) { // EGE Basic
      if (score >= 17) return "5";
      if (score >= 12) return "4";
      if (score >= 7) return "3";
      return "2";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/70">Загрузка...</div>
      </div>
    );
  }

  if (userCourses.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-16 w-16 text-white/50 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Нет выбранных курсов</h3>
        <p className="text-white/70">Выберите курсы для настройки целей</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Target className="h-6 w-6 text-yellow-500" />
        Мои цели
      </h2>
      
      <div className="space-y-6">
        {goals.map((goal) => (
          <div 
            key={goal.course_id}
            className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">{goal.name}</h3>
              {editingCourse === goal.course_id ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(goal.course_id)}
                    disabled={saving}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCourse(null)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Отмена
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setEditingCourse(goal.course_id)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Редактировать
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Goal Score */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  Целевой балл (0-{getMaxScore(goal.course_id)})
                </label>
                {editingCourse === goal.course_id ? (
                  <Input
                    type="number"
                    min="0"
                    max={getMaxScore(goal.course_id)}
                    value={getGoalValue(goal.course_id, `course_${goal.course_id}_goal`)}
                    onChange={(e) => updateGoalValue(goal.course_id, `course_${goal.course_id}_goal`, parseInt(e.target.value) || 0)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white text-lg font-semibold">
                    {getGoalValue(goal.course_id, `course_${goal.course_id}_goal`)}
                    {goal.course_id === 1 && getGradeTranslation(goal.course_id, getGoalValue(goal.course_id, `course_${goal.course_id}_goal`)) && (
                      <span className="text-sm text-white/70 ml-2">
                        (оценка: {getGradeTranslation(goal.course_id, getGoalValue(goal.course_id, `course_${goal.course_id}_goal`))})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* School Mark */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  Школьная оценка (1-5)
                </label>
                {editingCourse === goal.course_id ? (
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={getGoalValue(goal.course_id, `schoolmark${goal.course_id}`)}
                    onChange={(e) => updateGoalValue(goal.course_id, `schoolmark${goal.course_id}`, parseInt(e.target.value) || 0)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white text-lg font-semibold">
                    {getGoalValue(goal.course_id, `schoolmark${goal.course_id}`) || "—"}
                  </div>
                )}
              </div>

              {/* Self Estimation */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  Самооценка (1-10)
                </label>
                {editingCourse === goal.course_id ? (
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={getGoalValue(goal.course_id, `selfestimation${goal.course_id}`)}
                    onChange={(e) => updateGoalValue(goal.course_id, `selfestimation${goal.course_id}`, parseInt(e.target.value) || 0)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white text-lg font-semibold">
                    {getGoalValue(goal.course_id, `selfestimation${goal.course_id}`) || "—"}
                  </div>
                )}
              </div>

              {/* Test Mark */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  Результат теста (0-{getMaxScore(goal.course_id)})
                </label>
                {editingCourse === goal.course_id ? (
                  <Input
                    type="number"
                    min="0"
                    max={getMaxScore(goal.course_id)}
                    value={getGoalValue(goal.course_id, `testmark${goal.course_id}`)}
                    onChange={(e) => updateGoalValue(goal.course_id, `testmark${goal.course_id}`, parseInt(e.target.value) || 0)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white text-lg font-semibold">
                    {getGoalValue(goal.course_id, `testmark${goal.course_id}`) || "—"}
                    {goal.course_id === 1 && getGradeTranslation(goal.course_id, getGoalValue(goal.course_id, `testmark${goal.course_id}`)) && (
                      <span className="text-sm text-white/70 ml-2">
                        (оценка: {getGradeTranslation(goal.course_id, getGoalValue(goal.course_id, `testmark${goal.course_id}`))})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};