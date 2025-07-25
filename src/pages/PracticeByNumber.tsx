import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, BookOpen, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import MathRenderer from "@/components/MathRenderer";
import { useStreakTracking } from "@/hooks/useStreakTracking";
import { StreakDisplay } from "@/components/streak/StreakDisplay";
import { StreakRingAnimation } from "@/components/streak/StreakRingAnimation";
import { awardStreakPoints, calculateStreakReward, getCurrentStreakData } from "@/services/streakPointsService";
import { toast } from "sonner";

interface Question {
  question_id: string;
  problem_text: string;
  answer: string;
  solution_text: string;
  difficulty?: string | number;
}

const PracticeByNumber = () => {
  const { user } = useAuth();
  const { trackActivity } = useStreakTracking();
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionViewedBeforeAnswer, setSolutionViewedBeforeAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Streak animation state
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const [streakData, setStreakData] = useState({
    currentMinutes: 0,
    targetMinutes: 30,
    addedMinutes: 0
  });

  const currentQuestion = questions[currentQuestionIndex];

  const fetchQuestions = async (questionNumber: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('OGE_SHFIPI_problems_1_25')
        .select('question_id, problem_text, answer, solution_text')
        .like('question_id', `%_${questionNumber}_%`)
        .order('question_id');

      if (error) throw error;

      // Filter to ensure the number is in the correct position (third element)
      const filteredQuestions = data?.filter(q => {
        const parts = q.question_id.split('_');
        return parts.length >= 3 && parts[2] === questionNumber;
      }) || [];

      setQuestions(filteredQuestions);
      setCurrentQuestionIndex(0);
      resetQuestionState();
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
  };

  const handleNumberSelect = (value: string) => {
    setSelectedNumber(value);
    fetchQuestions(value);
  };

  const checkAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim() || !user) return;

    const correct = userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase();
    setIsCorrect(correct);
    setIsAnswered(true);

    // Award streak points immediately (regardless of correctness)
    const reward = calculateStreakReward(currentQuestion.difficulty);
    const currentStreakInfo = await getCurrentStreakData(user.id);
    
    if (currentStreakInfo) {
      setStreakData({
        currentMinutes: currentStreakInfo.todayMinutes,
        targetMinutes: currentStreakInfo.goalMinutes,
        addedMinutes: reward.minutes
      });
      setShowStreakAnimation(true);
    }
    
    await awardStreakPoints(user.id, reward);

    if (correct) {
      toast.success(`Правильно! +${reward.minutes} мин к дневной цели.`);
    } else {
      toast.error(`Неправильно. +${reward.minutes} мин к дневной цели за попытку.`);
    }
  };

  const handleShowSolution = () => {
    if (!isAnswered) {
      setSolutionViewedBeforeAnswer(true);
    }
    setShowSolution(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestionState();
    } else {
      toast.success("Все вопросы завершены!");
    }
  };

  const questionNumbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="pt-20 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Практика по номеру вопроса</h1>
              <p className="text-lg text-gray-600">Выберите номер вопроса (1-25) для практики всех задач этого типа</p>
            </div>
            {user && <StreakDisplay />}
          </div>

          {/* Question Number Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Выберите номер вопроса</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedNumber} onValueChange={handleNumberSelect}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Выберите номер (1-25)" />
                </SelectTrigger>
                <SelectContent>
                  {questionNumbers.map(num => (
                    <SelectItem key={num} value={num}>
                      Вопрос {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Question Content */}
          {selectedNumber && questions.length > 0 && currentQuestion && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Вопрос {selectedNumber} ({currentQuestionIndex + 1} из {questions.length})</span>
                  <span className="text-sm font-normal text-gray-500">
                    ID: {currentQuestion.question_id}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Problem Text */}
                <div className="prose max-w-none">
                  <MathRenderer text={currentQuestion.problem_text || "Текст задачи не найден"} />
                </div>

                {/* Answer Input */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Введите ваш ответ"
                      disabled={isAnswered}
                      onKeyPress={(e) => e.key === 'Enter' && !isAnswered && checkAnswer()}
                      className="flex-1"
                    />
                    <Button
                      onClick={checkAnswer}
                      disabled={isAnswered || !userAnswer.trim()}
                      className="min-w-32"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Проверить
                    </Button>
                  </div>

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
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleShowSolution}
                    className="flex-1"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Показать решение
                  </Button>
                  
                  {isAnswered && currentQuestionIndex < questions.length - 1 && (
                    <Button onClick={nextQuestion} className="flex-1">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Следующий вопрос
                    </Button>
                  )}
                </div>

                {/* Solution */}
                {showSolution && currentQuestion.solution_text && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-800">Решение</CardTitle>
                    </CardHeader>
                    <CardContent className="prose max-w-none">
                      <MathRenderer text={currentQuestion.solution_text} />
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="text-center py-8">
                <p>Загрузка вопросов...</p>
              </CardContent>
            </Card>
          )}

          {/* No Questions Found */}
          {selectedNumber && !loading && questions.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">Вопросы с номером {selectedNumber} не найдены</p>
              </CardContent>
            </Card>
          )}

          {/* Completion Message */}
          {selectedNumber && questions.length > 0 && currentQuestionIndex >= questions.length - 1 && isAnswered && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Поздравляем!
                </h3>
                <p className="text-green-700">
                  Вы завершили все вопросы номера {selectedNumber}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Streak Animation */}
      <StreakRingAnimation
        currentMinutes={streakData.currentMinutes}
        targetMinutes={streakData.targetMinutes}
        addedMinutes={streakData.addedMinutes}
        isVisible={showStreakAnimation}
        onAnimationComplete={() => setShowStreakAnimation(false)}
      />
    </div>
  );
};

export default PracticeByNumber;