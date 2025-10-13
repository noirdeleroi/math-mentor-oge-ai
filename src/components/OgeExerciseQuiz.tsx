import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, X, ArrowLeft, Trophy, Target, RotateCcw, BookOpen, Eye, Sparkles } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import MathRenderer from '@/components/MathRenderer';
import { toast } from '@/hooks/use-toast';
import { getQuestionsBySkills, OgeQuestion } from '@/services/ogeQuestionsService';
import { logTextbookActivity } from '@/utils/logTextbookActivity';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OgeExerciseQuizProps {
  title: string;
  skills: number[];
  onBack: () => void;
  questionCount?: number;
  isModuleTest?: boolean;
  moduleTopics?: string[];
  courseId?: string;
  itemId?: string; // Add itemId prop for tracking
}

const OgeExerciseQuiz: React.FC<OgeExerciseQuizProps> = ({ 
  title, 
  skills, 
  onBack, 
  questionCount = 4,
  isModuleTest = false,
  moduleTopics = [],
  courseId = "1",
  itemId // Accept itemId prop
}) => {
  const { trackActivity } = useStreakTracking();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<OgeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [viewedSolutionBeforeAnswer, setViewedSolutionBeforeAnswer] = useState(false);
  const [boostingSkills, setBoostingSkills] = useState(false);
  const solutionRef = useRef<HTMLDivElement>(null);
  
  // Track question start time for duration calculation
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);

  const options = ['А', 'Б', 'В', 'Г'];

  useEffect(() => {
    loadQuestions();
  }, [skills]);

  // Start timing when question changes
  useEffect(() => {
    if (questions.length > 0 && !showResult) {
      setQuestionStartTime(new Date());
    }
  }, [currentQuestionIndex, questions, showResult]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const questionsData = await getQuestionsBySkills(skills, questionCount);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить вопросы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (showResult) return;
    
    const answerLetter = options[optionIndex];
    setSelectedAnswer(answerLetter);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || showResult) return;

    const currentQuestion = questions[currentQuestionIndex];
    // If user viewed solution before answering, mark as incorrect
    const isCorrect = viewedSolutionBeforeAnswer ? false : selectedAnswer === currentQuestion.answer?.toUpperCase();
    
    setAnswers(prev => [...prev, isCorrect]);
    setShowResult(true);

    // Calculate duration in seconds
    const duration = questionStartTime 
      ? Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000)
      : 0;

    // Log exercise progress
    const solvedCount = answers.length + 1;
    const correctCount = [...answers, isCorrect].filter(Boolean).length;
    
    // Determine activity type based on question count
    let activityType: "exercise" | "test" | "exam";
    if (questionCount === 10 || isModuleTest) {
      activityType = "exam";
    } else if (questionCount === 6) {
      activityType = "test";
    } else {
      activityType = "exercise";
    }
    
    logTextbookActivity({
      activity_type: activityType,
      activity: title,
      solved_count: solvedCount,
      correct_count: correctCount,
      total_questions: questionCount,
      skills_involved: skills.join(","),
      item_id: itemId || `exercise-${skills.join("-")}`
    });

    if (isCorrect) {
      trackActivity('problem', 2);
      if ((window as any).triggerEnergyPointsAnimation) {
        (window as any).triggerEnergyPointsAnimation(10);
      }
    }

    // Record to database if user is logged in
    if (user && currentQuestion.skills) {
      try {
        const { error } = await supabase.functions.invoke('process-mcq-skill-attempt', {
          body: {
            user_id: user.id,
            question_id: currentQuestion.question_id,
            skill_id: currentQuestion.skills,
            finished_or_not: true,
            is_correct: isCorrect,
            difficulty: currentQuestion.difficulty || 2,
            duration: duration,
            course_id: courseId
          }
        });

        if (error) {
          console.error('Error recording MCQ skill attempt:', error);
        } else {
          console.log('Successfully recorded MCQ skill attempt');
        }
      } catch (error) {
        console.error('Error calling process-mcq-skill-attempt:', error);
      }
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer('');
      setShowResult(false);
      setShowSolution(false);
      setViewedSolutionBeforeAnswer(false); // Reset for next question
      setQuestionStartTime(new Date()); // Start timing for next question
    } else {
      setShowFinalResults(true);
      
      // If this is a module test and user passed (8+ correct answers), boost low mastery skills
      const correctCount = answers.filter(Boolean).length;
      if (isModuleTest && correctCount >= 8 && moduleTopics.length > 0 && user) {
        setBoostingSkills(true);
        try {
          console.log('Calling boost-low-mastery-skills function...');
          const { data, error } = await supabase.functions.invoke('boost-low-mastery-skills', {
            body: {
              user_id: user.id,
              topics: moduleTopics,
              course_id: courseId
            }
          });

          if (error) {
            console.error('Error boosting skills:', error);
          } else {
            console.log('Skills boost result:', data);
            if (data?.boosted_skills && data.boosted_skills.length > 0) {
              toast({
                title: "Прогресс обновлен! 🎉",
                description: `Улучшено понимание для ${data.boosted_skills.length} навыков!`,
              });
            }
          }
        } catch (error) {
          console.error('Error calling boost function:', error);
        } finally {
          setBoostingSkills(false);
        }
      }
    }
  };

  const handleRetry = () => {
    setShowFinalResults(false);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswer('');
    setShowResult(false);
    setShowSolution(false);
    setViewedSolutionBeforeAnswer(false);
    setQuestionStartTime(new Date()); // Start timing for first question
    loadQuestions();
  };

  const getOptionContent = (optionIndex: number) => {
    const question = questions[currentQuestionIndex];
    if (!question) return '';
    
    switch (optionIndex) {
      case 0: return question.option1 || '';
      case 1: return question.option2 || '';
      case 2: return question.option3 || '';
      case 3: return question.option4 || '';
      default: return '';
    }
  };

  const handleShowSolution = () => {
    // If viewing solution before answering, immediately mark as wrong
    if (!showResult && !viewedSolutionBeforeAnswer) {
      setViewedSolutionBeforeAnswer(true);
      
      // Auto-submit as incorrect
      setAnswers(prev => [...prev, false]);
      setShowResult(true);
      
      // Log exercise progress
      const solvedCount = answers.length + 1;
      const correctCount = answers.filter(Boolean).length; // Don't count this one as correct
      
      // Determine activity type based on question count
      let activityType: "exercise" | "test" | "exam";
      if (questionCount === 10 || isModuleTest) {
        activityType = "exam";
      } else if (questionCount === 6) {
        activityType = "test";
      } else {
        activityType = "exercise";
      }
      
      logTextbookActivity({
        activity_type: activityType,
        activity: title,
        solved_count: solvedCount,
        correct_count: correctCount,
        total_questions: questionCount,
        skills_involved: skills.join(","),
        item_id: itemId || `exercise-${skills.join("-")}`
      });
    }
    
    setShowSolution(!showSolution);
    // Scroll to bottom of modal after state update
    if (!showSolution) {
      setTimeout(() => {
        const modal = document.querySelector('.max-h-\\[95vh\\]');
        if (modal) {
          modal.scrollTo({ 
            top: modal.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }, 100);
    }
  };

  const handleReadArticle = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion?.skills) {
      navigate(`/textbook?skill=${currentQuestion.skills}`);
    }
  };

  const getOptionStyle = (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!showResult) {
      return selectedAnswer === options[optionIndex] 
        ? 'border-2 border-gold bg-gradient-to-r from-gold/10 to-sage/10 shadow-lg' 
        : 'border-2 border-navy/10 hover:border-sage/30 hover:bg-sage/5 bg-white shadow-sm';
    }
    
    const answerLetter = options[optionIndex];
    const isSelected = selectedAnswer === answerLetter;
    const isCorrectAnswer = answerLetter === currentQuestion?.answer?.toUpperCase();
    
    if (isCorrectAnswer) {
      return 'border-2 border-sage bg-gradient-to-r from-sage/20 to-emerald-500/20 shadow-lg';
    }
    
    if (isSelected && !isCorrectAnswer) {
      return 'border-2 border-red-500 bg-gradient-to-r from-red-50 to-red-100 shadow-lg';
    }
    
    return 'border-2 border-navy/5 opacity-50 bg-gray-50/50';
  };

  const correctAnswers = answers.filter(Boolean).length;
  const score = answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0;

  const getResultMessage = () => {
    if (correctAnswers < 2) {
      return {
        title: "Попробуйте еще раз!",
        message: "Вы можете лучше! Изучите материал еще раз и попробуйте снова.",
        icon: <RotateCcw className="w-5 h-5 text-white" />,
        color: "text-orange-600"
      };
    } else if (correctAnswers === 2) {
      return {
        title: "Неплохо!",
        message: "Хороший результат! Но есть куда расти.",
        icon: <Target className="w-5 h-5 text-white" />,
        color: "text-blue-600"
      };
    } else if (correctAnswers === 3) {
      return {
        title: "Отлично!",
        message: "Очень хороший результат! Продолжайте в том же духе.",
        icon: <Trophy className="w-5 h-5 text-white" />,
        color: "text-yellow-600"
      };
    } else {
      return {
        title: "Превосходно!",
        message: "Идеальный результат! Вы отлично освоили этот навык.",
        icon: <Trophy className="w-5 h-5 text-white" />,
        color: "text-green-600"
      };
    }
  };

  if (loading) {
    return (
      <Card className="shadow-xl border-2 border-sage/20 bg-gradient-to-br from-white via-sage/5 to-gold/5 mx-auto rounded-2xl backdrop-blur-md">
        <CardContent className="p-8 text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-sage/20 border-t-gold mx-auto mb-3"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-gold animate-pulse" />
          </div>
          <p className="text-base font-semibold bg-gradient-to-r from-gold to-sage bg-clip-text text-transparent">
            загружаем вопросы...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="shadow-xl border-2 border-sage/20 bg-gradient-to-br from-white via-sage/5 to-gold/5 mx-auto rounded-2xl backdrop-blur-md">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-sage/20 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gold" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-gold to-sage bg-clip-text text-transparent mb-2">
            Вопросы не найдены
          </h2>
          <p className="text-navy/60 mb-6 text-sm">
            Для этого упражнения пока нет доступных вопросов
          </p>
          <Button onClick={onBack} className="bg-gradient-to-r from-gold to-sage hover:from-gold/90 hover:to-sage/90 text-white rounded-xl px-6 py-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" />
            назад
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-2xl border-2 border-sage/30 bg-gradient-to-br from-white via-white to-sage/5 overflow-hidden mx-auto rounded-2xl max-w-6xl backdrop-blur-lg">
        <CardHeader className="p-4 border-b border-sage/10 bg-gradient-to-r from-gold/5 via-transparent to-sage/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-gold via-sage to-gold bg-clip-text text-transparent mb-0.5">
                {title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-navy/60 text-xs font-medium">вопрос {currentQuestionIndex + 1} из {questions.length}</p>
                {questions[currentQuestionIndex]?.skills && (
                  <span className="text-xs text-sage/50 font-mono bg-sage/5 px-2 py-0.5 rounded-full">
                    #{questions[currentQuestionIndex].skills}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={onBack} size="sm" variant="ghost" className="text-navy/60 hover:text-navy hover:bg-sage/10 rounded-lg px-2 py-1.5 text-xs transition-all">
              <ArrowLeft className="w-3 h-3 mr-1" />
              назад
            </Button>
          </div>
          <div className="relative">
            <div className="h-1.5 bg-gradient-to-r from-sage/10 to-gold/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold via-sage to-gold rounded-full transition-all duration-500" 
                   style={{width: `${(currentQuestionIndex / questions.length) * 100}%`}} />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
            {/* Left Column - Question and Buttons */}
            <div className="space-y-3">
              {/* Question */}
              <div className="p-4 bg-gradient-to-br from-navy/5 to-sage/5 rounded-xl border border-navy/10">
                <MathRenderer 
                  text={questions[currentQuestionIndex]?.problem_text || ''} 
                  className="text-sm text-navy font-medium leading-relaxed"
                  compiler="mathjax"
                />
              </div>

              {/* Result */}
              {showResult && (
                <div className="py-1">
                  {selectedAnswer === questions[currentQuestionIndex]?.answer?.toUpperCase() ? (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-sage/20 to-emerald-500/20 rounded-xl p-3 border border-sage">
                      <div className="w-6 h-6 bg-gradient-to-br from-sage to-emerald-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                      <p className="text-xs font-bold text-sage">Правильно!</p>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3 border border-red-400">
                      <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                        <X className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                      <p className="text-xs font-bold text-red-700">Неверно</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Submit/Next Button */}
                {!showResult ? (
                  <Button
                    size="sm"
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="w-full bg-gradient-to-r from-gold to-sage hover:from-gold/90 hover:to-sage/90 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    ответить
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    onClick={handleNextQuestion} 
                    className="w-full bg-gradient-to-r from-sage to-emerald-600 hover:from-sage/90 hover:to-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'дальше →' : 'финиш'}
                  </Button>
                )}

                {/* Helper Buttons Row */}
                <div className="flex gap-2">
                  {/* Solution Button */}
                  {questions[currentQuestionIndex]?.solution_text && (
                    <Button
                      size="sm"
                      onClick={handleShowSolution}
                      variant="outline"
                      className="flex-1 text-navy/70 border border-navy/20 hover:bg-sage/10 rounded-lg px-2 py-1.5 text-xs font-medium"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {showSolution ? 'скрыть' : 'решение'}
                    </Button>
                  )}
                  
                  {/* Read Article Button */}
                  {questions[currentQuestionIndex]?.skills && (
                    <Button
                      size="sm"
                      onClick={handleReadArticle}
                      variant="outline"
                      className="flex-1 text-navy/70 border border-navy/20 hover:bg-gold/10 rounded-lg px-2 py-1.5 text-xs font-medium"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      статья
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Answer Options */}
            <div className="space-y-2">
              {options.map((letter, index) => (
                <div
                  key={letter}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.01] ${getOptionStyle(index)}`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all
                      ${!showResult && selectedAnswer === letter 
                        ? 'bg-gradient-to-br from-gold to-sage text-white shadow-md scale-105' 
                        : showResult && letter === questions[currentQuestionIndex]?.answer?.toUpperCase()
                        ? 'bg-gradient-to-br from-sage to-emerald-600 text-white shadow-md'
                        : showResult && selectedAnswer === letter && letter !== questions[currentQuestionIndex]?.answer?.toUpperCase()
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md'
                        : 'bg-gradient-to-br from-navy/10 to-sage/10 text-navy'
                      }
                    `}>
                      {letter}
                    </div>
                    <MathRenderer 
                      text={getOptionContent(index)} 
                      className="flex-1 text-sm text-navy/90"
                      compiler="mathjax"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solution Display - Full Width Below */}
          {showSolution && questions[currentQuestionIndex]?.solution_text && (
            <div 
              ref={solutionRef}
              className="mt-4 p-4 bg-gradient-to-br from-navy/5 to-sage/5 rounded-xl border border-navy/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold/20 to-sage/20 flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-gold" />
                </div>
                <h4 className="font-bold text-navy text-sm">Решение</h4>
              </div>
              {viewedSolutionBeforeAnswer && !showResult && (
                <div className="mb-2 p-2 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-300 rounded-lg">
                  <p className="text-orange-800 text-xs font-medium">⚠️ Просмотр решения до ответа засчитается как неверный ответ</p>
                </div>
              )}
              <div className="space-y-1 bg-white rounded-lg p-3">
                {questions[currentQuestionIndex].solution_text.split('\\n').map((line: string, index: number) => (
                  <div key={index} className="text-left">
                    <MathRenderer 
                      text={line.trim()} 
                      className="text-navy text-xs leading-relaxed"
                      compiler="mathjax"
                    />
                  </div>
                ))}
              </div>
              
              {/* Link to Digital Textbook */}
              <div className="mt-3 pt-3 border-t border-navy/10">
                <Link
                  to={`/textbook?skill=${questions[currentQuestionIndex].skills}`}
                  className="inline-flex items-center gap-2 text-sm text-sage hover:text-gold transition-colors font-medium group"
                >
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Изучить этот навык подробнее в учебнике</span>
                  <span className="text-gold">→</span>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final Results Dialog */}
      <AlertDialog open={showFinalResults} onOpenChange={setShowFinalResults}>
        <AlertDialogContent className="sm:max-w-md border-2 border-sage/30 rounded-3xl bg-gradient-to-br from-white via-sage/5 to-gold/5 backdrop-blur-xl shadow-2xl">
          <AlertDialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-gold to-sage rounded-full flex items-center justify-center shadow-xl animate-bounce-in">
                {getResultMessage().icon}
              </div>
            </div>
            <AlertDialogTitle className={`text-2xl font-bold bg-gradient-to-r from-gold to-sage bg-clip-text text-transparent mb-2`}>
              {getResultMessage().title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-navy/70 font-medium">
              {getResultMessage().message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="text-center space-y-3 my-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gradient-to-br from-sage/10 to-sage/5 rounded-2xl border-2 border-sage/20 shadow-lg">
                <div className="text-3xl font-bold bg-gradient-to-r from-gold to-sage bg-clip-text text-transparent">{correctAnswers}</div>
                <div className="text-xs font-semibold text-navy/60 mt-1">из {questions.length}</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-gold/10 to-gold/5 rounded-2xl border-2 border-gold/20 shadow-lg">
                <div className="text-3xl font-bold bg-gradient-to-r from-gold to-sage bg-clip-text text-transparent">{score}%</div>
                <div className="text-xs font-semibold text-navy/60 mt-1">точность</div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex-col gap-3 pt-4 w-full">
            {correctAnswers < 3 && (
              <AlertDialogAction
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                попробовать еще раз
              </AlertDialogAction>
            )}
            <AlertDialogAction 
              onClick={() => {
                // Store exercise completion data for AI feedback
                const completionData = {
                  activityName: title,
                  activityType: questionCount === 10 || isModuleTest ? "exam" : questionCount === 6 ? "test" : "exercise",
                  totalQuestions: questions.length,
                  questionsCorrect: correctAnswers,
                  accuracy: score,
                  skills: skills,
                  itemId: itemId || `exercise-${skills.join("-")}`,
                  completedAt: new Date().toISOString(),
                  timestamp: Date.now()
                };
                localStorage.setItem('textbookExerciseCompletionData', JSON.stringify(completionData));
                
                navigate('/ogemath');
              }}
              className="w-full bg-gradient-to-r from-navy to-navy/80 hover:from-navy/90 hover:to-navy/70 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
            >
              💬 к ИИ ассистенту
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={onBack}
              className="w-full bg-gradient-to-r from-gold to-sage hover:from-gold/90 hover:to-sage/90 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
            >
              ← назад к модулю
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OgeExerciseQuiz;
