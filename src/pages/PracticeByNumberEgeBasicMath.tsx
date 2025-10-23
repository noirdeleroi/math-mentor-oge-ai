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
import { awardStreakPoints, calculateStreakReward, getCurrentStreakData } from "@/services/streakPointsService";
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

const PracticeByNumberEgeBasicMath = () => {
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
          .from('egemathbase')
          .select('question_id, problem_text, answer, solution_text, problem_number_type, problem_image')
          .eq('problem_number_type', questionNumber)
          .order('question_id');

        if (error) throw error;
        
        if (data) {
          const filteredData = data.map(q => ({
            ...q,
            problem_number_type: parseInt(q.problem_number_type || '0')
          }));
          allQuestions = [...allQuestions, ...filteredData];
        }
      }

      // Build status map from student_activity similar to OGEMath
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
        ...priorityGroups[1], // wrong first (priority 1)
        ...priorityGroups[2], // unfinished second (priority 2)
        ...priorityGroups[3], // unseen third (priority 3)
        ...priorityGroups[4]  // correct last (priority 4)
      ];

      setQuestions(sortedQuestions);
      setCurrentQuestionIndex(0);
      resetQuestionState();
      
      // Start attempt for the first question if user is logged in
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
        groupNumbers = Array.from({ length: 21 }, (_, i) => (i + 1).toString());
        break;
      case 'part1':
        groupNumbers = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
        break;
      case 'part2':
        groupNumbers = ['21'];
        break;
    }
    
    // Check if all numbers in the group are currently selected
    const allSelected = groupNumbers.every(num => selectedNumbers.includes(num));
    
    // If all selected, deselect the group; otherwise, select the group
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

  // Start attempt logging when question is presented
  const startAttempt = async (questionId: string) => {
    if (!user) return;
    
    try {
      // Fetch question details to populate skills and topics
      let skillsArray: number[] = [];
      let topicsArray: string[] = [];
      let problemNumberType = 1;

      try {
        const { data: detailsResp, error: detailsErr } = await supabase.functions.invoke('get-question-details', {
          body: { question_id: questionId, course_id: '2' }
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

      // Insert into student_activity table with skills and topics
      const { data, error } = await supabase
        .from('student_activity')
        .insert({
          user_id: user.id,
          course_id: '2',
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

  // Helper: detect non-numeric/canonical text answers (roots, intervals, units, LaTeX, etc.)
  const isNonNumericAnswer = (answer: string): boolean => {
    if (!answer) return false;
    const a = answer.trim();

    // Letters (ru/en) or backslash (LaTeX)
    if (/\p{L}/u.test(a) || a.includes("\\")) return true;

    // Common math symbols / set notation / intervals
    if (/[√π∞±≤≥∪∩∈∉∉≈≠(){}\[\];,]/.test(a)) return true;

    // Units like "см", "кг", "м", "мм", "%", etc.
    if (/(см|мм|м|км|кг|г|л|мл|%)(\b|$)/i.test(a)) return true;

    return false;
  };

  const checkAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    // Check if user is authenticated
    if (!user) {
      setShowAuthRequiredMessage(true);
      setTimeout(() => setShowAuthRequiredMessage(false), 5000);
      return;
    }

    try {
      let isCorrect = false;

      // Use check-text-answer function for all answer checking (conducts normalization)
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

      // Track result in session
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

      // Trigger animation IMMEDIATELY if correct (before backend operations)
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

      // Now perform backend operations in parallel (non-blocking for UI)
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
          await awardEnergyPoints(user.id, 'problem', undefined, 'egemathbase', currentStreak);
        })() : Promise.resolve()
      ]).catch(error => {
        console.error('Error in background operations:', error);
      });
    } catch (error) {
      console.error('Error in checkAnswer:', error);
      toast.error('Ошибка при проверке ответа');
    }
  };

  // Get latest student_activity data and submit to handle_submission
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
          course_id: '2',
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

  // Update student_activity directly with answer results
  const updateStudentActivity = async (isCorrect: boolean, scores: number, isSkipped: boolean = false) => {
    if (!user || !currentAttemptId) return;

    try {
      const now = new Date();
      const startTime = attemptStartTime || new Date();
      const durationInSeconds = (now.getTime() - startTime.getTime()) / 1000;

      const { error: updateError } = await supabase
        .from('student_activity')
        .update({ 
          duration_answer: durationInSeconds,
          is_correct: isCorrect,
          scores_fipi: scores,
          finished_or_not: true
        })
        .eq('user_id', user.id)
        .eq('attempt_id', currentAttemptId);

      if (updateError) {
        console.error('Error updating student_activity:', updateError);
        return;
      }

      console.log(`Updated student_activity: correct=${isCorrect}, scores=${scores}, duration=${durationInSeconds}s`);
    } catch (error) {
      console.error('Error in updateStudentActivity:', error);
    }
  };

  // Handle skipping a question
  const skipQuestion = async () => {
    if (!currentQuestion) return;

    if (user && currentAttemptId && attemptStartTime) {
      try {
        const now = new Date();
        const durationInSeconds = (now.getTime() - attemptStartTime.getTime()) / 1000;

        const { error: updateError } = await supabase
          .from('student_activity')
          .update({ 
            duration_answer: durationInSeconds,
            is_correct: false,
            scores_fipi: 0,
            finished_or_not: true
          })
          .eq('user_id', user.id)
          .eq('attempt_id', currentAttemptId);

        if (updateError) {
          console.error('Error updating activity for skip:', updateError);
        }

        submitToHandleSubmission(false).catch(error => 
          console.error('Background mastery update failed:', error)
        );
      } catch (error) {
        console.error('Error skipping question:', error);
      }
    }
    
    // Track skipped question in session
    setSessionResults(prev => {
      const newResults = [...prev];
      const existingIndex = newResults.findIndex(r => r.questionIndex === currentQuestionIndex);
      const result = {
        questionIndex: currentQuestionIndex,
        questionId: currentQuestion.question_id,
        isCorrect: false,
        userAnswer: '',
        correctAnswer: currentQuestion.answer,
        problemText: currentQuestion.problem_text,
        solutionText: currentQuestion.solution_text,
        isAnswered: false
      };
      
      if (existingIndex >= 0) {
        newResults[existingIndex] = result;
      } else {
        newResults.push(result);
      }
      return newResults;
    });
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
      
      const nextQuestion = questions[currentQuestionIndex + 1];
      if (nextQuestion && user) {
        startAttempt(nextQuestion.question_id).catch(error => 
          console.error('Background attempt start failed:', error)
        );
      }
    } else {
      toast.success("Все вопросы завершены!");
    }
  };

  const handleShowSolution = async () => {
    if (!isAnswered) {
      setSolutionViewedBeforeAnswer(true);
      
      if (user && currentQuestion) {
        try {
          let attemptId = currentAttemptId;
          let startTime = attemptStartTime;
          
          if (!attemptId || !startTime) {
            console.log('Starting attempt for question before marking as wrong:', currentQuestion.question_id);
            await startAttempt(currentQuestion.question_id);
            await new Promise(resolve => setTimeout(resolve, 100));
            attemptId = currentAttemptId;
            startTime = attemptStartTime;
          }
          
          if (attemptId && startTime) {
            const now = new Date();
            const durationInSeconds = (now.getTime() - startTime.getTime()) / 1000;

            await supabase
              .from('student_activity')
              .update({
                is_correct: false,
                duration_answer: durationInSeconds,
                finished_or_not: true,
                scores_fipi: 0
              })
              .eq('user_id', user.id)
              .eq('attempt_id', attemptId);

            setIsAnswered(true);
            setIsCorrect(false);
          } else {
            console.error('Could not set up attempt for marking question as wrong');
          }
        } catch (error) {
          console.error('Error marking question as wrong when showing solution:', error);
        }
      }
    }
    setShowSolution(true);
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
      
      const nextQ = questions[currentQuestionIndex + 1];
      if (nextQ && user) {
        await startAttempt(nextQ.question_id);
      }
    } else {
      toast.success("Все вопросы завершены!");
    }
  };

  const questionNumbers = Array.from({ length: 21 }, (_, i) => (i + 1).toString());

  return (
    <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="relative text-center mb-12">
          <div className="absolute left-0 top-0">
          {practiceStarted ? (
            <Button 
              onClick={handleBackToSelection}
              variant="ghost"
              size="sm"
              className="hover:bg-white/20 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              К выбору вопросов
            </Button>
          ) : (
            <Link to="/egemathbasic-practice">
              <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </Link>
          )}
          </div>
          {!practiceStarted && (
            <>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                Практика по номеру
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Выберите номер(а) (1–21) для тренировки задач выбранного типа
              </p>
            </>
          )}
        </div>

        <div className="max-w-6xl mx-auto flex justify-center">
          <div className={`${practiceStarted ? 'w-full max-w-3xl' : 'w-full max-w-4xl'}`}>

          {/* Question Selection Interface */}
          {!practiceStarted ? (
            <div className="space-y-6">
              {/* Individual Numbers */}
              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-[#1a1f36]">Отдельные номера</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Все вопросы button at top - smaller */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => toggleQuestionGroup('all')}
                        className="px-4 py-2 text-sm border-[#1a1f36]/30 text-[#1a1f36] font-medium hover:bg-gray-100 hover:text-[#1a1f36] active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20 transition-all"
                      >
                        Все вопросы
                      </Button>
                    </div>

                    {/* Number grid */}
                    <div className="grid grid-cols-7 md:grid-cols-10 gap-3">
                      {questionNumbers.map(num => (
                        <Button
                          key={num}
                          variant={selectedNumbers.includes(num) ? "default" : "outline"}
                          onClick={() => toggleIndividualNumber(num)}
                          className={`p-3 h-auto font-medium transition-all ${
                            selectedNumbers.includes(num)
                              ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] border-0 shadow-sm'
                              : 'border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 hover:text-[#1a1f36] active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20'
                          }`}
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Start Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleStartPractice}
                  disabled={selectedNumbers.length === 0}
                  className="px-8 py-3 text-lg bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Начать практику
                </Button>
              </div>

              {/* Selection Summary */}
              {selectedNumbers.length > 0 && (
                <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                  <CardContent className="pt-6">
                    <p className="text-[#1a1f36]">
                      <strong>Выбрано номеров:</strong> {selectedNumbers.join(', ')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : showStatistics ? (
            /* Statistics Window */
            <TestStatisticsWindow
              sessionResults={sessionResults}
              onGoToQuestion={handleGoToQuestion}
              onStartNewTest={handleNewTest}
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
            /* Practice Interface */
            questions.length > 0 && currentQuestion ? (
            <div>
              <Card className="mb-6 mx-auto bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardHeader className="border-b border-white/20">
                <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 text-[#1a1f36]">
                  <span className="text-lg sm:text-xl">Вопрос №{currentQuestion.problem_number_type} ({currentQuestionIndex + 1} из {questions.length})</span>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <Button
                      onClick={() => setShowFormulaBooklet(true)}
                      variant="outline"
                      className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 hover:text-[#1a1f36] w-full sm:w-auto"
                    >
                      <BookOpen className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Справочник формул</span>
                    </Button>
                    <Button
                      onClick={handleFinishTest}
                      variant="outline"
                      className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 w-full sm:w-auto"
                    >
                      Завершить тест
                    </Button>
                   <div className="flex items-center gap-2 justify-center sm:justify-start">
                     <span className="text-xs sm:text-sm font-normal text-gray-500">
                       ID: {currentQuestion.question_id}
                     </span>
                     {currentQuestion.status === 'correct' && (
                       <CheckCircle className="w-4 h-4 text-green-600" />
                     )}
                     {currentQuestion.status === 'wrong' && (
                       <XCircle className="w-4 h-4 text-red-600" />
                     )}
                     {currentQuestion.status === 'unfinished' && (
                       <div className="w-4 h-4 rounded-full border-2 border-yellow-500 bg-yellow-100" title="Начато, но не завершено" />
                     )}
                   </div>
                 </div>
               </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Problem Text */}
                <div className="prose max-w-none text-[#1a1f36]">
                  <MathRenderer text={currentQuestion.problem_text || "Текст задачи не найден"} compiler="mathjax" />
                </div>

                {/* Problem Image */}
                {currentQuestion.problem_image && (
                  <div className="flex justify-center">
                    <img 
                      src={currentQuestion.problem_image} 
                      alt="Изображение к задаче"
                      className="max-w-full h-auto rounded-lg shadow-sm border"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}

                {/* Answer Input */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Введите ваш ответ"
                      disabled={isAnswered || solutionViewedBeforeAnswer}
                      onKeyPress={(e) => e.key === 'Enter' && !isAnswered && !solutionViewedBeforeAnswer && checkAnswer()}
                      className="w-full max-w-md bg-white border-gray-300 text-[#1a1f36] placeholder:text-gray-500"
                    />
                    <Button
                      onClick={checkAnswer}
                      disabled={isAnswered || solutionViewedBeforeAnswer || !userAnswer.trim()}
                      className="min-w-32 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium disabled:opacity-50 transition-all"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Проверить
                    </Button>
                  </div>

                  {/* Note for non-numeric answers */}
                  {currentQuestion.answer && isNonNumericAnswer(currentQuestion.answer) && (
                    <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="font-medium text-yellow-800 mb-2">
                        Важно: форма ответа не имеет значения.
                      </div>
                      <div className="mb-2">
                        Вы можете записать ответ в любом виде — главное, чтобы он был математически верным.
                      </div>
                      <div className="text-xs">
                        <div className="font-medium mb-1">Примеры ответа:</div>
                        <ul className="list-disc ml-5 space-y-1 text-gray-700">
                          <li><em>корень из трёх</em></li>
                          <li><em>интервал от 0 до 5</em></li>
                          <li><em>3 см</em></li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Auth Required Message */}
                  {showAuthRequiredMessage && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertDescription className="text-orange-800">
                        Чтобы решать задачи, войдите на платформу.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Answer Result */}
                  {isAnswered && (
                    <Alert className={isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <AlertDescription>
                          {isCorrect ? (
                            <span className="text-green-800">
                              Правильно! {!solutionViewedBeforeAnswer && "Получены очки прогресса."}
                            </span>
                          ) : (
                            <span className="text-red-800">
                              Неправильно. Правильный ответ: <strong>{currentQuestion.answer}</strong>
                            </span>
                          )}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    onClick={handleShowSolution}
                    className="flex-1 min-w-32 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 hover:text-[#1a1f36]"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Показать решение
                  </Button>
                  
                  {!isAnswered && (
                    <Button
                      variant="outline"
                      onClick={skipQuestion}
                      className="flex-1 min-w-32 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 hover:text-[#1a1f36]"
                    >
                      Пропустить
                    </Button>
                  )}
                  
                  {isAnswered && currentQuestionIndex < questions.length - 1 && (
                    <Button onClick={nextQuestion} className="flex-1 min-w-32 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium transition-all">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Следующий вопрос
                    </Button>
                  )}
                </div>

                {/* Solution */}
                {showSolution && currentQuestion.solution_text && (
                  <Card className="bg-blue-50/50 backdrop-blur border border-blue-200/50 rounded-2xl shadow-md">
                    <CardHeader className="border-b border-blue-200/50">
                      <CardTitle className="text-blue-800">Решение</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="prose max-w-none text-[#1a1f36]">
                        <MathRenderer text={currentQuestion.solution_text} compiler="mathjax" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
              </Card>
            </div>
            ) : null
          )}

          {/* Results Summary */}
          {practiceStarted && questions.length > 0 && (
            <Card className="mx-auto bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardHeader className="border-b border-white/20">
                <CardTitle className="text-[#1a1f36]">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-700">
                  Найдено {questions.length} вопросов для выбранных номеров
                </p>
                {loading && <p className="text-blue-600 mt-2">Загрузка...</p>}
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>

      {/* Formula Booklet Dialog */}
      <FormulaBookletDialog
        open={showFormulaBooklet}
        onOpenChange={setShowFormulaBooklet}
      />
    </div>
  );
};

export default PracticeByNumberEgeBasicMath;
