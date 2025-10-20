  import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, ArrowLeft, ArrowRight, Clock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { toast } from "sonner";
import FormulaBookletDialog from "@/components/FormulaBookletDialog";
import Loading from "@/components/ui/Loading";

const COURSE_ID = "2"; // ЕГЭ База

// Generate a UUID (v4)
const makeExamId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  (crypto || (window as any).msCrypto).getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const b = Array.from(bytes, toHex).join("");
  return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20)}`;
};

interface Question {
  question_id: string;
  problem_text: string;
  answer: string;
  solution_text: string;
  difficulty?: string | number;
  problem_number_type?: number;
  problem_image?: string;
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
  attempted?: boolean;
  problemNumber: number;
}

type CheckTextAnswerResp = { is_correct: boolean };

const EgemathbasicMock = () => {
  const { user } = useAuth();
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [examStats, setExamStats] = useState<{
    totalCorrect: number;
    totalQuestions: number;
    percentage: number;
    totalTimeSpent: number;
  } | null>(null);
  const [examId, setExamId] = useState<string>("");

  // Timer state (3 hours)
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const [showFormulaBooklet, setShowFormulaBooklet] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number | null>(null);
  
  const currentQuestion = questions[currentQuestionIndex];

  // Start attempt when question changes
  useEffect(() => {
    if (!examStarted || examFinished || !currentQuestion || !user) return;
    const problemNumberType = currentQuestion.problem_number_type || (currentQuestionIndex + 1);
    startAttempt(currentQuestion.question_id, problemNumberType);
  }, [currentQuestionIndex, examStarted, examFinished, currentQuestion, user]);

  // --- Helper: fetch current exam id from profiles if needed
  const getCurrentExamId = async (): Promise<string | null> => {
    if (examId) return examId;
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("exam_id").eq("user_id", user.id).single();
    return data?.exam_id ?? null;
  };

  // --- Helper: check if answer is non-numeric
  const isNonNumericAnswer = (answer: string): boolean => {
    if (!answer) return false;
    if (/\p{L}/u.test(answer)) return true; // letters (units or words)
    if (answer.includes('\\')) return true; // LaTeX
    if (/[а-яё]/i.test(answer)) return true; // Cyrillic
    return false;
  };

  // --- Helper: persist answer (text) to photo_analysis_outputs
  const persistAnswerToPAO = async ({
    questionId,
    problemNumber,
    raw,
    verdict,
  }: {
    questionId: string;
    problemNumber: number | string;
    raw: string;
    verdict: "true" | "false" | null;
  }) => {
    if (!user) return;
    const exid = await getCurrentExamId();
    if (!exid) return;

    await supabase.from("photo_analysis_outputs").insert({
      user_id: user.id,
      question_id: questionId,
      exam_id: exid,
      problem_number: String(problemNumber),
      analysis_type: "solution",
      raw_output: raw,
      openrouter_check: verdict,
    });
  };

  // --- START ATTEMPT: Create student_activity record
  const startAttempt = async (questionId: string, problemNumberType: number): Promise<string | null> => {
    if (!user) return null;

    try {
      // Try to reuse latest unfinished attempt
      const { data: openAttempt, error: openErr } = await supabase
        .from('student_activity')
        .select('attempt_id, finished_or_not')
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openErr) {
        console.warn('[student_activity] lookup error:', openErr);
      }

      if (openAttempt && openAttempt.finished_or_not === false) {
        return (openAttempt as any).attempt_id as string;
      }

      // Create new attempt
      const { data: insertData, error: insertErr } = await supabase
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
          course_id: COURSE_ID,
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

  // --- Generate 21 random questions
  const generateQuestionSelection = async () => {
    try {
      const batchPromises = [];
      for (let problemNum = 1; problemNum <= 21; problemNum++) {
        batchPromises.push(
          supabase
            .from("egemathbase")
            .select("*")
            .eq("problem_number_type", problemNum.toString())
            .limit(30)
        );
      }

      const batchResults = await Promise.all(batchPromises);
      const selectedQuestions: any[] = [];
      batchResults.forEach((result, index) => {
        const problemNum = index + 1;
        if (result.data && result.data.length > 0) {
          const randomQuestion = result.data[Math.floor(Math.random() * result.data.length)];
          selectedQuestions.push(randomQuestion);
        } else {
          console.warn(`No questions found for problem number ${problemNum}`);
        }
      });

      setQuestions(selectedQuestions);
      setExamResults(
        selectedQuestions.map((q, i) => ({
          questionIndex: i,
          questionId: q.question_id,
          isCorrect: null,
          userAnswer: "",
          correctAnswer: q.answer || "",
          problemText: q.problem_text || "",
          solutionText: q.solution_text || "",
          timeSpent: 0,
          attempted: false,
          problemNumber: q.problem_number_type || i + 1,
        }))
      );
      setCurrentQuestionIndex(0);
      setUserAnswer("");
      setQuestionStartTime(new Date());
    } catch (err) {
      console.error("Error loading exam questions:", err);
      toast.error("Ошибка при загрузке вопросов");
    }
  };

  const completeAttempt = async (isCorrect: boolean, scores: number) => {
    if (!user || !currentQuestion) return;
    try {
      // Prefer latest unfinished attempt
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
    } catch (err) {
      console.error("Error in completeAttempt:", err);
    }
  };

  const handleStartExam = async () => {
    if (!user) {
      toast.error("Войдите в систему для прохождения экзамена");
      return;
    }
    setIsTransitioning(true);
    try {
      const newExamId = makeExamId();
      setExamId(newExamId);
      await supabase.from("profiles").update({ exam_id: newExamId }).eq("user_id", user.id);
      setExamStarted(true);
      setExamFinished(false);
      setExamStats(null);
      setExamStartTime(new Date());
      setIsTimeUp(false);
      await generateQuestionSelection();
    } catch (err) {
      console.error("Error starting exam:", err);
      toast.error("Ошибка при подготовке экзамена");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!currentQuestion) return;
    setIsTransitioning(true);
    try {
      const now = new Date();
      const timeSpent = questionStartTime ? Math.floor((now.getTime() - questionStartTime.getTime()) / 1000) : 0;
      const problemNumber = currentQuestion.problem_number_type || currentQuestionIndex + 1;

      let isCorrect = false;
      let scores = 0;

      if (userAnswer.trim()) {
        // Determine if we need server check based on answer types
        const userAns = userAnswer.trim();
        const correctAns = currentQuestion.answer;
        const needsServerCheck = isNonNumericAnswer(userAns) || isNonNumericAnswer(correctAns);

        if (needsServerCheck) {
          // Use check-text-answer for non-numeric answers
          const { data: checkData } = await supabase.functions.invoke("check-text-answer", {
            body: {
              user_id: user!.id,
              question_id: currentQuestion.question_id,
              submitted_answer: userAns,
            },
          });

          isCorrect = Boolean((checkData as CheckTextAnswerResp)?.is_correct);
          scores = isCorrect ? 1 : 0;

          // Store with openrouter_check verdict
          await persistAnswerToPAO({
            questionId: currentQuestion.question_id,
            problemNumber,
            raw: userAns,
            verdict: isCorrect ? "true" : "false",
          });
        } else {
          // Both are numeric - compare directly, store with NULL openrouter_check
          isCorrect = userAns.replace(',', '.') === correctAns.replace(',', '.');
          scores = isCorrect ? 1 : 0;

          await persistAnswerToPAO({
            questionId: currentQuestion.question_id,
            problemNumber,
            raw: userAns,
            verdict: null, // NULL for numeric answers
          });
        }

        await completeAttempt(isCorrect, scores);
      }

      const result: Partial<ExamResult> = {
        isCorrect,
        userAnswer: userAnswer.trim(),
        correctAnswer: currentQuestion.answer,
        problemText: currentQuestion.problem_text,
        solutionText: currentQuestion.solution_text,
        timeSpent,
        problemNumber,
      };
      setExamResults((prev) => {
        const newResults = [...prev];
        newResults[currentQuestionIndex] = { ...newResults[currentQuestionIndex], ...result, attempted: true } as ExamResult;
        return newResults;
      });

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setUserAnswer("");
        setQuestionStartTime(new Date());
      } else {
        await handleFinishExam();
      }
    } catch (err) {
      console.error("Error in handleNextQuestion:", err);
      toast.error("Произошла ошибка");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSkip = async () => {
    if (!currentQuestion) return;
    const problemNumber = currentQuestion.problem_number_type || currentQuestionIndex + 1;
    
    await completeAttempt(false, 0);
    await persistAnswerToPAO({
      questionId: currentQuestion.question_id,
      problemNumber,
      raw: "False",
      verdict: null,
    });

    setExamResults((prev) => {
      const newResults = [...prev];
      newResults[currentQuestionIndex] = {
        ...newResults[currentQuestionIndex],
        isCorrect: false,
        userAnswer: "",
        attempted: false,
      } as ExamResult;
      return newResults;
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer("");
      setQuestionStartTime(new Date());
    } else {
      await handleFinishExam();
    }
  };

  const handleFinishExam = async () => {
    setExamFinished(true);
    setIsTransitioning(true);
    
    try {
      const currentExamId = examId;
      if (!currentExamId || !user) {
        console.warn("No exam ID or user found");
        return;
      }

      // Fetch all photo analysis outputs for this exam
      const { data: photoData, error: photoError } = await supabase
        .from("photo_analysis_outputs")
        .select("*")
        .eq("exam_id", currentExamId)
        .eq("user_id", user.id);

      if (photoError) {
        console.error("Error fetching photo analysis outputs:", photoError);
      }

      const photoMap = new Map<string, any>();
      if (photoData) {
        photoData.forEach((item) => {
          photoMap.set(item.question_id, item);
        });
      }

      // Update exam results with photo data
      const updatedResults = examResults.map((result) => {
        const photoRow = photoMap.get(result.questionId);
        if (photoRow) {
          const attempted = Boolean(photoRow.raw_output && photoRow.raw_output.trim() && photoRow.raw_output !== 'False');
          let isCorrect: boolean | null = null;

          // Use openrouter_check if not NULL (text answers)
          if (photoRow.openrouter_check === "true") {
            isCorrect = true;
          } else if (photoRow.openrouter_check === "false") {
            isCorrect = false;
          } else if (photoRow.openrouter_check === null && attempted) {
            // Numeric answer - use raw_output
            const userAns = (photoRow.raw_output || "").trim().replace(',', '.');
            const correctAns = result.correctAnswer.trim().replace(',', '.');
            isCorrect = userAns === correctAns;
          }

          return {
            ...result,
            isCorrect,
            userAnswer: photoRow.raw_output || "",
            photoFeedback: photoRow.openrouter_check || "",
            attempted,
          };
        }
        return result;
      });

      setExamResults(updatedResults);

      const totalQuestions = updatedResults.length;
      const totalCorrect = updatedResults.filter((r) => r.isCorrect === true).length;
      const totalTimeSpent = updatedResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);

      setExamStats({
        totalCorrect,
        totalQuestions,
        percentage: Math.round((totalCorrect / totalQuestions) * 100),
        totalTimeSpent,
      });
    } catch (error) {
      console.error("Error in handleFinishExam:", error);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleGoToQuestion = (index: number) => {
    setReviewQuestionIndex(index);
    setIsReviewMode(true);
  };

  const handleBackToSummary = () => {
    setIsReviewMode(false);
    setReviewQuestionIndex(null);
  };

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <Link to="/egemathbasic-practice">
              <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              Пробный экзамен ЕГЭ (База)
            </h1>
            <div className="flex items-center gap-3 text-white/80">
              <Clock className="w-5 h-5" />
              <span className="font-mono">
                {new Date(elapsedTime * 1000).toISOString().substr(11, 8)} / 03:00:00
              </span>
              
            </div>
          </div>

          {isTransitioning && !examStarted ? (
            <Loading
              variant="ring-dots"
              message="Подготовка экзамена..."
              subMessage="Загружаем вопросы"
              size="lg"
            />
          ) : !examStarted ? (
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardContent className="p-6">
                <p className="text-white/80 mb-6">
                  Экзамен включает 21 вопрос и длится 3 часа. Ответы проверяются автоматически.
                </p>
                <Button
                  onClick={handleStartExam}
                  disabled={isTransitioning}
                  className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]"
                >
                  Начать экзамен
                </Button>
              </CardContent>
            </Card>
          ) : !examFinished ? (
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader className="border-b border-white/20">
                <CardTitle className="flex justify-between items-center">
                  <span>
                    Вопрос №{currentQuestion?.problem_number_type || currentQuestionIndex + 1} (
                    {currentQuestionIndex + 1} из {questions.length})
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowFormulaBooklet(true)}
                      variant="outline"
                      size="sm"
                      className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Справочник формул
                    </Button>
                    <Button
                      onClick={handleFinishExam}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Завершить экзамен
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <MathRenderer text={currentQuestion?.problem_text || ""} compiler="mathjax" />
                </div>
                {currentQuestion?.problem_image && (
                  <div className="flex justify-center">
                    <img
                      src={currentQuestion.problem_image}
                      alt="Изображение к задаче"
                      className="max-w-full h-auto rounded-lg shadow-sm border"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Введите ваш ответ"
                    className="flex-1 bg-white"
                  />
                  <Button
                    onClick={handleNextQuestion}
                    disabled={isTransitioning || !userAnswer.trim()}
                    className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Ответить
                  </Button>
                  <Button
                    onClick={handleSkip}
                    disabled={isTransitioning}
                    variant="outline"
                    className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                  >
                    Пропустить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isTransitioning ? (
            <Loading
              variant="ring-dots"
              message="Подсчитываем результаты..."
              subMessage="Обрабатываем ваши ответы"
              size="lg"
            />
          ) : !isReviewMode ? (
            <div className="space-y-6">
              {/* Large percentage display */}
              <Card className="bg-gradient-to-br from-yellow-500/10 to-emerald-500/10 backdrop-blur border border-yellow-500/20 rounded-2xl shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="text-7xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                      {examStats?.percentage}%
                    </div>
                    <div className="text-xl text-black/80">Результат экзамена</div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats card */}
              <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Статистика</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-emerald-500/10 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Все вопросы (1-21)</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                        {examStats?.totalCorrect}/{examStats?.totalQuestions}
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-emerald-500/10 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Время</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                        {new Date((examStats?.totalTimeSpent || 0) * 1000).toISOString().substr(11, 8)}
                      </div>
                    </div>
                  </div>

                  {/* Question grid - 7 columns x 3 rows */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Вопросы по номерам</h3>
                    <div className="grid grid-cols-7 gap-2">
                      {examResults.map((result, idx) => {
                        const isCorrect = result.isCorrect === true;
                        const isIncorrect = result.isCorrect === false;
                        const isUnanswered = !result.attempted;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleGoToQuestion(idx)}
                            className={`
                              aspect-square rounded-lg font-bold text-sm transition-all
                              flex items-center justify-center
                              ${
                                isCorrect
                                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                                  : isIncorrect
                                  ? "bg-gradient-to-br from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700"
                                  : "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 hover:from-gray-400 hover:to-gray-500"
                              }
                            `}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <Button
                      onClick={() => window.location.reload()}
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]"
                    >
                      Новый экзамен
                    </Button>
                    <Link to="/egemathbasic-practice" className="flex-1">
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
          ) : (
            // Review mode
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    Вопрос №{reviewQuestionIndex! + 1}
                  </CardTitle>
                  <Button
                    onClick={handleBackToSummary}
                    variant="outline"
                    size="sm"
                    className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    К результатам
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {reviewQuestionIndex !== null && examResults[reviewQuestionIndex] && (
                  <>
                    {/* Question text */}
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Условие задачи:</h3>
                      <div className="prose max-w-none">
                        <MathRenderer text={examResults[reviewQuestionIndex].problemText} compiler="mathjax" />
                      </div>
                    </div>

                    {/* Problem Image (if available) */}
                    {questions[reviewQuestionIndex]?.problem_image && (
                      <div className="flex justify-center">
                        <img
                          src={questions[reviewQuestionIndex].problem_image as any}
                          alt="Изображение к задаче"
                          className="max-w-full h-auto rounded-lg shadow-sm border"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>
                    )}

                    {/* User answer */}
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Ваш ответ:</h3>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        {examResults[reviewQuestionIndex].userAnswer || "Не отвечено"}
                      </div>
                    </div>

                    {/* Correct answer */}
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Правильный ответ:</h3>
                      <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700 font-semibold">
                        {examResults[reviewQuestionIndex].correctAnswer}
                      </div>
                    </div>

                    {/* Result indicator */}
                    <div className="flex items-center gap-2">
                      {examResults[reviewQuestionIndex].isCorrect ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                          <span className="text-emerald-600 font-semibold">Правильно</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-500" />
                          <span className="text-red-600 font-semibold">Неправильно</span>
                        </>
                      )}
                    </div>

                    {/* Solution */}
                    {examResults[reviewQuestionIndex].solutionText && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Решение:</h3>
                        <div className="prose max-w-none p-4 bg-blue-50 rounded-lg">
                          <MathRenderer text={examResults[reviewQuestionIndex].solutionText} compiler="mathjax" />
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-3 pt-4 border-t">
                      {reviewQuestionIndex > 0 && (
                        <Button
                          onClick={() => handleGoToQuestion(reviewQuestionIndex - 1)}
                          variant="outline"
                          className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Предыдущий
                        </Button>
                      )}
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
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <FormulaBookletDialog open={showFormulaBooklet} onOpenChange={setShowFormulaBooklet} />
    </div>
  );
};

export default EgemathbasicMock;
