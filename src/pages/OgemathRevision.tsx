import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, X, ArrowRight, Trophy, Target, RefreshCw, Heart, BookOpen, StopCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import MathRenderer from '@/components/MathRenderer';
import Header from '@/components/Header';
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

  const loadSkillsForRevision = async () => {
    try {
      setLoading(true);
      
      // Get skills from stories_and_telegram table
      const { data: storyData, error: storyError } = await supabase
        .from('stories_and_telegram')
        .select('*')
        .eq('user_id', user?.id)
        .not('hardcode_task', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      let skillsToUse: number[] = [];

      if (storyError) {
        console.error('Error fetching story data:', storyError);
      } else if (storyData && storyData.length > 0) {
        try {
          const story = storyData[0] as any;
          const taskData = JSON.parse(story.hardcode_task);
          const skillsFromTask = taskData["навыки для подтягивания"];
          if (Array.isArray(skillsFromTask) && skillsFromTask.length > 0) {
            skillsToUse = skillsFromTask;
          }
        } catch (parseError) {
          console.error('Error parsing hardcode_task JSON:', parseError);
        }
      }

      // If no skills found, use random skills from 1-200
      if (skillsToUse.length === 0) {
        skillsToUse = Array.from({ length: 20 }, () => Math.floor(Math.random() * 200) + 1);
        toast({
          title: "Навыки для повторения",
          description: "Используем случайные навыки для практики",
        });
      } else {
        toast({
          title: "Навыки для повторения загружены",
          description: `Найдено ${skillsToUse.length} навыков для подтягивания`,
        });
      }

      setSkillsForPractice(skillsToUse);
      loadNextQuestion(skillsToUse);
    } catch (error) {
      console.error('Error loading skills for revision:', error);
      // Fallback to random skills
      const randomSkills = Array.from({ length: 20 }, () => Math.floor(Math.random() * 200) + 1);
      setSkillsForPractice(randomSkills);
      loadNextQuestion(randomSkills);
    }
  };

  const loadNextQuestion = async (skills?: number[]) => {
    try {
      const skillsToUse = skills || skillsForPractice;
      if (skillsToUse.length === 0) return;

      // Select random skill from the array
      const randomSkill = skillsToUse[Math.floor(Math.random() * skillsToUse.length)];

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
    if (isHomeworkMode && newSession.questionsAttempted >= session.totalQuestions) {
      setTimeout(() => {
        setShowSummary(true);
      }, 2000);
    }
  };

  const handleNextQuestion = () => {
    if (isHomeworkMode && session.questionsAttempted >= session.totalQuestions) {
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
      const randomQuestionId = questionIds[Math.floor(Math.random() * questionIds.length)];

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
        ? 'border-primary bg-primary/10' 
        : 'border-border hover:border-primary/50 hover:bg-muted/50';
    }
    
    const answerLetter = options[optionIndex];
    const isSelected = selectedAnswer === answerLetter;
    const isCorrectAnswer = answerLetter === currentQuestion?.answer?.toUpperCase();
    
    if (isCorrectAnswer) {
      return 'border-green-500 bg-green-50 text-green-700';
    }
    
    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-50 text-red-700';
    }
    
    return 'border-border opacity-50';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg text-muted-foreground">Войдите в систему для доступа к повторению</p>
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const accuracy = session.questionsAttempted > 0 
      ? Math.round((session.correctAnswers / session.questionsAttempted) * 100) 
      : 0;
    
    const sessionMinutes = Math.max(1, Math.round((new Date().getTime() - session.startTime.getTime()) / (1000 * 60)));

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-20 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-green-600">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  Отличное повторение!
                </CardTitle>
                <p className="text-sm text-green-700 mt-2">
                  Повторение - мать учения! Вы укрепили свои знания 💪
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{session.questionsAttempted}</div>
                    <div className="text-sm text-green-700">Вопросов решено</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{session.correctAnswers}</div>
                    <div className="text-sm text-emerald-700">Правильных ответов</div>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{accuracy}%</div>
                  <div className="text-sm text-blue-700">Точность</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{session.pointsEarned}</div>
                  <div className="text-sm text-orange-700">Баллов заработано</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Heart className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-purple-700 font-medium">
                    {accuracy >= 80 
                      ? "Превосходно! Ваши навыки значительно улучшились!" 
                      : accuracy >= 60 
                      ? "Хорошая работа! Продолжайте практиковаться!" 
                      : "Отличное начало! Повторение поможет закрепить знания!"}
                  </p>
                </div>

                {session.questionsAttempted >= 10 && (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Совет:</strong> {accuracy >= 70 
                        ? "Вы отлично справляетесь! Такое регулярное повторение закрепляет навыки надолго." 
                        : "Не расстраивайтесь! Ошибки - это часть обучения. Попробуйте еще раз, и результат улучшится!"}
                    </p>
                  </div>
                )}

                {session.questionsAttempted >= 10 && (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Совет:</strong> {accuracy >= 70 
                        ? "Вы отлично справляетесь! Такое регулярное повторение закрепляет навыки надолго." 
                        : "Не расстраивайтесь! Ошибки - это часть обучения. Попробуйте еще раз, и результат улучшится!"}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button onClick={handleRestartSession} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Еще раз
                  </Button>
                  <Button onClick={handleBackToMain} variant="outline" className="flex-1" size="lg">
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
    : Math.min((session.questionsAttempted / 20) * 100, 100); // Show progress up to 20 questions in unlimited mode

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 px-4 pb-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button 
                onClick={handleBackToMain} 
                variant="outline" 
                size="sm"
                className="bg-white hover:bg-green-50"
              >
                ← Назад
              </Button>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-green-800">
                  {isHomeworkMode ? 'Домашнее задание' : 'Повторение навыков'}
                </h1>
                <p className="text-sm text-green-600">
                  {isHomeworkMode 
                    ? `Вопрос ${session.questionsAttempted + 1} из ${session.totalQuestions}`
                    : `Решено вопросов: ${session.questionsAttempted}`
                  }
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{session.correctAnswers}</div>
                  <div className="text-xs text-green-700">Верно</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{session.pointsEarned}</div>
                  <div className="text-xs text-orange-700">Баллов</div>
                </div>
                {!isHomeworkMode && (
                  <Button
                    onClick={handleStopSession}
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    Стоп
                  </Button>
                )}
              </div>
            </div>
            <Progress value={progressPercentage} className="w-full h-3" />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Question section */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg text-center flex items-center justify-center gap-2">
                    {isHomeworkMode ? (
                      <>
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        Домашнее задание от ИИ помощника
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 text-green-600" />
                        Повторение - супер полезно для вас!
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Загружаем навыки для повторения...</p>
                      </div>
                    </div>
                  ) : currentQuestion ? (
                    <div className="space-y-4">
                      {/* Question text */}
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <MathRenderer 
                          text={currentQuestion.problem_text} 
                          className="text-base leading-relaxed"
                          compiler="mathjax"
                        />
                      </div>

                      {/* Current skill info */}
                      <div className="text-center text-sm text-green-600">
                        Навык №{currentQuestion.skills} • Сложность: {currentQuestion.difficulty}/5
                      </div>

                      {/* Result feedback */}
                      {showResult && (
                        <div className="text-center py-3">
                          {isCorrect ? (
                            <div className="flex items-center justify-center space-x-2">
                              <Check className="w-6 h-6 text-green-500" />
                              <p className="text-base font-semibold text-green-600">
                                Отлично! +{15} баллов
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <X className="w-6 h-6 text-red-500" />
                              <p className="text-base font-semibold text-red-600">
                                Неправильно. Правильный ответ: {currentQuestion.answer?.toUpperCase()}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Next button */}
                      {showResult && (
                        <div className="text-center">
                          <Button
                            onClick={handleNextQuestion}
                            className="bg-green-600 hover:bg-green-700"
                            size="lg"
                          >
                            {isHomeworkMode && session.questionsAttempted >= session.totalQuestions ? (
                              <>Завершить</>
                            ) : (
                              <>Следующий вопрос <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">Ошибка загрузки</p>
                        <Button onClick={() => loadNextQuestion()} size="sm">Повторить</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Answer options */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base text-center">Варианты ответов</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentQuestion && (
                    <div className="space-y-3">
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