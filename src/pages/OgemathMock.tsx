import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Camera, Clock, BookOpen, Menu, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { toast } from "sonner";
import FormulaBookletDialog from "@/components/FormulaBookletDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";

interface Question {
  question_id: string;
  problem_text: string;
  answer: string;
  solution_text: string;
  difficulty?: string | number;
  problem_number_type?: number;
  problem_image?: string;
  solutiontextexpanded?: string;
}

interface ExamResult {
  questionIndex: number;
  questionId: string;
  isCorrect: boolean | null;
  userAnswer: string;
  correctAnswer: string;
  problemText: string;
  solutionText: string;
  timeSpent: number;
  photoFeedback?: string;
  attempted?: boolean;
  photoScores?: number;
  problemNumber: number;
}

type CheckTextAnswerResp = { is_correct: boolean };

const OgemathMock = () => {
  const { user } = useAuth();
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [examId, setExamId] = useState<string>("");
  const [examStats, setExamStats] = useState<{
    totalCorrect: number;
    totalQuestions: number;
    percentage: number;
    part1Correct: number;
    part1Total: number;
    part2Correct: number;
    part2Total: number;
    totalTimeSpent: number;
  } | null>(null);

  // Timer state
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Photo upload states for problems 20-25
  const [showTelegramNotConnected, setShowTelegramNotConnected] = useState(false);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string>("");
  const [photoScores, setPhotoScores] = useState<number | null>(null);

  // Formula booklet state
  const [showFormulaBooklet, setShowFormulaBooklet] = useState(false);

  // Review mode states
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number | null>(null);

  // Question navigation menu state
  const [showQuestionMenu, setShowQuestionMenu] = useState(false);

  // Part 2 loading state for questions 20-25
  const [part2Loading, setPart2Loading] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isPhotoQuestion = currentQuestion?.problem_number_type && currentQuestion.problem_number_type >= 20;

  // Start attempt when a new question is displayed
  useEffect(() => {
    if (!examStarted || examFinished || !currentQuestion || !user) return;
    const problemNumberType = currentQuestion.problem_number_type || (currentQuestionIndex + 1);
    startAttempt(currentQuestion.question_id, problemNumberType, 0);
  }, [currentQuestionIndex, examStarted, examFinished, currentQuestion, user]);

  // Timer effect - counts up to 3 hours 55 minutes (235 minutes)
  useEffect(() => {
    if (!examStartTime || examFinished) return;
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - examStartTime.getTime()) / 1000);
      setElapsedTime(elapsed);
      if (elapsed >= 14100) {
        setIsTimeUp(true);
        handleFinishExam();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [examStartTime, examFinished]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate question selection
  const generateQuestionSelection = async () => {
    setLoading(true);
    try {
      const batchPromises = [];
      for (let problemNum = 6; problemNum <= 25; problemNum++) {
        batchPromises.push(
          supabase
            .from('oge_math_fipi_bank')
            .select('*')
            .eq('problem_number_type', problemNum)
            .limit(20)
        );
      }
      const batchResults = await Promise.all(batchPromises);
      const selectedQuestions: any[] = [];
      const allQuestionIds: string[] = [];
      batchResults.forEach((result, index) => {
        const problemNum = index + 6;
        if (result.data && result.data.length > 0) {
          const randomQuestion = result.data[Math.floor(Math.random() * result.data.length)];
          selectedQuestions.push(randomQuestion);
          allQuestionIds.push(randomQuestion.question_id);
        } else {
          console.warn(`No questions found for problem number ${problemNum}`);
        }
      });

      const contextTypes = ['uchastki', 'pechi', 'bumaga', 'shini', 'dorogi', 'kvartiri', 'internet'] as const;
      const selectedContext = contextTypes[Math.floor(Math.random() * contextTypes.length)];
      const contextQuestions: any[] = [];

      if (selectedContext === 'internet') {
        const Y = Math.floor(Math.random() * 26) + 1;
        const contextPromises = [];
        for (let i = 0; i < 5; i++) {
          const questionId = `OGE_SHinternet_1_1_${Y + i}`;
          contextPromises.push(supabase.from('oge_math_fipi_bank').select('*').eq('question_id', questionId).single());
        }
        const contextResults = await Promise.all(contextPromises);
        contextResults.forEach((result) => {
          if (result.data && !result.error) {
            contextQuestions.push(result.data);
            allQuestionIds.push(result.data.question_id);
          }
        });
      } else {
        const ranges = { bumaga: 3, dorogi: 10, kvartiri: 5, pechi: 5, shiny: 4, uchastki: 4 } as const;
        const X = Math.floor(Math.random() * ranges[selectedContext]) + 1;
        const contextPromises = [];
        for (let i = 1; i <= 5; i++) {
          const questionId = `OGE_SH${selectedContext}_1_${X}_${i}`;
          contextPromises.push(supabase.from('oge_math_fipi_bank').select('*').eq('question_id', questionId).single());
        }
        const contextResults = await Promise.all(contextPromises);
        contextResults.forEach((result) => {
          if (result.data && !result.error) {
            contextQuestions.push(result.data);
            allQuestionIds.push(result.data.question_id);
          }
        });
      }

      if (contextQuestions.length < 5) {
        const fallbackPromises = [];
        for (let problemNum = 1; problemNum <= 5; problemNum++) {
          if (contextQuestions.length < problemNum) {
            fallbackPromises.push(supabase.from('oge_math_fipi_bank').select('*').eq('problem_number_type', problemNum).limit(10));
          }
        }
        if (fallbackPromises.length > 0) {
          const fallbackResults = await Promise.all(fallbackPromises);
          fallbackResults.forEach((result) => {
            if (result.data && result.data.length > 0) {
              const randomQuestion = result.data[Math.floor(Math.random() * result.data.length)];
              contextQuestions.push(randomQuestion);
              allQuestionIds.push(randomQuestion.question_id);
            }
          });
        }
      }

      const allQuestions = [...contextQuestions.slice(0, 5), ...selectedQuestions];
      if (allQuestions.length < 25) {
        toast.error('Не удалось загрузить все вопросы экзамена');
        return;
      }

      console.log('Pre-fetching question details for all 25 questions...');
      const questionDetailsPromises = allQuestionIds.slice(0, 25).map(questionId =>
        supabase.functions.invoke('get-question-details', {
          body: { question_id: questionId, course_id: '1' }
        })
      );
      const questionDetailsResults = await Promise.all(questionDetailsPromises);
      const questionDetailsCache = new Map();
      questionDetailsResults.forEach((result, index) => {
        if ((result as any).data && !(result as any).error) {
          questionDetailsCache.set(allQuestionIds[index], (result as any).data);
        } else {
          console.warn(`Failed to fetch details for question ${allQuestionIds[index]}`);
        }
      });
      (window as any).questionDetailsCache = questionDetailsCache;
      console.log(`Cached details for ${questionDetailsCache.size} questions`);

      setQuestions(allQuestions.slice(0, 25));
      const initialExamResults: ExamResult[] = allQuestions.slice(0, 25).map((question, index) => ({
        questionIndex: index,
        questionId: question.question_id,
        isCorrect: null,
        userAnswer: "",
        correctAnswer: question.answer || "",
        problemText: question.problem_text || "",
        solutionText: question.solution_text || "",
        timeSpent: 0,
        attempted: false,
        problemNumber: question.problem_number_type || (index + 1)
      }));
      setExamResults(initialExamResults);
      setCurrentQuestionIndex(0);
      setUserAnswer("");
      setQuestionStartTime(new Date());
    } catch (error) {
      console.error('Error generating exam questions:', error);
      toast.error('Ошибка при загрузке вопросов экзамена');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!user) {
      toast.error('Войдите в систему для прохождения экзамена');
      return;
    }
    
    setIsTransitioning(true);
    
    try {
      const cryptoApi = window.crypto || (window as any).msCrypto;
      const array = new Uint8Array(16);
      cryptoApi.getRandomValues(array);
      const newExamId = `${array[0].toString(16).padStart(2, '0')}${array[1].toString(16).padStart(2, '0')}${array[2].toString(16).padStart(2, '0')}${array[3].toString(16).padStart(2, '0')}-${array[4].toString(16).padStart(2, '0')}${array[5].toString(16).padStart(2, '0')}-${array[6].toString(16).padStart(2, '0')}${array[7].toString(16).padStart(2, '0')}-${array[8].toString(16).padStart(2, '0')}${array[9].toString(16).padStart(2, '0')}-${array[10].toString(16).padStart(2, '0')}${array[11].toString(16).padStart(2, '0')}${array[12].toString(16).padStart(2, '0')}${array[13].toString(16).padStart(2, '0')}${array[14].toString(16).padStart(2, '0')}${array[15].toString(16).padStart(2, '0')}`;
      setExamId(newExamId);

      const { error } = await supabase.from('profiles').update({ exam_id: newExamId }).eq('user_id', user.id);
      if (error) {
        console.error('Error saving exam_id to profiles:', error);
        toast.error('Ошибка при сохранении идентификатора экзамена');
        return;
      }

      setExamStarted(true);
      setExamStartTime(new Date());
      await generateQuestionSelection();
    } catch (error) {
      console.error('Error updating profile with exam_id:', error);
      toast.error('Ошибка при подготовке экзамена');
    } finally {
      setIsTransitioning(false);
    }
  };

  // Helpers
  const isNonNumericAnswer = (answer: string): boolean => {
    if (!answer) return false;
    if (/\p{L}/u.test(answer)) return true; // letters (units or words)
    if (answer.includes('\\')) return true; // LaTeX
    if (/[а-яё]/i.test(answer)) return true; // Cyrillic
    return false;
  };

  const isNumeric = (str: string): boolean => {
    const cleaned = str.trim();
    return /^-?\d+([.,]\d+)?$/.test(cleaned);
  };

  const sanitizeNumericAnswer = (answer: string): string => {
    return answer.trim().replace(/\s/g, '').replace(',', '.');
  };

  const hasSpecialSymbols = (str: string): boolean => {
    if (!str) return false;
    return /[\\±×÷∙·√∞≤≥≠≈≡^_%°‰µπ{}\[\]()<>|_⁄/]|[\u00B2\u00B3\u2070-\u2079\u2080-\u2089]/u.test(str);
  };

  const shouldUseServerCheck = (userAns: string, correctAns: string): boolean => {
    return (
      isNonNumericAnswer(userAns) ||
      isNonNumericAnswer(correctAns) ||
      hasSpecialSymbols(userAns) ||
      hasSpecialSymbols(correctAns)
    );
  };

  const handleNextQuestion = async () => {
    if (!currentQuestion || !questionStartTime) return;

    setIsTransitioning(true);

    try {
      const timeSpent = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000);
      const problemNumber = currentQuestion.problem_number_type || currentQuestionIndex + 1;

      let isCorrect: boolean | null = null;
      let analysisOutput = "";
      let scores = 0;

      if (user) {
      if (userAnswer.trim()) {
        if (problemNumber >= 20) {
          // FRQ (20–25)
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('exam_id')
              .eq('user_id', user.id)
              .single();

            const currentExamId = profile?.exam_id || examId;

            supabase.functions.invoke('analyze-photo-solution', {
              body: {
                student_solution: userAnswer.trim(),
                problem_text: currentQuestion.problem_text,
                solution_text: currentQuestion.solution_text,
                user_id: user.id,
                question_id: currentQuestion.question_id,
                exam_id: currentExamId,
                problem_number: problemNumber.toString()
              }
            }).catch(error => console.error('Background photo analysis error:', error));

            console.log('Photo analysis started in background for question', problemNumber);
            analysisOutput = "Решение отправлено на проверку";
            scores = 1;
            isCorrect = true;
          } catch (error) {
            console.error('Error with photo analysis function:', error);
            analysisOutput = "Ошибка обработки";
            scores = 0;
            isCorrect = false;
          }
        } else {
          // Part 1 (1–19) — INSERT first, then possibly server-check and UPDATE openrouter_check ("true"/"false")
          let insertedPhotoRowId: string | null = null;
          let currentExamId: string | null = null;

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('exam_id')
              .eq('user_id', user.id)
              .single();

            currentExamId = profile?.exam_id || examId;

            console.log("[PAO/INSERT] about to insert", {
              user_id: user.id,
              question_id: currentQuestion.question_id,
              exam_id: currentExamId,
              problem_number: problemNumber.toString(),
              analysis_type: 'solution',
              raw_output: userAnswer.trim(),
              openrouter_check: null
            });

            // Insert and get new row id back
            const { data: insertedRow, error: insertErr } = await supabase
              .from('photo_analysis_outputs')
              .insert({
                user_id: user.id,
                question_id: currentQuestion.question_id,
                exam_id: currentExamId,
                problem_number: problemNumber.toString(),
                raw_output: userAnswer.trim(),
                analysis_type: 'solution',
                openrouter_check: null, // TEXT column: start as null
              })
              .select('id')
              .single();

            if (insertErr) {
              console.error("[PAO/INSERT] error:", insertErr);
            } else if (insertedRow?.id) {
              insertedPhotoRowId = insertedRow.id;
              console.log("[PAO/INSERT] success, row id:", insertedPhotoRowId);
            }
          } catch (error) {
            console.error("[PAO/INSERT] exception:", error);
          }

          const correctAnswer = currentQuestion.answer;

          console.log("[CHECK] Routing decision inputs:", {
            userAnswer,
            correctAnswer,
            isNumericCorrect: isNumeric(correctAnswer),
            shouldUseServerCheck: shouldUseServerCheck(userAnswer, correctAnswer),
            insertedPhotoRowId,
            currentExamId
          });

          if (shouldUseServerCheck(userAnswer, correctAnswer)) {
            // Use server check via edge function
            try {
              console.log("[SERVER CHECK] invoking check-text-answer with payload:", {
                user_id: user.id,
                question_id: currentQuestion.question_id,
                submitted_answer: userAnswer.trim()
              });

              const { data, error } = await supabase.functions.invoke<CheckTextAnswerResp>(
                "check-text-answer",
                {
                  body: {
                    user_id: user.id,
                    question_id: currentQuestion.question_id,
                    submitted_answer: userAnswer.trim()
                  }
                }
              );

              console.log("[SERVER CHECK] response:", { data, error });

              if (error) {
                console.error("[SERVER CHECK] error, falling back to local compare:", error);
                if (isNumeric(correctAnswer)) {
                  const su = sanitizeNumericAnswer(userAnswer);
                  const sc = sanitizeNumericAnswer(correctAnswer);
                  isCorrect = su === sc;
                } else {
                  isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
                }
              } else {
                isCorrect = !!data?.is_correct;
              }

              // Persist server verdict as TEXT "true"/"false"
              try {
                let targetId = insertedPhotoRowId;

                if (!targetId) {
                  console.warn("[PAO/UPDATE] insertedPhotoRowId missing, selecting latest row as fallback.");
                  const { data: latestRow, error: selErr } = await supabase
                    .from("photo_analysis_outputs")
                    .select("id, created_at")
                    .eq("user_id", user.id)
                    .eq("question_id", currentQuestion.question_id)
                    .eq("exam_id", currentExamId!)
                    .eq("analysis_type", "solution")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (selErr) {
                    console.warn("[PAO/UPDATE] fallback select failed:", selErr);
                  } else {
                    targetId = latestRow?.id ?? null;
                  }
                }

                if (!targetId) {
                  console.warn("[PAO/UPDATE] No row id to update openrouter_check.");
                } else {
                  const verdictStr = isCorrect ? "true" : "false";
                  console.log("[PAO/UPDATE] writing openrouter_check =", verdictStr, "for id =", targetId);
                  const { data: updData, error: updateErr } = await supabase
                    .from("photo_analysis_outputs")
                    .update({ openrouter_check: verdictStr } as any)
                    .eq("id", targetId)
                    .select("id")
                    .single();

                  if (updateErr) {
                    console.warn("[PAO/UPDATE] update failed:", updateErr);
                  } else {
                    console.log("[PAO/UPDATE] update success:", updData);
                  }
                }
              } catch (uerr) {
                console.warn("[PAO/UPDATE] exception while updating openrouter_check:", uerr);
              }
            } catch (err) {
              console.error("[SERVER CHECK] exception, falling back to local compare:", err);
              if (isNumeric(correctAnswer)) {
                const su = sanitizeNumericAnswer(userAnswer);
                const sc = sanitizeNumericAnswer(correctAnswer);
                isCorrect = su === sc;
              } else {
                isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
              }
            }
          } else {
            // Local fast path only (no AI verdict to store)
            if (isNumeric(correctAnswer)) {
              const su = sanitizeNumericAnswer(userAnswer);
              const sc = sanitizeNumericAnswer(correctAnswer);
              isCorrect = su === sc;
            } else {
              isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
            }
          }
        }

        await completeAttempt(!!isCorrect, scores);

        submitToHandleSubmission(!!isCorrect, scores).catch(error =>
          console.error('Background mastery tracking failed:', error)
        );
      } else {
        // Skipped
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('exam_id')
            .eq('user_id', user.id)
            .single();

          const currentExamId = profile?.exam_id || examId;

          await supabase
            .from('photo_analysis_outputs')
            .insert({
              user_id: user.id,
              question_id: currentQuestion.question_id,
              exam_id: currentExamId,
              problem_number: problemNumber.toString(),
              raw_output: 'False',
              analysis_type: problemNumber >= 20 ? 'photo_solution' : 'solution',
              openrouter_check: null // TEXT
            });
        } catch (error) {
          console.error('Error saving skipped question:', error);
        }

        await completeAttempt(false, 0);
        isCorrect = false;
      }
    }

    const result: ExamResult = {
      questionIndex: currentQuestionIndex,
      questionId: currentQuestion.question_id,
      isCorrect,
      userAnswer: userAnswer.trim(),
      correctAnswer: currentQuestion.answer,
      problemText: currentQuestion.problem_text,
      solutionText: currentQuestion.solution_text,
      timeSpent,
      photoFeedback: analysisOutput,
      photoScores: scores,
      problemNumber
    };

      setExamResults(prev => {
        const newResults = [...prev];
        newResults[currentQuestionIndex] = { ...newResults[currentQuestionIndex], ...result, attempted: true };
        return newResults;
      });

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer("");
        setPhotoFeedback("");
        setPhotoScores(null);
        setQuestionStartTime(new Date());
      } else {
        handleFinishExam();
      }
    } catch (error) {
      console.error('Error in handleNextQuestion:', error);
      toast.error('Произошла ошибка');
    } finally {
      setIsTransitioning(false);
    }
  };

  const startAttempt = async (questionId: string, problemNumberType: number, _timeSpent: number) => {
    if (!user) return null;
    try {
      const questionDetailsCache = (window as any).questionDetailsCache;
      let skillsArray: number[] = [];
      let topicsArray: string[] = [];

      if (questionDetailsCache && questionDetailsCache.has(questionId)) {
        const questionDetails = questionDetailsCache.get(questionId);
        skillsArray = Array.isArray(questionDetails.skills_list) ? questionDetails.skills_list : [];
        topicsArray = Array.isArray(questionDetails.topics_list) ? questionDetails.topics_list : [];
        console.log(`Using cached details for ${questionId}: ${skillsArray.length} skills, ${topicsArray.length} topics`);
      } else {
        console.warn(`No cached details found for question ${questionId}, proceeding without skills/topics`);
      }

      const { data, error } = await supabase
        .from('student_activity')
        .insert({
          user_id: user.id,
          question_id: questionId,
          answer_time_start: questionStartTime?.toISOString() || new Date().toISOString(),
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
        return null;
      }
      if (data) {
        console.log('Started attempt:', (data as any).attempt_id);
        return (data as any).attempt_id;
      }
    } catch (error) {
      console.error('Error starting attempt:', error);
      return null;
    }
  };

  const completeAttempt = async (isCorrect: boolean, scores: number) => {
    if (!user) return;
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('student_activity')
        .select('attempt_id')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion!.question_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activityError || !activityData) {
        console.error('Error getting attempt for completion:', activityError);
        return;
      }

      const { error: completeError } = await supabase.functions.invoke('complete-attempt', {
        body: {
          attempt_id: (activityData as any).attempt_id,
          finished_or_not: true,
          is_correct: isCorrect,
          scores_fipi: scores
        }
      });

      if (completeError) {
        console.error('Error completing attempt:', completeError);
      } else {
        console.log(`Completed attempt: correct=${isCorrect}, scores=${scores}`);
      }
    } catch (error) {
      console.error('Error in completeAttempt:', error);
    }
  };

  const submitToHandleSubmission = async (isCorrect: boolean, scores: number) => {
    if (!user) return;
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('student_activity')
        .select('question_id, attempt_id, finished_or_not, duration_answer, scores_fipi')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion!.question_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (activityError || !activityData) {
        console.error('Error getting latest activity:', activityError);
        return;
      }

      const submissionData = {
        user_id: user.id,
        question_id: (activityData as any).question_id,
        finished_or_not: true,
        is_correct: isCorrect,
        duration: (activityData as any).duration_answer,
        scores_fipi: scores
      };

      const { data, error } = await supabase.functions.invoke('handle-submission', {
        body: {
          course_id: '1',
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

  const handleFinishExam = async () => {
    setExamFinished(true);
    
    // Phase 1: Process questions 1-19 immediately
    const phase1Stats = await processPhase1Results();
    if (phase1Stats) setExamStats(phase1Stats);
    
    // Phase 2: Process questions 20-25 with polling
    setPart2Loading(true);
    const phase2Stats = await processPhase2Results();
    setPart2Loading(false);
    
    if (phase2Stats) setExamStats(phase2Stats);
  };

  // Phase 1: Process questions 1-19 immediately
  const processPhase1Results = async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('exam_id')
        .eq('user_id', user.id)
        .single();

      const currentExamId = profile?.exam_id || examId;

      const { data: activityData, error: activityError } = await supabase
        .from('student_activity')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', '1')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (activityError) {
        console.error('Error fetching activity data:', activityError);
        return null;
      }

      const results: ExamResult[] = [];

      // Process only questions 1-19
      for (let i = 0; i < Math.min(19, questions.length); i++) {
        const question = questions[i];
        const activity = activityData?.find((a: any) => a.question_id === question.question_id);
        
        const userAnswer = activity?.is_correct !== null ? 
          (activity.is_correct ? question.answer : 'Неправильный ответ') : '';
        
        results.push({
          questionIndex: i,
          questionId: question.question_id,
          isCorrect: activity?.is_correct ?? null,
          userAnswer: userAnswer,
          correctAnswer: question.answer,
          problemText: question.problem_text,
          solutionText: question.solution_text || '',
          timeSpent: activity?.duration_answer || 0,
          attempted: activity?.is_correct !== null,
          problemNumber: question.problem_number_type || (i + 1)
        });
      }

      // Initialize questions 20-25 as loading/unattempted
      for (let i = 19; i < questions.length; i++) {
        const question = questions[i];
        results.push({
          questionIndex: i,
          questionId: question.question_id,
          isCorrect: null,
          userAnswer: '',
          correctAnswer: question.answer,
          problemText: question.problem_text,
          solutionText: question.solution_text || '',
          timeSpent: 0,
          attempted: false,
          problemNumber: question.problem_number_type || (i + 1)
        });
      }

      setExamResults(results);

      // Calculate stats for phase 1 only
      const part1Results = results.slice(0, 19);
      const part1Correct = part1Results.filter(r => r.isCorrect === true).length;
      const totalTimeSpent = part1Results.reduce((sum, r) => sum + r.timeSpent, 0);

      const stats = {
        totalCorrect: part1Correct,
        totalQuestions: 25,
        percentage: Math.round((part1Correct / 19) * 100),
        part1Correct: part1Correct,
        part1Total: 19,
        part2Correct: 0,
        part2Total: 6,
        totalTimeSpent: totalTimeSpent
      };

      setLoading(false);
      return stats;
    } catch (error) {
      console.error('Error in processPhase1Results:', error);
      setLoading(false);
      return null;
    }
  };

  // Polling function to check for photo analysis results
  const pollForPhotoResults = async (currentExamId: string, maxAttempts = 2, intervalMs = 2000) => {
    // Wait for photo analysis to complete (4 seconds total)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`Waiting for photo analysis, attempt ${attempt + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    // Fetch whatever photo results are available
    const { data: analysisResults, error: analysisError } = await supabase
      .from('photo_analysis_outputs')
      .select('question_id, raw_output, problem_number, openrouter_check')
      .eq('user_id', user!.id)
      .eq('exam_id', currentExamId)
      .order('created_at', { ascending: false });

    if (analysisError) {
      console.error('Error fetching analysis results:', analysisError);
      return [];
    }

    // Filter to keep only the most recent entry for each problem_number
    const latestResultsByProblemNumber = new Map<string, any>();
    if (analysisResults) {
      for (const result of analysisResults) {
        const problemNum = result.problem_number;
        if (problemNum && !latestResultsByProblemNumber.has(problemNum)) {
          latestResultsByProblemNumber.set(problemNum, result);
        }
      }
    }

    const filteredResults = Array.from(latestResultsByProblemNumber.values());
    console.log(`Found ${filteredResults.length} photo analysis results for questions 20-25`);
    return filteredResults;
  };

  // Phase 2: Process questions 20-25 with polling
  const processPhase2Results = async () => {
    if (!user) return null;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('exam_id')
        .eq('user_id', user.id)
        .single();

      const currentExamId = profile?.exam_id || examId;

      // Poll for photo results
      const photoResults = await pollForPhotoResults(currentExamId);
      
      // Also fetch student_activity for questions 20-25
      const questions2025 = questions.slice(19, 25);
      const { data: activityData } = await supabase
        .from('student_activity')
        .select('*')
        .eq('user_id', user.id)
        .in('question_id', questions2025.map(q => q.question_id));

      const questionAnswers = new Map<string, { answer: string; problemText: string; index: number }>();
      questions.forEach((q, index) => {
        questionAnswers.set(q.question_id, { answer: q.answer, problemText: q.problem_text, index });
      });
      
      // Create maps for quick lookup
      const photoResultsMap = new Map(photoResults.map(r => [r.question_id, r]));
      const activityMap = new Map((activityData || []).map(a => [a.question_id, a]));

      const updatedResults = [...examResults];
      let part2Correct = 0;

      // Process questions 20-25
      for (const question of questions2025) {
        const analysisResult = photoResultsMap.get(question.question_id);
        const activityRecord = activityMap.get(question.question_id);
        const questionData = questionAnswers.get(question.question_id);
        
        if (!questionData) continue;
        
        let isCorrect = false;
        let feedback = "";
        let scores = 0;
        let attempted = false;

        // Priority: Use photo analysis if available, otherwise use student_activity
        if (analysisResult) {
          // Has photo analysis result
          attempted = true;
          try {
            const feedbackData = JSON.parse(analysisResult.raw_output);
            if (feedbackData.review && typeof feedbackData.scores === 'number') {
              feedback = feedbackData.review;
              scores = feedbackData.scores;
              isCorrect = feedbackData.scores >= 2;
            } else {
              feedback = analysisResult.raw_output;
              scores = 0;
              isCorrect = false;
            }
          } catch (parseError) {
            console.error('Error parsing photo analysis:', parseError);
            feedback = analysisResult.raw_output;
            scores = 0;
            isCorrect = analysisResult.raw_output !== 'False';
          }
        } else if (activityRecord) {
          // Use student_activity data
          attempted = activityRecord.finished_or_not;
          isCorrect = activityRecord.is_correct || false;
          scores = activityRecord.scores_fipi || 0;
        }

        if (isCorrect) {
          part2Correct++;
        }

        const resultIndex = updatedResults.findIndex(r => r && r.questionId === question.question_id);
        if (resultIndex >= 0) {
          updatedResults[resultIndex] = {
            ...updatedResults[resultIndex],
            isCorrect,
            photoFeedback: feedback || undefined,
            photoScores: scores,
            attempted,
            userAnswer: analysisResult 
              ? JSON.stringify({ userAnswer: 'Развернутый ответ', score: scores })
              : updatedResults[resultIndex].userAnswer
          };
        }
      }

      setExamResults(updatedResults);

      // Calculate updated total stats
      const part1Correct = examStats?.part1Correct || 0;
      const totalCorrect = part1Correct + part2Correct;
      const percentage = Math.round((totalCorrect / 25) * 100);

      const finalStats = {
        totalCorrect,
        totalQuestions: 25,
        percentage,
        part1Correct: part1Correct,
        part1Total: 19,
        part2Correct: part2Correct,
        part2Total: 6,
        totalTimeSpent: elapsedTime
      };

      toast.success(`Экзамен завершен! Результат: ${totalCorrect}/25 (${percentage}%)`);
      return finalStats;
    } catch (error) {
      console.error('Error in processPhase2Results:', error);
      return examStats; // Return existing stats on error
    }
  };

  const handlePhotoAttachment = async () => {
    if (!user) {
      toast.error('Войдите в систему для прохождения экзамена');
      return;
    }
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('telegram_user_id')
        .eq('user_id', user.id)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('telegram_input')
        .eq('user_id', user.id)
        .single();

      if (profileError && (profileError as any).code !== 'PGRST116') {
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

      setUserAnswer(profile.telegram_input);
      setShowUploadPrompt(false);

      supabase.functions.invoke('check-photo-solution', {
        body: {
          student_solution: profile.telegram_input,
          problem_text: currentQuestion.problem_text,
          solution_text: currentQuestion.solution_text,
          user_id: user.id,
          question_id: currentQuestion.question_id,
          exam_id: examId
        }
      }).catch(error => console.error('Background photo analysis error:', error));

      toast.success('Фото решения сохранено и отправлено на анализ');
    } catch (error) {
      console.error('Error in handlePhotoCheck:', error);
      toast.error('Произошла ошибка при обработке решения');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleGoToQuestion = (questionIndex: number) => {
    setIsReviewMode(true);
    setReviewQuestionIndex(questionIndex);
  };

  const handleBackToSummary = () => {
    setIsReviewMode(false);
    setReviewQuestionIndex(null);
  };

  const handleNavigateToQuestion = (questionIndex: number) => {
    if (!isReviewMode) {
      const currentTime = questionStartTime ? Date.now() - questionStartTime.getTime() : 0;
      const newResult: ExamResult = {
        questionIndex: currentQuestionIndex,
        questionId: currentQuestion?.question_id || '',
        isCorrect: null,
        userAnswer,
        correctAnswer: currentQuestion?.answer || '',
        problemText: currentQuestion?.problem_text || '',
        solutionText: currentQuestion?.solution_text || '',
        timeSpent: Math.floor(currentTime / 1000),
        problemNumber: currentQuestion?.problem_number_type || currentQuestionIndex + 1
      };

      setExamResults(prev => {
        const updated = [...prev];
        updated[currentQuestionIndex] = { ...updated[currentQuestionIndex], ...newResult, attempted: userAnswer.trim() !== "" };
        return updated;
      });
    }

    setCurrentQuestionIndex(questionIndex);
    setUserAnswer(examResults[questionIndex]?.userAnswer || "");
    setQuestionStartTime(new Date());
    setShowQuestionMenu(false);
  };

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-start">
              <Link to="/ogemath-practice">
                <Button className="bg-gradient-to-r from-yellow-200 to-yellow-300 hover:from-yellow-300 hover:to-yellow-400 text-black shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  Назад
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Clock className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Пробный экзамен ОГЭ</h1>
              <p className="text-lg text-gray-600 mb-6">Полноценный экзамен с таймером на 3 часа 55 минут</p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Условия экзамена</CardTitle>
              </CardHeader>
              <CardContent className="text-left space-y-3">
                <p>• <strong>25 вопросов</strong> в порядке от 1 до 25</p>
                <p>• <strong>Время:</strong> 3 часа 55 минут (таймер запускается автоматически)</p>
                <p>• <strong>Вопросы 1-19:</strong> текстовые ответы</p>
                <p>• <strong>Вопросы 20-25:</strong> развернутые решения с фото</p>
                <p>• <strong>Результаты:</strong> показываются только в конце экзамена</p>
              </CardContent>
            </Card>

            <Button
              onClick={handleStartExam}
              disabled={loading || !user}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              {loading ? 'Подготовка экзамена...' : 'Начать экзамен'}
            </Button>

            {!user && (
              <Alert className="mt-4">
                <AlertDescription>Войдите в систему для прохождения экзамена</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (examFinished && !isReviewMode) {
    if (!examStats) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Обрабатываем результаты...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link to="/ogemath-practice">
                <Button className="bg-gradient-to-r from-yellow-200 to-yellow-300 hover:from-yellow-300 hover:to-yellow-400 text-black shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  Назад к практике
                </Button>
              </Link>
              <div className="text-lg font-semibold text-gray-700">Экзамен завершен</div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Результаты экзамена</h1>
              <div className="text-6xl font-bold mb-4">
                <span className={examStats.percentage >= 60 ? 'text-green-600' : 'text-red-600'}>
                  {examStats.percentage}%
                </span>
              </div>
              <p className="text-lg text-gray-600">
                {examStats.totalCorrect} из {examStats.totalQuestions} правильных ответов
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader><CardTitle>Часть 1 (1-19)</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{examStats.part1Correct}/{examStats.part1Total}</div>
                  <p className="text-gray-600">Базовый уровень</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Часть 2 (20-25)</CardTitle></CardHeader>
                <CardContent>
                  {part2Loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <span className="ml-3 text-gray-600">Обработка...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-purple-600">{examStats.part2Correct}/{examStats.part2Total}</div>
                      <p className="text-gray-600">Повышенный уровень</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Время</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">{formatTime(examStats.totalTimeSpent)}</div>
                  <p className="text-gray-600">Общее время</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Подробные результаты</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded"></span>Правильно</span>
                  <span className="inline-flex items-center gap-2 ml-4"><span className="w-3 h-3 bg-red-500 rounded"></span>Неправильно</span>
                  <span className="inline-flex items-center gap-2 ml-4"><span className="w-3 h-3 bg-gray-400 rounded"></span>Не отвечено</span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 25 }, (_, index) => {
                    const result = examResults[index];
                    const isAttempted = result?.attempted !== false;
                    const isCorrect = isAttempted ? result?.isCorrect : null;
                    const isLoadingQuestion = part2Loading && index >= 19;

                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className={`h-12 ${
                          isLoadingQuestion
                            ? 'bg-yellow-50 border-yellow-400 hover:bg-yellow-100 text-yellow-700'
                            : isCorrect === true
                            ? 'bg-green-100 border-green-500 hover:bg-green-200 text-green-800'
                            : isCorrect === false
                            ? 'bg-red-100 border-red-500 hover:bg-red-200 text-red-800'
                            : 'bg-gray-100 border-gray-400 hover:bg-gray-200 text-gray-600'
                        }`}
                        onClick={() => !isLoadingQuestion && handleGoToQuestion(index)}
                        disabled={isLoadingQuestion}
                      >
                        <div className="text-center">
                          <div className="font-semibold">{index + 1}</div>
                          <div className="text-xs">
                            {isLoadingQuestion ? '⏳' : isCorrect === true ? '✓' : isCorrect === false ? '✗' : '—'}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isReviewMode && reviewQuestionIndex !== null) {
    const reviewResult = examResults[reviewQuestionIndex];
    const reviewQuestion = questions[reviewQuestionIndex];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Button onClick={handleBackToSummary}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                К результатам
              </Button>
              <div className="text-lg font-semibold text-gray-700">
                Вопрос {reviewQuestionIndex + 1} из {questions.length}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Вопрос {reviewQuestionIndex + 1}
                  {reviewResult?.isCorrect === true ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : reviewResult?.isCorrect === false ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewQuestion?.problem_image && (
                  <img src={reviewQuestion.problem_image} alt="Problem" className="mb-4 max-w-full h-auto" />
                )}
                <MathRenderer text={reviewQuestion?.problem_text || ''} />
              </CardContent>
            </Card>

            <div className="space-y-4 mb-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Ваш ответ</CardTitle>
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded text-sm font-bold">
                      Баллы: {(() => {
                        const maxPoints = reviewQuestionIndex >= 19 ? 2 : 1;
                        let earnedPoints = 0;
                        if (reviewQuestionIndex >= 19 && reviewQuestionIndex <= 24) {
                          if (reviewResult?.photoScores !== undefined) {
                            earnedPoints = reviewResult.photoScores!;
                          } else if (reviewResult?.userAnswer?.startsWith('{')) {
                            try {
                              const analysis = JSON.parse(reviewResult.userAnswer);
                              earnedPoints = analysis.score || 0;
                            } catch {
                              earnedPoints = 0;
                            }
                          }
                        } else {
                          earnedPoints = reviewResult?.isCorrect ? 1 : 0;
                        }
                        return `${earnedPoints}/${maxPoints}`;
                      })()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-gray-50 rounded border">
                    <MathRenderer
                      text={(() => {
                        if (reviewQuestionIndex >= 19 && reviewQuestionIndex <= 24 && reviewResult?.userAnswer?.startsWith('{')) {
                          try {
                            const analysis = JSON.parse(reviewResult.userAnswer);
                            return analysis.userAnswer || 'Развернутый ответ представлен';
                          } catch {
                            return reviewResult?.userAnswer || 'Не отвечено';
                          }
                        }
                        return reviewResult?.userAnswer || 'Не отвечено';
                      })()}
                      compiler="mathjax"
                    />
                  </div>
                  {reviewResult?.photoFeedback && (
                    <div className="mt-3">
                      <strong>Оценка:</strong>
                      <div className="mt-1 p-3 bg-blue-50 rounded text-sm">
                        <MathRenderer text={reviewResult.photoFeedback} compiler="mathjax" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md animate-fade-in">
                <div className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b border-gray-200 pb-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  Правильный ответ:
                </div>
                <MathRenderer text={reviewResult?.correctAnswer || 'Неизвестно'} compiler="mathjax" />
              </div>
            </div>

            {reviewQuestion?.solution_text && (
              <Card>
                <CardHeader><CardTitle>Решение</CardTitle></CardHeader>
                <CardContent>
                  <MathRenderer text={reviewQuestion.solution_text} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with timer */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button onClick={() => setShowFormulaBooklet(true)} variant="outline" disabled={isTransitioning}>
                <BookOpen className="w-4 h-4 mr-2" />
                Справочные материалы
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className={`text-xl font-bold ${isTimeUp ? 'text-red-600' : 'text-blue-600'}`}>
                <Clock className="w-5 h-5 inline mr-2" />
                {formatTime(elapsedTime)}
              </div>

              <Button onClick={() => setShowQuestionMenu(true)} variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200" disabled={isTransitioning}>
                <Menu className="w-4 h-4 mr-2" />
                Вопросы
              </Button>

              <Button onClick={handleFinishExam} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" disabled={isTransitioning}>
                Завершить экзамен
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Вопрос {currentQuestionIndex + 1} из {questions.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-lg">Загрузка вопроса...</div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  Задание {currentQuestionIndex + 1}
                  {currentQuestion?.problem_number_type && (
                    <span className="ml-2 text-sm font-normal text-gray-500">(Номер {currentQuestion.problem_number_type})</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentQuestion?.problem_image && (
                  <img src={currentQuestion.problem_image} alt="Problem" className="mb-4 max-w-full h-auto" />
                )}

                <div className="mb-6">
                  <MathRenderer text={currentQuestion?.problem_text || ''} />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ваш ответ:</label>
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Введите ваш ответ"
                      className="text-lg"
                      disabled={isTransitioning}
                    />
                  </div>

                  {isPhotoQuestion && (
                    <div className="flex justify-center">
                      <Button variant="outline" onClick={handlePhotoAttachment} className="bg-blue-50 hover:bg-blue-100 border-blue-200" disabled={isTransitioning}>
                        <Camera className="w-4 h-4 mr-2" />
                        Прикрепить фото
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      {currentQuestionIndex > 0 && (
                        <Button
                          onClick={() => {
                            setCurrentQuestionIndex(prev => prev - 1);
                            setUserAnswer(examResults[currentQuestionIndex - 1]?.userAnswer || "");
                          }}
                          variant="outline"
                          disabled={isTransitioning}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Предыдущий
                        </Button>
                      )}
                    </div>

                    <Button onClick={handleNextQuestion} className="flex items-center gap-2" disabled={isTransitioning || loading}>
                      {currentQuestionIndex === questions.length - 1 ? 'Завершить экзамен' : 'Следующий вопрос'}
                      {currentQuestionIndex < questions.length - 1 && <ArrowRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Telegram Not Connected Dialog */}
      <Dialog open={showTelegramNotConnected} onOpenChange={setShowTelegramNotConnected}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Telegram не подключен
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-700">Зайдите в Дашборд и потвердите Telegram код.</p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setShowTelegramNotConnected(false)}>Понятно</Button>
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
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                Загрузите фото в телеграм бот egechat_bot. Уже загрузили? Нажмите кнопку 'Да'
              </p>
            </div>
            <div className="flex justify-center">
              <Button onClick={handlePhotoCheck} disabled={isProcessingPhoto} className="min-w-24">
                {isProcessingPhoto ? 'Обработка...' : 'Да'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Navigation Menu */}
      <Dialog open={showQuestionMenu} onOpenChange={setShowQuestionMenu}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Навигация по вопросам
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-5 gap-3">
              {questions.map((_, index) => {
                const hasAnswer = examResults[index]?.attempted || examResults[index]?.userAnswer;
                const isCurrent = index === currentQuestionIndex;
                return (
                  <Button
                    key={index}
                    variant={isCurrent ? "default" : "outline"}
                    className={`h-14 ${
                      isCurrent
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : hasAnswer
                        ? 'bg-green-50 border-green-300 hover:bg-green-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleNavigateToQuestion(index)}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{index + 1}</div>
                      <div className="text-xs mt-1">{hasAnswer ? '✓' : '○'}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
            <div className="mt-4 text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>Текущий вопрос</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Отвечен</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-gray-300 rounded"></div>
                <span>Не отвечен</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FormulaBookletDialog open={showFormulaBooklet} onOpenChange={setShowFormulaBooklet} />

      {isTimeUp && (
        <Alert className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">
            Время экзамена истекло! Экзамен завершается автоматически.
          </AlertDescription>
        </Alert>
      )}

      {isTransitioning && <LoadingOverlay message="Загрузка..." />}
    </div>
  );
};

export default OgemathMock;
