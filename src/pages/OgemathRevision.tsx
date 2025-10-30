import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Check,
  X,
  ArrowRight,
  Trophy,
  Target,
  RefreshCw,
  Heart,
  BookOpen,
  StopCircle,
  ArrowLeft,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import MathRenderer from '@/components/MathRenderer';
import { toast } from '@/hooks/use-toast';
import { awardEnergyPoints } from '@/services/energyPoints';
import FeedbackButton from '@/components/FeedbackButton';

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
  solution_text?: string;
}

interface RevisionSession {
  questionsAttempted: number;
  correctAnswers: number;
  pointsEarned: number;
  startTime: Date;
  totalQuestions: number;
}

const OgemathRevision: React.FC = () => {
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
    totalQuestions: 5,
  });
  const [showSummary, setShowSummary] = useState(false);
  const [isHomeworkMode, setIsHomeworkMode] = useState(false);
  const [homeworkQuestions, setHomeworkQuestions] = useState<string[]>([]);
  const [isStopped, setIsStopped] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [sessionOver, setSessionOver] = useState(false);
  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  // One-time initialization guard
  const initializedRef = useRef<boolean>(false);

  const options = ['А', 'Б', 'В', 'Г'];

  useEffect(() => {
    // Run once when we have enough info (either homework state provided or user is ready)
    if (initializedRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: any = location.state;
    if (state?.isHomework && state?.homeworkQuestions) {
      initializedRef.current = true;
      setIsHomeworkMode(true);
      setHomeworkQuestions(state.homeworkQuestions);
      setSession((prev) => ({
        ...prev,
        totalQuestions: state.homeworkQuestions.length,
      }));
      loadHomeworkQuestion(state.homeworkQuestions);
      return;
    }
    if (!user) return; // wait for user before revision mode init
    initializedRef.current = true;
    loadSkillsForRevision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.state]);

  // Only pull skills from stories_and_telegram for course_id = '1'.
  // If none found or JSON invalid, tell the user "Навыков для подтягивания пока нет 💤"
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
        // DB error — surface a friendly toast
        // (kept behavior unchanged)
        // eslint-disable-next-line no-console
        console.error('Error fetching story data:', storyError);
        toast({
          title: 'Ошибка загрузки',
          description: 'Не удалось загрузить данные для повторения 😕',
          variant: 'destructive',
        });
        return;
      }

      if (!storyData || storyData.length === 0) {
        // removed toast
        setSkillsForPractice([]);
        return;
      }

      let skillsFromTask: number[] = [];
      try {
        const story = storyData[0] as { hardcode_task: string };
        const taskData = JSON.parse(story.hardcode_task) as
Record<string, unknown>;
        const maybeSkills = (taskData as Record<string,
unknown>)['навыки для подтягивания'];
        skillsFromTask = Array.isArray(maybeSkills) ? (maybeSkills as
number[]) : [];
      } catch (parseError) {
        // eslint-disable-next-line no-console
        console.error('Error parsing hardcode_task JSON:', parseError);
        // removed toast
        setSkillsForPractice([]);
        return;
      }

      if (!skillsFromTask.length) {
        setSkillsForPractice([]);
        setSessionOver(true);
        return;
      }

      // removed toast

      setSkillsForPractice(skillsFromTask);
      // Only load a question if one is not already selected
      if (!currentQuestion && !sessionOver) {
        loadNextQuestion(skillsFromTask);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading skills for revision:', error);
      toast({
        title: 'Ошибка 😔',
        description: 'Не удалось загрузить навыки для повторения.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNextQuestion = async (skills?: number[]) => {
    try {
      const skillsToUse = skills || skillsForPractice;
      if (skillsToUse.length === 0) return;

      // Random skill
      const randomSkill = skillsToUse[Math.floor(Math.random() * skillsToUse.length)];

      const { data, error } = await supabase
        .from('oge_math_skills_questions')
        .select(
          'question_id, problem_text, answer, option1, option2, option3, option4, skills, difficulty, solution_text'
        )
        .eq('skills', randomSkill)
        .not('problem_text', 'is', null)
        .not('option1', 'is', null)
        .not('option2', 'is', null)
        .not('option3', 'is', null)
        .not('option4', 'is', null);

      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading question:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить вопрос. Попробуйте еще раз.',
          variant: 'destructive',
        });
        return;
      }

      if (data && data.length > 0) {
        // Filter out already used questions
        const pool = data.filter(q => !usedQuestionIdsRef.current.has(q.question_id));
        if (pool.length === 0) {
          const remainingSkills = (skillsToUse || []).filter(s => s !== randomSkill);
          if (remainingSkills.length > 0) {
            await loadNextQuestion(remainingSkills);
            return;
          }
          setSessionOver(true);
          return;
        }
        const randomQuestion = pool[Math.floor(Math.random() * pool.length)];
        usedQuestionIdsRef.current.add(randomQuestion.question_id);
        setCurrentQuestion(randomQuestion);
        setSelectedAnswer('');
        setShowResult(false);
      } else {
        const availableSkills = skillsToUse.filter((s) => s !== randomSkill);
        if (availableSkills.length > 0) {
          await loadNextQuestion(availableSkills);
        } else {
          setSessionOver(true);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading question:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при загрузке вопроса',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (optionIndex: number) => {
    if (showResult) return;

    const answerLetter = options[optionIndex];
    setSelectedAnswer(answerLetter);

    const correct = answerLetter === currentQuestion?.answer?.toUpperCase();
    setIsCorrect(correct);
    setShowResult(true);

    const newSession: RevisionSession = {
      ...session,
      questionsAttempted: session.questionsAttempted + 1,
      correctAnswers: session.correctAnswers + (correct ? 1 : 0),
      pointsEarned: session.pointsEarned + (correct ? 15 : 5),
      startTime: session.startTime,
      totalQuestions: session.totalQuestions,
    };
    setSession(newSession);

    if (correct && user) {
      trackActivity('problem', 3);

      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();

      const currentStreak = (streakData as { current_streak?: number }
| null)?.current_streak || 0;

      const result = await awardEnergyPoints(
        user.id,
        'problem',
        undefined,
        'oge_math_skills_questions',
        currentStreak
      );

      if (
        result.success &&
        result.pointsAwarded &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).triggerEnergyPointsAnimation
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).triggerEnergyPointsAnimation(result.pointsAwarded);
      }
    }

    if (isHomeworkMode && newSession.questionsAttempted >=
session.totalQuestions) {
      setTimeout(() => {
        setShowSummary(true);
      }, 2000);
    }
  };

  const handleNextQuestion = () => {
    // Always hide solution when moving to the next question
    if (showSolution) setShowSolution(false);
    if (isHomeworkMode && session.questionsAttempted >= session.totalQuestions) {
      setShowSummary(true);
      return;
    }
    loadNextQuestion();
  };

  // When viewing the solution, count the question as wrong if not already answered
  const handleToggleSolution = () => {
    if (!showResult && !showSolution) {
      setIsCorrect(false);
      setShowResult(true);
      const newSession: RevisionSession = {
        ...session,
        questionsAttempted: session.questionsAttempted + 1,
        correctAnswers: session.correctAnswers,
        pointsEarned: session.pointsEarned + 5,
        startTime: session.startTime,
        totalQuestions: session.totalQuestions,
      };
      setSession(newSession);
      if (isHomeworkMode && newSession.questionsAttempted >= session.totalQuestions) {
        setTimeout(() => setShowSummary(true), 2000);
      }
    }
    setShowSolution(prev => !prev);
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
      totalQuestions: isHomeworkMode ? homeworkQuestions.length : 9999,
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

      const randomQuestionId = questionIds[Math.floor(Math.random() *
questionIds.length)];

      const { data, error } = await supabase
        .from('oge_math_skills_questions')
        .select(
          'question_id, problem_text, answer, option1, option2, option3, option4, skills, difficulty, solution_text'
        )
        .eq('question_id', randomQuestionId)
        .single();

      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading homework question:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить вопрос из домашнего задания',
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        setCurrentQuestion(data);
        setSelectedAnswer('');
        setShowResult(false);
        // removed toast
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading homework question:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при загрузке домашнего задания',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getOptionContent = (optionIndex: number) => {
    const question = currentQuestion;
    if (!question) return '';

    switch (optionIndex) {
      case 0:
        return question.option1;
      case 1:
        return question.option2;
      case 2:
        return question.option3;
      case 3:
        return question.option4;
      default:
        return '';
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
        style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
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

            <Card className="bg-white/10 backdrop-blur border
border-white/20 rounded-2xl shadow-xl">
              <CardContent className="p-6">
                <p className="text-white/80">Войдите в систему для
доступа к повторению</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const accuracy =
      session.questionsAttempted > 0
        ? Math.round((session.correctAnswers /
session.questionsAttempted) * 100)
        : 0;

    return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
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

            <Card className="bg-gradient-to-br from-yellow-500/10
to-emerald-500/10 backdrop-blur border border-yellow-500/20
rounded-2xl shadow-xl mb-6">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="text-7xl font-bold bg-gradient-to-r
from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                    {accuracy}%
                  </div>
                  <div className="text-xl text-[#1a1f36]">Результат повторения</div>
                </div>
              </CardContent>
            </Card>

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
                    <div className="text-3xl font-bold
text-emerald-600">{session.correctAnswers}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br
from-yellow-500/10 to-emerald-500/10 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Баллы</div>
                    <div className="text-3xl font-bold
text-orange-600">{session.pointsEarned}</div>
                  </div>
                </div>

                <div className="text-center p-4 bg-purple-50
rounded-lg border border-purple-200">
                  <Heart className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-purple-700 font-medium">
                    {accuracy >= 80
                      ? 'Превосходно! Ваши навыки значительно улучшились!'
                      : accuracy >= 60
                      ? 'Хорошая работа! Продолжайте практиковаться!'
                      : 'Отличное начало! Повторение поможет закрепить знания!'}
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
      style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
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

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-display font-bold
bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text
text-transparent">
              {isHomeworkMode ? 'Домашнее задание' : 'Повторение навыков'}
            </h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/15 border border-green-400/30">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Решено верно: {session.correctAnswers}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-400/30">
                <X className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium">Решено неверно: {Math.max(session.questionsAttempted - session.correctAnswers, 0)}</span>
              </div>
            </div>
          </div>

          {/* Removed progress bar and question count */}
          {!isHomeworkMode && (
            <div className="mb-6 flex justify-end">
              <Button
                onClick={handleStopSession}
                variant="outline"
                size="sm"
                className="text-[#1a1f36] hover:text-[#1a1f36] border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Стоп
              </Button>
            </div>
          )}

          {sessionOver && (
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl mb-6">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-semibold mb-2">Повторение завершено</div>
                <div className="text-[#1a1f36]/70">На сегодня достаточно. Возвращайтесь завтра — я подготовлю новые задания для вас ✨</div>
              </CardContent>
            </Card>
          )}

          {!sessionOver && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Question, Solution, Actions */}
            <div className="lg:col-span-2">
              <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
                <CardHeader className="border-b border-[#1a1f36]/10">
                  <CardTitle className="text-lg">
                    {isHomeworkMode ? 'Домашнее задание от ИИ помощника' : 'Повторение — супер полезно для вас!'}
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
                    <div key={currentQuestion.question_id} className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-lg
 border border-emerald-200">
                        <MathRenderer
                          text={currentQuestion.problem_text}
                          compiler="mathjax"
                        />
                      </div>
 
                      {/* Helper Buttons Row: Solution and Article */}
                      <div className="flex gap-2">
                        {currentQuestion.solution_text && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleToggleSolution}
                            className="flex-1 border-[#1a1f36]/20 text-[#1a1f36] hover:text-[#1a1f36] hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {showSolution ? 'скрыть' : 'решение'}
                          </Button>
                        )}
                        {currentQuestion.skills && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/textbook?skill=${currentQuestion.skills}`, '_blank')}
                            className="flex-1 border-[#1a1f36]/20 text-[#1a1f36] hover:text-[#1a1f36] hover:bg-gray-100"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            статья
                          </Button>
                        )}
                      </div>
                      <div className="flex justify-end">
                        {currentQuestion && (
                          <FeedbackButton contentType="mcq" contentRef={currentQuestion.question_id} />
                        )}
                      </div>

                      {showSolution && currentQuestion.solution_text && (
                        <div className="mt-2 p-3 bg-white rounded-lg border border-[#1a1f36]/10">
                          <h4 className="font-medium text-sm mb-2">Решение</h4>
                          <MathRenderer text={currentQuestion.solution_text} compiler="mathjax" />
                        </div>
                      )}
 
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleNextQuestion}
                          className="flex-1 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]"
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Дальше
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-white/50 rounded-lg border border-white/40 text-[#1a1f36]/70">
                      Вопрос не найден. Попробуйте загрузить другой.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Vertical Answer Options */}
            <div className="lg:col-span-1">
              <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
                <CardHeader className="border-b border-[#1a1f36]/10">
                  <CardTitle className="text-base text-center">Варианты ответов</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {currentQuestion && (
                    <div key={currentQuestion.question_id} className="space-y-3">
                      {options.map((letter, index) => (
                        <div
                          key={letter}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${getOptionStyle(index)} hover:shadow-sm`}
                          onClick={() => handleAnswerSelect(index)}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="font-bold text-base flex-shrink-0 bg-white rounded-full w-8 h-8 flex items-center justify-center">
                              {letter}
                            </span>
                            <MathRenderer text={getOptionContent(index)} className="flex-1 text-sm" compiler="mathjax" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OgemathRevision;
