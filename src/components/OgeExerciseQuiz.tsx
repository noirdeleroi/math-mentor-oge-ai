import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, X, ArrowLeft, Trophy, Target, RotateCcw, BookOpen, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import MathRenderer from '@/components/MathRenderer';
import { toast } from '@/hooks/use-toast';
import { logTextbookActivity } from '@/utils/logTextbookActivity';
import { useNavigate } from 'react-router-dom';

interface Question {
  question_id: string;
  problem_text: string;
  answer: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  difficulty: number;
  solution_text?: string;
}

interface OgeExerciseQuizProps {
  skills: number[];
  title: string;
  questionCount?: number;
  isModuleTest?: boolean;
  onBack: () => void;
  courseId?: number;
  itemId?: string;
}

const OgeExerciseQuiz: React.FC<OgeExerciseQuizProps> = ({ 
  skills, 
  title, 
  questionCount = 5, 
  isModuleTest = false, 
  onBack,
  courseId = 1,
  itemId
}) => {
  const { user } = useAuth();
  const { trackActivity } = useStreakTracking();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSolution, setShowSolution] = useState(false);

  const options = ['А', 'Б', 'В', 'Г'];

  useEffect(() => {
    loadQuestions();
    logTextbookActivity({
      activity_type: "exercise",
      activity: title,
      solved_count: 0,
      correct_count: 0,
      total_questions: questionCount,
      item_id: itemId || `exercise-${skills.join("-")}`
    });
  }, [skills]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('oge_math_skills_questions')
        .select('question_id, problem_text, answer, option1, option2, option3, option4, difficulty, solution_text')
        .in('skills', skills)
        .not('problem_text', 'is', null)
        .not('option1', 'is', null)
        .not('option2', 'is', null)
        .not('option3', 'is', null)
        .not('option4', 'is', null)
        .limit(questionCount);

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить вопросы',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить вопросы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.answer;
    
    setAnswers([...answers, isCorrect]);
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShowResult(false);
      setShowSolution(false);
    } else {
      const correctAnswers = answers.filter(a => a).length;
      const score = Math.round((correctAnswers / questions.length) * 100);
      
      if (user) {
        trackActivity('practice_test');
        logTextbookActivity({
          activity_type: "exercise",
          activity: title,
          solved_count: questions.length,
          correct_count: correctAnswers,
          total_questions: questions.length,
          skills_involved: skills.join(','),
          item_id: itemId || `exercise-${skills.join("-")}`
        });
      }
      
      setShowFinalResults(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setAnswers([]);
    setShowResult(false);
    setShowFinalResults(false);
    setShowSolution(false);
    loadQuestions();
  };

  const currentQuestion = questions[currentQuestionIndex];
  const correctAnswers = answers.filter(a => a).length;
  const score = Math.round((correctAnswers / questions.length) * 100);

  const getResultMessage = () => {
    if (score >= 80) return { 
      title: 'Превосходно!', 
      message: 'Ты отлично справился с заданием!',
      icon: <Trophy className="w-12 h-12 text-white" />
    };
    if (score >= 60) return { 
      title: 'Хорошо!', 
      message: 'Неплохой результат, продолжай практиковаться!',
      icon: <Target className="w-12 h-12 text-white" />
    };
    return { 
      title: 'Нужно повторить', 
      message: 'Рекомендуем изучить теорию еще раз',
      icon: <BookOpen className="w-12 h-12 text-white" />
    };
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">
            <p className="mb-4">Вопросы не найдены</p>
            <Button onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">
            Вопрос {currentQuestionIndex + 1} из {questions.length}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="prose max-w-none">
            <MathRenderer text={currentQuestion.problem_text} />
          </div>

          <div className="space-y-3">
            {[currentQuestion.option1, currentQuestion.option2, currentQuestion.option3, currentQuestion.option4].map((option, index) => {
              const optionLetter = options[index];
              const isSelected = selectedAnswer === optionLetter;
              const isCorrect = currentQuestion.answer === optionLetter;
              const showCorrectness = showResult && (isSelected || isCorrect);

              return (
                <Button
                  key={index}
                  onClick={() => !showResult && setSelectedAnswer(optionLetter)}
                  disabled={showResult}
                  variant={showCorrectness ? (isCorrect ? 'default' : 'destructive') : isSelected ? 'secondary' : 'outline'}
                  className={`w-full justify-start text-left h-auto py-4 px-6 ${
                    showCorrectness 
                      ? isCorrect 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-red-500 hover:bg-red-600'
                      : ''
                  }`}
                >
                  <span className="font-bold mr-3">{optionLetter})</span>
                  <MathRenderer text={option} />
                  {showCorrectness && (
                    isCorrect ? <Check className="ml-auto w-5 h-5" /> : isSelected && <X className="ml-auto w-5 h-5" />
                  )}
                </Button>
              );
            })}
          </div>

          {currentQuestion.solution_text && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowSolution(!showSolution)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showSolution ? 'Скрыть решение' : 'Показать решение'}
              </Button>
              {showSolution && (
                <Card className="mt-4 bg-muted">
                  <CardContent className="pt-4">
                    <MathRenderer text={currentQuestion.solution_text || ''} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {!showResult ? (
              <Button
                onClick={handleAnswerSubmit}
                disabled={!selectedAnswer}
                className="flex-1"
              >
                Проверить ответ
              </Button>
            ) : (
              <Button onClick={handleNextQuestion} className="flex-1">
                {currentQuestionIndex < questions.length - 1 ? 'Следующий вопрос' : 'Показать результаты'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final Results Dialog - Gen Z Redesign */}
      <AlertDialog open={showFinalResults} onOpenChange={setShowFinalResults}>
        <AlertDialogContent className="sm:max-w-lg border-none rounded-[32px] bg-white shadow-2xl p-0 overflow-hidden">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-sage/10 to-gold/5 animate-pulse" style={{animationDuration: '3s'}} />
          
          {/* Top Accent Bar */}
          <div className="h-2 bg-gradient-to-r from-gold via-sage to-gold" />
          
          <div className="relative p-8">
            <AlertDialogHeader className="text-center space-y-6">
              {/* Icon with Glow Effect */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold to-sage rounded-full blur-xl opacity-40 animate-pulse" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-gold to-sage rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                    {getResultMessage().icon}
                  </div>
                </div>
              </div>
              
              {/* Title */}
              <div className="space-y-2">
                <AlertDialogTitle className="text-3xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-gold via-sage to-gold bg-clip-text text-transparent">
                    {getResultMessage().title}
                  </span>
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base text-navy/60 font-medium">
                  {getResultMessage().message}
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 my-8">
              {/* Correct Answers */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sage/10 to-transparent p-6 hover:scale-105 transition-all duration-300 cursor-default">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-sage/20 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="text-4xl font-black bg-gradient-to-br from-sage to-emerald-600 bg-clip-text text-transparent mb-1">
                    {correctAnswers}
                  </div>
                  <div className="text-xs font-bold text-navy/50 uppercase tracking-wider">из {questions.length}</div>
                </div>
              </div>
              
              {/* Accuracy */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/10 to-transparent p-6 hover:scale-105 transition-all duration-300 cursor-default">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gold/20 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="text-4xl font-black bg-gradient-to-br from-gold to-orange-500 bg-clip-text text-transparent mb-1">
                    {score}%
                  </div>
                  <div className="text-xs font-bold text-navy/50 uppercase tracking-wider">точность</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <AlertDialogFooter className="flex-col gap-3 w-full mt-6">
              {/* Retry Button (if needed) */}
              {correctAnswers < 3 && (
                <AlertDialogAction
                  onClick={handleRetry}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <div className="relative flex items-center justify-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    <span>попробовать еще раз</span>
                  </div>
                </AlertDialogAction>
              )}
              
              {/* AI Assistant Button */}
              <AlertDialogAction 
                onClick={async () => {
                  if (!user) {
                    toast({
                      title: 'Ошибка',
                      description: 'Необходимо войти в систему',
                      variant: 'destructive'
                    });
                    return;
                  }

                  try {
                    const activityType = questionCount === 10 || isModuleTest ? "exam" : questionCount === 6 ? "test" : "exercise";
                    const activityTypeRu = activityType === 'exam' ? 'Экзамен' : activityType === 'test' ? 'Тест' : 'Упражнение';

                    const feedbackMessage = `**${activityTypeRu.toUpperCase()}: ${title}**\n\n` +
                      `✅ Правильных ответов: ${correctAnswers} из ${questions.length}\n` +
                      `📊 Точность: ${score}%\n` +
                      `🎯 Навыки: #${skills.join(', #')}\n\n` +
                      (score >= 75 ? '🎉 Отличная работа! Ты хорошо освоил этот материал.' :
                       score >= 50 ? '👍 Неплохой результат! Продолжай практиковаться.' :
                       '💪 Не останавливайся! Изучи теорию и попробуй еще раз.');

                    const { data: pendingRecord, error: insertError } = await supabase
                      .from('pending_homework_feedback')
                      .insert([{
                        course_id: courseId.toString(),
                        user_id: user.id,
                        feedback_type: 'textbook_exercise',
                        homework_name: title,
                        context_data: {
                          activityType,
                          totalQuestions: questions.length,
                          questionsCorrect: correctAnswers,
                          accuracy: score,
                          skills: skills,
                          itemId: itemId || `exercise-${skills.join("-")}`,
                          completedAt: new Date().toISOString(),
                          timestamp: Date.now()
                        },
                        processed: true,
                        processed_at: new Date().toISOString(),
                        feedback_message: feedbackMessage
                      }])
                      .select('id')
                      .single();

                    if (insertError) {
                      console.error('Failed to create feedback record:', insertError);
                      navigate('/ogemath');
                      return;
                    }

                    navigate(`/ogemath?pending_feedback=${pendingRecord.id}`);
                  } catch (error) {
                    console.error('Error creating exercise feedback:', error);
                    navigate('/ogemath');
                  }
                }}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-navy to-navy/90 hover:from-navy/90 hover:to-navy/80 text-white rounded-2xl px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-xl">💬</span>
                  <span>к ИИ ассистенту</span>
                </div>
              </AlertDialogAction>
              
              {/* Back Button */}
              <AlertDialogAction 
                onClick={onBack}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-gold to-sage hover:from-gold/90 hover:to-sage/90 text-white rounded-2xl px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-2">
                  <span>←</span>
                  <span>назад к модулю</span>
                </div>
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OgeExerciseQuiz;
