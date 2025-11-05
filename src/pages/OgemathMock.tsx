import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FeedbackButton from "@/components/FeedbackButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Camera, Clock, BookOpen, Menu, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { toast } from "sonner";
import FormulaBookletDialog from "@/components/FormulaBookletDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import Loading from "@/components/ui/Loading";

const COURSE_ID = '1'; // OГЭ
const makeExamId = () => {
  // Standard 36-char UUID like "123e4567-e89b-12d3-a456-426614174000"
  return (crypto as any)?.randomUUID?.() ?? uuidV4Fallback();
};

// Fallback for older browsers (still returns a valid v4 UUID)
function uuidV4Fallback() {
  const b = new Uint8Array(16);
  (crypto || (window as any).msCrypto).getRandomValues(b);
  // Per RFC 4122:
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = Array.from(b, x => x.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}


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

  const currentQuestion = questions[currentQuestionIndex];
  const isPhotoQuestion = currentQuestion?.problem_number_type && currentQuestion.problem_number_type >= 20;

  // Start attempt when a new question is displayed
  useEffect(() => {
    if (!examStarted || examFinished || !currentQuestion || !user) return;
    const problemNumberType = currentQuestion.problem_number_type || (currentQuestionIndex + 1);
    startAttempt(currentQuestion.question_id, problemNumberType);
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
    const newExamId = makeExamId();
    setExamId(newExamId);
    
    const { error } = await supabase
      .from('profiles')
      .update({ exam_id: newExamId }) // column should be UUID type
      .eq('user_id', user.id);


    if (error) {
      console.error('Error saving exam_id to profiles:', error);
      toast.error('Ошибка при сохранении идентификатора экзамена');
      return;
    }

    setExamStarted(true);
    setExamFinished(false);
    setExamStats(null);
    setExamStartTime(new Date());
    setIsTimeUp(false);

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

  // --- NEW: insert placeholder for Part 2 (20–25) so results always see an attempted row
  const insertPhotoPlaceholder = async (
    problemNumber: number,
    answerText: string,
    qid: string
  ): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('exam_id')
        .eq('user_id', user.id)
        .single();

      const currentExamId = profile?.exam_id || examId;

      const { data, error } = await supabase
        .from('photo_analysis_outputs')
        .insert({
          user_id: user.id,
          question_id: qid,
          exam_id: currentExamId,
          problem_number: problemNumber.toString(),
          analysis_type: 'photo_solution',  // keep consistent with reader
          raw_output: answerText.trim(),     // marks as "attempted"
          openrouter_check: null
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[PAO/INSERT placeholder] failed:', error);
        return null;
      }
      return (data as any)?.id ?? null;
    } catch (e) {
      console.warn('[PAO/INSERT placeholder] exception:', e);
      return null;
    }
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
            // FRQ (20–25) — INSERT placeholder then fire-and-forget analysis
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('exam_id')
                .eq('user_id', user.id)
                .single();

              const currentExamId = profile?.exam_id || examId;

              // 1) placeholder row so results page sees an attempted entry
              const placeholderId = await insertPhotoPlaceholder(
                problemNumber,
                userAnswer,
                currentQuestion.question_id
              );

              // 2) Kick off AI analysis (update same row if your function supports it)
              supabase.functions.invoke('analyze-photo-solution', {
                body: {
                  student_solution: userAnswer.trim(),
                  problem_text: currentQuestion.problem_text,
                  solution_text: currentQuestion.solution_text,
                  user_id: user.id,
                  question_id: currentQuestion.question_id,
                  exam_id: currentExamId,
                  problem_number: problemNumber.toString(),
                  photo_row_id: placeholderId || undefined
                }
              }).catch(error => console.error('Background photo analysis error:', error));

              console.log('Photo analysis started in background for question', problemNumber);
              analysisOutput = "Решение отправлено на проверку";
              scores = 1;           // optimistic point if you want
              isCorrect = true;     // optimistic correctness for UI
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
        await handleFinishExam(); // await so the small delay applies before stats
      }
    } catch (error) {
      console.error('Error in handleNextQuestion:', error);
      toast.error('Произошла ошибка');
    } finally {
      setIsTransitioning(false);
    }
  };

const startAttempt = async (questionId: string, problemNumberType: number): Promise<string | null> => {
  if (!user) return null;

  try {
    // 1) Try to reuse the latest unfinished attempt for this user+question
    const { data: openAttempt, error: openErr } = await supabase
      .from('student_activity')
      .select('attempt_id, finished_or_not')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openErr) {
      console.warn('[student_activity] lookup unfinished attempt error:', openErr);
    }

    if (openAttempt && openAttempt.finished_or_not === false) {
      // Reuse existing unfinished attempt
      return (openAttempt as any).attempt_id as string;
    }

    // 2) Otherwise, create a new attempt
    const questionDetailsCache = (window as any).questionDetailsCache;
    let skillsArray: number[] = [];
    let topicsArray: string[] = [];

    if (questionDetailsCache && questionDetailsCache.has(questionId)) {
      const questionDetails = questionDetailsCache.get(questionId);
      skillsArray = Array.isArray(questionDetails.skills_list) ? questionDetails.skills_list : [];
      topicsArray = Array.isArray(questionDetails.topics_list) ? questionDetails.topics_list : [];
    }

    const { data: insertData, error: insertErr } = await supabase
      .from('student_activity')
      .insert({
        user_id: user.id,
        question_id: questionId,
        answer_time_start: new Date().toISOString(), // source of truth
        finished_or_not: false,
        problem_number_type: problemNumberType,
        is_correct: null,
        duration_answer: null,
        scores_fipi: null,
        skills: skillsArray.length ? skillsArray : null,
        topics: topicsArray.length ? topicsArray : null,
        course_id: COURSE_ID, // <-- ensure course is saved
      })
      .select('attempt_id')
      .single();

    if (insertErr) {
      console.error('[student_activity] insert error:', insertErr);
      return null;
    }

    return (insertData as any)?.attempt_id ?? null;
  } catch (e) {
    console.error('startAttempt() exception:', e);
    return null;
  }
};



const completeAttempt = async (isCorrect: boolean, scores: number) => {
  if (!user || !currentQuestion) return;
  try {
    // Prefer the latest unfinished attempt
    let { data: activityData, error: activityError } = await supabase
      .from('student_activity')
      .select('attempt_id, finished_or_not')
      .eq('user_id', user.id)
      .eq('question_id', currentQuestion.question_id)
      .eq('finished_or_not', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fallback: latest attempt if none unfinished
    if (!activityData) {
      const fallback = await supabase
        .from('student_activity')
        .select('attempt_id, finished_or_not')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion.question_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      activityData = fallback.data as any;
      activityError = fallback.error as any;
    }

    if (activityError || !activityData) {
      console.error('Error getting attempt for completion:', activityError);
      return;
    }

    const { error: completeError } = await supabase.functions.invoke('complete-attempt', {
      body: {
        attempt_id: (activityData as any).attempt_id,
        finished_or_not: true,
        is_correct: isCorrect,
        scores_fipi: scores,
      },
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

    // small settle delay so the last insert (placeholder) is visible to the query
    await new Promise((r) => setTimeout(r, 250));

    const stats = await processExamResults();
    if (stats) setExamStats(stats);
  };

  const processExamResults = async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('exam_id')
        .eq('user_id', user.id)
        .single();

      const currentExamId = profile?.exam_id || examId;

      const { data: analysisResults, error: analysisError } = await supabase
        .from('photo_analysis_outputs')
        .select('question_id, raw_output, problem_number, analysis_type, openrouter_check, created_at')
        .eq('user_id', user.id)
        .eq('exam_id', currentExamId)
        .order('created_at', { ascending: false });

      if (analysisError) {
        console.error('Error fetching analysis results:', analysisError);
        toast.error('Ошибка при получении результатов анализа');
        setLoading(false);
        return null;
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

      if (filteredResults.length > 0) {
        setPhotoFeedback(JSON.stringify(filteredResults));
      }

      const questionAnswers = new Map<string, { answer: string; problemText: string; index: number }>();
      questions.forEach((q, index) => {
        questionAnswers.set(q.question_id, { answer: q.answer, problemText: q.problem_text, index });
      });

      const updatedResults = [...examResults];
      let totalCorrect = 0;
      let part1Correct = 0;
      let part2Correct = 0;
      const part1Total = 19;
      const part2Total = 6;
      const totalQuestions = 25;

      if (filteredResults.length > 0) {
        for (const analysisResult of filteredResults) {
          if (!analysisResult.question_id || !analysisResult.problem_number) {
            console.warn('Skipping invalid analysis result:', analysisResult);
            continue;
          }

          const problemNumber = parseInt(analysisResult.problem_number);
          const questionData = questionAnswers.get(analysisResult.question_id);
          if (!questionData) continue;

          let isCorrect = false;
          let feedback = "";
          let scores = 0;

          if (problemNumber >= 20) {
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
              console.error('Error parsing stored analysis:', parseError);
              feedback = analysisResult.raw_output;
              scores = 0;
              isCorrect = analysisResult.raw_output !== 'False';
            }

            if (isCorrect) {
              part2Correct++;
              totalCorrect++;
            }
          } else {
            // Part 1 (1–19) — prefer openrouter_check if present ("true"/"false" as TEXT)
            const raw = (analysisResult as any).openrouter_check as string | null | undefined;
            const orCheck: boolean | null =
              typeof raw === "string"
                ? (raw.trim().toLowerCase() === "true" ? true : raw.trim().toLowerCase() === "false" ? false : null)
                : null;

            if (orCheck === true || orCheck === false) {
              isCorrect = orCheck;
              feedback = isCorrect ? "Правильно (AI проверка)" : "Неправильно (AI проверка)";
            } else {
              const userAnswerStored = analysisResult.raw_output as string;
              const correctAnswer = questionData.answer;

              if (userAnswerStored === 'False') {
                isCorrect = false;
                feedback = "Вопрос пропущен";
              } else {
                if (isNumeric(correctAnswer)) {
                  const sanitizedUserAnswer = sanitizeNumericAnswer(userAnswerStored);
                  const sanitizedCorrectAnswer = sanitizeNumericAnswer(correctAnswer);
                  isCorrect = sanitizedUserAnswer === sanitizedCorrectAnswer;
                  feedback = isCorrect ? "Правильно" : "Неправильно";
                } else {
                  const userAnswerLower = userAnswerStored.toString().toLowerCase().trim();
                  const correctAnswerLower = correctAnswer.toString().toLowerCase().trim();
                  isCorrect = userAnswerLower === correctAnswerLower;
                  feedback = isCorrect ? "Правильно" : "Неправильно";
                }
              }
            }

            if (isCorrect) {
              part1Correct++;
              totalCorrect++;
            }
          }

          const resultIndex = updatedResults.findIndex(r => r && r.questionId === analysisResult.question_id);
          if (resultIndex >= 0) {
            updatedResults[resultIndex] = {
              ...updatedResults[resultIndex],
              isCorrect,
              photoFeedback: feedback,
              photoScores: scores,
              attempted: true
            };
          }
        }
      }

      setExamResults(updatedResults);

      const percentage = Math.round((totalCorrect / totalQuestions) * 100);
      toast.success(`Экзамен завершен! Результат: ${totalCorrect}/${totalQuestions} (${percentage}%)`);

      return {
        totalCorrect,
        totalQuestions,
        percentage,
        part1Correct,
        part1Total,
        part2Correct,
        part2Total,
        totalTimeSpent: elapsedTime
      };
    } catch (error) {
      console.error('Error processing exam results:', error);
      return null;
    } finally {
      setLoading(false);
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
      // 1. Query telegram_input from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('telegram_input, exam_id')
        .eq('user_id', user.id)
        .single();

      if (profileError && (profileError as any).code !== 'PGRST116') {
        console.error('Error getting telegram input:', profileError);
        toast.error('Ошибка при получении данных');
        setIsProcessingPhoto(false);
        return;
      }

      if (!profile?.telegram_input) {
        toast.error('Фото не загружено в Telegram бот.');
        setIsProcessingPhoto(false);
        return;
      }

      const studentSolution = profile.telegram_input;
      const currentExamId = profile?.exam_id || examId;
      const problemNumber = currentQuestion.problem_number_type || (currentQuestionIndex + 1);

      // 2. Set user answer for display
      setUserAnswer(studentSolution);
      
      // 3. Close upload dialog
      setShowUploadPrompt(false);

      // 4. Insert placeholder into photo_analysis_outputs
      const { data: placeholderData, error: placeholderError } = await supabase
        .from('photo_analysis_outputs')
        .insert({
          user_id: user.id,
          question_id: currentQuestion.question_id,
          exam_id: currentExamId,
          problem_number: problemNumber.toString(),
          analysis_type: 'photo_solution',
          raw_output: studentSolution.trim(),
          student_solution: studentSolution.trim(),
          openrouter_check: null
        })
        .select('id')
        .single();

      if (placeholderError) {
        console.error('Error inserting placeholder:', placeholderError);
        toast.error('Ошибка при сохранении решения');
        setIsProcessingPhoto(false);
        return;
      }

      const photoRowId = (placeholderData as any)?.id;

      // 5. Invoke analyze-photo-solution edge function (background)
      supabase.functions.invoke('analyze-photo-solution', {
        body: {
          student_solution: studentSolution,
          problem_text: currentQuestion.problem_text,
          solution_text: currentQuestion.solution_text,
          user_id: user.id,
          question_id: currentQuestion.question_id,
          exam_id: currentExamId,
          problem_number: problemNumber.toString(),
          photo_row_id: photoRowId
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
      <div 
        className="min-h-screen text-white relative" 
        style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
      >
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Back */}
            <div className="mb-6">
              <Link to="/ogemath-practice">
                <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад
                </Button>
              </Link>
            </div>

            {/* Header (no formula booklet button on initial screen) */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                Пробный экзамен ОГЭ
              </h1>
              <div className="flex items-center gap-3 text-white/80">
                <Clock className="w-5 h-5" />
                <span className="font-mono">00:00:00 / 03:55:00</span>
              </div>
            </div>

            {/* Start/Exam UI */}
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardContent className="p-6">
                <div className="space-y-4 text-white/80 mb-6">
                  <p>• <strong className="text-white">25 вопросов</strong> в порядке от 1 до 25</p>
                  <p>• <strong className="text-white">Время:</strong> 3 часа 55 минут (таймер запускается автоматически)</p>
                  <p>• <strong className="text-white">Вопросы 1-19:</strong> текстовые ответы</p>
                  <p>• <strong className="text-white">Вопросы 20-25:</strong> развернутые решения с фото</p>
                  <p>• <strong className="text-white">Результаты:</strong> показываются только в конце экзамена</p>
                </div>
                <Button 
                  onClick={handleStartExam} 
                  disabled={loading || !user}
                  className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] px-8 py-3 text-lg font-semibold"
                >
                  {loading ? 'Подготовка экзамена...' : 'Начать экзамен'}
                </Button>
                {!user && (
                  <Alert className="mt-4 bg-orange-50 border-orange-200">
                    <AlertDescription className="text-orange-800">Войдите в систему для прохождения экзамена</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (examFinished && !isReviewMode) {
    if (!examStats) {
      return (
        <div 
          className="min-h-screen text-white relative flex items-center justify-center" 
          style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
        >
          <Loading 
            variant="ring-dots" 
            size="lg" 
            message="Обрабатываем результаты..." 
            fullscreen={false}
            className="text-white"
          />
        </div>
      );
    }

    return (
      <div 
        className="min-h-screen md:min-h-screen text-white relative w-full max-w-full overflow-x-hidden" 
        style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
      >
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Back */}
            <div className="mb-6">
              <Link to="/ogemath-practice">
                <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к практике
                </Button>
              </Link>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-4">
                Результаты экзамена
              </h1>
              <div className="text-6xl font-bold mb-4">
                <span className={examStats.percentage >= 60 ? 'text-emerald-400' : 'text-red-400'}>
                  {examStats.percentage}%
                </span>
              </div>
              <p className="text-lg text-white/80">
                {examStats.totalCorrect} из {examStats.totalQuestions} правильных ответов
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader><CardTitle className="text-[#1a1f36]">Часть 1 (1-19)</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{examStats.part1Correct}/{examStats.part1Total}</div>
                  <p className="text-gray-600">Базовый уровень</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader><CardTitle className="text-[#1a1f36]">Часть 2 (20-25)</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{examStats.part2Correct}/{examStats.part2Total}</div>
                  <p className="text-gray-600">Повышенный уровень</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader><CardTitle className="text-[#1a1f36]">Время</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">{formatTime(examStats.totalTimeSpent)}</div>
                  <p className="text-gray-600">Общее время</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-[#1a1f36]">Подробные результаты</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded"></span>Правильно</span>
                  <span className="inline-flex items-center gap-2 ml-4"><span className="w-3 h-3 bg-red-500 rounded"></span>Неправильно</span>
                  <span className="inline-flex items-center gap-2 ml-4"><span className="w-3 h-3 bg-gray-400 rounded"></span>Не отвечено</span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {Array.from({ length: 25 }, (_, index) => {
                    const result = examResults[index];
                    const isAttempted = result?.attempted !== false;
                    const isCorrect = isAttempted ? result?.isCorrect : null;

                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className={`h-12 ${
                          isCorrect === true
                            ? 'bg-green-100 border-green-500 hover:bg-green-200 text-green-800'
                            : isCorrect === false
                            ? 'bg-red-100 border-red-500 hover:bg-red-200 text-red-800'
                            : 'bg-gray-100 border-gray-400 hover:bg-gray-200 text-gray-600'
                        }`}
                        onClick={() => handleGoToQuestion(index)}
                      >
                        <div className="text-center">
                          <div className="font-semibold">{index + 1}</div>
                          <div className="text-xs">{isCorrect === true ? '✓' : isCorrect === false ? '✗' : '—'}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]"
                  >
                    Новый экзамен
                  </Button>
                  <Link to="/ogemath-practice" className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      К практике
                    </Button>
                  </Link>
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
      <div 
        className="min-h-screen text-white relative" 
        style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
      >
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Back */}
            <div className="mb-6">
              <Button onClick={handleBackToSummary} variant="outline" size="sm" className="bg-transparent border-white/20 hover:border-white/40 text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                К результатам
              </Button>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                Вопрос {reviewQuestionIndex + 1} из {questions.length}
              </h1>
            </div>
            <Card className="mb-6 bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#1a1f36]">
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
              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[#1a1f36]">Ваш ответ</CardTitle>
                    <div className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] px-3 py-1 rounded text-sm font-bold">
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

              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-[#1a1f36] flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Правильный ответ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                    <MathRenderer text={reviewResult?.correctAnswer || 'Неизвестно'} compiler="mathjax" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {reviewQuestion?.solution_text && (
              <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
                <CardHeader><CardTitle className="text-[#1a1f36]">Решение</CardTitle></CardHeader>
                <CardContent>
                  <div className="prose max-w-none p-4 bg-blue-50 rounded-lg">
                    <MathRenderer text={reviewQuestion.solution_text} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-6">
              {reviewQuestionIndex > 0 && (
                <Button
                  onClick={() => handleGoToQuestion(reviewQuestionIndex - 1)}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Предыдущий
                </Button>
              )}
              <FeedbackButton contentType={reviewQuestion?.problem_number_type && reviewQuestion.problem_number_type >= 20 ? 'frq_question' : 'mcq'} contentRef={reviewQuestion?.question_id || ''} />
              {reviewQuestionIndex < examResults.length - 1 && (
                <Button
                  onClick={() => handleGoToQuestion(reviewQuestionIndex + 1)}
                  className="ml-auto bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]"
                >
                  Следующий
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen md:min-h-screen text-white relative w-full max-w-full overflow-x-hidden" 
      style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              Пробный экзамен ОГЭ
            </h1>
            <div className="flex items-center gap-3 text-white/80">
              <div className={`text-xl font-bold ${isTimeUp ? 'text-red-400' : 'text-white'}`}>
                <Clock className="w-5 h-5 inline mr-2" />
                {formatTime(elapsedTime)}
              </div>
              <Button
                onClick={() => setShowFormulaBooklet(true)}
                variant="outline"
                className="bg-transparent border-white/20 hover:border-white/40 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                disabled={isTransitioning}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Справочник формул
              </Button>
              <Button
                onClick={() => setShowQuestionMenu(true)}
                variant="outline"
                className="bg-transparent border-white/20 hover:border-white/40 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                disabled={isTransitioning}
              >
                <Menu className="w-4 h-4 mr-2" />
                Вопросы
              </Button>
              <Button onClick={handleFinishExam} variant="outline" className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700" disabled={isTransitioning}>
                Завершить экзамен
              </Button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-white/80">Вопрос {currentQuestionIndex + 1} из {questions.length}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
            </div>
          </div>

          {(
            <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-[#1a1f36]">
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

                  <div className="flex justify-between pt-4 border-t">
                    <div className="flex gap-3">
                      {currentQuestionIndex > 0 && (
                        <Button
                          onClick={() => {
                            setCurrentQuestionIndex(prev => prev - 1);
                            setUserAnswer(examResults[currentQuestionIndex - 1]?.userAnswer || "");
                          }}
                          variant="outline"
                          className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                          disabled={isTransitioning}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Предыдущий
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <FeedbackButton contentType={isPhotoQuestion ? 'frq_question' : 'mcq'} contentRef={currentQuestion?.question_id || ''} />
                      <Button 
                        onClick={handleNextQuestion} 
                        className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]" 
                        disabled={isTransitioning || loading}
                      >
                        {currentQuestionIndex === questions.length - 1 ? 'Завершить экзамен' : 'Следующий вопрос'}
                        {currentQuestionIndex < questions.length - 1 && <ArrowRight className="w-4 h-4" />}
                      </Button>
                    </div>
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
