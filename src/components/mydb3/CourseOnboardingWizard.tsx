import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Zap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TOTAL_STEPS = 4;

// Mock data for demo (replace with your registry if desired)
const COURSES: Record<string, { title: string }> = {
  'oge-math': { title: 'ОГЭ Математика' },
  'ege-basic': { title: 'ЕГЭ Базовая математика' },
  'ege-advanced': { title: 'ЕГЭ Профильная математика' },
};

const courseIdToNumber: Record<string, number> = {
  'oge-math': 1,
  'ege-basic': 2,
  'ege-advanced': 3,
};

interface CourseOnboardingWizardProps {
  courseId: string;
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
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<CourseFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const course = COURSES[courseId] || { title: 'Математика' };
  const courseNumber = courseIdToNumber[courseId] || 1;

  // Floating particles animation
  const particles = Array.from({ length: 20 }, (_, i) => i);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onDone]);

  useEffect(() => {
    setCurrentStep(1);
    setData({});
    setError(null);
    setIsSubmitting(false);
    loadExistingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

  const loadExistingData = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(
          `schoolmark${courseNumber}, selfestimation${courseNumber}, testmark${courseNumber}, course_${courseNumber}_goal`
        )
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading existing data:', error);
        return;
      }

      if (profile) {
        setData({
          schoolGrade: profile[`schoolmark${courseNumber}`] ?? undefined,
          basicLevel: profile[`selfestimation${courseNumber}`] ?? undefined,
          mockScore: profile[`testmark${courseNumber}`] ?? undefined,
          tookMock:
            profile[`testmark${courseNumber}`] !== null &&
            profile[`testmark${courseNumber}`] !== undefined
              ? true
              : undefined,
          goalScore: profile[`course_${courseNumber}_goal`]
            ? parseInt(profile[`course_${courseNumber}_goal`], 10)
            : undefined,
        });
      }
    } catch (e) {
      console.error('Error loading existing data:', e);
    }
  };

  const updateData = (newData: Partial<CourseFormData>) => {
    setData((prev) => ({ ...prev, ...newData }));
    setError(null);
  };

  const getEmojiForLevel = (level: number): string => {
    const emojis = ['😞', '😐', '🙂', '😊', '😍'];
    return emojis[level - 1] || '🙂';
  };

  const getSmartComment = (): string => {
    if (data.goalScore == null) return '';

    const isOGE = courseId === 'oge-math';

    if (isOGE) {
      const score = data.goalScore;
      if (score >= 22) return 'Отлично! Целишься на 5! 🚀';
      if (score >= 15) return 'Хороша цель! На 4 вполне реально 💪';
      if (score >= 8) return 'Неплохо! Тройка будет в кармане 😊';
      return 'Давай поставим цель чуть повыше? 😉';
    }

    const baselineFromSelfAssessment = (data.basicLevel || 1) * 15;
    const mockScore = data.tookMock ? data.mockScore : null;
    const ambitionGap = data.goalScore - (mockScore ?? baselineFromSelfAssessment);

    if (data.goalScore >= 90) return 'Вау! Очень амбициозно! 🚀';
    if (ambitionGap >= 25) return 'Отлично! Любим вызовы. Настроим умный план 💪';
    if (data.goalScore < 50) return 'Ну а если поставить цель повыше? Думаю, ты можешь лучше 😉';
    if (data.tookMock && mockScore && mockScore <= 40 && data.goalScore >= 70)
      return 'План жёсткий, но реальный. Поехали шаг за шагом!';
    return 'Хороший ориентир. Давай начнём!';
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!data.schoolGrade;
      case 2:
        return !!data.basicLevel;
      case 3:
        return (
          data.tookMock !== undefined &&
          (!data.tookMock || (data.mockScore !== undefined && data.mockScore >= 0 && data.mockScore <= 100))
        );
      case 4: {
        const isOGE = courseId === 'oge-math';
        const isEgeBasic = courseId === 'ege-basic';
        const isEgeProf = courseId === 'ege-advanced';

        const maxScore = isOGE ? 31 : isEgeBasic ? 21 : isEgeProf ? 100 : 100;
        return data.goalScore !== undefined && data.goalScore >= 0 && data.goalScore <= maxScore;
      }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) setCurrentStep((p) => p + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((p) => p - 1);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!user) throw new Error('User not authenticated');

      const updateObject: Record<string, number | string | null> = {
        [`schoolmark${courseNumber}`]: data.schoolGrade ?? null,
        [`selfestimation${courseNumber}`]: data.basicLevel ?? null,
        [`testmark${courseNumber}`]: data.tookMock ? data.mockScore ?? null : null,
        [`course_${courseNumber}_goal`]: data.goalScore != null ? String(data.goalScore) : null,
      };

      const { error } = await supabase.from('profiles').update(updateObject).eq('user_id', user.id);

      if (error) throw error;

      toast.success('Данные сохранены', {
        description: `Настройки для курса "${course.title}" обновлены`,
      });

      onDone();
    } catch (e) {
      console.error('Error saving course data:', e);
      setError('Не удалось сохранить данные. Попробуйте ещё раз.');
      onError?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const Step1 = () => (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-6xl mb-4"
        >
          📚
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Твоя оценка</h2>
        <p className="text-[#9ca3af]">Средняя по математике в школе</p>
      </motion.div>

      <div className="grid grid-cols-4 gap-3">
        {[2, 3, 4, 5].map((grade, index) => (
          <motion.button
            key={grade}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateData({ schoolGrade: grade })}
            className={`relative h-20 text-2xl font-bold rounded-2xl transition-all overflow-hidden group ${
              data.schoolGrade === grade
                ? 'bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white shadow-lg shadow-green-500/50'
                : 'bg-[#2a3447] text-[#9ca3af] hover:bg-[#344155] border border-[#374151]'
            }`}
          >
            {data.schoolGrade === grade && (
              <motion.div
                layoutId="selected-grade"
                className="absolute inset-0 bg-gradient-to-br from-[#a8e063] to-[#56ab2f]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{grade}</span>
            {data.schoolGrade === grade && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 z-10">
                <Star className="w-4 h-4 fill-white text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-7xl mb-4">
          {data.basicLevel ? getEmojiForLevel(data.basicLevel) : '🙂'}
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Твой уровень</h2>
        <p className="text-[#9ca3af]">Как оцениваешь свои навыки?</p>
      </motion.div>

      <div className="space-y-6">
        <div className="relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#a8e063]/20 to-[#56ab2f]/20 blur-xl rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: `${((data.basicLevel || 3) - 1) * 25}%` }}
          />

          <div className="relative py-6">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={data.basicLevel || 3}
              onChange={(e) => updateData({ basicLevel: parseInt(e.target.value, 10) })}
              className="w-full h-3 bg-[#2a3447] rounded-full appearance-none cursor-pointer slider-modern-dark"
              style={{
                background: `linear-gradient(to right, 
                  #a8e063 0%, 
                  #56ab2f ${((data.basicLevel || 3) - 1) * 25}%, 
                  #2a3447 ${((data.basicLevel || 3) - 1) * 25}%, 
                  #2a3447 100%)`,
              }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-[#9ca3af]">Слабо</span>
          <motion.div
            key={data.basicLevel}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-bold text-2xl bg-gradient-to-r from-[#a8e063] to-[#56ab2f] bg-clip-text text-transparent"
          >
            {data.basicLevel || 3} из 5
          </motion.div>
          <span className="text-[#9ca3af]">Отлично</span>
        </div>
      </div>
    </div>
  );

  const Step3 = () => (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-6xl mb-4">
          📝
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Пробный тест</h2>
        <p className="text-[#9ca3af]">Уже проходил(а)?</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Нет', value: false, icon: '❌' },
          { label: 'Да', value: true, icon: '✅' },
        ].map(({ label, value, icon }, index) => (
          <motion.button
            key={label}
            initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateData({ tookMock: value, mockScore: undefined })}
            className={`relative h-24 rounded-2xl font-semibold transition-all text-base overflow-hidden ${
              data.tookMock === value
                ? 'bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white shadow-lg shadow-green-500/50'
                : 'bg-[#2a3447] text-[#9ca3af] hover:bg-[#344155] border border-[#374151]'
            }`}
          >
            {data.tookMock === value && (
              <motion.div
                layoutId="selected-mock"
                className="absolute inset-0 bg-gradient-to-br from-[#a8e063] to-[#56ab2f]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">{icon}</span>
              <span>{label}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {data.tookMock && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="space-y-3"
          >
            <Label className="text-sm font-medium text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#a8e063]" />
              Сколько баллов?
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={data.mockScore ?? ''}
                onChange={(e) => updateData({ mockScore: e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0 })}
                placeholder="0–100"
                className="h-14 text-center text-2xl font-bold bg-[#2a3447] border-[#374151] rounded-2xl text-white placeholder:text-[#6b7280] focus:border-[#a8e063] focus:ring-[#a8e063]"
              />
              {data.mockScore !== undefined && data.mockScore >= 0 && data.mockScore <= 100 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Zap className="w-6 h-6 text-[#a8e063] fill-[#a8e063]" />
                </motion.div>
              )}
            </div>
            {data.tookMock && (data.mockScore === undefined || data.mockScore < 0 || data.mockScore > 100) && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 font-medium">
                Введи число от 0 до 100
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const Step4 = () => {
    const isOGE = courseId === 'oge-math';
    const isEgeBasic = courseId === 'ege-basic';
    const isEgeProf = courseId === 'ege-advanced';

    const maxScore = isOGE ? 31 : isEgeBasic ? 21 : isEgeProf ? 100 : 100;
    const defaultScore = isOGE ? 15 : isEgeBasic ? 12 : isEgeProf ? 50 : 50;
    const showPercentage = false;

    const currentGoal = data.goalScore ?? defaultScore;

    return (
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="text-6xl mb-4">
            🎯
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Твоя цель</h2>
          <p className="text-[#9ca3af]">На сколько баллов целишься?</p>
        </motion.div>

        <div className="space-y-6">
          <motion.div key={currentGoal} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#a8e063]/20 to-[#56ab2f]/20 blur-3xl" />
            <div className="relative text-7xl font-black bg-gradient-to-r from-[#a8e063] to-[#56ab2f] bg-clip-text text-transparent">
              {currentGoal}
              {showPercentage ? '%' : ''}
            </div>
          </motion.div>

          <div className="relative py-8">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-[#a8e063]/30 to-[#56ab2f]/30 blur-2xl rounded-full"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: `${(currentGoal / maxScore) * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max={maxScore}
              step="1"
              value={currentGoal}
              onChange={(e) => updateData({ goalScore: parseInt(e.target.value, 10) })}
              className="w-full h-4 bg-[#2a3447] rounded-full appearance-none cursor-pointer slider-modern-dark relative z-10"
              style={{
                background: `linear-gradient(to right, 
                  #a8e063 0%, 
                  #56ab2f ${(currentGoal / maxScore) * 100}%, 
                  #2a3447 ${(currentGoal / maxScore) * 100}%, 
                  #2a3447 100%)`,
              }}
            />
          </div>

          <div className="flex justify-between text-sm text-[#9ca3af]">
            <span>0</span>
            <span>{maxScore}</span>
          </div>

          {isOGE && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-2">
              {[
                { grade: '2', range: '0–7', from: 'from-red-500/20', to: 'to-red-600/20', text: 'text-red-400' },
                { grade: '3', range: '8–14', from: 'from-orange-500/20', to: 'to-orange-600/20', text: 'text-orange-400' },
                { grade: '4', range: '15–21', from: 'from-blue-500/20', to: 'to-blue-600/20', text: 'text-blue-400' },
                { grade: '5', range: '22–31', from: 'from-[#a8e063]/20', to: 'to-[#56ab2f]/20', text: 'text-green-400' },
              ].map(({ grade, range, from, to, text }) => (
                <div key={grade} className={`bg-gradient-to-br ${from} ${to} backdrop-blur-sm rounded-xl p-2 text-center border border-white/5`}>
                  <div className={`font-bold text-base ${text}`}>{grade}</div>
                  <div className="text-xs text-[#9ca3af]">{range}</div>
                </div>
              ))}
            </motion.div>
          )}

          {isEgeBasic && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
              {[
                { grade: '3', range: '7–11', from: 'from-orange-500/20', to: 'to-orange-600/20', text: 'text-orange-400' },
                { grade: '4', range: '12–16', from: 'from-blue-500/20', to: 'to-blue-600/20', text: 'text-blue-400' },
                { grade: '5', range: '17–21', from: 'from-[#a8e063]/20', to: 'to-[#56ab2f]/20', text: 'text-green-400' },
              ].map(({ grade, range, from, to, text }) => (
                <div key={grade} className={`bg-gradient-to-br ${from} ${to} backdrop-blur-sm rounded-xl p-2 text-center border border-white/5`}>
                  <div className={`font-bold text-base ${text}`}>{grade}</div>
                  <div className="text-xs text-[#9ca3af]">{range}</div>
                </div>
              ))}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {data.goalScore != null && (
              <motion.div
                key={getSmartComment()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center text-base text-white bg-gradient-to-r from-[#a8e063]/10 to-[#56ab2f]/10 backdrop-blur-sm py-4 px-6 rounded-2xl border border-[#a8e063]/20"
              >
                {getSmartComment()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-red-500 hover:bg-red-600 text-white text-sm h-10 rounded-xl font-medium transition-all"
            >
              Повторить
            </button>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(168, 224, 99, 0.4)' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 bg-gradient-to-r from-[#a8e063] to-[#56ab2f] hover:from-[#98d653] hover:to-[#4c9b2b] text-white text-base font-bold rounded-2xl transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Сохраняем...
            </>
          ) : (
            <>
              Готово
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                🚀
              </motion.span>
            </>
          )}
        </motion.button>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 />;
      case 2:
        return <Step2 />;
      case 3:
        return <Step3 />;
      case 4:
        return <Step4 />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#1a202e]/95 backdrop-blur-2xl flex items-center justify-center p-4 z-50"
      onClick={onDone}
    >
      {/* Animated Background Particles */}
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#a8e063] rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.2,
          }}
          animate={{
            y: [0, Math.random() * window.innerHeight * 0.8, 0],
            x: [0, Math.random() * window.innerWidth * 0.8, 0],
          }}
          transition={{ duration: 12 + Math.random() * 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Modal Card */}
      <div
        className="relative w-full max-w-2xl bg-[#111827]/70 border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">{course.title}</h1>
            <p className="text-sm text-[#9ca3af]">Пару вопросов — и мы настроим курс под тебя</p>
          </div>
          <button
            onClick={onDone}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#a8e063] to-[#56ab2f]"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          <div className="mt-2 text-xs text-[#9ca3af] text-right">
            Шаг {currentStep} из {TOTAL_STEPS}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-8">{renderStep()}</div>

        {/* Footer Navigation (hidden on step 4 because we show “Готово”) */}
        {currentStep < 4 && (
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Назад
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-[#a8e063] to-[#56ab2f] hover:from-[#98d653] hover:to-[#4c9b2b] text-white"
            >
              Далее
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
