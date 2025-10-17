import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, X, ArrowRight, Trophy, Target, RefreshCw, Heart,
BookOpen, StopCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import MathRenderer from '@/components/MathRenderer';
import { toast } from '@/hooks/use-toast';
import { awardEnergyPoints } from '@/services/energyPoints';

interface Question {
  question_id: string;
  problem_text: string;
  answer: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  skills: number;
  difficulty: number;
}

interface RevisionSession {
  questionsAttempted: number;
  correctAnswers: number;
  pointsEarned: number;
  startTime: Date;
  totalQuestions: number;
}

const OgemathRevision = () => {
  const { user } = useAuth();
  const { trackActivity } = useStreakTracking();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skillsForPractice, setSkillsForPractice] = useState<number[]>([]);
  const [session, setSession] = useState<RevisionSession>({
    questionsAttempted: 0,
    correctAnswers: 0,
    pointsEarned: 0,
    startTime: new Date(),
    totalQuestions: 5
  });
  const [showSummary, setShowSummary] = useState(false);
  const [isHomeworkMode, setIsHomeworkMode] = useState(false);
  const [homeworkQuestions, setHomeworkQuestions] = useState<string[]>([]);
  const [isStopped, setIsStopped] = useState(false);

  const options = ['А', 'Б', 'В', 'Г'];

  useEffect(() => {
    // Check if we're in homework mode
    if (location.state?.isHomework && location.state?.homeworkQuestions) {
      setIsHomeworkMode(true);
      setHomeworkQuestions(location.state.homeworkQuestions);

      // Set total questions to match homework questions count
      setSession(prev => ({
        ...prev,
        totalQuestions: location.state.homeworkQuestions.length
      }));

      loadHomeworkQuestion(location.state.homeworkQuestions);
    } else if (user) {
      loadSkillsForRevision();
    }
  }, [user, location.state]);

  // ✅ Only pull skills from stories_and_telegram for course_id = '1'
  // If none found (or JSON invalid), show the "Навыков..." toast and stop.
  const loadSkillsForRevision = async () => {
    try {
      setLoading(true);

      const { data: storyData, error: storyError } = await supabase
        .from('stories_and_telegram')
        .select('hardcode_task')
        .eq('user_id', user?.id)
        .eq('course_id', '1')
        .not('hardcode_task', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (storyError) {
        console.error('Error fetching story data:', storyError);
        toast({
          title: 'Ошибка загрузки',
          description: 'Не удалось загрузить данные для повторения 😕',
          variant: 'destructive'
        });
        return;
      }

      if (!storyData || storyData.length === 0) {
        toast({ title: 'Навыков для подтягивания пока нет 💤' });
        setSkillsForPractice([]);
        return;
      }

      let skillsFromTask: number[] = [];
      try {
        const story = storyData[0] as any;
        const taskData = JSON.parse(story.hardcode_task);
        skillsFromTask = Array.isArray(taskData?.['навыки для подтягивания'])
          ? taskData['навыки для подтягивания']
          : [];
      } catch (parseError) {
        console.error('Error parsing hardcode_task JSON:', parseError);
        toast({ title: 'Навыков для подтягивания пока нет 💤' });
        setSkillsForPractice([]);
        return;
      }

      if (!skillsFromTask.length) {
        toast({ title: 'Навыков для подтягивания пока нет 💤' });
        setSkillsForPractice([]);
        return;
      }

      toast({
        title: 'Навыки для повторения загружены 🎯',
        description: `Найдено ${skillsFromTask.length} навыков.`
      });

      setSkillsForPractice(skillsFromTask);
      loadNextQuestion(skillsFromTask);
    } catch (error) {
      console.error('Error loading skills for revision:', error);
      toast({
        title: 'Ошибка 😔',
        description: 'Не удалось загрузить навыки для повторения.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNextQuestion = async (skills?: number[]) => {
    try {
      const skillsToUse = skills || skillsForPractice;
      if (skillsToUse.length === 0) return;

      // Select random skill from the array
      const randomSkill = skillsToUse[Math.floor(Math.random() *
skillsToUse.length)];

      // Get questions for this skill
      const { data, error } = await supabase
        .from('oge_math_skills_questions')
        .select('question_id, problem_text, answer, option1, option2, option3, option4, skills, difficulty')
        .eq('skills', randomSkill)
        .not('problem_text', 'is', null)
        .not('option1', 'is', null)
        .not('option2', 'is', null)
        .not('option3', 'is', null)
        .not('option4', 'is', null);

      if (error) {
        console.error('Error loading question:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить вопрос. Попробуйте еще раз.",
          variant: "destructive"
        });
        return;
      }

      if (data && data.length > 0) {
        // Select random question from the skill
        const randomQuestion = data[Math.floor(Math.random() * data.length)];
        setCurrentQuestion(randomQuestion);
        setSelectedAnswer('');
        setShowResult(false);
      } else {
        // If no questions found for this skill, try another one
        const availableSkills = skillsToUse.filter(s => s !== randomSkill);
        if (availableSkills.length > 0) {
          loadNextQuestion(availableSkills);
        } else {
          toast({
            title: "Вопросы не найдены",
            description: "Не удалось найти вопросы для практики",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error loading question:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при загрузке вопроса",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (optionIndex: number) => {
    if (showResult) return;

    const answerLetter = options[optionIndex];
    setSelectedAnswer(answerLetter);

    // Check if answer is correct
    const correct = answerLetter === currentQuestion?.answer?.toUpperCase();
    setIsCorrect(correct);
    setShowResult(true);

    // Update session stats
    const newSession = {
      ...session,
      questionsAttempted: session.questionsAttempted + 1,
      correctAnswers: session.correctAnswers + (correct ? 1 : 0),
      pointsEarned: session.pointsEarned + (correct ? 15 : 5) // More points for revision
    };
    setSession(newSession);

    // Track activity for streak and award energy points
    if (correct && user) {
      trackActivity('problem', 3);

      // Fetch current streak for bonus calculation
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();

      const currentStreak = streakData?.current_streak || 0;

      // Award energy points based on table (oge_math_skills_questions = 1 point)
      const result = await awardEnergyPoints(user.id, 'problem', undefined, 'oge_math_skills_questions', currentStreak);

      // Trigger header animation with awarded points
      if (result.success && result.pointsAwarded && (window as any).triggerEnergyPointsAnimation) {
        (window as any).triggerEnergyPointsAnimation(result.pointsAwarded);
      }
    }

    // Only auto-complete in homework mode
    if (isHomeworkMode && newSession.questionsAttempted >=
session.totalQuestions) {
      setTimeout(() => {
        setShowSummary(true);
      }, 2000);
    }
  };

  const handleNextQuestion = () => {
    if (isHomeworkMode && session.questionsAttempted >=
session.totalQuestions) {
      setShowSummary(true);
    } else {
      if (isHomeworkMode) {
        loadHomeworkQuestion(homeworkQuestions);
      } else {
        loadNextQuestion();
      }
    }
  };

  const handleStopSession = () => {
    setIsStopped(true);
    setShowSummary(true);
  };

  const handleRestartSession = () => {
    setSession({
      questionsAttempted: 0,
      correctAnswers: 0,
      pointsEarned: 0,
      startTime: new Date(),
      totalQuestions: isHomeworkMode ? homeworkQuestions.length : 9999
    });
    setShowSummary(false);
    setIsStopped(false);
    if (isHomeworkMode) {
      loadHomeworkQuestion(homeworkQuestions);
    } else {
      loadSkillsForRevision();
    }
  };

  const handleBackToMain = () => {
    if (isHomeworkMode) {
      navigate('/homework');
    } else {
      navigate('/ogemath-practice');
    }
  };

  const loadHomeworkQuestion = async (questionIds: string[]) => {
    if (questionIds.length === 0) return;

    try {
      setLoading(true);

      // Select random question from homework list
      const randomQuestionId = questionIds[Math.floor(Math.random() *
questionIds.length)];

      // Get the specific homework question
      const { data, error } = await supabase
        .from('oge_math_skills_questions')
        .select('question_id, problem_text, answer, option1, option2, option3, option4, skills, difficulty')
        .eq('question_id', randomQuestionId)
        .single();

      if (error) {
        console.error('Error loading homework question:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить вопрос из домашнего задания",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setCurrentQuestion(data);
        setSelectedAnswer('');
        setShowResult(false);
        toast({
          title: "Домашнее задание",
          description: "Загружен вопрос из вашего домашнего задания",
        });
      }
    } catch (error) {
      console.error('Error loading homework question:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при загрузке домашнего задания",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getOptionContent = (optionIndex: number) => {
    const question = currentQuestion;
    if (!question) return '';

    switch (optionIndex) {
      case 0: return question.option1;
      case 1: return question.option2;
      case 2: return question.option3;
      case 3: return question.option4;
      default: return '';
    }
  };

  const getOptionStyle = (optionIndex: number) => {
    if (!showResult) {
      return selectedAnswer === options[optionIndex]
        ? 'border-emerald-500 bg-emerald-50'
        : 'border-[#1a1f36]/30 hover:bg-gray-100';
    }

    const answerLetter = options[optionIndex];
    const isSelected = selectedAnswer === answerLetter;
    const isCorrectAnswer = answerLetter ===
currentQuestion?.answer?.toUpperCase();

    if (isCorrectAnswer) {
      return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    }

    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-50 text-red-700';
    }

    return 'border-[#1a1f36]/20 opacity-70';
  };

  if (!user) {
    return (
      <div
        className="min-h-screen text-white relative"
        style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}
      >
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <Button 
                variant="ghost" 
                size="sm"
                className="hover:bg-white/20 text-white" 
                onClick={() => navigate('/ogemath-practice')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </div>

            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardContent className="p-6">
                <p className="text-white/80">Войдите в систему для доступа к повторению</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const accuracy = session.questionsAttempted > 0
      ? Math.round((session.correctAnswers / session.questionsAttempted) * 100)
      : 0;

    return (
      <div
        className="min-h-screen text-white relative"
        style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}
      >
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <Button 
                variant="ghost" 
                size="sm"
                className="hover:bg-white/20 text-white" 
                onClick={handleBackToMain}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </div>

            {/* Big result percentage */}
            <Card className="bg-gradient-to-br from-yellow-500/10
to-emerald-500/10 backdrop-blur border border-yellow-500/20
rounded-2xl shadow-xl mb-6">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="text-7xl font-bold bg-gradient-to-r
from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                    {accuracy}%
                  </div>
                  <div className="text-xl text-white/80">Результат
повторения</div>
                </div>
              </CardContent>
            </Card>

            {/* Stats & actions */}
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br
from-yellow-500/10 to-emerald-500/10 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Решено
вопросов</div>
                    <div className="text-3xl font-bold
bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text
text-transparent">
                      {session.questionsAttempted}
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br
from-yellow-500/10 to-emerald-500/10 rounded-lg">
                    <div className="text-sm text-gray-600
mb-1">Правильных ответов</div>
                    <div className="text-3xl font-bold text-emerald-600">
                      {session.correctAnswers}
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br
from-yellow-500/10 to-emerald-500/10 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Баллы</div>
                    <div className="text-3xl font-bold text-orange-600">
                      {session.pointsEarned}
                    </div>
                  </div>
                </div>

                <div className="text-center p-4 bg-purple-50
rounded-lg border border-purple-200">
                  <Heart className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-purple-700 font-medium">
                    {accuracy >= 80
                      ? "Превосходно! Ваши навыки значительно улучшились!"
                      : accuracy >= 60
                      ? "Хорошая работа! Продолжайте практиковаться!"
                      : "Отличное начало! Повторение поможет закрепить знания!"}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleRestartSession}
                    className="flex-1 bg-gradient-to-r from-yellow-500
to-emerald-500 hover:from-yellow-600 hover:to-emerald-600
text-[#1a1f36]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Еще раз
                  </Button>
                  <Button
                    onClick={handleBackToMain}
                    variant="outline"
                    className="flex-1 border-[#1a1f36]/30
text-[#1a1f36] hover:bg-gray-100"
                  >
                    Назад к практике
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = isHomeworkMode
    ? (session.questionsAttempted / session.totalQuestions) * 100
    : Math.min((session.questionsAttempted / 20) * 100, 100);

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-white/20 text-white" 
              onClick={handleBackToMain}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-display font-bold
bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text
text-transparent">
              {isHomeworkMode ? 'Домашнее задание' : 'Повторение навыков'}
            </h1>
            <div className="flex items-center gap-3 text-white/80">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm">
                {isHomeworkMode
                  ? `Вопрос ${session.questionsAttempted + 1} из
${session.totalQuestions}`
                  : `Решено: ${session.questionsAttempted}`}
              </span>
            </div>
          </div>

          {/* Progress card */}
          <Card className="bg-white/10 backdrop-blur border
border-white/20 rounded-2xl shadow-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Target className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <Progress value={progressPercentage} className="h-2
bg-black [&>div]:bg-orange-500" />
                </div>
                <span className="text-sm text-white/80 whitespace-nowrap">
                  {isHomeworkMode
                    ? `${session.questionsAttempted}/${session.totalQuestions}`
                    : `${Math.min(session.questionsAttempted, 20)}/20`}
                </span>
                {!isHomeworkMode && (
                  <Button
                    onClick={handleStopSession}
                    variant="outline"
                    size="sm"
                    className="text-red-200 border-red-300/40
hover:bg-red-500/10"
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    Стоп
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Question card */}
            <div className="lg:col-span-2">
              <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
                <CardHeader className="border-b border-[#1a1f36]/10">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>
                      {isHomeworkMode ? 'Домашнее задание от ИИ помощника' : 'Повторение — супер полезно для вас!'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8
w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                        <p className="text-sm
text-[#1a1f36]/70">Загружаем навыки для повторения...</p>
                      </div>
                    </div>
                  ) : currentQuestion ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-lg
border border-emerald-200">
                        <MathRenderer
                          text={currentQuestion.problem_text}
                          className="text-base leading-relaxed"
                          compiler="mathjax"
                        />
                      </div>

                      <div className="text-center text-sm text-[#1a1f36]/70">
                        Навык №{currentQuestion.skills} • Сложность:
{currentQuestion.difficulty}/5
                      </div>

                      {showResult && (
                        <div className="text-center py-3">
                          {isCorrect ? (
                            <div className="flex items-center
justify-center space-x-2">
                              <Check className="w-6 h-6 text-emerald-600" />
                              <p className="text-base font-semibold
text-emerald-700">
                                Отлично! +{15} баллов
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center
justify-center space-x-2">
                              <X className="w-6 h-6 text-red-500" />
                              <p className="text-base font-semibold
text-red-600">
                                Неправильно. Правильный ответ:
{currentQuestion.answer?.toUpperCase()}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {showResult && (
                        <div className="text-center">
                          <Button
                            onClick={handleNextQuestion}
                            className="bg-gradient-to-r
from-yellow-500 to-emerald-500 hover:from-yellow-600
hover:to-emerald-600 text-[#1a1f36]"
                            size="lg"
                          >
                            {isHomeworkMode &&
session.questionsAttempted >= session.totalQuestions ? (
                              <>Завершить</>
                            ) : (
                              <>Следующий вопрос <ArrowRight
className="w-4 h-4 ml-2" /></>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Target className="w-8 h-8 text-[#1a1f36]/40
mx-auto mb-2" />
                        <p className="text-sm text-[#1a1f36]/60
mb-2">Ошибка загрузки</p>
                        <Button onClick={() => loadNextQuestion()}
size="sm" className="bg-gradient-to-r from-yellow-500 to-emerald-500
text-[#1a1f36]">
                          Повторить
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Answer options */}
            <div className="lg:col-span-1">
              <Card className="bg-white/95 text-[#1a1f36] rounded-2xl
shadow-xl">
                <CardHeader className="border-b border-[#1a1f36]/10">
                  <CardTitle className="text-base
text-center">Варианты ответов</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {currentQuestion && (
                    <div className="space-y-3">
                      {options.map((letter, index) => (
                        <div
                          key={letter}
                          className={`p-4 border-2 rounded-lg
cursor-pointer transition-all duration-200 ${getOptionStyle(index)}
hover:shadow-sm`}
                          onClick={() => handleAnswerSelect(index)}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="font-bold text-base
flex-shrink-0 bg-white rounded-full w-8 h-8 flex items-center
justify-center">
                              {letter}
                            </span>
                            <MathRenderer
                              text={getOptionContent(index)}
                              className="flex-1 text-sm"
                              compiler="mathjax"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OgemathRevision;