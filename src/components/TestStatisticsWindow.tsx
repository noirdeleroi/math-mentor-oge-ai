import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Eye, ArrowLeft, RotateCcw } from "lucide-react";
import MathRenderer from "@/components/MathRenderer";

interface SessionResult {
  questionIndex: number;
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  problemText: string;
  solutionText: string;
  isAnswered: boolean;
}

interface TestStatisticsWindowProps {
  sessionResults: SessionResult[];
  onGoToQuestion: (questionIndex: number) => void;
  onStartNewTest: () => void;
  isReviewMode?: boolean;
  currentQuestionData?: {
    question: SessionResult;
    onBackToSummary: () => void;
  };
}

const TestStatisticsWindow = ({ 
  sessionResults, 
  onGoToQuestion, 
  onStartNewTest,
  isReviewMode = false,
  currentQuestionData
}: TestStatisticsWindowProps) => {
  // Calculate overall statistics
  const totalQuestions = sessionResults.length;
  const answeredQuestions = sessionResults.filter(r => r.isAnswered).length;
  const correctAnswers = sessionResults.filter(r => r.isCorrect && r.isAnswered).length;
  const skippedQuestions = sessionResults.filter(r => !r.isAnswered).length;
  const accuracy = answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0;

  if (isReviewMode && currentQuestionData) {
    // Review Mode - Show individual question
    const { question, onBackToSummary } = currentQuestionData;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Button 
              onClick={onBackToSummary}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              К сводке результатов
            </Button>
            <div className="text-lg font-semibold text-gray-700">
              Просмотр вопроса №{question.questionIndex + 1}
            </div>
          </div>

          {/* Question Review Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {question.isAnswered ? (
                  question.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                Вопрос №{question.questionIndex + 1}
                <span className="text-sm font-normal text-gray-500 ml-auto">
                  {question.isAnswered 
                    ? (question.isCorrect ? "Правильно" : "Неправильно")
                    : "Пропущено"
                  }
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem Text */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Условие задачи:</h3>
                <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
                  <MathRenderer text={question.problemText} compiler="mathjax" />
                </div>
              </div>

              {/* Student Answer */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Ваш ответ</h3>
                <div className={`p-4 rounded-lg border-2 ${
                  question.isAnswered 
                    ? (question.isCorrect 
                        ? "bg-green-50 border-green-200 text-green-800" 
                        : "bg-red-50 border-red-200 text-red-800")
                    : "bg-gray-50 border-gray-200 text-gray-600"
                }`}>
                  {question.isAnswered ? (
                    <MathRenderer text={question.userAnswer} compiler="mathjax" />
                  ) : (
                    "Не отвечено"
                  )}
                </div>
              </div>

              {/* Score and Correct Answer Row */}
              <div className="flex items-start gap-6">
                {/* Score Display - More Prominent */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg shadow-lg">
                  <div className="text-sm font-medium opacity-90">Баллы</div>
                  <div className="text-2xl font-bold">
                    {question.isCorrect ? '2' : (question.isAnswered ? '1' : '0')}/2
                  </div>
                </div>

                {/* Correct Answer - Compact */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-700 mb-2 text-sm">Правильный ответ</h3>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                    <MathRenderer text={question.correctAnswer} compiler="mathjax" />
                  </div>
                </div>
              </div>

              {/* Solution */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Решение:</h3>
                <div className="prose max-w-none bg-blue-50 p-4 rounded-lg">
                  <MathRenderer text={question.solutionText} compiler="mathjax" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Результаты теста</h1>
          <Button 
            onClick={onStartNewTest}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Новый тест
          </Button>
        </div>

        {/* Overall Statistics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Всего вопросов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Отвечено</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{answeredQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Правильно</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{correctAnswers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Точность</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{accuracy}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Question-by-Question Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Результаты по вопросам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {sessionResults.map((result, index) => (
                <Card 
                  key={result.questionId} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    result.isAnswered 
                      ? (result.isCorrect ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500")
                      : "border-l-4 border-l-gray-400"
                  }`}
                  onClick={() => onGoToQuestion(result.questionIndex)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {result.isAnswered ? (
                          result.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <div className="font-semibold">Вопрос №{index + 1}</div>
                          <div className="text-sm text-gray-600">
                            {result.isAnswered 
                              ? `Ваш ответ: ${result.userAnswer}` 
                              : "Пропущено"
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Правильный ответ:</div>
                          <div className="font-medium">{result.correctAnswer}</div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Просмотр
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestStatisticsWindow;