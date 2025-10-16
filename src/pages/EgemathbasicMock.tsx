import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, ArrowLeft, ArrowRight, Clock, BookOpen, Menu, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { toast } from "sonner";
import FormulaBookletDialog from "@/components/FormulaBookletDialog";

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
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [examStats, setExamStats] = useState<{
    totalCorrect: number;
    totalQuestions: number;
    percentage: number;
    totalTimeSpent: number;
  } | null>(null);

  // Timer state (3 hours)
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Formula booklet state
  const [showFormulaBooklet, setShowFormulaBooklet] = useState(false);

  // Review mode states
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (!examStartTime || examFinished) return;
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - examStartTime.getTime()) / 1000);
      setElapsedTime(elapsed);
      if (elapsed >= 10800) { // 3 hours
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

  // Generate 21 questions (1..21) from egemathbase
  const generateQuestionSelection = async () => {
    setLoading(true);
    try {
      const batchPromises = [] as any[];
      for (let problemNum = 1; problemNum <= 21; problemNum++) {
        batchPromises.push(
          supabase
            .from('egemathbase')
            .select('*')
            .eq('problem_number_type', problemNum.toString())
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

      if (selectedQuestions.length < 21) {
        toast.error('Не удалось загрузить все вопросы экзамена');
        return;
      }

      // Pre-fetch question details for mastery context (course_id '2')
      const questionIds = selectedQuestions.map(q => q.question_id);
      const questionDetailsPromises = questionIds.map(questionId =>
        supabase.functions.invoke('get-question-details', { body: { question_id: questionId, course_id: '2' } })
      );
      const questionDetailsResults = await Promise.all(questionDetailsPromises);
      const questionDetailsCache = new Map();
      questionDetailsResults.forEach((result, index) => {
        if ((result as any).data && !(result as any).error) {
          questionDetailsCache.set(questionIds[index], (result as any).data);
        }
      });
      (window as any).questionDetailsCache = questionDetailsCache;

      setQuestions(selectedQuestions);
      const initialResults: ExamResult[] = selectedQuestions.map((question, index) => ({
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
      setExamResults(initialResults);
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

  const startAttempt = async (questionId: string, problemNumberType: number) => {
    if (!user) return null;
    try {
      const questionDetailsCache = (window as any).questionDetailsCache;
      let skillsArray: number[] = [];
      let topicsArray: string[] = [];
      if (questionDetailsCache && questionDetailsCache.has(questionId)) {
        const questionDetails = questionDetailsCache.get(questionId);
        skillsArray = Array.isArray(questionDetails.skills_list) ? questionDetails.skills_list : [];
        topicsArray = Array.isArray(questionDetails.topics_list) ? questionDetails.topics_list : [];
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
          topics: topicsArray.length ? topicsArray : null,
          course_id: '2'
        })
        .select('attempt_id')
        .single();

      if (error) {
        console.error('Error starting attempt:', error);
        return null;
      }
      return (data as any)?.attempt_id ?? null;
    } catch (error) {
      console.error('Error starting attempt:', error);
      return null;
    }
  };

  const completeAttempt = async (isCorrect: boolean, scores: number) => {
    if (!user) return;
    try {
      const { data: activityData } = await supabase
        .from('student_activity')
        .select('attempt_id')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion!.question_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!activityData) return;

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
      }
    } catch (error) {
      console.error('Error in completeAttempt:', error);
    }
  };

  const submitToHandleSubmission = async (isCorrect: boolean, scores: number) => {
    if (!user) return;
    try {
      const { data: activityData } = await supabase
        .from('student_activity')
        .select('question_id, attempt_id, finished_or_not, duration_answer, scores_fipi')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion!.question_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!activityData) return;

      const submissionData = {
        user_id: user.id,
        question_id: (activityData as any).question_id,
        finished_or_not: true,
        is_correct: isCorrect,
        duration: (activityData as any).duration_answer,
        scores_fipi: scores
      };

      await supabase.functions.invoke('handle-submission', {
        body: {
          course_id: '2',
          submission_data: submissionData
        }
      });
    } catch (error) {
      console.error('Error in submitToHandleSubmission:', error);
    }
  };

  const handleStartExam = async () => {
    if (!user) {
      toast.error('Войдите в систему для прохождения экзамена');
      return;
    }
    setIsTransitioning(true);
    try {
      await generateQuestionSelection();
      setExamStarted(true);
      setExamFinished(false);
      setExamStats(null);
      setExamStartTime(new Date());
      setIsTimeUp(false);
    } catch (error) {
      console.error(error);
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
      const problemNumber = currentQuestion.problem_number_type || (currentQuestionIndex + 1);

      // Server-side check
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-text-answer', {
        body: {
          user_id: user!.id,
          question_id: currentQuestion.question_id,
          submitted_answer: userAnswer.trim()
        }
      });
      if (checkError) {
        toast.error('Ошибка проверки ответа');
        return;
      }
      const isCorrect = Boolean((checkData as CheckTextAnswerResp)?.is_correct);
      const scores = isCorrect ? 1 : 0;

      await completeAttempt(isCorrect, scores);
      await submitToHandleSubmission(isCorrect, scores);

      const result: Partial<ExamResult> = {
        isCorrect,
        userAnswer: userAnswer.trim(),
        correctAnswer: currentQuestion.answer,
        problemText: currentQuestion.problem_text,
        solutionText: currentQuestion.solution_text,
        timeSpent,
        problemNumber
      };
      setExamResults(prev => {
        const newResults = [...prev];
        newResults[currentQuestionIndex] = { ...newResults[currentQuestionIndex], ...result, attempted: true } as ExamResult;
        return newResults;
      });

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer("");
        setQuestionStartTime(new Date());
      } else {
        await handleFinishExam();
      }
    } catch (error) {
      console.error('Error in handleNextQuestion:', error);
      toast.error('Произошла ошибка');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleFinishExam = async () => {
    setExamFinished(true);
    await new Promise((r) => setTimeout(r, 200));
    // Simple stats for 21 questions
    const totalQuestions = examResults.length || 21;
    const totalCorrect = examResults.filter(r => r.isCorrect).length;
    const totalTimeSpent = examResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    setExamStats({ totalCorrect, totalQuestions, percentage: Math.round((totalCorrect / totalQuestions) * 100), totalTimeSpent });
  };

  const handleSkip = async () => {
    if (!currentQuestion) return;
    setExamResults(prev => {
      const newResults = [...prev];
      newResults[currentQuestionIndex] = {
        ...newResults[currentQuestionIndex],
        isCorrect: false,
        userAnswer: "",
        attempted: false
      } as ExamResult;
      return newResults;
    });
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer("");
      setQuestionStartTime(new Date());
    } else {
      await handleFinishExam();
    }
  };

  const handleNewExam = () => {
    setExamStarted(false);
    setExamFinished(false);
    setQuestions([]);
    setExamResults([]);
    setCurrentQuestionIndex(0);
    setUserAnswer("");
    setExamStats(null);
    setElapsedTime(0);
    setIsTimeUp(false);
  };

  return (
    <div className="min-h-screen text-white relative" style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Back */}
          <div className="mb-6">
            <Link to="/egemathbasic-practice">
              <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              Пробный экзамен ЕГЭ (База)
            </h1>
            <div className="flex items-center gap-3 text-white/80">
              <Clock className="w-5 h-5" />
              <span className="font-mono">{formatTime(elapsedTime)} / 03:00:00</span>
              <Button onClick={() => setShowFormulaBooklet(true)} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <BookOpen className="w-4 h-4 mr-2" />Справочник формул
              </Button>
            </div>
          </div>

          {/* Start/Exam UI */}
          {!examStarted ? (
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
              <CardContent className="p-6">
                <p className="text-white/80 mb-6">Экзамен включает 21 вопрос и длится 3 часа. Ответы проверяются автоматически.</p>
                <Button onClick={handleStartExam} className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]">
                  Начать экзамен
                </Button>
              </CardContent>
            </Card>
          ) : !examFinished ? (
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader className="border-b border-white/20">
                <CardTitle className="flex justify-between items-center">
                  <span>Вопрос №{currentQuestion?.problem_number_type || currentQuestionIndex + 1} ({currentQuestionIndex + 1} из {questions.length})</span>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleFinishExam} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" disabled={isTransitioning}>Завершить экзамен</Button>
                    <Button onClick={() => setShowFormulaBooklet(true)} variant="outline" className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"><BookOpen className="w-4 h-4 mr-2"/>Справочник формул</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <MathRenderer text={currentQuestion?.problem_text || ""} compiler="mathjax" />
                </div>
                <div className="flex gap-2">
                  <Input value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Введите ваш ответ" className="flex-1 bg-white" />
                  <Button onClick={handleNextQuestion} disabled={isTransitioning || !userAnswer.trim()} className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]">
                    <CheckCircle className="w-4 h-4 mr-2"/>Ответить
                  </Button>
                  <Button onClick={handleSkip} disabled={isTransitioning} variant="outline" className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100">Пропустить</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader className="border-b border-white/20">
                <CardTitle>Результаты экзамена</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>Правильных ответов: <strong>{examStats?.totalCorrect}</strong> из <strong>{examStats?.totalQuestions}</strong> ({examStats?.percentage}%)</div>
                <div>Общее время: <strong>{formatTime(examStats?.totalTimeSpent || 0)}</strong></div>
                <div className="flex gap-2">
                  <Button onClick={handleNewExam} className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]">Новый экзамен</Button>
                  <Link to="/egemathbasic-practice"><Button variant="outline" className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100"><ArrowLeft className="w-4 h-4 mr-2"/>К практике</Button></Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Formula Booklet Dialog */}
      <FormulaBookletDialog open={showFormulaBooklet} onOpenChange={setShowFormulaBooklet} />
    </div>
  );
};

export default EgemathbasicMock;
