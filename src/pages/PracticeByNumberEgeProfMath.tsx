import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, BookOpen, ArrowRight, Home, ArrowLeft, Camera, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
  status?: 'correct' | 'wrong' | 'unseen' | 'unfinished';
}

const PracticeByNumberEgeProfMath = () => {
  const navigate = useNavigate();
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
  
  // Photo attachment states
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showTelegramNotConnected, setShowTelegramNotConnected] = useState(false);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string>("");
  const [photoScores, setPhotoScores] = useState<number | null>(null);

  // Formula booklet state
  const [showFormulaBooklet, setShowFormulaBooklet] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const fetchQuestions = async (questionNumbers: string[]) => {
    setLoading(true);
    try {
      let allQuestions: Question[] = [];
      
      for (const questionNumber of questionNumbers) {
        const { data, error } = await supabase
          .from('egemathprof')
          .select('question_id, problem_text, answer, solution_text, problem_number_type')
          .eq('problem_number_type', parseInt(questionNumber))
          .order('question_id');

        if (error) throw error;
        
        if (data) {
          allQuestions = [...allQuestions, ...data];
        }
      }

      // Get user's activity history for these questions if logged in
      let userActivity: any[] = [];
      let questionStatusMap: { [key: string]: { status: 'correct' | 'wrong' | 'unseen' | 'unfinished', priority: number } } = {};
      
      if (user && allQuestions.length > 0) {
        const questionIds = allQuestions.map(q => q.question_id);
        const { data: activityData } = await supabase
          .from('student_activity')
          .select('question_id, is_correct, finished_or_not, updated_at')
          .eq('user_id', user.id)
          .in('question_id', questionIds)
          .order('updated_at', { ascending: false });
        
        userActivity = activityData || [];

        // Create status map for each question based on most recent attempt
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
        groupNumbers = Array.from({ length: 19 }, (_, i) => (i + 1).toString());
        break;
      case 'part1':
        groupNumbers = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
        break;
      case 'part2':
        groupNumbers = Array.from({ length: 7 }, (_, i) => (i + 13).toString());
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
    setSessionResults([]);
    setShowStatistics(false);
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

  const handleGoToQuestion = (index: number) => {
    setReviewQuestionIndex(index);
    setCurrentQuestionIndex(index);
    resetQuestionState();
  };

  const handleBackToSummary = () => {
    setReviewQuestionIndex(null);
  };

  // Start attempt logging when question is presented
  const startAttempt = async (questionId: string) => {
    if (!user) return;
    
    try {
      let skillsArray: number[] = [];
      let topicsArray: string[] = [];
      let problemNumberType = 1;

      try {
        const { data: detailsResp, error: detailsErr } = await supabase.functions.invoke('get-question-details', {
          body: { question_id: questionId, course_id: '3' }
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
          question_id: questionId,
          answer_time_start: new Date().toISOString(),
          finished_or_not: false,
          problem_number_type: problemNumberType,
          is_correct: null,
          duration_answer: null,
          scores_fipi: null,
          skills: skillsArray.length ? skillsArray : null,
          topics: topicsArray.length ? topicsArray : null,
          course_id: '3'
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

  const isNonNumericAnswer = (answer: string): boolean => {
    if (!answer) return false;
    if (/\p{L}/u.test(answer)) return true;
    if (answer.includes('\\')) return true;
    if (/[а-яё]/i.test(answer)) return true;
    return false;
  };

  const isNumeric = (str: string): boolean => {
    const cleaned = str.trim();
    return /^-?\d+([.,]\d+)?$/.test(cleaned);
  };

  const sanitizeNumericAnswer = (answer: string): string => {
    return answer.trim().replace(/\s/g, '').replace(',', '.');
  };

  const checkAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    if (!user) {
      setShowAuthRequiredMessage(true);
      setTimeout(() => setShowAuthRequiredMessage(false), 5000);
      return;
    }

    try {
      // Use check-text-answer function for ALL answer checking (like OGE Math)
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

      const isCorrectValue = data?.is_correct || false;
      console.log('check-text-answer result:', { isCorrect: isCorrectValue });

      setIsCorrect(isCorrectValue);
      setIsAnswered(true);

      // Track result in session
      setSessionResults(prev => {
        const newResults = [...prev];
        const existingIndex = newResults.findIndex(r => r.questionIndex === currentQuestionIndex);
        const result = {
          questionIndex: currentQuestionIndex,
          questionId: currentQuestion.question_id,
          isCorrect: isCorrectValue,
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
      if (isCorrectValue) {
        // Fetch streak for points calculation
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .single();
        
        const currentStreak = streakData?.current_streak || 0;
        // Calculate points: 2 base points for egemathprof, x10 if streak >= 3
        const basePoints = 2;
        const pointsToShow = currentStreak >= 3 ? basePoints * 10 : basePoints;
        
        if ((window as any).triggerEnergyPointsAnimation) {
          (window as any).triggerEnergyPointsAnimation(pointsToShow);
        }
      }

      // Now perform backend operations in parallel (non-blocking for UI)
      Promise.all([
        updateStudentActivity(isCorrectValue, 0),
        submitToHandleSubmission(isCorrectValue),
        awardStreakPoints(user.id, calculateStreakReward(currentQuestion.difficulty)),
        // Award energy points if correct
        isCorrectValue ? (async () => {
          const { data: streakData } = await supabase
            .from('user_streaks')
            .select('current_streak')
            .eq('user_id', user.id)
            .single();
          
          const currentStreak = streakData?.current_streak || 0;
          await awardEnergyPoints(user.id, 'problem', undefined, 'egemathprof', currentStreak);
        })() : Promise.resolve()
      ]).catch(error => {
        console.error('Error in background operations:', error);
      });
    } catch (error) {
      console.error('Error in checkAnswer:', error);
      toast.error('Ошибка при проверке ответа');
    }
  };

  const updateStudentActivity = async (isCorrect: boolean, scores: number) => {
    if (!user || !currentAttemptId) return;

    try {
      const now = new Date();
      const durationInSeconds = attemptStartTime 
        ? (now.getTime() - attemptStartTime.getTime()) / 1000 
        : 0;

      await supabase
        .from('student_activity')
        .update({
          is_correct: isCorrect,
          duration_answer: durationInSeconds,
          finished_or_not: true,
          scores_fipi: scores
        })
        .eq('user_id', user.id)
        .eq('attempt_id', currentAttemptId);
    } catch (error) {
      console.error('Error updating student activity:', error);
    }
  };

  const submitToHandleSubmission = async (isCorrect: boolean) => {
    if (!user) return;

    try {
      // Get latest student_activity row for current user
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

      // Create submission_data dictionary
      const submissionData = {
        user_id: user.id,
        question_id: activityData.question_id,
        attempt_id: activityData.attempt_id,
        finished_or_not: activityData.finished_or_not,
        is_correct: isCorrect,
        duration: activityData.duration_answer,
        scores_fipi: activityData.scores_fipi
      };

      // Call handle_submission function with course_id='3'
      const { data, error } = await supabase.functions.invoke('handle-submission', {
        body: { 
          course_id: '3',
          submission_data: submissionData
        }
      });

      if (error) {
        console.error('Error in handle-submission:', error);
        return;
      }

      console.log('Handle submission completed:', data);
    } catch (error) {
      console.error('Error in submitToHandleSubmission:', error);
    }
  };

  const skipQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      if (user && currentAttemptId && attemptStartTime) {
        try {
          const now = new Date();
          const durationInSeconds = (now.getTime() - attemptStartTime.getTime()) / 1000;

          await supabase
            .from('student_activity')
            .update({
              is_correct: false,
              duration_answer: durationInSeconds,
              finished_or_not: true,
              scores_fipi: 0
            })
            .eq('user_id', user.id)
            .eq('attempt_id', currentAttemptId);

          submitToHandleSubmission(false).catch(error => 
            console.error('Background mastery update failed:', error)
          );
        } catch (error) {
          console.error('Error skipping question:', error);
        }
      }
      
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

            setSessionResults(prev => {
              const newResults = [...prev];
              const existingIndex = newResults.findIndex(r => r.questionIndex === currentQuestionIndex);
              const result = {
                questionIndex: currentQuestionIndex,
                questionId: currentQuestion.question_id,
                isCorrect: false,
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

            setIsAnswered(true);
            setIsCorrect(false);
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
      handleFinishTest();
    }
  };

  const handlePhotoAttachment = async () => {
    if (!user) {
      setShowAuthRequiredMessage(true);
      setTimeout(() => setShowAuthRequiredMessage(false), 5000);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('telegram_user_id')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking telegram connection:', error);
        toast.error('Ошибка при проверке подключения Telegram');
        return;
      }

      if (!profile?.telegram_user_id) {
        setShowTelegramNotConnected(true);
      } else {
        setShowUploadPrompt(true);
      }
    } catch (error) {
      console.error('Error in handlePhotoAttachment:', error);
      toast.error('Ошибка при проверке подключения Telegram');
    }
  };

  const handlePhotoCheck = async () => {
    if (!user || !currentQuestion) return;

    setIsProcessingPhoto(true);
    
    try {
      // Check telegram_input for data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('telegram_input')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error getting telegram input:', profileError);
        toast.error('Ошибка при получении данных');
        setIsProcessingPhoto(false);
        return;
      }

      if (!profile?.telegram_input) {
        toast.error('Фото не загружено.');
        setIsProcessingPhoto(false);
        return;
      }

      // Make OpenRouter API call
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('check-photo-solution', {
        body: {
          student_solution: profile.telegram_input,
          problem_text: currentQuestion.problem_text,
          solution_text: currentQuestion.solution_text,
          user_id: user.id,
          question_id: currentQuestion.question_id
        }
      });

      if (apiError) {
        console.error('Error calling check-photo-solution:', apiError);
        if (apiResponse?.retry_message) {
          toast.error(apiResponse.retry_message);
        } else {
          toast.error('Ошибка API. Попробуйте ввести решение снова.');
        }
        setIsProcessingPhoto(false);
        return;
      }

      if (apiResponse?.feedback) {
        try {
          // Parse JSON response
          const feedbackData = JSON.parse(apiResponse.feedback);
          if (feedbackData.review && typeof feedbackData.scores === 'number') {
            setPhotoFeedback(feedbackData.review);
            setPhotoScores(feedbackData.scores);
            
            // Handle photo submission using direct update
            const isCorrect = feedbackData.scores > 0;
            await updateStudentActivity(isCorrect, feedbackData.scores);
            
            // Update UI states
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
                userAnswer: 'Фото решение',
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
            
            setShowUploadPrompt(false);
          } else {
            toast.error('Неверный формат ответа API');
          }
        } catch (parseError) {
          console.error('Error parsing API response:', parseError);
          // Fallback to treating as plain text
          setPhotoFeedback(apiResponse.feedback);
          setPhotoScores(null);
          setShowUploadPrompt(false);
        }
      } else {
        toast.error('Не удалось получить обратную связь');
      }
    } catch (error) {
      console.error('Error in handlePhotoCheck:', error);
      toast.error('Произошла ошибка при обработке решения');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const clearPhotoFeedback = () => {
    setPhotoFeedback("");
    setPhotoScores(null);
  };

  const closePhotoDialog = () => {
    setShowPhotoDialog(false);
    setPhotoFeedback("");
    setPhotoScores(null);
  };

  return (
    <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto">

          {/* Header with Back Button */}
          <div className="relative text-center mb-16">
            {/* Back Button - positioned to the left */}
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
                <Link to="/egemathprof-practice">
                  <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                </Link>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              Практика по номеру
            </h1>
            {!practiceStarted && (
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Выберите номер(а) (1–19) для тренировки задач выбранного типа
              </p>
            )}
          </div>

          {!practiceStarted ? (
            /* Question Selection Interface */
            <div className="space-y-6">
              {/* Question Groups */}
              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-[#1a1f36]">Группы вопросов</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => toggleQuestionGroup('all')}
                      className="p-4 h-auto text-center border-[#1a1f36]/30 text-[#1a1f36] font-medium hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20 active:text-black transition-all"
                    >
                      Все вопросы
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toggleQuestionGroup('part1')}
                      className="p-4 h-auto text-center border-[#1a1f36]/30 text-[#1a1f36] font-medium hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20 active:text-black transition-all"
                    >
                      Часть 1 (1-12)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toggleQuestionGroup('part2')}
                      className="p-4 h-auto text-center border-[#1a1f36]/30 text-[#1a1f36] font-medium hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20 active:text-black transition-all"
                    >
                      Часть 2 (13-19)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Numbers */}
              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-[#1a1f36]">Отдельные номера</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Part 1 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Часть 1</h4>
                      <div className="grid grid-cols-6 gap-3">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                          <Button
                            key={num}
                            variant={selectedNumbers.includes(num.toString()) ? "default" : "outline"}
                            onClick={() => toggleIndividualNumber(num.toString())}
                            className={`p-3 h-auto font-medium text-sm ${
                              selectedNumbers.includes(num.toString())
                                ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] border-0 shadow-sm'
                                : 'border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20'
                            }`}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Part 2 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Часть 2</h4>
                      <div className="grid grid-cols-7 gap-3">
                        {Array.from({ length: 7 }, (_, i) => i + 13).map(num => (
                          <Button
                            key={num}
                            variant={selectedNumbers.includes(num.toString()) ? "default" : "outline"}
                            onClick={() => toggleIndividualNumber(num.toString())}
                            className={`p-3 h-auto font-medium text-sm ${
                              selectedNumbers.includes(num.toString())
                                ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] border-0 shadow-sm'
                                : 'border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20'
                            }`}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
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
                      <strong>Выбрано номеров:</strong> {selectedNumbers.sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : showStatistics ? (
            /* Statistics Window */
            <TestStatisticsWindow
              sessionResults={sessionResults}
              onStartNewTest={handleNewTest}
              onGoToQuestion={handleGoToQuestion}
            />
          ) : isReviewMode && reviewQuestionIndex !== null ? (
            /* Review Mode */
            <div className="space-y-6">
              <div className="flex gap-3 mb-6">
                <Button onClick={handleBackToSummary} variant="ghost" className="hover:bg-white/20 text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  К итогам
                </Button>
              </div>
              
              {currentQuestion && (
                <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                  <CardHeader className="border-b border-white/20">
                    <CardTitle className="text-[#1a1f36]">
                      Вопрос {currentQuestionIndex + 1} из {questions.length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="prose max-w-none text-[#1a1f36]">
                      <MathRenderer text={currentQuestion.problem_text || "Текст задачи не найден"} compiler="mathjax" />
                    </div>

                    {currentQuestion.solution_text && (
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

                    <div className="flex gap-3">
                      <Button onClick={handleBackToSummary} className="flex-1 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium">
                        Вернуться к итогам
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Practice Mode */
            currentQuestion && (
              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl mb-6">
                <CardHeader className="border-b border-white/20">
                  <CardTitle className="flex justify-between items-center text-[#1a1f36]">
                    <span>Вопрос {currentQuestionIndex + 1} из {questions.length}</span>
                    <span className="text-sm font-normal text-gray-600">ID: {currentQuestion.question_id}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Problem Text */}
                  <div className="prose max-w-none text-[#1a1f36]">
                    <MathRenderer text={currentQuestion.problem_text || "Текст задачи не найден"} compiler="mathjax" />
                  </div>

                  {/* Non-numeric Answer Note */}
                  {currentQuestion.answer && isNonNumericAnswer(currentQuestion.answer) && !isAnswered && (
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

                  {/* Answer Input */}
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Введите ваш ответ"
                        disabled={isAnswered}
                        onKeyPress={(e) => e.key === 'Enter' && !isAnswered && checkAnswer()}
                        className="flex-1 bg-white border-gray-300 text-[#1a1f36] placeholder:text-gray-500"
                      />
                      <Button
                        onClick={checkAnswer}
                        disabled={isAnswered || !userAnswer.trim()}
                        className="min-w-32 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium disabled:opacity-50 transition-all"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Проверить
                      </Button>
                    </div>

                    {/* Photo Attachment Button for questions 13-19 */}
                    {currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 13 && currentQuestion.problem_number_type <= 19 && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={handlePhotoAttachment}
                          className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Прикрепить фото
                        </Button>
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
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={handleShowSolution}
                      className="flex-1 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Решение
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowFormulaBooklet(true)}
                      className="flex-1 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Справочник формул
                    </Button>

                    {!isAnswered && (
                      <Button
                        variant="outline"
                        onClick={skipQuestion}
                        className="flex-1 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                      >
                        Пропустить
                      </Button>
                    )}
                    
                    {isAnswered && (
                      <>
                        {currentQuestionIndex < questions.length - 1 ? (
                          <Button onClick={nextQuestion} className="flex-1 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium transition-all">
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Дальше
                          </Button>
                        ) : (
                          <Button onClick={handleFinishTest} className="flex-1 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium transition-all">
                            Завершить тест
                          </Button>
                        )}
                      </>
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
            )
          )}

          </div>
        </div>
      </div>

      {/* Formula Booklet Dialog */}
      <FormulaBookletDialog open={showFormulaBooklet} onOpenChange={setShowFormulaBooklet} />

      {/* Photo Feedback Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={closePhotoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Результат проверки фото
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm text-gray-700 mb-2">Обратная связь:</p>
              <p className="text-sm">{photoFeedback}</p>
            </div>
            {photoScores !== null && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-medium text-sm text-blue-700 mb-1">Полученные баллы:</p>
                <p className="text-lg font-bold text-blue-800">{photoScores}</p>
              </div>
            )}
            <Button onClick={closePhotoDialog} className="w-full">
              Понятно
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram Not Connected Dialog */}
      <Dialog open={showTelegramNotConnected} onOpenChange={setShowTelegramNotConnected}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Telegram не подключен</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Для использования функции прикрепления фото необходимо подключить Telegram аккаунт в настройках профиля.
            </p>
            <Button 
              onClick={() => setShowTelegramNotConnected(false)} 
              className="w-full"
            >
              Понятно
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Prompt Dialog */}
      <Dialog open={showUploadPrompt} onOpenChange={setShowUploadPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Прикрепление фото
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Отправьте фото вашего решения в Telegram боте для автоматической проверки.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handlePhotoCheck}
                disabled={isProcessingPhoto}
                className="flex-1"
              >
                {isProcessingPhoto ? 'Обработка...' : 'Проверить фото'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowUploadPrompt(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeByNumberEgeProfMath;