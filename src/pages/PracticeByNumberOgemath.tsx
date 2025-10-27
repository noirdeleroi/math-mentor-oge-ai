import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, BookOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { useStreakTracking } from "@/hooks/useStreakTracking";
import { awardStreakPoints, calculateStreakReward } from "@/services/streakPointsService";
import { awardEnergyPoints } from "@/services/energyPoints";
import { toast } from "sonner";
import TestStatisticsWindow from "@/components/TestStatisticsWindow";
import FormulaBookletDialog from "@/components/FormulaBookletDialog";

interface Question {
  question_id: string;
  problem_text: string;
  answer: string;
  solution_text: string;
  difficulty?: string | number;
  problem_number_type?: number;
  problem_image?: string;
  status?: 'correct' | 'wrong' | 'unseen' | 'unfinished';
}

const PracticeByNumberOgemath = () => {
  const { user } = useAuth();
  const { trackActivity } = useStreakTracking();
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionViewedBeforeAnswer, setSolutionViewedBeforeAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
  const [attemptStartTime, setAttemptStartTime] = useState<Date | null>(null);
  
  // Test session tracking
  const [showStatistics, setShowStatistics] = useState(false);
  const [sessionResults, setSessionResults] = useState<Array<{
    questionIndex: number;
    questionId: string;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
    problemText: string;
    solutionText: string;
    isAnswered: boolean;
  }>>([]);
  
  // Review mode states
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number | null>(null);
  
  // Auth required message state
  const [showAuthRequiredMessage, setShowAuthRequiredMessage] = useState(false);
  
  // Formula booklet state
  const [showFormulaBooklet, setShowFormulaBooklet] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const fetchQuestions = async (questionNumbers: string[]) => {
    setLoading(true);
    try {
      let allQuestions: Question[] = [];
      
      for (const questionNumber of questionNumbers) {
        const { data, error } = await supabase
          .from('oge_math_fipi_bank')
          .select('question_id, problem_text, answer, solution_text, problem_number_type, problem_image')
          .eq('problem_number_type', parseInt(questionNumber))
          .order('question_id');

        if (error) throw error;
        
        if (data) {
          allQuestions = [...allQuestions, ...data];
        }
      }

      // Build status map from student_activity
      let questionStatusMap: { [key: string]: { status: 'correct' | 'wrong' | 'unseen' | 'unfinished', priority: number } } = {};

      if (user && allQuestions.length > 0) {
        const questionIds = allQuestions.map(q => q.question_id);
        const { data: activityData } = await supabase
          .from('student_activity')
          .select('question_id, is_correct, finished_or_not, updated_at')
          .eq('user_id', user.id)
          .in('question_id', questionIds)
          .order('updated_at', { ascending: false });

        const userActivity = activityData || [];
        allQuestions.forEach(question => {
          const questionActivity = userActivity.filter(a => a.question_id === question.question_id);
          if (questionActivity.length === 0) {
            questionStatusMap[question.question_id] = { status: 'unseen', priority: 3 };
          } else {
            const mostRecent = questionActivity[0];
            if (!mostRecent.finished_or_not) {
              questionStatusMap[question.question_id] = { status: 'unfinished', priority: 2 };
            } else if (mostRecent.is_correct === false) {
              questionStatusMap[question.question_id] = { status: 'wrong', priority: 1 };
            } else if (mostRecent.is_correct === true) {
              questionStatusMap[question.question_id] = { status: 'correct', priority: 4 };
            } else {
              questionStatusMap[question.question_id] = { status: 'unfinished', priority: 2 };
            }
          }
        });
      } else {
        allQuestions.forEach(question => {
          questionStatusMap[question.question_id] = { status: 'unseen', priority: 3 };
        });
      }

      const questionsWithStatus = allQuestions.map(question => ({
        ...question,
        status: questionStatusMap[question.question_id]?.status || 'unseen',
        priority: questionStatusMap[question.question_id]?.priority || 3
      }));

      // Group by priority and shuffle within each group
      const priorityGroups = {
        1: questionsWithStatus.filter(q => q.priority === 1), // wrong
        2: questionsWithStatus.filter(q => q.priority === 2), // unfinished
        3: questionsWithStatus.filter(q => q.priority === 3), // unseen
        4: questionsWithStatus.filter(q => q.priority === 4)  // correct
      };

      // Shuffle each group
      Object.values(priorityGroups).forEach(group => {
        for (let i = group.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [group[i], group[j]] = [group[j], group[i]];
        }
      });

      // Combine groups in priority order
      const sortedQuestions = [
        ...priorityGroups[1],
        ...priorityGroups[2],
        ...priorityGroups[3],
        ...priorityGroups[4]
      ];

      setQuestions(sortedQuestions);
      setCurrentQuestionIndex(0);
      resetQuestionState();
      
      if (sortedQuestions.length > 0 && user) {
        await startAttempt(sortedQuestions[0].question_id);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Ошибка при загрузке вопросов');
    } finally {
      setLoading(false);
    }
  };

  const resetQuestionState = () => {
    setUserAnswer("");
    setIsAnswered(false);
    setIsCorrect(false);
    setShowSolution(false);
    setSolutionViewedBeforeAnswer(false);
    setCurrentAttemptId(null);
    setAttemptStartTime(null);
  };

  const toggleQuestionGroup = (groupType: string) => {
    let groupNumbers: string[] = [];
    
    switch (groupType) {
      case 'all':
        groupNumbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
        break;
      case 'part1':
        groupNumbers = Array.from({ length: 19 }, (_, i) => (i + 1).toString());
        break;
      case 'part2':
        groupNumbers = Array.from({ length: 6 }, (_, i) => (i + 20).toString());
        break;
    }
    
    const allSelected = groupNumbers.every(num => selectedNumbers.includes(num));
    
    if (allSelected) {
      setSelectedNumbers(prev => prev.filter(n => !groupNumbers.includes(n)));
    } else {
      setSelectedNumbers(prev => {
        const newSelected = [...prev];
        groupNumbers.forEach(num => {
          if (!newSelected.includes(num)) {
            newSelected.push(num);
          }
        });
        return newSelected;
      });
    }
  };

  const toggleIndividualNumber = (number: string) => {
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      } else {
        return [...prev, number];
      }
    });
  };

  const handleStartPractice = () => {
    if (selectedNumbers.length === 0) {
      toast.error('Выберите хотя бы один номер вопроса');
      return;
    }
    
    setPracticeStarted(true);
    fetchQuestions(selectedNumbers);
  };

  const handleBackToSelection = () => {
    setPracticeStarted(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    resetQuestionState();
  };

  const handleFinishTest = () => {
    setShowStatistics(true);
    setIsReviewMode(false);
  };

  const handleNewTest = () => {
    setShowStatistics(false);
    setSessionResults([]);
    setIsReviewMode(false);
    setReviewQuestionIndex(null);
    handleBackToSelection();
  };

  const handleGoToQuestion = (questionIndex: number) => {
    setIsReviewMode(true);
    setReviewQuestionIndex(questionIndex);
  };
  
  const handleBackToSummary = () => {
    setIsReviewMode(false);
    setReviewQuestionIndex(null);
  };

  const startAttempt = async (questionId: string) => {
    if (!user) return;
    
    try {
      let skillsArray: number[] = [];
      let topicsArray: string[] = [];
      let problemNumberType = 1;

      try {
        const { data: detailsResp, error: detailsErr } = await supabase.functions.invoke('get-question-details', {
          body: { question_id: questionId, course_id: '1' }
        });
        if (detailsErr) {
          console.warn('get-question-details error (will fallback):', detailsErr);
        } else if (detailsResp?.data) {
          skillsArray = Array.isArray(detailsResp.data.skills_list) ? detailsResp.data.skills_list : [];
          topicsArray = Array.isArray(detailsResp.data.topics_list) ? detailsResp.data.topics_list : [];
          if (detailsResp.data.problem_number_type) {
            problemNumberType = parseInt(detailsResp.data.problem_number_type.toString(), 10);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch question details:', e);
      }

      const { data, error } = await supabase
        .from('student_activity')
        .insert({
          user_id: user.id,
          course_id: '1',
          question_id: questionId,
          answer_time_start: new Date().toISOString(),
          finished_or_not: false,
          problem_number_type: problemNumberType,
          is_correct: null,
          duration_answer: null,
          scores_fipi: null,
          skills: skillsArray.length ? skillsArray : null,
          topics: topicsArray.length ? topicsArray : null
        })
        .select('attempt_id')
        .single();

      if (error) {
        console.error('Error starting attempt:', error);
        return;
      }

      if (data) {
        setCurrentAttemptId(data.attempt_id);
        setAttemptStartTime(new Date());
      }
    } catch (error) {
      console.error('Error starting attempt:', error);
    }
  };

  const checkAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    if (!user) {
      setShowAuthRequiredMessage(true);
      setTimeout(() => setShowAuthRequiredMessage(false), 5000);
      return;
    }

    try {
      let isCorrect = false;

      const { data, error } = await supabase.functions.invoke('check-text-answer', {
        body: {
          user_id: user.id,
          question_id: currentQuestion.question_id,
          submitted_answer: userAnswer.trim()
        }
      });

      if (error) {
        console.error('Error checking answer:', error);
        toast.error('Ошибка при проверке ответа');
        return;
      }

      isCorrect = data?.is_correct || false;

      setIsCorrect(isCorrect);
      setIsAnswered(true);

      setSessionResults(prev => {
        const newResults = [...prev];
        const existingIndex = newResults.findIndex(r => r.questionIndex === currentQuestionIndex);
        const result = {
          questionIndex: currentQuestionIndex,
          questionId: currentQuestion.question_id,
          isCorrect,
          userAnswer: userAnswer.trim(),
          correctAnswer: currentQuestion.answer,
          problemText: currentQuestion.problem_text,
          solutionText: currentQuestion.solution_text,
          isAnswered: true
        };
        
        if (existingIndex >= 0) {
          newResults[existingIndex] = result;
        } else {
          newResults.push(result);
        }
        return newResults;
      });

      if (isCorrect) {
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .single();
        
        const currentStreak = streakData?.current_streak || 0;
        const basePoints = 2;
        const pointsToShow = currentStreak >= 3 ? basePoints * 10 : basePoints;
        
        if ((window as any).triggerEnergyPointsAnimation) {
          (window as any).triggerEnergyPointsAnimation(pointsToShow);
        }
      }

      Promise.all([
        updateStudentActivity(isCorrect, 0),
        submitToHandleSubmission(isCorrect),
        awardStreakPoints(user.id, calculateStreakReward(currentQuestion.difficulty)),
        isCorrect ? (async () => {
          const { data: streakData } = await supabase
            .from('user_streaks')
            .select('current_streak')
            .eq('user_id', user.id)
            .single();
          
          const currentStreak = streakData?.current_streak || 0;
          await awardEnergyPoints(user.id, 'problem', undefined, 'ogemath', currentStreak);
        })() : Promise.resolve()
      ]).catch(error => {
        console.error('Error in background operations:', error);
      });
    } catch (error) {
      console.error('Error in checkAnswer:', error);
      toast.error('Ошибка при проверке ответа');
    }
  };

  const submitToHandleSubmission = async (isCorrect: boolean) => {
    if (!user) return;

    try {
      const { data: activityData, error: activityError } = await supabase
        .from('student_activity')
        .select('question_id, attempt_id, finished_or_not, duration_answer, scores_fipi')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (activityError || !activityData) {
        console.error('Error getting latest activity:', activityError);
        return;
      }

      const submissionData = {
        user_id: user.id,
        question_id: activityData.question_id,
        attempt_id: activityData.attempt_id,
        finished_or_not: activityData.finished_or_not,
        is_correct: isCorrect,
        duration: activityData.duration_answer,
        scores_fipi: activityData.scores_fipi
      };

      const { data, error } = await supabase.functions.invoke('handle-submission', {
        body: { 
          course_id: '1',
          submission_data: submissionData
        }
      });

      if (error) {
        console.error('Error in handle-submission:', error);
        toast.error('Ошибка при обработке ответа');
        return;
      }

      console.log('Handle submission completed:', data);
    } catch (error) {
      console.error('Error in submitToHandleSubmission:', error);
    }
  };

  const updateStudentActivity = async (isCorrect: boolean, scoresFipi: number | null) => {
    if (!user || !currentAttemptId || !attemptStartTime) return;

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - attemptStartTime.getTime()) / 1000);

      const { error } = await supabase
        .from('student_activity')
        .update({
          is_correct: isCorrect,
          finished_or_not: true,
          duration_answer: duration,
          scores_fipi: scoresFipi
        })
        .eq('attempt_id', currentAttemptId);

      if (error) {
        console.error('Error updating student activity:', error);
      }
    } catch (error) {
      console.error('Error in updateStudentActivity:', error);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
      
      if (user) {
        await startAttempt(questions[currentQuestionIndex + 1].question_id);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      resetQuestionState();
    }
  };

  if (showStatistics && !isReviewMode) {
    return (
      <TestStatisticsWindow
        sessionResults={sessionResults}
        onStartNewTest={handleNewTest}
        onGoToQuestion={handleGoToQuestion}
      />
    );
  }

  if (isReviewMode && reviewQuestionIndex !== null) {
    const reviewQuestion = sessionResults[reviewQuestionIndex];
    if (!reviewQuestion) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6 bg-card/50 backdrop-blur border-primary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleBackToSummary}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Назад к результатам
                </Button>
                <CardTitle>Вопрос {reviewQuestionIndex + 1} из {sessionResults.length}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Задача:</h3>
                  <MathRenderer text={reviewQuestion.problemText} compiler="mathjax" />
                </div>

                <Alert className={reviewQuestion.isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                  <AlertDescription className="flex items-center gap-2">
                    {reviewQuestion.isCorrect ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Правильно!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-800">Неправильно</span>
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1">Ваш ответ:</p>
                    <div className="p-3 bg-muted rounded">
                      <MathRenderer text={reviewQuestion.userAnswer} compiler="mathjax" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Правильный ответ:</p>
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <MathRenderer text={reviewQuestion.correctAnswer} compiler="mathjax" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Решение:
                  </h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <MathRenderer text={reviewQuestion.solutionText} compiler="mathjax" />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (reviewQuestionIndex > 0) {
                        setReviewQuestionIndex(reviewQuestionIndex - 1);
                      }
                    }}
                    disabled={reviewQuestionIndex === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Предыдущий
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (reviewQuestionIndex < sessionResults.length - 1) {
                        setReviewQuestionIndex(reviewQuestionIndex + 1);
                      }
                    }}
                    disabled={reviewQuestionIndex === sessionResults.length - 1}
                  >
                    Следующий
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!practiceStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Link to="/ogemath-practice">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            </Link>
          </div>

          <Card className="mb-6 bg-card/50 backdrop-blur border-primary/10">
            <CardHeader>
              <CardTitle className="text-3xl font-display bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Практика по номеру вопроса ОГЭ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Быстрый выбор:</h3>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant={selectedNumbers.length === 25 ? "default" : "outline"}
                    onClick={() => toggleQuestionGroup('all')}
                  >
                    Все (1-25)
                  </Button>
                  <Button
                    variant={selectedNumbers.filter(n => parseInt(n) <= 19).length === 19 ? "default" : "outline"}
                    onClick={() => toggleQuestionGroup('part1')}
                  >
                    Часть 1 (1-19)
                  </Button>
                  <Button
                    variant={selectedNumbers.filter(n => parseInt(n) >= 20).length === 6 ? "default" : "outline"}
                    onClick={() => toggleQuestionGroup('part2')}
                  >
                    Часть 2 (20-25)
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Или выберите конкретные номера:</h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {Array.from({ length: 25 }, (_, i) => (i + 1).toString()).map(num => (
                    <Button
                      key={num}
                      variant={selectedNumbers.includes(num) ? "default" : "outline"}
                      onClick={() => toggleIndividualNumber(num)}
                      className="w-full"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleStartPractice}
                disabled={selectedNumbers.length === 0}
                className="w-full"
                size="lg"
              >
                Начать практику ({selectedNumbers.length} номер{selectedNumbers.length === 1 ? '' : selectedNumbers.length < 5 ? 'а' : 'ов'})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 bg-card/50 backdrop-blur border-primary/10">
          <p className="text-lg">Загрузка вопросов...</p>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 bg-card/50 backdrop-blur border-primary/10">
          <p className="text-lg">Вопросы не найдены</p>
          <Button onClick={handleBackToSelection} className="mt-4">
            Назад к выбору
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <FormulaBookletDialog 
        open={showFormulaBooklet} 
        onOpenChange={setShowFormulaBooklet}
      />
      
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 bg-card/50 backdrop-blur border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleBackToSelection} size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFormulaBooklet(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Формулы
                </Button>
                <Button variant="destructive" size="sm" onClick={handleFinishTest}>
                  Завершить тест
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <CardTitle>
                Вопрос {currentQuestionIndex + 1} из {questions.length}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Номер: {currentQuestion.problem_number_type}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <MathRenderer text={currentQuestion.problem_text} compiler="mathjax" />
              {currentQuestion.problem_image && (
                <img 
                  src={currentQuestion.problem_image} 
                  alt="Problem illustration" 
                  className="mt-4 max-w-full h-auto rounded"
                />
              )}
            </div>

            {showAuthRequiredMessage && (
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertDescription className="text-yellow-800">
                  Для проверки ответа необходимо войти в аккаунт
                </AlertDescription>
              </Alert>
            )}

            {!isAnswered ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ваш ответ:</label>
                  <Input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                    placeholder="Введите ответ"
                    className="text-lg"
                  />
                </div>
                <Button onClick={checkAnswer} className="w-full" size="lg">
                  Проверить ответ
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className={isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                  <AlertDescription className="flex items-center gap-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Правильно!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-800">Неправильно</span>
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1">Ваш ответ:</p>
                    <div className="p-3 bg-muted rounded">
                      <MathRenderer text={userAnswer} compiler="mathjax" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Правильный ответ:</p>
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <MathRenderer text={currentQuestion.answer} compiler="mathjax" />
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowSolution(!showSolution)}
                  className="w-full"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {showSolution ? 'Скрыть решение' : 'Показать решение'}
                </Button>

                {showSolution && (
                  <div className="p-4 bg-muted rounded-lg">
                    <MathRenderer text={currentQuestion.solution_text} compiler="mathjax" />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Предыдущий
                  </Button>
                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      onClick={handleNextQuestion}
                      className="flex-1"
                    >
                      Следующий
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleFinishTest}
                      variant="default"
                      className="flex-1"
                    >
                      Завершить тест
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PracticeByNumberOgemath;
