import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, X, ArrowLeft, Trophy, Target, RotateCcw, BookOpen, Eye, Sparkles } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import MathRenderer from '@/components/MathRenderer';
import FeedbackButton from '@/components/FeedbackButton';
import { toast } from '@/hooks/use-toast';
import { getQuestionsBySkills, OgeQuestion } from '@/services/ogeQuestionsService';
import { logTextbookActivity } from '@/utils/logTextbookActivity';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type QuizMode = 'skill_quiz' | 'exercise' | 'topic_test' | 'mid_test' | 'exam';

interface OgeExerciseQuizProps {
  title: string;
  skills: number[];
  onBack: () => void;
  questionCount?: number;
  isModuleTest?: boolean;
  mode?: QuizMode;
  moduleTopics?: string[];
  courseId?: string;
  itemId?: string;
}

const OgeExerciseQuiz: React.FC<OgeExerciseQuizProps> = ({ 
  title, 
  skills, 
  onBack, 
  questionCount = 4,
  isModuleTest = false,
  mode,
  moduleTopics = [],
  courseId = "1",
  itemId
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
  
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);

  const options = ['А', 'Б', 'В', 'Г'];

  // Normalize stored answer to a Russian letter 'А' | 'Б' | 'В' | 'Г'
  const getCorrectAnswerLetter = (question?: OgeQuestion | null): string | null => {
    if (!question?.answer) return null;
    const raw = String(question.answer).trim();
    const optMatch = raw.toLowerCase().match(/^option([1-4])$/);
    if (optMatch) {
      const idx = parseInt(optMatch[1], 10) - 1;
      return options[idx] || null;
    }
    const letter = raw.toUpperCase();
    const latinToRus: Record<string, string> = { 'A': 'А', 'B': 'Б', 'V': 'В', 'G': 'Г' };
    if (latinToRus[letter]) return latinToRus[letter];
    if (options.includes(letter)) return letter;
    return null;
  };

  const isAnswerCorrect = (question: OgeQuestion | undefined, selectedLetter: string): boolean => {
    const correctLetter = getCorrectAnswerLetter(question);
    return !!correctLetter && selectedLetter === correctLetter;
  };

  useEffect(() => {
    loadQuestions();
  }, [skills]);

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

  const resolvedMode: QuizMode = mode
    ? mode
    : isModuleTest || questionCount === 10
    ? 'exam'
    : questionCount === 6
    ? 'topic_test'
    : skills.length === 1
    ? 'skill_quiz'
    : 'exercise';

  const mapModeToActivity = (quizMode: QuizMode): "skill_quiz" | "exercise" | "topic_test" | "mid_test" | "exam" => {
    switch (quizMode) {
      case 'skill_quiz':
        return 'skill_quiz';
      case 'topic_test':
        return 'topic_test';
      case 'mid_test':
        return 'mid_test';
      case 'exam':
        return 'exam';
      default:
        return 'exercise';
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || showResult) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = viewedSolutionBeforeAnswer ? false : isAnswerCorrect(currentQuestion, selectedAnswer);
    
    setAnswers(prev => [...prev, isCorrect]);
    setShowResult(true);

    const duration = questionStartTime 
      ? Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000)
      : 0;

    const solvedCount = answers.length + 1;
    const correctCount = [...answers, isCorrect].filter(Boolean).length;
    
    const activityType = mapModeToActivity(resolvedMode);
    
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
        (window as any).triggerEnergyPointsAnimation(1);
      }
    }

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
      setViewedSolutionBeforeAnswer(false);
      setQuestionStartTime(new Date());
    } else {
      setShowFinalResults(true);
      
      const correctCount = answers.filter(Boolean).length;
      
      if (isModuleTest && correctCount >= 8 && moduleTopics.length > 0 && user) {
        setBoostingSkills(true);
        try {
          console.log('Calling boost-low-mastery-skills function for module test...');
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
      
      const totalCount = questions.length;
      const percentage = (correctCount / totalCount) * 100;
      
      if (user && !isModuleTest && percentage >= 83 && questions[0]?.problem_number_type) {
        setBoostingSkills(true);
        try {
          const topicId = questions[0].problem_number_type;
          console.log(`Boosting skills for topic ${topicId} with score ${correctCount}/${totalCount}`);
          
          const { data, error } = await supabase.functions.invoke('boost-low-mastery-skills', {
            body: {
              user_id: user.id,
              topic_id: topicId,
              course_id: courseId
            }
          });
          
          if (error) {
            console.error('Error boosting skills:', error);
          } else {
            console.log('Topic skills boost result:', data);
            if (data?.boosted_skills && data.boosted_skills.length > 0) {
              toast({
                title: "Прогресс обновлен! 🎉",
                description: `Улучшено понимание для ${data.boosted_skills.length} навыков!`,
              });
            }
          }
        } catch (error) {
          console.error('Error calling boost-low-mastery-skills:', error);
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
    setQuestionStartTime(new Date());
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
    if (!showResult && !viewedSolutionBeforeAnswer) {
      setViewedSolutionBeforeAnswer(true);
      
      setAnswers(prev => [...prev, false]);
      setShowResult(true);
      
      const solvedCount = answers.length + 1;
      const correctCount = answers.filter(Boolean).length;
      
      const activityType = mapModeToActivity(resolvedMode);
      
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
    const isCorrectAnswer = answerLetter === getCorrectAnswerLetter(currentQuestion);
    
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
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-br from-navy/5 to-sage/5 rounded-xl border border-navy/10">
                {/* Problem image (optional) */}
                {questions[currentQuestionIndex]?.problem_image && (
                  <div className="w-full mb-3">
                    <img
                      src={questions[currentQuestionIndex].problem_image as unknown as string}
                      alt="Иллюстрация к вопросу"
                      className="mx-auto max-h-56 md:max-h-64 w-full object-contain rounded-lg shadow-sm border border-navy/10 bg-white"
                      loading="lazy"
                    />
                  </div>
                )}
                <MathRenderer 
                  text={questions[currentQuestionIndex]?.problem_text || ''} 
                  className="text-sm text-navy font-medium leading-relaxed"
                  compiler="mathjax"
                />
              </div>

              {showResult && (
                <div className="py-1">
                  {isAnswerCorrect(questions[currentQuestionIndex], selectedAnswer) ? (
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

              <div className="space-y-2">
                <div className="flex justify-end">
                  {questions[currentQuestionIndex]?.question_id && (
                    <FeedbackButton
                      contentType="mcq"
                      contentRef={String(questions[currentQuestionIndex].question_id)}
                    />
                  )}
                </div>
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

                <div className="flex gap-2">
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
                        : showResult && letter === getCorrectAnswerLetter(questions[currentQuestionIndex])
                        ? 'bg-gradient-to-br from-sage to-emerald-600 text-white shadow-md'
                        : showResult && selectedAnswer === letter && letter !== getCorrectAnswerLetter(questions[currentQuestionIndex])
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
              
              <div className="mt-3 pt-3 border-t border-navy/10">
                <button
                  onClick={() => window.open(`/textbook?skill=${questions[currentQuestionIndex].skills}`, '_blank')}
                  className="inline-flex items-center gap-2 text-sm text-sage hover:text-gold transition-colors font-medium group"
                >
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Изучить этот навык подробнее в учебнике</span>
                  <span className="text-gold">→</span>
                </button>
              </div>
            </div>
          )}
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
              
              {/* Back Button */}
              <AlertDialogAction 
                onClick={onBack}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-gold to-sage hover:from-gold/90 hover:to-sage/90 text-white rounded-2xl px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-2">
                  <span>←</span>
                  <span>назад</span>
                </div>
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OgeExerciseQuiz;
