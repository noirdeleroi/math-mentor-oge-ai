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
import FeedbackButton from '@/components/FeedbackButton';
import { toast } from '@/hooks/use-toast';
import { logTextbookActivity } from '@/utils/logTextbookActivity';

interface Skill {
  id: number;
  title: string;
}

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

interface SkillPracticeQuizProps {
  skill: Skill;
  onBackToArticle: () => void;
}

const SkillPracticeQuiz: React.FC<SkillPracticeQuizProps> = ({ skill, onBackToArticle }) => {
  const { user } = useAuth();
  const { trackActivity } = useStreakTracking();
  
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
    // Track exercise started
    logTextbookActivity({
      activity_type: "exercise",
      activity: `${skill.title} Practice`,
      solved_count: 0,
      correct_count: 0,
      total_questions: 5,
      item_id: `skill-practice-${skill.id}`
    });
  }, [skill.id]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      // Get questions related to this skill
    const { data, error } = await supabase
      .from('oge_math_skills_questions')
        .select('question_id, problem_text, answer, option1, option2, option3, option4, difficulty')
        .eq('skills', skill.id)
        .not('problem_text', 'is', null)
        .not('option1', 'is', null)
        .not('option2', 'is', null)
        .not('option3', 'is', null)
        .not('option4', 'is', null)
        .limit(5);

      if (error) {
        console.error('Error loading questions:', error);
        throw error;
      } else {
        setQuestions(data || []);
      }
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

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || showResult) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.answer?.toUpperCase();
    
    setAnswers(prev => [...prev, isCorrect]);
    setShowResult(true);

    if (isCorrect) {
      trackActivity('problem', 2);
      if ((window as any).triggerEnergyPointsAnimation) {
        (window as any).triggerEnergyPointsAnimation(10);
      }
    }
    
    // Track progress after each answer
    const currentProgress = answers.length + 1;
    const correctAnswers = [...answers, isCorrect].filter(Boolean).length;
    logTextbookActivity({
      activity_type: "exercise",
      activity: `${skill.title} Practice`,
      solved_count: currentProgress,
      correct_count: correctAnswers,
      total_questions: 5,
      item_id: `skill-practice-${skill.id}`
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer('');
      setShowResult(false);
      setShowSolution(false); // Reset solution visibility
    } else {
      setShowFinalResults(true);
    }
  };

  const getOptionContent = (optionIndex: number) => {
    const question = questions[currentQuestionIndex];
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
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!showResult) {
      return selectedAnswer === options[optionIndex] 
        ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-lg transform scale-105' 
        : 'border-gray-200 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md';
    }
    
    const answerLetter = options[optionIndex];
    const isSelected = selectedAnswer === answerLetter;
    const isCorrectAnswer = answerLetter === currentQuestion?.answer?.toUpperCase();
    
    if (isCorrectAnswer) {
      return 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 shadow-lg';
    }
    
    if (isSelected && !isCorrectAnswer) {
      return 'border-red-500 bg-gradient-to-r from-red-50 to-pink-50 text-red-700 shadow-lg';
    }
    
    return 'border-gray-200 opacity-60 bg-gray-50';
  };

  const correctAnswers = answers.filter(Boolean).length;
  const score = answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0;

  const getResultMessage = () => {
    if (correctAnswers < 3) {
      return {
        title: "Попробуйте еще раз!",
        message: "Вы можете лучше! Изучите материал еще раз и попробуйте снова.",
        icon: <RotateCcw className="w-8 h-8 text-orange-500" />,
        color: "text-orange-600"
      };
    } else if (correctAnswers === 3) {
      return {
        title: "Неплохо!",
        message: "Хороший результат! Но есть куда расти.",
        icon: <Target className="w-8 h-8 text-blue-500" />,
        color: "text-blue-600"
      };
    } else if (correctAnswers === 4) {
      return {
        title: "Отлично!",
        message: "Очень хороший результат! Продолжайте в том же духе.",
        icon: <Trophy className="w-8 h-8 text-yellow-500" />,
        color: "text-yellow-600"
      };
    } else {
      return {
        title: "Превосходно!",
        message: "Идеальный результат! Вы отлично освоили этот навык.",
        icon: <Trophy className="w-8 h-8 text-green-500" />,
        color: "text-green-600"
      };
    }
  };

  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Загружаем вопросы...</p>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Вопросы не найдены
          </h2>
          <p className="text-gray-600 mb-6">
            К сожалению, для этого навыка пока нет доступных вопросов.
          </p>
          <Button onClick={onBackToArticle} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться к статье
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-1">
          <div className="bg-white rounded-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ⚡ {skill.title}
                  </CardTitle>
                  <p className="text-gray-600 font-medium">Вопрос {currentQuestionIndex + 1} из {questions.length}</p>
                </div>
                <Button onClick={onBackToArticle} variant="outline" size="sm" className="hover:bg-blue-50">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  К статье
                </Button>
              </div>
              <Progress value={(currentQuestionIndex / questions.length) * 100} className="w-full h-3 bg-gray-200">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" 
                     style={{width: `${(currentQuestionIndex / questions.length) * 100}%`}} />
              </Progress>
            </CardHeader>
            
            <CardContent className="space-y-6 p-6">
              {/* Question */}
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-blue-200 shadow-sm">
                <MathRenderer 
                  text={questions[currentQuestionIndex]?.problem_text || ''} 
                  className="text-lg font-medium"
                  compiler="mathjax"
                />
              </div>

              {/* Answer Options */}
              <div className="grid grid-cols-1 gap-4">
                {options.map((letter, index) => (
                  <div
                    key={letter}
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 ${getOptionStyle(index)}`}
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                        ${!showResult && selectedAnswer === letter 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                          : showResult && letter === questions[currentQuestionIndex]?.answer?.toUpperCase()
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                          : showResult && selectedAnswer === letter && letter !== questions[currentQuestionIndex]?.answer?.toUpperCase()
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}>
                        {letter}
                      </div>
                      <MathRenderer 
                        text={getOptionContent(index)} 
                        className="flex-1 text-base font-medium"
                        compiler="mathjax"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Result */}
              {showResult && (
                <div className="text-center py-6">
                  {selectedAnswer === questions[currentQuestionIndex]?.answer?.toUpperCase() ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">Правильно!</p>
                          <p className="text-green-500">Отличная работа! 🎉</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center">
                          <X className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">Неправильно</p>
                          <p className="text-red-500">Не расстраивайтесь, попробуйте еще раз! 💪</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Solution Button */}
                  {questions[currentQuestionIndex]?.solution_text && (
                    <div className="mt-4">
                      <Button
                        onClick={() => setShowSolution(!showSolution)}
                        variant="outline"
                        className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {showSolution ? 'Скрыть решение' : 'Показать решение'}
                      </Button>
                    </div>
                  )}
                  
                  {/* Solution Display */}
                  {showSolution && questions[currentQuestionIndex]?.solution_text && (
                    <div className="mt-4 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        <h4 className="font-bold text-purple-700">Решение:</h4>
                      </div>
                      <MathRenderer 
                        text={questions[currentQuestionIndex].solution_text} 
                        className="text-left text-gray-700"
                        compiler="mathjax"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Feedback + Action Buttons */}
              <div className="flex items-center justify-between gap-4">
                <FeedbackButton contentType="mcq" contentRef={questions[currentQuestionIndex]?.question_id} />
                <div className="flex justify-center space-x-4">
                {!showResult ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    ✨ Ответить
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextQuestion} 
                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    {currentQuestionIndex < questions.length - 1 ? '➡️ Следующий вопрос' : '🏁 Завершить тест'}
                  </Button>
                )}
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      {/* Final Results Dialog */}
      <AlertDialog open={showFinalResults} onOpenChange={setShowFinalResults}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getResultMessage().icon}
            </div>
            <AlertDialogTitle className={`text-2xl ${getResultMessage().color}`}>
              {getResultMessage().title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {getResultMessage().message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="text-center space-y-3 my-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-100">
                <div className="text-3xl font-bold text-blue-600">{correctAnswers}</div>
                <div className="text-xs text-blue-700">из {questions.length}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-100">
                <div className="text-3xl font-bold text-purple-600">{score}%</div>
                <div className="text-xs text-purple-700">точность</div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex-col gap-3 w-full">
            {correctAnswers < 3 && (
              <AlertDialogAction
                onClick={() => {
                  setShowFinalResults(false);
                  setCurrentQuestionIndex(0);
                  setAnswers([]);
                  setSelectedAnswer('');
                  setShowResult(false);
                }}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                попробовать еще раз
              </AlertDialogAction>
            )}
            <AlertDialogAction onClick={onBackToArticle} className="w-full">
              назад к модулю
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SkillPracticeQuiz;