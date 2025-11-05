import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  GraduationCap,
  Gauge,
  ClipboardCheck,
  Target,
  Star,
  Check,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const TOTAL_STEPS = 4;

const COURSES: Record<string, { title: string }> = {
  "oge-math": { title: "ОГЭ Математика" },
  "ege-basic": { title: "ЕГЭ Базовая математика" },
  "ege-advanced": { title: "ЕГЭ Профильная математика" },
};

const courseIdToNumber: Record<string, number> = {
  "oge-math": 1,
  "ege-basic": 2,
  "ege-advanced": 3,
};

interface CourseOnboardingWizardProps {
  courseId: string;
  onDone: () => void;
  onError?: () => void;
  closeOnBackdrop?: boolean;
}

interface CourseFormData {
  schoolGrade?: number;
  basicLevel?: number;
  tookMock?: boolean;
  mockScore?: number;
  goalScore?: number;
}

const gradePills = [2, 3, 4, 5];

const levelLabels = [
  "Новичок",
  "Базовый",
  "Средний",
  "Сильный",
  "Профи",
] as const;

const stepConfig = [
  {
    id: 1,
    title: "Школьная оценка",
    icon: GraduationCap,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 2,
    title: "Уровень знаний",
    icon: Gauge,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: 3,
    title: "Пробный тест",
    icon: ClipboardCheck,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: 4,
    title: "Цель по баллам",
    icon: Target,
    color: "from-green-500 to-emerald-500",
  },
];

export function CourseOnboardingWizard({
  courseId,
  onDone,
  onError,
  closeOnBackdrop = true,
}: CourseOnboardingWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<CourseFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const course = COURSES[courseId] || { title: "Математика" };
  const courseNumber = courseIdToNumber[courseId] || 1;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onDone]);

  const loadExistingData = async () => {
    if (!user) return;
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          `schoolmark${courseNumber}, selfestimation${courseNumber}, testmark${courseNumber}, course_${courseNumber}_goal`
        )
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading existing data:", error);
        return;
      }

      if (profile) {
        setData({
          schoolGrade:
            (profile as any)[`schoolmark${courseNumber}`] ?? undefined,
          basicLevel:
            (profile as any)[`selfestimation${courseNumber}`] ?? undefined,
          mockScore: (profile as any)[`testmark${courseNumber}`] ?? undefined,
          tookMock:
            (profile as any)[`testmark${courseNumber}`] != null
              ? true
              : undefined,
          goalScore: (profile as any)[`course_${courseNumber}_goal`]
            ? parseInt((profile as any)[`course_${courseNumber}_goal`], 10)
            : undefined,
        });
      }
    } catch (e) {
      console.error("Error loading existing data:", e);
    }
  };

  // Reset only when course changes, not on every user object change
  useEffect(() => {
    setCurrentStep(1);
    setData({});
    setError(null);
    setIsSubmitting(false);
  }, [courseId]);

  // Load existing data when we have a user and course
  useEffect(() => {
    if (user) {
      void loadExistingData();
    }
  }, [courseId, user?.id]);

  const updateData = (patch: Partial<CourseFormData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  const getSmartComment = (): string => {
    if (data.goalScore == null) return "";
    const isOGE = courseId === "oge-math";

    if (isOGE) {
      const s = data.goalScore;
      if (s >= 22) return "Отлично! Целишься на «5». Поехали 🚀";
      if (s >= 15) return "Хорошая цель на «4» — реально 💪";
      if (s >= 8) return "Стабильная «3» — подтянем темы и усилим результат.";
      return "Давай поставим планку чуть выше — я помогу 🙂";
    }

    const baseline = (data.basicLevel || 3) * 15;
    const mock = data.tookMock ? data.mockScore ?? baseline : baseline;
    const gap = (data.goalScore ?? 0) - mock;

    if (data.goalScore >= 90) return "Супер-цель! Будем работать как профи 🔥";
    if (gap >= 25) return "Амбициозно — построим умный маршрут к цели 💪";
    if (data.goalScore < 50) return "Можно смелее — ты явно можешь больше 😉";
    return "Звучит реалистично. Начинаем!";
  };

  const isOGE = courseId === "oge-math";
  const isEgeBasic = courseId === "ege-basic";
  const isEgeProf = courseId === "ege-advanced";
  const maxScore = isOGE ? 31 : isEgeBasic ? 21 : isEgeProf ? 100 : 100;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!data.schoolGrade;
      case 2:
        return !!data.basicLevel;
      case 3:
        return (
          data.tookMock !== undefined &&
          (!data.tookMock ||
            (data.mockScore !== undefined &&
              data.mockScore >= 0 &&
              data.mockScore <= 100))
        );
      case 4:
        return (
          data.goalScore !== undefined &&
          data.goalScore >= 0 &&
          data.goalScore <= maxScore
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceed())
      setCurrentStep((p) => p + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((p) => p - 1);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      if (!user) throw new Error("User not authenticated");

      const updateObject: Record<string, number | string | null> = {
        [`schoolmark${courseNumber}`]: data.schoolGrade ?? null,
        [`selfestimation${courseNumber}`]: data.basicLevel ?? null,
        [`testmark${courseNumber}`]: data.tookMock
          ? data.mockScore ?? null
          : null,
        [`course_${courseNumber}_goal`]:
          data.goalScore != null ? String(data.goalScore) : null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateObject)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Данные сохранены", {
        description: `Настройки для курса «${course.title}» обновлены`,
      });

      onDone();
    } catch (e) {
      console.error("Error saving course data:", e);
      setError("Не удалось сохранить данные. Попробуйте ещё раз.");
      onError?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const Step1 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white mb-0.5">
          Какая у тебя оценка по математике?
        </h3>
        <p className="text-xs text-gray-400">
          Укажи среднюю оценку за последнее время
        </p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {gradePills.map((grade, i) => {
          const selected = data.schoolGrade === grade;
          return (
            <motion.button
              key={grade}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateData({ schoolGrade: grade })}
              className={`relative py-4 px-2 rounded-2xl font-bold text-2xl transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20"
              }`}
            >
              {grade}
              {selected && (
                <motion.div
                  layoutId="grade-selected"
                  className="absolute -top-2 -right-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="w-6 h-6 bg-green-500 rounded-full text-white p-0.5" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white mb-0.5">
          Оцени свой уровень знаний
        </h3>
        <p className="text-xs text-gray-400">
          Честно оцени текущий уровень подготовки
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as const).map((lvl, i) => {
          const selected = data.basicLevel === lvl;
          return (
            <motion.button
              key={lvl}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateData({ basicLevel: lvl })}
              className={`relative py-4 rounded-xl transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        s < lvl ? "fill-current" : "fill-white/20"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold">
                  {levelLabels[lvl - 1]}
                </span>
              </div>
              {selected && (
                <motion.div
                  layoutId="level-selected"
                  className="absolute -top-2 -right-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="w-6 h-6 bg-green-500 rounded-full text-white p-0.5" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const Step3 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white mb-0.5">
          Ты уже проходил пробный тест?
        </h3>
        <p className="text-xs text-gray-400">
          Это поможет нам лучше оценить твой уровень
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Нет", value: false },
          { label: "Да", value: true },
        ].map(({ label, value }, i) => {
          const selected = data.tookMock === value;
          return (
            <motion.button
              key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                updateData({ tookMock: value, mockScore: undefined })
              }
              className={`relative py-6 rounded-xl transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/50"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20"
              }`}
            >
              <div className="font-semibold text-lg">{label}</div>
              {selected && (
                <motion.div
                  layoutId="mock-selected"
                  className="absolute -top-2 -right-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="w-6 h-6 bg-green-500 rounded-full text-white p-0.5" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div
        className={`space-y-2 bg-white/5 p-3 rounded-lg border border-white/10 transition-opacity duration-300 ${
          data.tookMock ? "opacity-100" : "opacity-50 pointer-events-none"
        }`}
      >
        <label className="block text-xs font-semibold text-white">
          Сколько баллов ты получил? (0–100)
        </label>
        <Input
          type="number"
          min={0}
          max={100}
          value={data.mockScore ?? ""}
          onChange={(e) =>
            updateData({
              mockScore:
                e.target.value === ""
                  ? undefined
                  : Math.max(
                      0,
                      Math.min(100, parseInt(e.target.value, 10) || 0)
                    ),
            })
          }
          placeholder="Например, 62"
          className="text-center text-2xl font-bold bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-amber-500/50 py-2"
        />
        {data.mockScore !== undefined &&
          (data.mockScore < 0 || data.mockScore > 100) && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400"
            >
              Введи число от 0 до 100
            </motion.p>
          )}
      </div>
    </div>
  );

  const Step4 = () => {
    const defaultScore = isOGE ? 15 : isEgeBasic ? 12 : 50;
    const currentGoal = data.goalScore ?? defaultScore;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white mb-0.5">
            Какая твоя цель по баллам?
          </h3>
          <p className="text-xs text-gray-400">Максимум: {maxScore} баллов</p>
        </div>

        {/* No motion around the frequently-updating number to avoid micro-blinks */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            {currentGoal}
          </div>
          <div className="text-xs text-gray-300 mt-1">баллов</div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentGoal]}
            onValueChange={([val]) => updateData({ goalScore: val })}
            min={0}
            max={maxScore}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 font-semibold">
            <span>0</span>
            <span>{maxScore}</span>
          </div>
        </div>

        {isOGE && (
          <div className="grid grid-cols-4 gap-1 text-xs">
            {[
              { grade: "2", range: "0–7", cls: "from-red-500 to-red-600" },
              { grade: "3", range: "8–14", cls: "from-orange-500 to-orange-600" },
              { grade: "4", range: "15–21", cls: "from-blue-500 to-blue-600" },
              { grade: "5", range: "22–31", cls: "from-green-500 to-green-600" },
            ].map(({ grade, range, cls }, i) => (
              <motion.div
                key={grade}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={`rounded bg-gradient-to-br ${cls} p-1.5 text-center shadow-lg`}
              >
                <div className="font-black text-sm text-white">{grade}</div>
                <div className="text-white/90 font-semibold text-xs">
                  {range}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isEgeBasic && (
          <div className="grid grid-cols-3 gap-1 text-xs">
            {[
              {
                grade: "3",
                range: "7–11",
                cls: "from-orange-500 to-orange-600",
              },
              {
                grade: "4",
                range: "12–16",
                cls: "from-blue-500 to-blue-600",
              },
              {
                grade: "5",
                range: "17–21",
                cls: "from-green-500 to-green-600",
              },
            ].map(({ grade, range, cls }, i) => (
              <motion.div
                key={grade}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={`rounded bg-gradient-to-br ${cls} p-1.5 text-center shadow-lg`}
              >
                <div className="font-black text-sm text-white">{grade}</div>
                <div className="text-white/90 font-semibold text-xs">
                  {range}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {data.goalScore != null && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3 text-center text-white font-semibold text-sm">
            <Sparkles className="inline-block w-4 h-4 text-green-400 mr-1.5 mb-0.5" />
            {getSmartComment()}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 text-center font-semibold">
            {error}
          </div>
        )}
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
      ref={rootRef}
      className="fixed inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0d1425] to-[#0a0f1e] flex items-center justify-center p-4 z-50 overflow-hidden"
      onClick={() => {
        if (closeOnBackdrop) onDone();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Background blur effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </div>

      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
          {/* Close button */}
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDone}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-black text-white mb-1">
              {course.title}
            </h1>
            <p className="text-sm text-gray-400">
              Персонализируем курс под твои цели ✨
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2">
              {stepConfig.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                  <React.Fragment key={step.id}>
                    <motion.button
                      onClick={() =>
                        step.id < currentStep && setCurrentStep(step.id)
                      }
                      whileHover={step.id < currentStep ? { scale: 1.05 } : {}}
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                        isActive
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg"
                          : isCompleted
                          ? "bg-green-500/20 text-green-400 cursor-pointer"
                          : "bg-white/5 text-gray-500"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="pulse"
                          className="absolute inset-0 rounded-full border-2 border-current"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.button>
                    {i < stepConfig.length - 1 && (
                      <motion.div
                        className={`flex-1 h-1 rounded-full transition-all ${
                          isCompleted
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-white/10"
                        }`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">
              Шаг {currentStep} из {TOTAL_STEPS}
            </div>
          </motion.div>

          {/* Step content */}
          <div className="min-h-[240px] mb-6">{renderStep()}</div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2"
          >
            {currentStep === TOTAL_STEPS ? (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-sm"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    Сохраняем…
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Готово
                  </>
                )}
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  Назад
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 py-2.5 px-5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  Далее
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
