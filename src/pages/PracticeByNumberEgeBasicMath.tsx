import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import FeedbackButton from "@/components/FeedbackButton";

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

  // Device upload & analysis states for part 2 (13–19)
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [studentSolution, setStudentSolution] = useState<string>("");
  const [photoScores, setPhotoScores] = useState<number | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<string>("");
  const [parsedAnalysis, setParsedAnalysis] = useState<ParsedAnalysis | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  interface ParsedError {
    type: string;
    description: string;
    studentSolution: string;
    correctSolution: string;
    context: string;
  }
  interface ParsedAnalysis {
    errors: ParsedError[];
    summary: { score: number; comment: string };
  }
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
    } catch (e) {
      console.error('Error parsing HTML analysis:', e);
      return null;
    }
  };

  const fetchStudentSolution = async () => {
    if (!user) return null;
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('telegram_uploads')
        .select('extracted_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) { console.error('fetchStudentSolution error', error); return null; }
      return data?.extracted_text || '';
    } catch (e) {
      console.error('fetchStudentSolution exception', e);
      return null;
    }
  };

  const fetchAnalysisData = async () => {
    if (!user) return null;
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('photo_analysis_outputs')
        .select('raw_output')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) { console.error('fetchAnalysisData error', error); return null; }
      if (data?.raw_output) {
        const json = JSON.parse(data.raw_output);
        if (json.review && typeof json.review === 'string') {
          const parsed = parseHtmlAnalysis(json.review);
          if (parsed) setParsedAnalysis(parsed);
        }
      }
      return null;
    } catch (e) {
      console.error('fetchAnalysisData exception', e);
      return null;
    }
  };

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
                      onClick={async () => {
                        if (uploadedImages.length > 0 && currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 13 && currentQuestion.problem_number_type <= 19) {
                          if (!user) { setShowAuthRequiredMessage(true); setTimeout(() => setShowAuthRequiredMessage(false), 5000); return; }
                          setIsProcessingPhoto(true);
                          setUploadProgress(0);
                          setAnalysisProgress(0);
                          setOcrProgress(`Обработка фото 1 из ${uploadedImages.length}...`);
                          try {
                            const uploadInterval = setInterval(() => {
                              setUploadProgress(prev => { if (prev >= 95) { clearInterval(uploadInterval); return 95; } return prev + 2; });
                            }, 50);
                            const { data: processData, error: processError } = await supabase.functions.invoke('process-device-photos', {
                              body: { user_id: user.id, images: uploadedImages, question_id: currentQuestion.question_id }
                            });
                            clearInterval(uploadInterval);
                            setUploadProgress(100);
                            if (processError || !processData?.success) {
                              console.error('Error processing device photos:', processError);
                              toast.error(processData?.error || 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.');
                              setIsProcessingPhoto(false); setOcrProgress(''); setUploadProgress(0); setAnalysisProgress(0); return;
                            }
                            setOcrProgress('Анализ решения...');
                            const analysisInterval = setInterval(() => {
                              setAnalysisProgress(prev => { if (prev >= 95) { clearInterval(analysisInterval); return 95; } return prev + 2; });
                            }, 50);
                            const { data: prof, error: profErr } = await supabase.from('profiles').select('telegram_input').eq('user_id', user.id).single();
                            if (profErr || !prof?.telegram_input) { clearInterval(analysisInterval); setAnalysisProgress(0); throw new Error('Не удалось получить распознанный текст'); }
                            const { data: apiResponse, error: apiError } = await supabase.functions.invoke('analyze-photo-solution', {
                              body: { student_solution: prof.telegram_input,
                                      problem_text: currentQuestion.problem_text,
                                      solution_text: currentQuestion.solution_text,
                                      user_id: user.id,
                                      question_id: currentQuestion.question_id,
                                      problem_number: currentQuestion.problem_number_type }
                            });
                            clearInterval(analysisInterval);
                            setAnalysisProgress(100);
                            if (apiError) {
                              console.error('Error calling analyze-photo-solution:', apiError);
                              toast.error(apiResponse?.retry_message || 'Ошибка API. Попробуйте снова.');
                              setIsProcessingPhoto(false); setOcrProgress(''); setUploadProgress(0); setAnalysisProgress(0); return;
                            }
                            if (apiResponse?.feedback) {
                              try {
                                const feedbackData = JSON.parse(apiResponse.feedback);
                                if (feedbackData.review && typeof feedbackData.scores === 'number') {
                                  const isCorrectNow = feedbackData.scores > 0;
                                  await updateStudentActivity(isCorrectNow, feedbackData.scores);
                                  setIsCorrect(isCorrectNow);
                                  setIsAnswered(true);
                                  setPhotoFeedback(feedbackData.review?.overview_latex || '');
                                  setPhotoScores(feedbackData.scores);
                                  // Fetch and render student solution + parsed analysis
                                  const solution = await fetchStudentSolution();
                                  if (solution) setStudentSolution(solution);
                                  await fetchAnalysisData();
                                  setUploadedImages([]);
                                } else {
                                  toast.error('Неверный формат ответа API');
                                }
                              } catch (e) {
                                console.error('Parse error:', e);
                                setPhotoFeedback(apiResponse.feedback);
                                setPhotoScores(null);
                              }
                            } else {
                              toast.error('Не удалось получить обратную связь');
                            }
                          } catch (err) {
                            console.error('Error in device photo flow:', err);
                            toast.error('Произошла ошибка при обработке решения');
                            setUploadProgress(0); setAnalysisProgress(0);
                          } finally {
                            setIsProcessingPhoto(false);
                            setOcrProgress('');
                          }
                        } else {
                          await checkAnswer();
                        }
                      }}
                      disabled={isAnswered || solutionViewedBeforeAnswer || (!userAnswer.trim() && !(currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 13 && currentQuestion.problem_number_type <= 19 && uploadedImages.length > 0))}
                      className="min-w-32 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md font-medium disabled:opacity-50 transition-all"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {uploadedImages.length > 0 ? (isProcessingPhoto ? 'Обработка...' : 'Проверить фото') : 'Проверить'}
                    </Button>
                    <FeedbackButton
                      contentType="frq_question"
                      contentRef={currentQuestion.question_id}
                    />
                  </div>

                  {/* Device upload controls for 13–19 */}
                  {currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 13 && currentQuestion.problem_number_type <= 19 && (
                    <div className="space-y-3">
                      <div className="flex gap-3 justify-center flex-wrap">
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('egebasic-device-upload-input')?.click()}
                          className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                        >
                          Загрузить с устройства
                        </Button>
                        <input
                          id="egebasic-device-upload-input"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            const remaining = 3 - uploadedImages.length;
                            if (remaining === 0) { toast.error('Максимум 3 файла'); e.currentTarget.value = ''; return; }
                            const filesToProcess = Array.from(files).slice(0, remaining);
                            const newImages: string[] = [];
                            let processed = 0;
                            filesToProcess.forEach((file) => {
                              if (!file.type.startsWith('image/')) { toast.error('Пожалуйста, загрузите только изображения'); processed++; return; }
                              if (file.size > 20 * 1024 * 1024) { toast.error(`Файл ${file.name} слишком большой. Макс: 20MB`); processed++; return; }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const result = ev.target?.result as string;
                                newImages.push(result);
                                processed++;
                                if (processed === filesToProcess.length) {
                                  setUploadedImages(prev => [...prev, ...newImages]);
                                  toast.success(`Загружено ${newImages.length} фото`);
                                }
                              };
                              reader.onerror = () => { toast.error('Ошибка при загрузке файла'); processed++; };
                              reader.readAsDataURL(file);
                            });
                            e.currentTarget.value = '';
                          }}
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
                                onClick={() => { setSelectedPreviewImage(image); setShowImagePreview(true); }}
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {uploadedImages.length > 0 && uploadedImages.length < 3 && (
                        <div className="text-xs text-center text-gray-500">Загружено {uploadedImages.length} из 3 фото</div>
                      )}
                      {ocrProgress && (
                        <div className="text-center text-sm text-gray-600">{ocrProgress}</div>
                      )}
                    </div>
                  )}

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

                  {/* Answer Result */
                  }
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
                  {/* Render Student Solution + Analysis for 13–19 when photos were checked */}
                  {studentSolution && currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 13 && currentQuestion.problem_number_type <= 19 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
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

                      {parsedAnalysis && (
                        <Card className="bg-purple-50 border-purple-200">
                          <CardHeader>
                            <CardTitle className="text-purple-800">Анализ решения</CardTitle>
                            <div className="text-sm text-purple-700">Оценка: {parsedAnalysis.summary.score}/2</div>
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

      {/* Image Preview Dialog */}
      <div>
        {showImagePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImagePreview(false)}>
            <div className="bg-white rounded-lg p-4 max-w-4xl w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <div className="text-lg font-semibold mb-3 text-[#1a1f36]">Загруженное решение</div>
              <div className="flex justify-center">
                <img src={selectedPreviewImage || ''} alt="Uploaded solution full size" className="max-w-full max-h-[70vh] rounded" />
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowImagePreview(false)}>Закрыть</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bars Overlay for device processing */}
      {uploadProgress > 0 && (uploadedImages.length > 0) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-[90vw] max-w-md text-[#1a1f36]">
            <div className="text-center text-lg font-semibold mb-4">Обработка решения</div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>1. Загрузка фото</span><span>{Math.round(uploadProgress)}%</span></div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-3 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>2. Анализ решения</span><span>{Math.round(analysisProgress)}%</span></div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-3 rounded-full transition-all duration-300 ease-out" style={{ width: `${analysisProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeByNumberEgeBasicMath;
