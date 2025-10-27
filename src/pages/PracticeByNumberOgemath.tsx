import { useState, useEffect } from "react";
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
        const problemNumberInt = parseInt(questionNumber, 10);
        const { data, error } = await supabase
          .from('oge_math_fipi_bank')
          .select('question_id, problem_text, answer, solution_text, problem_number_type, problem_image')
          .eq('problem_number_type', problemNumberInt)
          .order('question_id');

        if (error) throw error;
        
        if (data) {
          const filteredData = data.map(q => ({
            ...q,
            problem_number_type: parseInt(q.problem_number_type?.toString() || '0')
          }));
          allQuestions = [...allQuestions, ...filteredData];
        }
      }

      // Create a map to store the status of each question
      

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

      const priorityGroups = {
        1: questionsWithStatus.filter(q => q.priority === 1),
        2: questionsWithStatus.filter(q => q.priority === 2),
        3: questionsWithStatus.filter(q => q.priority === 3),
        4: questionsWithStatus.filter(q => q.priority === 4)
      };

      Object.values(priorityGroups).forEach(group => {
        for (let i = group.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [group[i], group[j]] = [group[j], group[i]];
        }
      });

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
        groupNumbers = ['20', '21', '22', '23', '24', '25'];
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
        console.warn('Failed to fetch question details, proceeding without skills/topics:', e);
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
        console.log('Started attempt:', data.attempt_id);
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

      console.log('Checking answer using check-text-answer function');
      const { data, error } = await supabase.functions.invoke('check-text-answer', {
        body: {
          user_id: user.id,
          question_id: currentQuestion.question_id,
          submitted_answer: userAnswer.trim()
        }
      });

      if (error) {
        console.error('Error checking answer:', error);
        toast.error('Ошибка при проверке ответа. Пожалуйста, попробуйте ещё раз.');
        return;
      }

      isCorrect = data?.is_correct || false;
      console.log('check-text-answer result:', { isCorrect });

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
          await awardEnergyPoints(user.id, 'problem', undefined, 'oge_math_fipi_bank', currentStreak);
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
    if (!user || !currentAttemptId) return;

    const endTime = new Date();
    const duration = attemptStartTime 
      ? Math.round((endTime.getTime() - attemptStartTime.getTime()) / 1000)
      : null;

    try {
      const { error } = await supabase
        .from('student_activity')
        .update({
          is_correct: isCorrect,
          finished_or_not: true,
          duration_answer: duration,
          scores_fipi: scoresFipi,
          answer_time_end: endTime.toISOString()
        })
        .eq('attempt_id', currentAttemptId);

      if (error) {
        console.error('Error updating student_activity:', error);
      } else {
        console.log('Updated student_activity for attempt:', currentAttemptId);
      }
    } catch (error) {
      console.error('Error updating student_activity:', error);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      resetQuestionState();
      
      if (user) {
        await startAttempt(questions[nextIndex].question_id);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      resetQuestionState();
    }
  };

  const handleToggleSolution = () => {
    if (!isAnswered && !showSolution) {
      setSolutionViewedBeforeAnswer(true);
    }
    setShowSolution(!showSolution);
  };

  const questionNumbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {!practiceStarted ? (
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Практика ОГЭ по номерам</CardTitle>
              <p className="text-muted-foreground">
                Выберите номера вопросов для практики
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => toggleQuestionGroup('all')}
                  variant={selectedNumbers.length === 25 ? "default" : "outline"}
                >
                  Все номера (1-25)
                </Button>
                <Button
                  onClick={() => toggleQuestionGroup('part1')}
                  variant={selectedNumbers.filter(n => parseInt(n) <= 19).length === 19 ? "default" : "outline"}
                >
                  Часть 1 (1-19)
                </Button>
                <Button
                  onClick={() => toggleQuestionGroup('part2')}
                  variant={selectedNumbers.filter(n => parseInt(n) >= 20).length === 6 ? "default" : "outline"}
                >
                  Часть 2 (20-25)
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Выберите конкретные номера:</p>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {questionNumbers.map((num) => (
                    <Button
                      key={num}
                      onClick={() => toggleIndividualNumber(num)}
                      variant={selectedNumbers.includes(num) ? "default" : "outline"}
                      size="sm"
                      className="h-10 w-full"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Выбрано: <span className="font-semibold">{selectedNumbers.length}</span> номеров
                </p>
                <Button
                  onClick={handleStartPractice}
                  disabled={selectedNumbers.length === 0}
                  size="lg"
                >
                  Начать практику
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : showStatistics ? (
          <TestStatisticsWindow
            sessionResults={sessionResults}
            onStartNewTest={handleNewTest}
            onGoToQuestion={handleGoToQuestion}
            isReviewMode={isReviewMode}
            currentQuestionData={
              isReviewMode && reviewQuestionIndex !== null
                ? {
                    question: sessionResults[reviewQuestionIndex],
                    onBackToSummary: handleBackToSummary,
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                onClick={handleBackToSelection}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад к выбору
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFormulaBooklet(true)}
                  variant="outline"
                  size="sm"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Формулы
                </Button>
                <Button
                  onClick={handleFinishTest}
                  variant="default"
                  size="sm"
                >
                  Завершить тест
                </Button>
              </div>
            </div>

            <div className="bg-card/95 backdrop-blur border border-border/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Вопрос {currentQuestionIndex + 1} из {questions.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  Номер: {currentQuestion?.problem_number_type}
                </span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {showAuthRequiredMessage && (
              <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Пожалуйста, войдите в систему, чтобы проверить ответ и отслеживать прогресс.{' '}
                  <Link to="/subscribe" className="underline font-medium">
                    Войти
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {loading ? (
              <Card className="bg-card/95 backdrop-blur border-border/50">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Загрузка вопросов...</p>
                </CardContent>
              </Card>
            ) : currentQuestion ? (
              <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Вопрос {currentQuestionIndex + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentQuestion.problem_image && (
                    <div className="flex justify-center">
                      <img
                        src={currentQuestion.problem_image}
                        alt="Problem illustration"
                        className="max-w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}

                  <div className="prose dark:prose-invert max-w-none">
                    <MathRenderer text={currentQuestion.problem_text} compiler="mathjax" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ваш ответ:</label>
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      disabled={isAnswered}
                      placeholder="Введите ответ"
                      className="text-lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isAnswered) {
                          checkAnswer();
                        }
                      }}
                    />
                  </div>

                  {!isAnswered && (
                    <Button
                      onClick={checkAnswer}
                      disabled={!userAnswer.trim()}
                      className="w-full"
                      size="lg"
                    >
                      Проверить ответ
                    </Button>
                  )}

                  {isAnswered && (
                    <Alert className={isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <AlertDescription className={isCorrect ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
                          {isCorrect ? (
                            <span className="font-medium">Правильно!</span>
                          ) : (
                            <span>
                              <span className="font-medium">Неправильно.</span> Правильный ответ: {currentQuestion.answer}
                            </span>
                          )}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}

                  <Button
                    onClick={handleToggleSolution}
                    variant="outline"
                    className="w-full"
                  >
                    {showSolution ? 'Скрыть решение' : 'Показать решение'}
                  </Button>

                  {showSolution && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-lg">Решение:</CardTitle>
                      </CardHeader>
                      <CardContent className="prose dark:prose-invert max-w-none">
                        <MathRenderer text={currentQuestion.solution_text} compiler="mathjax" />
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      variant="outline"
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Предыдущий
                    </Button>
                    <Button
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="flex-1"
                    >
                      Следующий
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>

      <FormulaBookletDialog 
        open={showFormulaBooklet} 
        onOpenChange={setShowFormulaBooklet} 
      />
    </div>
  );
};

export default PracticeByNumberOgemath;
