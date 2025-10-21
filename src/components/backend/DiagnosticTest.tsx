import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MathRenderer from '@/components/MathRenderer';

interface MCQQuestion {
  question_id: string;
  problem_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: string;
  skills: number;
  difficulty: number;
}

interface DiagnosticTestProps {
  onComplete?: (results: { totalQuestions: number; correctAnswers: number; testedSkills: number[] }) => void;
}

const SKILLS_TO_TEST = [1, 6, 15, 17, 36, 37, 38, 39, 50, 58, 69, 103, 110, 113, 118, 180];
const MAX_QUESTIONS = 15;

// Map Russian letters to option numbers
const RUSSIAN_TO_OPTION: Record<string, string> = {
  'А': 'option1',
  'Б': 'option2', 
  'В': 'option3',
  'Г': 'option4'
};

export const DiagnosticTest: React.FC<DiagnosticTestProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [answers, setAnswers] = useState<{ questionId: string; selectedOption: string; correct: boolean; skill: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
    const { data, error } = await supabase
      .from('oge_math_skills_questions')
        .select('*')
        .in('skills', SKILLS_TO_TEST)
        .not('problem_text', 'is', null)
        .not('option1', 'is', null)
        .not('answer', 'is', null);

      if (error) {
        console.error('Error loading questions:', error);
        toast.error('Ошибка загрузки вопросов');
        return;
      }

      if (!data || data.length === 0) {
        toast.error('Нет доступных вопросов для диагностического теста');
        return;
      }

      // Convert and shuffle questions
      const convertedQuestions: MCQQuestion[] = data.map(q => ({
        question_id: q.question_id,
        problem_text: q.problem_text || '',
        option1: q.option1 || '',
        option2: q.option2 || '',
        option3: q.option3 || '',
        option4: q.option4 || '',
        answer: q.answer || '',
        skills: q.skills || 0,
        difficulty: q.difficulty || 1
      }));

      // Shuffle and limit questions
      const shuffled = convertedQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffled.slice(0, MAX_QUESTIONS));
    } catch (error) {
      console.error('Error in loadQuestions:', error);
      toast.error('Ошибка при загрузке теста');
    } finally {
      setIsLoading(false);
    }
  };

  const startTest = async () => {
    await loadQuestions();
    setTestStarted(true);
  };

  const submitAnswer = async () => {
    if (!selectedOption || !questions[currentQuestionIndex]) return;

    const currentQuestion = questions[currentQuestionIndex];
    
    // Convert Russian letter answer to option format for comparison
    const correctOption = RUSSIAN_TO_OPTION[currentQuestion.answer] || currentQuestion.answer;
    const isCorrect = selectedOption === correctOption;
    
    console.log('Answer check:', {
      userAnswer: selectedOption,
      correctAnswer: currentQuestion.answer,
      correctOption: correctOption,
      isCorrect: isCorrect
    });
    
    // Save answer
    const newAnswer = {
      questionId: currentQuestion.question_id,
      selectedOption,
      correct: isCorrect,
      skill: currentQuestion.skills
    };
    
    setAnswers(prev => [...prev, newAnswer]);
    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);

    // Update consecutive correct count and difficulty
    if (isCorrect) {
      const newConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsecutive);
      
      // Difficulty progression logic
      if (currentDifficulty === 1 && newConsecutive >= 5) {
        setCurrentDifficulty(2);
        setConsecutiveCorrect(0);
      } else if (currentDifficulty === 2 && newConsecutive >= 3) {
        setCurrentDifficulty(3);
        setConsecutiveCorrect(0);
      }
    } else {
      setConsecutiveCorrect(0);
    }

    // Show feedback briefly
    setTimeout(() => {
      setShowFeedback(false);
      setLastAnswerCorrect(null);
      
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption('');
      } else {
        completeTest();
      }
    }, 1500);
  };

  const completeTest = async () => {
    if (!user) return;

    setTestCompleted(true);
    const correctAnswers = answers.filter(a => a.correct).length;
    const testedSkills = [...new Set(answers.map(a => a.skill))];
    
    try {
      // Update student skills
      const skillUpdates: Record<string, number> = {};
      
      testedSkills.forEach(skillId => {
        const skillAnswers = answers.filter(a => a.skill === skillId);
        const skillCorrect = skillAnswers.filter(a => a.correct).length;
        const skillTotal = skillAnswers.length;
        
        if (skillTotal > 0) {
          // If perfect score, set to 25%, otherwise give moderate boost
          const scorePercentage = skillCorrect / skillTotal;
          if (scorePercentage === 1.0) {
            skillUpdates[`skill_${skillId}`] = 25;
          } else {
            // Give moderate boost based on performance
            skillUpdates[`skill_${skillId}`] = Math.max(15, Math.round(scorePercentage * 20));
          }
        }
      });

      if (Object.keys(skillUpdates).length > 0) {
        const { error } = await supabase
          .from('student_skills')
          .upsert({
            uid: user.id,
            ...skillUpdates
          }, {
            onConflict: 'uid'
          });

        if (error) {
          console.error('Error updating skills:', error);
          toast.error('Ошибка при сохранении результатов');
        } else {
          toast.success('Результаты диагностического теста сохранены!');
        }
      }

      onComplete?.({
        totalQuestions: questions.length,
        correctAnswers,
        testedSkills
      });
    } catch (error) {
      console.error('Error completing test:', error);
      toast.error('Ошибка при завершении теста');
    }
  };

  const getFinalFeedback = () => {
    const correctAnswers = answers.filter(a => a.correct).length;
    const percentage = (correctAnswers / answers.length) * 100;
    
    if (percentage >= 80) {
      return "Ваши базовые знания сильны — вы готовы двигаться дальше!";
    } else if (percentage >= 60) {
      return "У вас хорошая база, но стоит повторить некоторые темы.";
    } else {
      return "Вам нужно повторить основные темы перед продолжением обучения.";
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Загрузка диагностического теста...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!testStarted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Диагностический тест базовых знаний</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Этот тест поможет оценить ваши базовые математические навыки. 
            Вас ждет 12-15 вопросов с вариантами ответов.
          </p>
          <Button onClick={startTest} size="lg">
            Начать тест
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (testCompleted) {
    const correctAnswers = answers.filter(a => a.correct).length;
    const percentage = Math.round((correctAnswers / answers.length) * 100);
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Тест завершен!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {correctAnswers}/{answers.length}
            </div>
            <div className="text-lg text-gray-600 mb-4">
              Правильных ответов ({percentage}%)
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-center text-gray-700">
              {getFinalFeedback()}
            </p>
          </div>
          
          <div className="text-sm text-gray-500 text-center">
            Проверенные навыки: {[...new Set(answers.map(a => a.skill))].length} из {SKILLS_TO_TEST.length}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Ошибка</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Не удалось загрузить вопросы для теста.</p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          Вопрос {currentQuestionIndex + 1} из {questions.length}
        </CardTitle>
        <Progress value={progress} className="w-full" />
        <div className="text-sm text-gray-500">
          Сложность: {currentDifficulty} | Правильных подряд: {consecutiveCorrect}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showFeedback && (
          <div className={`text-center p-3 rounded-lg ${lastAnswerCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {lastAnswerCorrect ? '✅ Правильно!' : '❌ Неверно!'}
          </div>
        )}
        
        {!showFeedback && (
          <>
            <div className="bg-gray-50 p-4 rounded-lg">
              <MathRenderer text={currentQuestion.problem_text} className="text-lg" compiler="mathjax" />
            </div>

            <div className="space-y-2">
              {[
                { key: 'option1', text: currentQuestion.option1 },
                { key: 'option2', text: currentQuestion.option2 },
                { key: 'option3', text: currentQuestion.option3 },
                { key: 'option4', text: currentQuestion.option4 }
              ].filter(option => option.text).map((option) => (
                <button
                  key={option.key}
                  className={`w-full p-3 text-left border rounded-lg transition-colors ${
                    selectedOption === option.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedOption(option.key)}
                >
                  <MathRenderer text={option.text} compiler="mathjax" />
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Правильных ответов: {answers.filter(a => a.correct).length} / {answers.length}
              </div>
              <Button 
                onClick={submitAnswer} 
                disabled={!selectedOption}
                className="px-6"
              >
                {currentQuestionIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DiagnosticTest;
