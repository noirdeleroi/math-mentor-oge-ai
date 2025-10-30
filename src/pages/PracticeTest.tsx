
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, BookOpen, ArrowRight, ArrowLeft, Camera, X } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { useStreakTracking } from "@/hooks/useStreakTracking";
import { awardStreakPoints, calculateStreakReward } from "@/services/streakPointsService";
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

// Auto-start with this question
const AUTO_QUESTION_ID = 'OGE_FIPI_2296_94_642065' as const;

const PracticeTest = () => {
  // Helper function to check if answer is non-numeric
  const isNonNumericAnswer = (answer: string): boolean => {
    if (!answer) return false;
    if (/\p{L}/u.test(answer)) return true;         // contains letters/units
    if (answer.includes('\\')) return true;         // latex
    if (/[а-яё]/i.test(answer)) return true;        // cyrillic words
    return false;
  };

  const { user } = useAuth();
  const { trackActivity } = useStreakTracking();

  // Function to highlight context in student solution
  const highlightContextInSolution = (solution: string, context: string): string => {
    if (!context || !solution) return solution;
    
    // Extract content from <pre> tags if they exist
    let contextToUse = context;
    const preMatch = context.match(/<pre>(.*?)<\/pre>/s);
    if (preMatch) {
      contextToUse = preMatch[1].trim();
    }
    
    // Extract the actual math content from context (remove LaTeX delimiters and clean up)
    const cleanContext = contextToUse
      .replace(/\$\$/g, '')
      .replace(/\$/g, '')
      .replace(/\\text\{[^}]*\}/g, '') // Remove \text{} commands
      .replace(/\\leftarrow/g, '←') // Convert LaTeX arrows
      .replace(/\\rightarrow/g, '→')
      .replace(/\\pm/g, '±')
      .replace(/\\cdot/g, '·')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\infty/g, '∞')
      .replace(/\\pi/g, 'π')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\epsilon/g, 'ε')
      .replace(/\\theta/g, 'θ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\mu/g, 'μ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\tau/g, 'τ')
      .replace(/\\phi/g, 'φ')
      .replace(/\\omega/g, 'ω')
      .replace(/\\Gamma/g, 'Γ')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\Theta/g, 'Θ')
      .replace(/\\Lambda/g, 'Λ')
      .replace(/\\Sigma/g, 'Σ')
      .replace(/\\Phi/g, 'Φ')
      .replace(/\\Omega/g, 'Ω')
      .trim();
    
    if (!cleanContext) return solution;
    
    // Create a regex to find the context in the solution
    // First normalize backslashes to handle \\ and \ equivalently
    const normalizedContext = cleanContext.replace(/\\\\/g, '\\');
    
    // Then escape special regex characters
    const escapedContext = normalizedContext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create a more flexible regex that matches both \\ and \ versions
    const flexibleRegex = escapedContext.replace(/\\/g, '(\\\\|\\\\)');
    
    // Try to find and highlight the context
    const regex = new RegExp(`(${flexibleRegex})`, 'gi');
    const highlighted = solution.replace(regex, '<mark class="bg-yellow-300 px-1 rounded font-semibold">$1</mark>');
    
    return highlighted;
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

  // SELECTION STATE REMAINS BUT WE START IN PRACTICE MODE
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [practiceStarted, setPracticeStarted] = useState(true);   // was false
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionViewedBeforeAnswer, setSolutionViewedBeforeAnswer] = useState(false);
  const [loading, setLoading] = useState(true);                   // start loading immediately
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

  // --- NEW: start directly with the target question ---
  const startWithQuestionId = async (qid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oge_math_fipi_bank')
        .select('question_id, problem_text, answer, solution_text, problem_number_type, problem_image')
        .eq('question_id', qid)
        .maybeSingle();

      if (error || !data) {
        console.error('Question not found or error:', error);
        toast.error('Вопрос не найден');
        return;
      }

      setQuestions([data]);
      setCurrentQuestionIndex(0);
      resetQuestionState();

      if (user) {
        await startAttempt(data.question_id);
      }
    } catch (e) {
      console.error('Error loading question by id:', e);
      toast.error('Ошибка загрузки вопроса');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startWithQuestionId(AUTO_QUESTION_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleBackToSelection = () => {
    // kept for compatibility if needed, but selection UI is hidden now
    setPracticeStarted(true);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    resetQuestionState();
    setSessionResults([]);
    setShowStatistics(false);
    // immediately reload the auto question
    startWithQuestionId(AUTO_QUESTION_ID);
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
        if (!detailsErr && detailsResp?.data) {
          skillsArray = Array.isArray(detailsResp.data.skills_list) ? detailsResp.data.skills_list : [];
          topicsArray = Array.isArray(detailsResp.data.topics_list) ? detailsResp.data.topics_list : [];
          if (detailsResp.data.problem_number_type) {
            problemNumberType = parseInt(detailsResp.data.problem_number_type.toString(), 10);
          }
        }
      } catch (e) {
        console.warn('get-question-details fallback:', e);
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
          topics: topicsArray.length ? topicsArray : null
        })
        .select('attempt_id')
        .single();

      if (!error && data) {
        setCurrentAttemptId(data.attempt_id);
        setAttemptStartTime(new Date());
      }
    } catch (error) {
      console.error('Error starting attempt:', error);
    }
  };

  const isNumeric = (str: string): boolean => /^-?\d+([.,]\d+)?$/.test(str.trim());
  const sanitizeNumericAnswer = (answer: string): string => answer.trim().replace(/\s/g, '').replace(',', '.');

  const checkAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    if (!user) {
      setShowAuthRequiredMessage(true);
      setTimeout(() => setShowAuthRequiredMessage(false), 5000);
      return;
    }

    try {
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

      const ok = data?.is_correct || false;
      setIsCorrect(ok);
      setIsAnswered(true);

      setSessionResults(prev => {
        const newResults = [...prev];
        const existingIndex = newResults.findIndex(r => r.questionIndex === currentQuestionIndex);
        const result = {
          questionIndex: currentQuestionIndex,
          questionId: currentQuestion.question_id,
          isCorrect: ok,
          userAnswer: userAnswer.trim(),
          correctAnswer: currentQuestion.answer,
          problemText: currentQuestion.problem_text,
          solutionText: currentQuestion.solution_text,
          isAnswered: true
        };
        if (existingIndex >= 0) newResults[existingIndex] = result; else newResults.push(result);
        return newResults;
      });

      if (ok) {
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .single();
        const currentStreak = streakData?.current_streak || 0;
        const basePoints = 2;
        const pointsToShow = currentStreak >= 3 ? basePoints * 10 : basePoints;
        (window as any).triggerEnergyPointsAnimation?.(pointsToShow);
      }

      Promise.all([
        updateStudentActivity(ok, 0),
        submitToHandleSubmission(ok),
        awardStreakPoints(user.id, calculateStreakReward(currentQuestion.difficulty)),
        ok ? (async () => {
          const { data: streakData } = await supabase
            .from('user_streaks')
            .select('current_streak')
            .eq('user_id', user.id)
            .single();
          const currentStreak = streakData?.current_streak || 0;
          const { awardEnergyPoints: awardPoints } = await import('@/services/energyPoints');
          await awardPoints(user.id, 'problem', undefined, 'oge_math_fipi_bank', currentStreak);
        })() : Promise.resolve()
      ]).catch(err => console.error('Background ops error:', err));
    } catch (error) {
      console.error('Error in checkAnswer:', error);
      toast.error('Ошибка при проверке ответа');
    }
  };

  const submitToHandleSubmission = async (isCorrect: boolean) => {
    if (!user) return;
    try {
      const { data: activityData } = await supabase
        .from('student_activity')
        .select('question_id, attempt_id, finished_or_not, duration_answer, scores_fipi')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!activityData) return;

      const submissionData = {
        user_id: user.id,
        question_id: activityData.question_id,
        attempt_id: activityData.attempt_id,
        finished_or_not: activityData.finished_or_not,
        is_correct: isCorrect,
        duration: activityData.duration_answer,
        scores_fipi: activityData.scores_fipi
      };

      const { error } = await supabase.functions.invoke('handle-submission', {
        body: { course_id: '1', submission_data: submissionData }
      });

      if (error) {
        console.error('Error in handle-submission:', error);
        toast.error('Ошибка при обработке ответа');
      }
    } catch (error) {
      console.error('Error in submitToHandleSubmission:', error);
    }
  };

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

      if (updateError) console.error('Error updating student_activity:', updateError);
    } catch (error) {
      console.error('Error in updateStudentActivity:', error);
    }
  };

  const skipQuestion = async () => {
    if (!currentQuestion) return;

    if (user && currentAttemptId && attemptStartTime) {
      try {
        const now = new Date();
        const durationInSeconds = (now.getTime() - attemptStartTime.getTime()) / 1000;

        await supabase
          .from('student_activity')
          .update({
            duration_answer: durationInSeconds,
            is_correct: false,
            scores_fipi: 0,
            finished_or_not: true
          })
          .eq('user_id', user.id)
          .eq('attempt_id', currentAttemptId);

        submitToHandleSubmission(false).catch(e => console.error('BG mastery update failed:', e));
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
      if (existingIndex >= 0) newResults[existingIndex] = result; else newResults.push(result);
      return newResults;
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
      const nextQuestion = questions[currentQuestionIndex + 1];
      if (nextQuestion && user) startAttempt(nextQuestion.question_id).catch(e => console.error('Start attempt failed:', e));
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
            await startAttempt(currentQuestion.question_id);
            await new Promise(r => setTimeout(r, 100));
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
              if (existingIndex >= 0) newResults[existingIndex] = result; else newResults.push(result);
              return newResults;
            });

            setIsAnswered(true);
            setIsCorrect(false);
          }
        } catch (error) {
          console.error('Error marking wrong on show solution:', error);
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
      if (nextQ && user) await startAttempt(nextQ.question_id);
    } else {
      toast.success("Все вопросы завершены!");
    }
  };

  // Device/photo helpers (unchanged)
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
      if (!profile?.telegram_user_id) setShowTelegramNotConnected(true);
      else setShowUploadPrompt(true);
    } catch (error) {
      console.error('Error in handlePhotoAttachment:', error);
      toast.error('Ошибка при проверке подключения Telegram');
    }
  };

  const handlePhotoCheck = async () => {
    if (!user || !currentQuestion) return;
    setIsProcessingPhoto(true);
    try {
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
        if (apiResponse?.retry_message) toast.error(apiResponse.retry_message);
        else toast.error('Ошибка API. Попробуйте ввести решение снова.');
        setIsProcessingPhoto(false);
        return;
      }

      if (apiResponse?.feedback) {
        try {
          const feedbackData = JSON.parse(apiResponse.feedback);
          if (feedbackData.review && typeof feedbackData.scores === 'number') {
            setStructuredPhotoFeedback(feedbackData);
            setPhotoFeedback(feedbackData.review.overview_latex || '');
            setPhotoScores(feedbackData.scores);

            const ok = feedbackData.scores > 0;
            await updateStudentActivity(ok, feedbackData.scores);
            setIsCorrect(ok);
            setIsAnswered(true);
            setShowUploadPrompt(false);
          } else {
            toast.error('Неверный формат ответа API');
          }
        } catch (parseError) {
          console.error('Error parsing API response:', parseError);
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

  const handleDeviceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = 3 - uploadedImages.length;
    if (remainingSlots === 0) {
      toast.error('Максимум 3 файла');
      return;
    }
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImages: string[] = [];
    let processedCount = 0;

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Пожалуйста, загрузите только изображения');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Файл ${file.name} слишком большой. Максимальный размер: 20MB`);
        return;
      }
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
      reader.onerror = () => toast.error('Ошибка при загрузке файла');
      reader.readAsDataURL(file);
    });
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
      const { data, error } = await supabase
        .from('telegram_uploads')
        .select('extracted_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data?.extracted_text || '';
    } catch {
      return null;
    }
  };

  const fetchAnalysisData = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('photo_analysis_outputs')
        .select('raw_output')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      if (data?.raw_output) {
        try { 
          // Parse as JSON
          const jsonData = JSON.parse(data.raw_output);
          
          // Check if review contains HTML content
          if (jsonData.review && typeof jsonData.review === 'string') {
            // Parse the HTML content from review key
            const parsedHtml = parseHtmlAnalysis(jsonData.review);
            if (parsedHtml) {
              setParsedAnalysis(parsedHtml);
              // Also set the scores from the main JSON
              setAnalysisData({ scores: jsonData.scores || 0, review: { errors: [], summary: '' } });
              return { ...jsonData, parsedHtml };
            }
          }
          
          // Fallback to original JSON format
          setAnalysisData(jsonData);
          return jsonData;
        } catch { 
          return null;
        }
      }
      return null;
    } catch {
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
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) { clearInterval(uploadInterval); return 95; }
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
        toast.error(processData?.error || 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.');
        setIsProcessingPhoto(false);
        setOcrProgress("");
        setUploadProgress(0);
        setAnalysisProgress(0);
        return;
      }

      setOcrProgress("Анализ решения...");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('telegram_input')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.telegram_input) {
        toast.error('Ошибка при получении данных');
        setIsProcessingPhoto(false);
        setOcrProgress("");
        return;
      }

      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) { clearInterval(analysisInterval); return 95; }
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
        if (apiResponse?.retry_message) toast.error(apiResponse.retry_message);
        else toast.error('Ошибка API. Попробуйте ввести решение снова.');
        setIsProcessingPhoto(false);
        setOcrProgress("");
        setUploadProgress(0);
        setAnalysisProgress(0);
        return;
      }

      if (apiResponse?.feedback) {
        try {
          const feedbackData = JSON.parse(apiResponse.feedback);
          if (feedbackData.review && typeof feedbackData.scores === 'number') {
            setStructuredPhotoFeedback(feedbackData);
            setPhotoFeedback(feedbackData.review.overview_latex || '');
            setPhotoScores(feedbackData.scores);

            const ok = feedbackData.scores > 0;
            await updateStudentActivity(ok, feedbackData.scores);
            setIsCorrect(ok);
            setIsAnswered(true);

            const solution = await fetchStudentSolution();
            if (solution) setStudentSolution(solution);

            const analysis = await fetchAnalysisData();
            if (analysis) setAnalysisData(analysis);

            setUploadedImages([]);
          } else {
            toast.error('Неверный формат ответа API');
          }
        } catch (parseError) {
          setPhotoFeedback(apiResponse.feedback);
          setPhotoScores(null);
          setStructuredPhotoFeedback(null);
        }
      } else {
        toast.error('Не удалось получить обратную связь');
      }
    } catch (error) {
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

  return (
    <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto">

            {/* Header with Back Button */}
            <div className="relative text-center mb-16">
              {/* Always link back (no selection page on this screen) */}
              <div className="absolute left-0 top-0">
                <Link to="/ogemath-practice">
                  <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                </Link>
              </div>

              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                Практика по номеру
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Автоматически открыт вопрос по ID
              </p>
            </div>

            {/* Practice Interface (no selection screen) */}
            {showStatistics ? (
              <TestStatisticsWindow
                sessionResults={sessionResults}
                onGoToQuestion={(idx) => { setIsReviewMode(true); setReviewQuestionIndex(idx); }}
                onStartNewTest={() => { setShowStatistics(false); setSessionResults([]); setIsReviewMode(false); setReviewQuestionIndex(null); handleBackToSelection(); }}
                isReviewMode={isReviewMode}
                currentQuestionData={
                  isReviewMode && reviewQuestionIndex !== null
                    ? { question: sessionResults[reviewQuestionIndex], onBackToSummary: () => { setIsReviewMode(false); setReviewQuestionIndex(null); } }
                    : undefined
                }
              />
            ) : (
              <>
                {loading && (
                  <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                    <CardHeader className="border-b border-white/20">
                      <CardTitle className="text-[#1a1f36]">Загрузка вопроса…</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-gray-700">Пожалуйста, подождите.</p>
                    </CardContent>
                  </Card>
                )}

                {!loading && questions.length > 0 && currentQuestion && (
                  <Card className="mb-6 bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                    <CardHeader className="border-b border-white/20">
                      <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 text-[#1a1f36]">
                        <span className="text-lg sm:text-xl">Вопрос №{currentQuestion.problem_number_type} (1 из {questions.length})</span>
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
                            onClick={() => setShowStatistics(true)}
                            variant="outline"
                            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 w-full sm:w-auto"
                          >
                            Завершить тест
                          </Button>
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <span className="text-xs sm:text-sm font-normal text-gray-500">
                              ID: {currentQuestion.question_id}
                            </span>
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
                        </div>

                        {ocrProgress && (
                          <div className="text-center text-sm text-muted-foreground">
                            {ocrProgress}
                          </div>
                        )}

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
                              <Button variant="outline" onClick={handlePhotoAttachment}>
                                <Camera className="w-4 h-4 mr-2" />
                                Загрузить через Telegram
                              </Button>

                              <Button variant="outline" onClick={() => document.getElementById('device-upload-input')?.click()}>
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

                            {/* Student Solution + Analysis (for photo uploads) */}
                            {studentSolution && currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 20 && (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Card className="bg-blue-50 border-blue-200">
                                  <CardHeader>
                                    <CardTitle className="text-blue-800">Ваше решение</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="bg-white border border-blue-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                      {parsedAnalysis && parsedAnalysis.errors.length > 0 ? (
                                        <div className="space-y-2">
                                          <MathRenderer 
                                            text={parsedAnalysis.errors.reduce((highlightedSolution, error) => {
                                              return highlightContextInSolution(highlightedSolution, error.context);
                                            }, studentSolution)} 
                                            compiler="mathjax" 
                                          />
                                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm text-yellow-800 font-medium">
                                              💡 Желтым выделены фрагменты с ошибками
                                            </p>
                                          </div>
                                        </div>
                                      ) : (
                                        <MathRenderer text={studentSolution} compiler="mathjax" />
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Analysis Display - Support both JSON and HTML formats */}
                                {(analysisData || parsedAnalysis) && (
                                  <Card className="bg-purple-50 border-purple-200">
                                    <CardHeader>
                                      <CardTitle className="text-purple-800">Анализ решения</CardTitle>
                                      <CardDescription>
                                        Оценка: {analysisData?.scores || parsedAnalysis?.summary.score || 0}/2
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-6 max-h-96 overflow-y-auto">
                                        {/* HTML Format Analysis */}
                                        {parsedAnalysis && parsedAnalysis.errors.length > 0 && (
                                          <>
                                            {parsedAnalysis.errors.map((error, index) => (
                                              <Card key={index} className="bg-white border border-purple-200 shadow-lg">
                                                <CardContent className="p-6">
                                                  <div className="space-y-4">
                                                    {/* Error Type */}
                                                    <div className="flex items-center gap-2">
                                                      <Badge variant="destructive" className="text-sm font-semibold px-3 py-1">
                                                        {error.type}
                                                      </Badge>
                                                    </div>
                                                    
                                                    {/* Description */}
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                      <p className="text-sm text-gray-700 leading-relaxed">
                                                        <MathRenderer text={error.description} compiler="mathjax" />
                                                      </p>
                                                    </div>
                                                    
                                                    {/* Student Solution */}
                                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                      <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                        <span className="text-sm font-semibold text-red-700">Решение ученика:</span>
                                                      </div>
                                                      <div className="bg-white border border-red-300 rounded p-3">
                                                        <MathRenderer text={error.studentSolution} compiler="mathjax" />
                                                      </div>
                                                    </div>
                                                    
                                                    {/* Correct Solution */}
                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                      <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                        <span className="text-sm font-semibold text-green-700">Правильное решение:</span>
                                                      </div>
                                                      <div className="bg-white border border-green-300 rounded p-3">
                                                        <MathRenderer text={error.correctSolution} compiler="mathjax" />
                                                      </div>
                                                    </div>
                                                    
                                                    {/* Context */}
                                                    {error.context && (
                                                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                        <span className="text-sm font-semibold text-gray-700">Контекст:</span>
                                                        <div className="mt-2 bg-white border border-gray-300 rounded p-3 font-mono text-sm">
                                                          <MathRenderer text={error.context} compiler="mathjax" />
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </CardContent>
                                              </Card>
                                            ))}
                                            
                                            {/* Summary */}
                                            {parsedAnalysis.summary.comment && (
                                              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
                                                <CardContent className="p-6">
                                                  <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                                    <span className="text-lg font-semibold text-green-800">Общая оценка</span>
                                                    <Badge className="bg-green-600 text-white ml-auto">
                                                      {parsedAnalysis.summary.score}/2
                                                    </Badge>
                                                  </div>
                                                  <div className="bg-white border border-green-300 rounded-lg p-4">
                                                    <MathRenderer text={parsedAnalysis.summary.comment} compiler="mathjax" />
                                                  </div>
                                                </CardContent>
                                              </Card>
                                            )}
                                          </>
                                        )}
                                        
                                        {/* JSON Format Analysis (fallback) */}
                                        {analysisData && !parsedAnalysis && (
                                          <>
                                            {analysisData.review.errors && analysisData.review.errors.length > 0 ? (
                                              analysisData.review.errors.map((error, index) => (
                                                <Card key={index} className="bg-white border border-purple-200">
                                                  <CardContent className="pt-4">
                                                    <div className="space-y-2">
                                                      <Badge variant="destructive">{error.type}</Badge>
                                                      <p className="text-sm text-gray-700">{error.message}</p>
                                                      <div className="space-y-1">
                                                        <div>
                                                          <span className="text-xs font-semibold text-red-600">Что написано:</span>
                                                          <MathRenderer text={error.student_latex} compiler="mathjax" />
                                                        </div>
                                                        <div>
                                                          <span className="text-xs font-semibold text-green-600">Должно быть:</span>
                                                          <MathRenderer text={error.expected_latex} compiler="mathjax" />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              ))
                                            ) : (
                                              <div className="text-center py-8 text-gray-500">
                                                Ошибок не найдено. Отличная работа! 🎉
                                              </div>
                                            )}

                                            {analysisData.review.summary && (
                                              <Card className="bg-green-50 border-green-200 mt-4">
                                                <CardContent className="pt-4">
                                                  <p className="text-sm font-semibold text-green-800">Общая оценка:</p>
                                                  <MathRenderer text={analysisData.review.summary} compiler="mathjax" />
                                                </CardContent>
                                              </Card>
                                            )}
                                          </>
                                        )}
                                        
                                        {/* No errors found */}
                                        {(!parsedAnalysis || parsedAnalysis.errors.length === 0) && !analysisData && (
                                          <div className="text-center py-8 text-gray-500">
                                            Ошибок не найдено. Отличная работа! 🎉
                                          </div>
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
                              {studentSolution && (
                                <div className="mb-6">
                                  <h3 className="text-lg font-semibold text-blue-800 mb-3">Ваше решение</h3>
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <MathRenderer text={studentSolution} compiler="mathjax" />
                                  </div>
                                </div>
                              )}

                              <div className="mb-6">
                                <h3 className="text-lg font-semibold text-green-800 mb-3">Общая оценка</h3>
                                <MathRenderer text={photoFeedback} compiler="mathjax" />
                              </div>

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

                              {structuredPhotoFeedback && (
                                <div className="space-y-6">
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
                )}

                {/* Stats summary box (kept) */}
                {questions.length > 0 && !showStatistics && (
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
              </>
            )}
          </div>
        </div>
      </div>

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

export default PracticeTest;

