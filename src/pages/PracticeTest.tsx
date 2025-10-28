import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, BookOpen, ArrowRight, Home, ArrowLeft, Camera, X } from "lucide-react";
import { Link } from "react-router-dom";
import MathRenderer from "@/components/MathRenderer";
import { useStreakTracking } from "@/hooks/useStreakTracking";

import { awardStreakPoints, calculateStreakReward, getCurrentStreakData } from "@/services/streakPointsService";
import { toast } from "sonner";
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

const PracticeTest = () => {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [studentSolution, setStudentSolution] = useState<string>("");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const { addStreakPoint } = useStreakTracking();

  useEffect(() => {
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, let's try to get any question from the database to see what IDs exist
      const { data: sampleData, error: sampleError } = await supabase
        .from('oge_math_fipi_bank')
        .select('question_id, problem_text, answer, solution_text, problem_number_type, problem_image')
        .limit(1)
        .single();

      if (sampleError) {
        console.error('Error fetching sample question:', sampleError);
        setError('Не удалось загрузить вопрос');
        return;
      }

      if (!sampleData) {
        setError('Вопросы не найдены в базе данных');
        return;
      }

      // Use the sample question for now
      setCurrentQuestion(sampleData);
    } catch (err) {
      console.error('Error:', err);
      setError('Произошла ошибка при загрузке');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    const isAnswerCorrect = checkAnswer(userAnswer.trim(), currentQuestion.answer);
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      toast.success("Правильно! 🎉");
      await addStreakPoint();
    } else {
      toast.error("Неправильно. Попробуйте еще раз.");
    }

    // Update student activity
    await updateStudentActivity(currentQuestion.question_id, isAnswerCorrect);
  };

  const checkAnswer = (userAnswer: string, correctAnswer: string): boolean => {
    // Normalize answers for comparison
    const normalizeAnswer = (answer: string) => {
      return answer
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/,/g, '.')
        .replace(/^0+/, '')
        .replace(/\.$/, '');
    };

    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    // Check exact match first
    if (normalizedUser === normalizedCorrect) {
      return true;
    }

    // Check if user answer contains the correct answer (for multiple answers)
    if (normalizedCorrect.includes(';') || normalizedCorrect.includes(',')) {
      const correctAnswers = normalizedCorrect.split(/[;,]/).map(a => a.trim());
      return correctAnswers.some(answer => normalizedUser === answer);
    }

    // Check if correct answer contains user answer (for ranges)
    if (normalizedCorrect.includes('-') || normalizedCorrect.includes('..')) {
      return normalizedCorrect.includes(normalizedUser);
    }

    return false;
  };

  const updateStudentActivity = async (questionId: string, isCorrect: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('student_activity')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          is_correct: isCorrect,
          timestamp: new Date().toISOString(),
          course_id: 1
        });

      if (error) {
        console.error('Error updating student activity:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDevicePhotoCheck = async () => {
    if (!currentQuestion || uploadedImages.length === 0) return;

    setIsProcessingPhoto(true);
    setUploadProgress(0);
    setAnalysisProgress(0);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(uploadInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      // Process the photo
      const formData = new FormData();
      formData.append('image', uploadedImages[0]);
      formData.append('question_id', currentQuestion.question_id);
      formData.append('user_id', user?.id || '');

      const response = await fetch('/api/process-device-photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process photo');
      }

      const result = await response.json();
      
      // Simulate analysis progress
      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(analysisInterval);
            return 100;
          }
          return prev + 3;
        });
      }, 30);

      // Wait for analysis to complete
      setTimeout(async () => {
        await fetchStudentSolution();
        await fetchAnalysisData();
        
        // Check if answer is correct
        const isAnswerCorrect = result.is_correct;
        setIsCorrect(isAnswerCorrect);
        
        if (isAnswerCorrect) {
          toast.success("Правильно! 🎉");
          await addStreakPoint();
        } else {
          toast.error(`Неправильно. Правильный ответ: ${currentQuestion.answer}`);
        }

        await updateStudentActivity(currentQuestion.question_id, isAnswerCorrect);
        
        setIsProcessingPhoto(false);
      }, 2000);

    } catch (error) {
      console.error('Error processing photo:', error);
      toast.error('Ошибка при обработке фото');
      setIsProcessingPhoto(false);
    }
  };

  const fetchStudentSolution = async () => {
    if (!user) return null;
    try {
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

      setStudentSolution(data?.extracted_text || '');
      return data?.extracted_text || '';
    } catch (error) {
      console.error('Error:', error);
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
        const parsed = JSON.parse(data.raw_output);
        setAnalysisData(parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setUploadedImages(Array.from(files));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загружаем вопрос...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Ошибка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchQuestion} className="w-full">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Вопрос не найден</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Не удалось загрузить вопрос.</p>
            <Button onClick={fetchQuestion} className="w-full">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/ogemath">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к ОГЭ
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Тест</h1>
          </div>
          <div className="flex items-center gap-2">
            <FormulaBookletDialog />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                Тестовое задание
              </CardTitle>
              <Badge variant="outline">
                Тип: {currentQuestion.problem_number_type || 'Не указан'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="prose max-w-none">
                <MathRenderer text={currentQuestion.problem_text} compiler="mathjax" />
              </div>
              
              {currentQuestion.problem_image && (
                <div className="mt-4">
                  <img 
                    src={currentQuestion.problem_image} 
                    alt="Problem" 
                    className="max-w-full h-auto rounded-lg border"
                  />
                </div>
              )}

              {/* Answer Input */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ваш ответ:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Введите ответ..."
                    className="flex-1"
                    disabled={isCorrect === true}
                  />
                  <Button 
                    onClick={handleAnswerSubmit}
                    disabled={!userAnswer.trim() || isCorrect === true}
                  >
                    Проверить
                  </Button>
                </div>
              </div>

              {/* Photo Upload for questions 20-25 */}
              {currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 20 && (
                <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Загрузить с устройства
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadedImages.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Выбрано файлов: {uploadedImages.length}
                        </span>
                        <Button
                          onClick={handleDevicePhotoCheck}
                          disabled={isProcessingPhoto}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Проверить
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Result Display */}
              {isCorrect !== null && (
                <Alert className={`mt-4 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <AlertDescription className={isCorrect ? 'text-green-800' : 'text-red-800'}>
                      {isCorrect 
                        ? "Правильно! Отличная работа! 🎉" 
                        : `Неправильно. Правильный ответ: ${currentQuestion.answer}`
                      }
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Student Solution and Analysis */}
              {studentSolution && currentQuestion.problem_number_type && currentQuestion.problem_number_type >= 20 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
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
                  {analysisData && (
                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-purple-800">Анализ решения</CardTitle>
                        <CardDescription>
                          Оценка: {analysisData.scores}/2
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
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
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Solution Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowSolution(!showSolution)}
                  variant="outline"
                  className="w-full"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {showSolution ? 'Скрыть решение' : 'Показать решение'}
                </Button>
              </div>

              {/* Solution Display */}
              {showSolution && (
                <Card className="mt-4 bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800">Решение</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <MathRenderer text={currentQuestion.solution_text} compiler="mathjax" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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

export default PracticeTest;
