import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, BookOpen, Award, Target, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { COURSES, CourseId, courseIdToNumber } from '@/lib/courses.registry';

const TOTAL_STEPS = 4;

interface CourseOnboardingWizardProps {
  courseId: CourseId;
  onDone: () => void;
  onError?: () => void;
}

interface CourseFormData {
  schoolGrade?: number;
  basicLevel?: number;
  tookMock?: boolean;
  mockScore?: number;
  goalScore?: number;
}

export function CourseOnboardingWizard({ courseId, onDone, onError }: CourseOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<CourseFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const course = COURSES[courseId];
  const courseNumber = courseIdToNumber[courseId];

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDone();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onDone]);

  useEffect(() => {
    // Reset wizard state when courseId changes
    setCurrentStep(1);
    setData({});
    setError(null);
    setIsSubmitting(false);
    loadExistingData();
  }, [courseId, user]);

  const loadExistingData = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`schoolmark${courseNumber}, selfestimation${courseNumber}, testmark${courseNumber}, course_${courseNumber}_goal`)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading existing data:', error);
        return;
      }

      if (profile) {
        setData({
          schoolGrade: profile[`schoolmark${courseNumber}`] || undefined,
          basicLevel: profile[`selfestimation${courseNumber}`] || undefined,
          mockScore: profile[`testmark${courseNumber}`] || undefined,
          tookMock: profile[`testmark${courseNumber}`] !== null ? true : undefined,
          goalScore: profile[`course_${courseNumber}_goal`] ? parseInt(profile[`course_${courseNumber}_goal`]) : undefined,
        });
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const updateData = (newData: Partial<CourseFormData>) => {
    setData(prev => ({ ...prev, ...newData }));
    setError(null);
  };

  const getEmojiForLevel = (level: number): string => {
    const emojis = ['😞', '😐', '🙂', '😊', '😍'];
    return emojis[level - 1] || '🙂';
  };

  const getSmartComment = (): string => {
    if (!data.goalScore) return '';

    const isOGE = courseId === 'oge-math';
    
    if (isOGE) {
      const score = data.goalScore;
      if (score >= 22) return "Отлично! Целишься на 5! 🚀";
      if (score >= 15) return "Хороша цель! На 4 вполне реально 💪";
      if (score >= 8) return "Неплохо! Тройка будет в кармане 😊";
      return "Давай поставим цель чуть повыше? 😉";
    }

    const baselineFromSelfAssessment = (data.basicLevel || 1) * 15;
    const mockScore = data.tookMock ? data.mockScore : null;
    const ambitionGap = data.goalScore - (mockScore ?? baselineFromSelfAssessment);

    if (data.goalScore >= 90) {
      return "Вау! Очень амбициозно! 🚀";
    }
    if (ambitionGap >= 25) {
      return `Отлично! Любим вызовы. Настроим умный план 💪`;
    }
    if (data.goalScore < 50) {
      return "Ну а если поставить цель повыше? Думаю, ты можешь лучше 😉";
    }
    if (data.tookMock && mockScore && mockScore <= 40 && data.goalScore >= 70) {
      return "План жёсткий, но реальный. Поехали шаг за шагом!";
    }
    return "Хороший ориентир. Давай начнём!";
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!data.schoolGrade;
      case 2:
        return !!data.basicLevel;
      case 3:
        return data.tookMock !== undefined && (!data.tookMock || (data.mockScore !== undefined && data.mockScore >= 0 && data.mockScore <= 100));
      case 4:
        const isOGE = courseId === 'oge-math';
        const isEgeBasic = courseId === 'ege-basic';
        const isEgeProf = courseId === 'ege-advanced';
        
        let maxScore;
        if (isOGE) {
          maxScore = 31;
        } else if (isEgeBasic) {
          maxScore = 21;
        } else if (isEgeProf) {
          maxScore = 100;
        } else {
          maxScore = 100;
        }
        
        return data.goalScore !== undefined && data.goalScore >= 0 && data.goalScore <= maxScore;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!user) throw new Error('User not authenticated');

      const updateObject = {
        [`schoolmark${courseNumber}`]: data.schoolGrade || null,
        [`selfestimation${courseNumber}`]: data.basicLevel || null,
        [`testmark${courseNumber}`]: data.tookMock ? (data.mockScore || null) : null,
        [`course_${courseNumber}_goal`]: data.goalScore ? data.goalScore.toString() : null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateObject)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Данные сохранены",
        description: `Настройки для курса "${course.title}" обновлены`,
      });

      onDone();
      
    } catch (error) {
      console.error('Error saving course data:', error);
      setError('Не удалось сохранить данные. Попробуйте ещё раз.');
      if (onError) onError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: { x: 300, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1f36] mb-1">Твоя оценка</h2>
              <p className="text-sm text-gray-600">Средняя по математике в школе</p>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((grade) => (
                <motion.button
                  key={grade}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => updateData({ schoolGrade: grade })}
                  className={`h-12 text-xl font-bold rounded-xl transition-all ${
                    data.schoolGrade === grade
                      ? 'bg-gradient-to-br from-yellow-500 to-emerald-500 text-white shadow-md'
                      : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80'
                  }`}
                >
                  {grade}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1f36] mb-1">Твой уровень</h2>
              <p className="text-sm text-gray-600">Как оцениваешь свои навыки?</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <span className="text-4xl">{data.basicLevel ? getEmojiForLevel(data.basicLevel) : '🙂'}</span>
              </div>
              
              {/* Custom Modern Slider */}
              <div className="relative py-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={data.basicLevel || 3}
                  onChange={(e) => updateData({ basicLevel: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern"
                  style={{
                    background: `linear-gradient(to right, 
                      rgb(234 179 8) 0%, 
                      rgb(234 179 8) ${((data.basicLevel || 3) - 1) * 25}%, 
                      rgb(229 231 235) ${((data.basicLevel || 3) - 1) * 25}%, 
                      rgb(229 231 235) 100%)`
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>Слабо</span>
                <span className="font-semibold text-[#1a1f36]">{data.basicLevel || 3} из 5</span>
                <span>Отлично</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1f36] mb-1">Пробный тест</h2>
              <p className="text-sm text-gray-600">Уже проходил(а)?</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Нет', value: false },
                { label: 'Да', value: true }
              ].map(({ label, value }) => (
                <motion.button
                  key={label}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateData({ tookMock: value, mockScore: undefined })}
                  className={`h-10 rounded-xl font-medium transition-all text-sm ${
                    data.tookMock === value
                      ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 text-white shadow-md'
                      : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80'
                  }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>

            {data.tookMock && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-[#1a1f36]">Сколько баллов?</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={data.mockScore || ''}
                  onChange={(e) => updateData({ mockScore: parseInt(e.target.value) || 0 })}
                  placeholder="0–100"
                  className="h-10 text-center text-base font-semibold bg-gray-50/80 border-gray-300 rounded-xl text-[#1a1f36]"
                />
                {data.tookMock && (data.mockScore === undefined || data.mockScore < 0 || data.mockScore > 100) && (
                  <p className="text-xs text-red-600 font-medium">Введи число от 0 до 100</p>
                )}
              </motion.div>
            )}
          </div>
        );

      case 4:
        const isOGE = courseId === 'oge-math';
        const isEgeBasic = courseId === 'ege-basic';
        const isEgeProf = courseId === 'ege-advanced';
        
        let maxScore, defaultScore, showPercentage;
        
        if (isOGE) {
          maxScore = 31;
          defaultScore = 15;
          showPercentage = false;
        } else if (isEgeBasic) {
          maxScore = 21;
          defaultScore = 12;
          showPercentage = false;
        } else if (isEgeProf) {
          maxScore = 100;
          defaultScore = 50;
          showPercentage = false;
        } else {
          maxScore = 100;
          defaultScore = 50;
          showPercentage = true;
        }
        
        const currentGoal = data.goalScore || defaultScore;
        
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1f36] mb-1">Твоя цель</h2>
              <p className="text-sm text-gray-600">На сколько баллов целишься?</p>
            </div>
            
            <div className="space-y-5">
              {/* Score Display */}
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                  {currentGoal}{showPercentage ? '%' : ''}
                </div>
              </div>

              {/* Modern Slider */}
              <div className="relative py-4">
                <input
                  type="range"
                  min="0"
                  max={maxScore}
                  step="1"
                  value={currentGoal}
                  onChange={(e) => updateData({ goalScore: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern"
                  style={{
                    background: `linear-gradient(to right, 
                      rgb(234 179 8) 0%, 
                      rgb(234 179 8) ${(currentGoal / maxScore) * 100}%, 
                      rgb(229 231 235) ${(currentGoal / maxScore) * 100}%, 
                      rgb(229 231 235) 100%)`
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>{maxScore}</span>
              </div>

              {/* OGE Grade Reference */}
              {isOGE && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-4 gap-1.5 pt-2"
                >
                  {[
                    { grade: '2', range: '0–7', bg: 'bg-red-100/80', text: 'text-red-700' },
                    { grade: '3', range: '8–14', bg: 'bg-orange-100/80', text: 'text-orange-700' },
                    { grade: '4', range: '15–21', bg: 'bg-blue-100/80', text: 'text-blue-700' },
                    { grade: '5', range: '22–31', bg: 'bg-green-100/80', text: 'text-green-700' }
                  ].map(({ grade, range, bg, text }) => (
                    <div key={grade} className={`${bg} rounded-lg p-1.5 text-center`}>
                      <div className={`font-bold text-sm ${text}`}>{grade}</div>
                      <div className="text-xs text-gray-600">{range}</div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* EGE Basic Grade Reference */}
              {isEgeBasic && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-3 gap-1.5 pt-2"
                >
                  {[
                    { grade: '3', range: '7–11', bg: 'bg-orange-100/80', text: 'text-orange-700' },
                    { grade: '4', range: '12–16', bg: 'bg-blue-100/80', text: 'text-blue-700' },
                    { grade: '5', range: '17–21', bg: 'bg-green-100/80', text: 'text-green-700' }
                  ].map(({ grade, range, bg, text }) => (
                    <div key={grade} className={`${bg} rounded-lg p-1.5 text-center`}>
                      <div className={`font-bold text-sm ${text}`}>{grade}</div>
                      <div className="text-xs text-gray-600">{range}</div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Smart Comment */}
              {data.goalScore && (
                <motion.div
                  key={getSmartComment()}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-gray-700 py-2"
                >
                  {getSmartComment()}
                </motion.div>
              )}
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-sm h-9 rounded-lg font-medium transition-all"
                >
                  Повторить
                </button>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-10 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Сохраняем..." : "Готово 🚀"}
            </motion.button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1a1f36]/60 backdrop-blur-xl flex items-center justify-center p-4 z-50" onClick={onDone}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-2xl overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          onClick={onDone}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-all hover:scale-110 group"
        >
          <X className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1a1f36] mb-1">Начнём</h1>
            <p className="text-sm text-gray-600">{course.title}</p>
          </div>
          
          {/* Modern Progress Bar */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                  i + 1 <= currentStep
                    ? 'bg-gradient-to-r from-yellow-500 to-emerald-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Шаг {currentStep} из {TOTAL_STEPS}</p>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {currentStep < TOTAL_STEPS && (
          <div className="px-8 pb-8 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-4 h-10 text-sm text-gray-600 hover:text-gray-900 font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Назад
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 h-10 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Далее
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}