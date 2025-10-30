import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FeedbackButton from "@/components/FeedbackButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, BookOpen, ArrowRight, Home, ArrowLeft, Camera, X } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { useStreakTracking } from "@/hooks/useStreakTracking";

import { awardStreakPoints, calculateStreakReward, getCurrentStreakData } from "@/services/streakPointsService";
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

// Photo analysis feedback types
interface PhotoAnalysisFeedback {
  scores: number;
  review: {
    meta: {
      rubric_max_score: number;
      notes: string;
    };
    final_answer: {
      student_latex: string;
      correct_latex: string;
      is_correct: boolean;
    };
    errors: Array<{
      id: string;
      type: string;
      severity: 'minor' | 'major';
      message: string;
      student_latex: string;
      expected_latex: string;
      explanation_latex: string;
      affects_final_answer: boolean;
      location: {
        line_start: number;
        line_end: number;
        char_start: number;
        char_end: number;
        snippet: string;
        bboxes: any[];
      };
      step_ref: {
        correct_step_index: number;
        student_match_quality: 'exact' | 'approx' | 'none';
      };
      suggested_fix_latex: string;
    }>;
    step_alignment: Array<{
      correct_step_index: number;
      correct_step_latex: string;
      student: {
        line_start: number;
        line_end: number;
        char_start: number;
        char_end: number;
        snippet: string;
      };
      match_quality: 'exact' | 'approx' | 'none';
    }>;
    marks: Array<{
      target_error_id: string;
      style: 'underline' | 'strike' | 'circle' | 'box' | 'arrow';
      note_latex: string;
    }>;
    overview_latex: string;
  };
}

// Simplified interface for new analysis format
interface AnalysisError {
  type: string;
  message: string;
  student_latex: string;
  expected_latex: string;
  context_snippet: string;
}

interface AnalysisData {
  scores: number;
  review: {
    errors: AnalysisError[];
    summary?: string;
  };
}

// HTML parsing interfaces for new format
interface ParsedError {
  type: string;
  description: string;
  studentSolution: string;
  correctSolution: string;
  context: string;
}

interface ParsedAnalysis {
  errors: ParsedError[];
  summary: {
    score: number;
    comment: string;
  };
}

const PracticeByNumberOgemath = () => {
  // Helper function to check if answer is non-numeric
  const isNonNumericAnswer = (answer: string): boolean => {
    if (!answer) return false;
    // Check if answer contains units (like кг, м, см, etc.)
    if (/\p{L}/u.test(answer)) return true;
    // Check if answer contains LaTeX expressions (contains backslashes)
    if (answer.includes('\\')) return true;
    // Check if answer contains mathematical expressions that aren't just numbers
    if (/[а-яё]/i.test(answer)) return true;
    return false;
  };
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
  
  // Removed streak animation popup state (no longer needed)
  
  // Auth required message state
  const [showAuthRequiredMessage, setShowAuthRequiredMessage] = useState(false);
  
  // Photo attachment states
  const [showTelegramNotConnected, setShowTelegramNotConnected] = useState(false);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string>("");
  const [photoScores, setPhotoScores] = useState<number | null>(null);
  const [structuredPhotoFeedback, setStructuredPhotoFeedback] = useState<PhotoAnalysisFeedback | null>(null);
  const [studentSolution, setStudentSolution] = useState<string>("");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [parsedAnalysis, setParsedAnalysis] = useState<ParsedAnalysis | null>(null);
  
  // Device upload states
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

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
            // Get most recent attempt based on updated_at
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
        // If no user, mark all as unseen
        allQuestions.forEach(question => {
          questionStatusMap[question.question_id] = { status: 'unseen', priority: 3 };
        });
      }

      // Sort questions by priority (1=highest priority, 4=lowest priority) and then randomly within each priority group
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
        ...priorityGroups[1], // unseen first
        ...priorityGroups[2], // unfinished second
        ...priorityGroups[3], // wrong third
        ...priorityGroups[4]  // correct last
      ];

      const selectedQuestions = sortedQuestions;

      setQuestions(selectedQuestions);
      setCurrentQuestionIndex(0);
      resetQuestionState();
      
      // Start attempt for the first question if user is logged in
      if (selectedQuestions.length > 0 && user) {
        await startAttempt(selectedQuestions[0].question_id);
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
    setUploadedImages([]);
    setPhotoFeedback("");
    setPhotoScores(null);
    setStructuredPhotoFeedback(null);
    setStudentSolution("");
    setOcrProgress("");
  };

  const toggleQuestionGroup = (groupType: string) => {
    let groupNumbers: string[] = [];
    
    switch (groupType) {
      case 'all':
        groupNumbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
        break;
      case 'part1':
        groupNumbers = ['1-5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
        break;
      case 'part2_algebra':
        groupNumbers = ['20', '21', '22'];
        break;
      case 'part2_geometry':
        groupNumbers = ['23', '24', '25'];
        break;
    }
    
    // Expand grouped numbers
    const expandedNumbers: string[] = [];
    groupNumbers.forEach(num => {
      if (num === '1-5') {
        expandedNumbers.push('1', '2', '3', '4', '5');
      } else {
        expandedNumbers.push(num);
      }
    });
    
    // Check if all numbers in the group are currently selected
    const allSelected = expandedNumbers.every(num => selectedNumbers.includes(num));
    
    // If all selected, deselect the group; otherwise, select the group
    if (allSelected) {
      setSelectedNumbers(prev => prev.filter(n => !expandedNumbers.includes(n)));
    } else {
      setSelectedNumbers(prev => {
        const newSelected = [...prev];
        expandedNumbers.forEach(num => {
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

      // Insert into student_activity table with skills and topics
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

  // Helper function to check if a string is purely numeric
  const isNumeric = (str: string): boolean => {
    // Remove spaces and check if the string contains only digits, dots, commas, and negative signs
    const cleaned = str.trim();
    // Check if it's purely numeric (digits, decimal separators, negative sign)
    return /^-?\d+([.,]\d+)?$/.test(cleaned);
  };

  // Helper function to sanitize numeric input
  const sanitizeNumericAnswer = (answer: string): string => {
    return answer.trim().replace(/\s/g, '').replace(',', '.');
  };

  const checkAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    // Check if user is authenticated
    if (!user) {
      setShowAuthRequiredMessage(true);
      // Hide message after 5 seconds
      setTimeout(() => setShowAuthRequiredMessage(false), 5000);
      return;
    }

    try {
      const correctAnswer = currentQuestion.answer;
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
        // Fetch streak for points calculation
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .single();
        
        const currentStreak = streakData?.current_streak || 0;
        // Calculate points: 2 base points for oge_math_fipi_bank, x10 if streak >= 3
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
        // Award energy points if correct
        isCorrect ? (async () => {
          const { data: streakData } = await supabase
            .from('user_streaks')
            .select('current_streak')
            .eq('user_id', user.id)
            .single();
          
          const currentStreak = streakData?.current_streak || 0;
          const { awardEnergyPoints: awardPoints } = await import('@/services/energyPoints');
          await awardPoints(user.id, 'problem', undefined, 'oge_math_fipi_bank', currentStreak);
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

      // Call handle_submission function
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

  // Update student_activity directly with answer results
  const updateStudentActivity = async (isCorrect: boolean, scores: number, isSkipped: boolean = false) => {
    if (!user || !currentAttemptId) return;

    try {
      // Calculate duration from attempt start time
      const now = new Date();
      const startTime = attemptStartTime || new Date();
      const durationInSeconds = (now.getTime() - startTime.getTime()) / 1000;

      // Update the student_activity row
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

    // Optimized skip: minimal database operations
    if (user && currentAttemptId && attemptStartTime) {
      try {
        // Calculate duration
        const now = new Date();
        const durationInSeconds = (now.getTime() - attemptStartTime.getTime()) / 1000;

        // Single UPDATE operation to mark as skipped
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

        // Fire-and-forget mastery update (don't wait for it)
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
    
    // Immediately move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
      
      // Start next attempt in background (don't block UI)
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
      
      // Mark question as wrong in database when solution is viewed before answering
      if (user && currentQuestion) {
        try {
          // If currentAttemptId is not set yet, start the attempt first
          let attemptId = currentAttemptId;
          let startTime = attemptStartTime;
          
          if (!attemptId || !startTime) {
            console.log('Starting attempt for question before marking as wrong:', currentQuestion.question_id);
            await startAttempt(currentQuestion.question_id);
            // Wait a bit for state to update
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

            // Update session results
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

            // Mark as answered and incorrect
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
      
      // Start attempt for the next question
      const nextQ = questions[currentQuestionIndex + 1];
      if (nextQ && user) {
        await startAttempt(nextQ.question_id);
      }
    } else {
      toast.success("Все вопросы завершены!");
    }
  };

  // Photo attachment functionality
  const handlePhotoAttachment = async () => {
    if (!user) {
      setShowAuthRequiredMessage(true);
      setTimeout(() => setShowAuthRequiredMessage(false), 5000);
      return;
    }

    try {
      // Check if user has telegram_user_id
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
            // Set structured feedback
            setStructuredPhotoFeedback(feedbackData);
            setPhotoFeedback(feedbackData.review.overview_latex || '');
            setPhotoScores(feedbackData.scores);
            
            // Handle photo submission using direct update
            const isCorrect = feedbackData.scores > 0;
            await updateStudentActivity(isCorrect, feedbackData.scores);
            
            // Update UI states
            setIsCorrect(isCorrect);
            setIsAnswered(true);
            
            setShowUploadPrompt(false);
          } else {
            toast.error('Неверный формат ответа API');
          }
        } catch (parseError) {
          console.error('Error parsing API response:', parseError);
          // Fallback to treating as plain text
          setPhotoFeedback(apiResponse.feedback);
          setPhotoScores(null);
          setStructuredPhotoFeedback(null);
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

  // Handle device upload (multiple files)
  const handleDeviceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    const remainingSlots = 3 - uploadedImages.length;
    if (remainingSlots === 0) {
      toast.error('Максимум 3 файла');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImages: string[] = [];
    let processedCount = 0;

    filesToProcess.forEach((file) => {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        toast.error('Пожалуйста, загрузите только изображения');
        return;
      }

      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Файл ${file.name} слишком большой. Максимальный размер: 20MB`);
        return;
      }

      // Read the file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newImages.push(result);
        processedCount++;

        if (processedCount === filesToProcess.length) {
          setUploadedImages(prev => [...prev, ...newImages]);
          toast.success(`Загружено ${newImages.length} фото`);
        }
      };
      reader.onerror = () => {
        toast.error('Ошибка при загрузке файла');
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    event.target.value = '';
  };

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageClick = (image: string) => {
    setSelectedPreviewImage(image);
    setShowImagePreview(true);
  };

  const clearPhotoFeedback = () => {
    setPhotoFeedback("");
    setPhotoScores(null);
    setStructuredPhotoFeedback(null);
    setStudentSolution("");
  };

  const fetchStudentSolution = async () => {
    if (!user) return null;
    
    try {
      // Fetch the most recent extracted_text for the current user
      // @ts-ignore - Supabase type instantiation issue
      const { data, error } = await supabase
        .from('telegram_uploads')
        .select('extracted_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching student solution:', error);
        return null;
      }

      return data?.extracted_text || '';
    } catch (error) {
      console.error('Error in fetchStudentSolution:', error);
      return null;
    }
  };

  // Function to parse HTML analysis format
  const parseHtmlAnalysis = (htmlContent: string): ParsedAnalysis | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const errors: ParsedError[] = [];
      const errorDivs = doc.querySelectorAll('div.error');
      
      errorDivs.forEach((div) => {
        const typeMatch = div.innerHTML.match(/<b>Тип ошибки:<\/b>\s*(.+?)<br>/);
        const descriptionMatch = div.innerHTML.match(/<b>Описание:<\/b>\s*(.+?)<br>/);
        const studentMatch = div.innerHTML.match(/<b>Решение ученика:<\/b>\s*(.+?)<br>/);
        const correctMatch = div.innerHTML.match(/<b>Правильное решение:<\/b>\s*(.+?)<br>/);
        const contextMatch = div.innerHTML.match(/<b>Контекст:<\/b>\s*<pre>(.+?)<\/pre>/);
        
        if (typeMatch && descriptionMatch && studentMatch && correctMatch) {
          errors.push({
            type: typeMatch[1].trim(),
            description: descriptionMatch[1].trim(),
            studentSolution: studentMatch[1].trim(),
            correctSolution: correctMatch[1].trim(),
            context: contextMatch ? contextMatch[1].trim() : ''
          });
        }
      });
      
      const summaryDiv = doc.querySelector('div.summary');
      let summary = { score: 0, comment: '' };
      
      if (summaryDiv) {
        const scoreMatch = summaryDiv.innerHTML.match(/<b>Оценка:<\/b>\s*(\d+)/);
        const commentMatch = summaryDiv.innerHTML.match(/<b>Комментарий:<\/b>\s*(.+?)(?:$|<br>)/);
        
        summary = {
          score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
          comment: commentMatch ? commentMatch[1].trim() : ''
        };
      }
      
      return { errors, summary };
    } catch (error) {
      console.error('Error parsing HTML analysis:', error);
      return null;
    }
  };

  const fetchAnalysisData = async () => {
    if (!user) return null;
    
    try {
      // @ts-ignore - Type instantiation is excessively deep
      const { data, error } = await supabase
        .from('photo_analysis_outputs')
        .select('raw_output')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching analysis data:', error);
        return null;
      }

      if (data?.raw_output) {
        try {
          const jsonData = JSON.parse(data.raw_output);
          
          // Parse the HTML content from review key
          if (jsonData.review && typeof jsonData.review === 'string') {
            const parsedHtml = parseHtmlAnalysis(jsonData.review);
            if (parsedHtml) {
              setParsedAnalysis(parsedHtml);
              // Also set the scores from the main JSON
              setAnalysisData({ scores: jsonData.scores || 0, review: { errors: [], summary: '' } });
              return { ...jsonData, parsedHtml };
            }
          }
          
          return null;
        } catch (parseError) {
          console.error('Error parsing analysis data:', parseError);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('Error in fetchAnalysisData:', error);
      return null;
    }
  };

  const handleDevicePhotoCheck = async () => {
    if (!user || !currentQuestion) return;
    if (uploadedImages.length === 0) return;

    setIsProcessingPhoto(true);
    setUploadProgress(0);
    setAnalysisProgress(0);
    setOcrProgress(`Обработка фото 1 из ${uploadedImages.length}...`);

    try {
      // Step 1: Process photos via new edge function
      // Animate upload progress from 0 to 100
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(uploadInterval);
            return 95;
          }
          return prev + 2;
        });
      }, 50);

      const { data: processData, error: processError } = await supabase.functions.invoke('process-device-photos', {
        body: {
          user_id: user.id,
          images: uploadedImages,
          question_id: currentQuestion.question_id
        }
      });

      clearInterval(uploadInterval);
      setUploadProgress(100);

      if (processError || !processData?.success) {
        console.error('Error processing device photos:', processError);
        toast.error(processData?.error || 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.');
        setIsProcessingPhoto(false);
        setOcrProgress("");
        setUploadProgress(0);
        setAnalysisProgress(0);
        return;
      }

      // Step 2: Get the LaTeX from profiles.telegram_input
      setOcrProgress("Анализ решения...");
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('telegram_input')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.telegram_input) {
        console.error('Error getting telegram input:', profileError);
        toast.error('Ошибка при получении данных');
        setIsProcessingPhoto(false);
        setOcrProgress("");
        return;
      }

      // Step 3: Call existing analyze-photo-solution function
      // Animate analysis progress from 0 to 100
      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) {
            clearInterval(analysisInterval);
            return 95;
          }
          return prev + 2;
        });
      }, 50);

      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('analyze-photo-solution', {
        body: {
          student_solution: profile.telegram_input,
          problem_text: currentQuestion.problem_text,
          solution_text: currentQuestion.solution_text,
          user_id: user.id,
          question_id: currentQuestion.question_id,
          problem_number: currentQuestion.problem_number_type
        }
      });

      clearInterval(analysisInterval);
      setAnalysisProgress(100);

      if (apiError) {
        console.error('Error calling analyze-photo-solution:', apiError);
        if (apiResponse?.retry_message) {
          toast.error(apiResponse.retry_message);
        } else {
          toast.error('Ошибка API. Попробуйте ввести решение снова.');
        }
        setIsProcessingPhoto(false);
        setOcrProgress("");
        setUploadProgress(0);
        setAnalysisProgress(0);
        return;
      }

      // Step 4: Process feedback
      if (apiResponse?.feedback) {
        try {
          const feedbackData = JSON.parse(apiResponse.feedback);
          if (feedbackData.review && typeof feedbackData.scores === 'number') {
            // Set structured feedback
            setStructuredPhotoFeedback(feedbackData);
            setPhotoFeedback(feedbackData.review.overview_latex || '');
            setPhotoScores(feedbackData.scores);
            
            const isCorrect = feedbackData.scores > 0;
            await updateStudentActivity(isCorrect, feedbackData.scores);
            
            setIsCorrect(isCorrect);
            setIsAnswered(true);
            
            // Always fetch and show student solution and analysis after marking
            const solution = await fetchStudentSolution();
            if (solution) {
              setStudentSolution(solution);
            }
            
            // Fetch analysis data
            const analysis = await fetchAnalysisData();
            if (analysis) {
              setAnalysisData(analysis);
            }
            
            // Clear uploaded images for next question
            setUploadedImages([]);
          } else {
            toast.error('Неверный формат ответа API');
          }
        } catch (parseError) {
          console.error('Error parsing API response:', parseError);
          setPhotoFeedback(apiResponse.feedback);
          setPhotoScores(null);
          setStructuredPhotoFeedback(null);
        }
      } else {
        toast.error('Не удалось получить обратную связь');
      }
    } catch (error) {
      console.error('Error in handleDevicePhotoCheck:', error);
      toast.error('Произошла ошибка при обработке решения');
      setIsProcessingPhoto(false);
      setOcrProgress("");
      setUploadProgress(0);
      setAnalysisProgress(0);
    } finally {
      setIsProcessingPhoto(false);
      setOcrProgress("");
      setUploadProgress(0);
      setAnalysisProgress(0);
    }
  };

  const questionNumbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());

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
                <Link to="/ogemath-practice">
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
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Выберите номер(а) для тренировки задач выбранного типа
            </p>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      Часть 1
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toggleQuestionGroup('part2_algebra')}
                      className="p-4 h-auto text-center border-[#1a1f36]/30 text-[#1a1f36] font-medium hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20 active:text-black transition-all"
                    >
                      Часть 2 Алгебра
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toggleQuestionGroup('part2_geometry')}
                      className="p-4 h-auto text-center border-[#1a1f36]/30 text-[#1a1f36] font-medium hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20 active:text-black transition-all"
                    >
                      Часть 2 Геометрия
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
                    {/* Part 1 - Left Column */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Часть 1</h4>
                      
                      {/* Part 1 Algebra */}
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Алгебра (№1-14)</h5>
                        <div className="grid grid-cols-5 gap-3">
                          {/* Special button for questions 1-5 */}
                          <Button
                            variant={selectedNumbers.includes('1') && selectedNumbers.includes('2') && 
                                    selectedNumbers.includes('3') && selectedNumbers.includes('4') && 
                                    selectedNumbers.includes('5') ? "default" : "outline"}
                            onClick={() => {
                              const group = ['1', '2', '3', '4', '5'];
                              const allSelected = group.every(n => selectedNumbers.includes(n));
                              if (allSelected) {
                                setSelectedNumbers(prev => prev.filter(n => !group.includes(n)));
                              } else {
                                setSelectedNumbers(prev => [...new Set([...prev, ...group])]);
                              }
                            }}
                            className={`p-3 h-auto font-medium transition-all ${
                              selectedNumbers.includes('1') && selectedNumbers.includes('2') && 
                              selectedNumbers.includes('3') && selectedNumbers.includes('4') && 
                              selectedNumbers.includes('5')
                                ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] border-0 shadow-sm'
                                : 'border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 active:bg-gradient-to-r active:from-yellow-500/20 active:to-emerald-500/20'
                            }`}
                          >
                            1-5
                          </Button>
                          
                          {/* Individual number buttons 6-14 */}
                          {Array.from({ length: 9 }, (_, i) => i + 6).map(num => (
                            <Button
                              key={num}
                              variant={selectedNumbers.includes(num.toString()) ? "default" : "outline"}
                              onClick={() => toggleIndividualNumber(num.toString())}
                              className={`p-3 h-auto font-medium ${
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

                      {/* Part 1 Geometry */}
                      <div>
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Геометрия (№15-19)</h5>
                        <div className="grid grid-cols-5 gap-3">
                          {Array.from({ length: 5 }, (_, i) => i + 15).map(num => (
                            <Button
                              key={num}
                              variant={selectedNumbers.includes(num.toString()) ? "default" : "outline"}
                              onClick={() => toggleIndividualNumber(num.toString())}
                              className={`p-3 h-auto font-medium ${
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

                    {/* Part 2 - Right Column */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Часть 2</h4>
                      
                      {/* Part 2 Algebra */}
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Алгебра (№20-22)</h5>
                        <div className="grid grid-cols-3 gap-3">
                          {Array.from({ length: 3 }, (_, i) => i + 20).map(num => (
                            <Button
                              key={num}
                              variant={selectedNumbers.includes(num.toString()) ? "default" : "outline"}
                              onClick={() => toggleIndividualNumber(num.toString())}
                              className={`p-3 h-auto font-medium ${
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

                      {/* Part 2 Geometry */}
                      <div className="mt-20">
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Геометрия (№23-25)</h5>
                        <div className="grid grid-cols-3 gap-3">
                          {Array.from({ length: 3 }, (_, i) => i + 23).map(num => (
                            <Button
                              key={num}
                              variant={selectedNumbers.includes(num.toString()) ? "default" : "outline"}
                              onClick={() => toggleIndividualNumber(num.toString())}
                              className={`p-3 h-auto font-medium ${
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
            <Card className="mb-6 bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
               <CardHeader className="border-b border-white/20">
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 text-[#1a1f36]">
                    <span className="text-lg sm:text-xl">Вопрос №{currentQuestion.problem_number_type} ({currentQuestionIndex + 1} из {questions.length})</span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                      <Button
                        onClick={() => setShowFormulaBooklet(true)}
                        variant="outline"
                        className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 w-full sm:w-auto"
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Введите ваш ответ"
                      disabled={isAnswered || solutionViewedBeforeAnswer}
                      onKeyPress={(e) => e.key === 'Enter' && !isAnswered && !solutionViewedBeforeAnswer && checkAnswer()}
                      className="flex-1 w-full bg-white border-gray-300 text-[#1a1f36] placeholder:text-gray-500"
                    />
                    <Button
                      onClick={async () => {
                        if (uploadedImages.length > 0) {
                          await handleDevicePhotoCheck();
                        } else {
                          await checkAnswer();
                        }
                      }}
                      disabled={
                        isAnswered || 
                        solutionViewedBeforeAnswer || 
                        isProcessingPhoto || 
                        (!userAnswer.trim() && uploadedImages.length === 0)
                      }
                      className="w-full sm:w-auto min-w-32 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium disabled:opacity-50 transition-all"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isProcessingPhoto ? 'Обработка...' : 'Проверить'}
                    </Button>
                    <div className="flex sm:items-center sm:ml-2">
                      <FeedbackButton
                        contentType="frq_question"
                        contentRef={String(currentQuestion.question_id)}
                      />
                    </div>
                  </div>
                  
                  {/* OCR Progress Display */}
                  {ocrProgress && (
                    <div className="text-center text-sm text-muted-foreground">
                      {ocrProgress}
                    </div>
                  )}

                  <div className="space-y-4">
                  </div>

                  {/* Note for part 2 questions (20-25) requiring photo upload */}
                  {currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 20 && (
                    <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="font-medium text-yellow-800 mb-2">
                        Важно: это задание требует развёрнутого решения.
                      </div>
                      <div className="mb-2">
                        Пожалуйста, загрузите фотографию вашего решения, и ваш AI-учитель проверит его для вас.
                      </div>
                      <div className="font-medium text-yellow-700">
                        Пишите чётко и разборчиво, решение и ответ.
                      </div>
                    </div>
                  )}

                  {/* Note for non-numeric answers in part 1 */}
                  {currentQuestion.problem_number_type && currentQuestion.problem_number_type < 20 && currentQuestion.answer && isNonNumericAnswer(currentQuestion.answer) && (
                    <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="font-medium text-yellow-800 mb-2">
                        Важно: форма ответа не имеет значения.
                      </div>
                      <div className="mb-2">
                        Вы можете записать ответ в любом виде -- главное, чтобы он был математически верным.
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

                  {/* Photo Attachment Buttons for questions 20+ */}
                  {currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 20 && (
                    <div className="space-y-3">
                      <div className="flex gap-3 justify-center flex-wrap">
                        <Button
                          variant="outline"
                          onClick={handlePhotoAttachment}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Загрузить через Telegram
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('device-upload-input')?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Загрузить с устройства
                        </Button>
                        <input
                          id="device-upload-input"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleDeviceUpload}
                        />
                      </div>
                      
                      {/* Image Previews */}
                      {uploadedImages.length > 0 && (
                        <div className="flex justify-center gap-3 flex-wrap">
                          {uploadedImages.map((image, index) => (
                            <div key={index} className="relative inline-block">
                              <img
                                src={image}
                                alt={`Uploaded solution ${index + 1}`}
                                className="max-w-xs max-h-48 rounded-lg border-2 border-primary/20 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => handleImageClick(image)}
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={() => handleRemoveUploadedImage(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {uploadedImages.length > 0 && uploadedImages.length < 3 && (
                        <div className="text-xs text-center text-gray-500">
                          Загружено {uploadedImages.length} из 3 фото
                        </div>
                      )}
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
                    <div className="space-y-4">
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

                      {/* Show Student Solution and Analysis for photo uploads - always show after marking */}
                      {studentSolution && currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 20 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Student Solution */}
                          <Card className="bg-blue-50 border-blue-200">
                            <CardHeader>
                              <CardTitle className="text-blue-800">Ваше решение</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="bg-white border border-blue-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <MathRenderer text={studentSolution} compiler="mathjax" />
                              </div>
                            </CardContent>
                          </Card>

                          {/* Analysis */}
                          {parsedAnalysis && (
                            <Card className="bg-purple-50 border-purple-200">
                              <CardHeader>
                                <CardTitle className="text-purple-800">Анализ решения</CardTitle>
                                <CardDescription>
                                  Оценка: {parsedAnalysis.summary.score}/2
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                  {parsedAnalysis.errors.length > 0 ? (
                                    parsedAnalysis.errors.map((error, index) => (
                                      <Card key={index} className="bg-white border border-purple-200">
                                        <CardContent className="pt-4">
                                          <div className="space-y-3">
                                            <Badge variant="destructive" className="text-xs">{error.type}</Badge>
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                              <p className="text-sm text-blue-800 font-medium">Описание:</p>
                                              <p className="text-sm text-gray-700 mt-1">{error.description}</p>
                                            </div>
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                <p className="text-sm text-red-800 font-medium">Решение ученика:</p>
                                              </div>
                                              <MathRenderer text={error.studentSolution} compiler="mathjax" />
                                            </div>
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <p className="text-sm text-green-800 font-medium">Правильное решение:</p>
                                              </div>
                                              <MathRenderer text={error.correctSolution} compiler="mathjax" />
                                            </div>
                                            {error.context && (
                                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                                <p className="text-sm text-gray-800 font-medium">Контекст:</p>
                                                <MathRenderer text={error.context} compiler="mathjax" />
                                              </div>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))
                                  ) : (
                                    <div className="text-center py-8 text-gray-500">
                                      Ошибок не найдено. Отличная работа! 🎉
                                    </div>
                                  )}
                                  
                                  {/* Summary */}
                                  {parsedAnalysis.summary.comment && (
                                    <Card className="bg-green-50 border-green-200 mt-4">
                                      <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge className="bg-green-600 text-white">{parsedAnalysis.summary.score}/2</Badge>
                                          <p className="text-sm font-semibold text-green-800">Общая оценка:</p>
                                        </div>
                                        <MathRenderer text={parsedAnalysis.summary.comment} compiler="mathjax" />
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                 {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleShowSolution}
                    className="flex-1 min-w-32 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Показать решение
                  </Button>
                  
                  {!isAnswered && (
                    <Button
                      variant="outline"
                      onClick={skipQuestion}
                      className="flex-1 min-w-32 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
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

                {/* Photo Feedback */}
                {photoFeedback && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center justify-between">
                        Обратная связь по решению
                        <Button variant="ghost" size="sm" onClick={clearPhotoFeedback}>
                          <X className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        {/* Student Solution */}
                        {studentSolution && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-blue-800 mb-3">Ваше решение</h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <MathRenderer text={studentSolution} compiler="mathjax" />
                            </div>
                          </div>
                        )}

                        {/* Overview */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-green-800 mb-3">Общая оценка</h3>
                          <MathRenderer text={photoFeedback} compiler="mathjax" />
                        </div>

                        {/* Score Display */}
                        {photoScores !== null && (
                          <div className="mb-6 p-4 bg-green-100 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold text-green-800">
                                Баллы: {photoScores} из 2
                              </span>
                              <div className="flex space-x-2">
                                {[1, 2].map((score) => (
                                  <div
                                    key={score}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                      score <= photoScores
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                    }`}
                                  >
                                    {score}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Structured Feedback */}
                        {structuredPhotoFeedback && (
                          <div className="space-y-6">
                            {/* Final Answer Comparison */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-semibold text-blue-800 mb-3">Сравнение ответов</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-blue-700 mb-2">Ваш ответ:</p>
                                  <div className="bg-white p-3 rounded border">
                                    <MathRenderer 
                                      text={structuredPhotoFeedback.review.final_answer.student_latex} 
                                      compiler="mathjax" 
                                    />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-blue-700 mb-2">Правильный ответ:</p>
                                  <div className="bg-white p-3 rounded border">
                                    <MathRenderer 
                                      text={structuredPhotoFeedback.review.final_answer.correct_latex} 
                                      compiler="mathjax" 
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                  structuredPhotoFeedback.review.final_answer.is_correct
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {structuredPhotoFeedback.review.final_answer.is_correct ? '✓ Правильно' : '✗ Неправильно'}
                                </span>
                              </div>
                            </div>

                            {/* Errors */}
                            {structuredPhotoFeedback.review.errors.length > 0 && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="font-semibold text-red-800 mb-3">
                                  Найденные ошибки ({structuredPhotoFeedback.review.errors.length})
                                </h4>
                                <div className="space-y-4">
                                  {structuredPhotoFeedback.review.errors.map((error, index) => (
                                    <div key={error.id} className="bg-white border border-red-200 rounded-lg p-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-red-700">
                                            Ошибка {index + 1}
                                          </span>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            error.severity === 'major' 
                                              ? 'bg-red-100 text-red-800' 
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {error.severity === 'major' ? 'Критическая' : 'Незначительная'}
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500">{error.type}</span>
                                      </div>
                                      
                                      <p className="text-sm text-gray-700 mb-3">{error.message}</p>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <div>
                                          <p className="text-xs font-medium text-gray-600 mb-1">Ваше решение:</p>
                                          <div className="bg-gray-50 p-2 rounded text-sm">
                                            <MathRenderer text={error.student_latex} compiler="mathjax" />
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-gray-600 mb-1">Правильно должно быть:</p>
                                          <div className="bg-gray-50 p-2 rounded text-sm">
                                            <MathRenderer text={error.expected_latex} compiler="mathjax" />
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="bg-blue-50 p-3 rounded">
                                        <p className="text-xs font-medium text-blue-700 mb-1">Объяснение:</p>
                                        <MathRenderer text={error.explanation_latex} compiler="mathjax" />
                                      </div>
                                      
                                      {error.suggested_fix_latex && (
                                        <div className="bg-green-50 p-3 rounded mt-2">
                                          <p className="text-xs font-medium text-green-700 mb-1">Рекомендация:</p>
                                          <MathRenderer text={error.suggested_fix_latex} compiler="mathjax" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Step Alignment */}
                            {structuredPhotoFeedback.review.step_alignment.length > 0 && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h4 className="font-semibold text-purple-800 mb-3">Пошаговое сравнение</h4>
                                <div className="space-y-3">
                                  {structuredPhotoFeedback.review.step_alignment.map((step, index) => (
                                    <div key={index} className="bg-white border border-purple-200 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-purple-700">
                                          Шаг {step.correct_step_index + 1}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          step.match_quality === 'exact' 
                                            ? 'bg-green-100 text-green-800'
                                            : step.match_quality === 'approx'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {step.match_quality === 'exact' ? 'Точно' : 
                                           step.match_quality === 'approx' ? 'Примерно' : 'Не найдено'}
                                        </span>
                                      </div>
                                      <div className="bg-gray-50 p-2 rounded">
                                        <MathRenderer text={step.correct_step_latex} compiler="mathjax" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Evaluator Notes */}
                            {structuredPhotoFeedback.review.meta.notes && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Комментарий преподавателя</h4>
                                <p className="text-sm text-gray-700">{structuredPhotoFeedback.review.meta.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
            ) : null
          )}


          {/* Results Summary */}
          {practiceStarted && questions.length > 0 && !showStatistics && (
            <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
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

      {/* Streak Animation removed - energy points animation is now in header */}

      {/* Telegram Not Connected Dialog */}
      <Dialog open={showTelegramNotConnected} onOpenChange={setShowTelegramNotConnected}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              Telegram не подключен
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-700">
              Зайдите в Дашборд и потвердите Telegram код.
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setShowTelegramNotConnected(false)}>
              Понятно
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Prompt Dialog */}
      <Dialog open={showUploadPrompt} onOpenChange={setShowUploadPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Загрузка фото решения</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted border rounded-lg">
              <p>
                Загрузите фото в телеграм бот egechat_bot. Уже загрузили? Нажмите кнопку 'Да'
              </p>
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={handlePhotoCheck}
                disabled={isProcessingPhoto}
                className="min-w-24"
              >
                {isProcessingPhoto ? 'Обработка...' : 'Да'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Formula Booklet Dialog */}
      <FormulaBookletDialog 
        open={showFormulaBooklet} 
        onOpenChange={setShowFormulaBooklet} 
      />

      {/* Image Preview Dialog */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Загруженное решение</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={selectedPreviewImage || ''}
              alt="Uploaded solution full size"
              className="max-w-full max-h-[70vh] rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Dialog with Two Loading Bars */}
      <Dialog open={isProcessingPhoto && uploadedImages.length > 0} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center">Обработка решения</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Upload Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">1. Загрузка фото</span>
                <span className="text-gray-500">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            {/* Analysis Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">2. Анализ решения</span>
                <span className="text-gray-500">{Math.round(analysisProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeByNumberOgemath;
