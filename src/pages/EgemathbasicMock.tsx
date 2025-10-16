import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Clock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { toast } from "sonner";
import FormulaBookletDialog from "@/components/FormulaBookletDialog";

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
  const currentQuestion = questions[currentQuestionIndex];

  // --- Helper: fetch current exam id from profiles if needed
  const getCurrentExamId = async (): Promise<string | null> => {
    if (examId) return examId;
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("exam_id").eq("user_id", user.id).single();
    return data?.exam_id ?? null;
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
    if (!user) return;
    try {
      const { data: activityData } = await supabase
        .from("student_activity")
        .select("attempt_id")
        .eq("user_id", user.id)
        .eq("question_id", currentQuestion!.question_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!activityData) return;
      await supabase.functions.invoke("complete-attempt", {
        body: {
          attempt_id: (activityData as any).attempt_id,
          finished_or_not: true,
          is_correct: isCorrect,
          scores_fipi: scores,
        },
      });
    } catch (err) {
      console.error("Error completing attempt:", err);
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

      // Check answer
      const { data: checkData } = await supabase.functions.invoke("check-text-answer", {
        body: {
          user_id: user!.id,
          question_id: currentQuestion.question_id,
          submitted_answer: userAnswer.trim(),
        },
      });

      const isCorrect = Boolean((checkData as CheckTextAnswerResp)?.is_correct);
      const scores = isCorrect ? 1 : 0;

      await completeAttempt(isCorrect, scores);
      await persistAnswerToPAO({
        questionId: currentQuestion.question_id,
        problemNumber,
        raw: userAnswer.trim(),
        verdict: isCorrect ? "true" : "false",
      });

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
    await new Promise((r) => setTimeout(r, 200));
    const totalQuestions = examResults.length || 21;
    const totalCorrect = examResults.filter((r) => r.isCorrect).length;
    const totalTimeSpent = examResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    setExamStats({
      totalCorrect,
      totalQuestions,
      percentage: Math.round((totalCorrect / totalQuestions) * 100),
      totalTimeSpent,
    });
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
              <Button
                onClick={() => setShowFormulaBooklet(true)}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Справочник формул
              </Button>
            </div>
          </div>

          {!examStarted ? (
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardContent className="p-6">
                <p className="text-white/80 mb-6">
                  Экзамен включает 21 вопрос и длится 3 часа. Ответы проверяются автоматически.
                </p>
                <Button
                  onClick={handleStartExam}
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
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <MathRenderer text={currentQuestion?.problem_text || ""} compiler="mathjax" />
                </div>
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
          ) : (
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle>Результаты экзамена</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  Правильных ответов: <strong>{examStats?.totalCorrect}</strong> из{" "}
                  <strong>{examStats?.totalQuestions}</strong> ({examStats?.percentage}%)
                </div>
                <div>
                  Общее время:{" "}
                  <strong>
                    {new Date((examStats?.totalTimeSpent || 0) * 1000).toISOString().substr(11, 8)}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]"
                  >
                    Новый экзамен
                  </Button>
                  <Link to="/egemathbasic-practice">
                    <Button
                      variant="outline"
                      className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      К практике
                    </Button>
                  </Link>
                </div>
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
