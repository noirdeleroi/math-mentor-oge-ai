import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  /** prevent closing by clicking the backdrop if you want */
  closeOnBackdrop?: boolean;
}

interface CourseFormData {
  schoolGrade?: number; // 2..5
  basicLevel?: number; // 1..5
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

  const course = COURSES[courseId] || { title: "Математика" };
  const courseNumber = courseIdToNumber[courseId] || 1;

  // --- particles (stable after mount; no re-randomize every render) ---
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ w: 1024, h: 768 });

  useEffect(() => {
    const r = rootRef.current;
    if (!r) return;
    const obs = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      setViewport({ w: cr.width, h: cr.height });
    });
    obs.observe(r);
    return () => obs.disconnect();
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        x: Math.random() * viewport.w,
        y: Math.random() * viewport.h,
        dur: 12 + Math.random() * 8,
        opa: 0.25 + Math.random() * 0.5,
        scl: 0.6 + Math.random() * 0.8,
      })),
    // only regenerate when container size meaningfully changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewport.w, viewport.h]
  );

  // Esc to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onDone]);

  // load persisted values
  useEffect(() => {
    setCurrentStep(1);
    setData({});
    setError(null);
    setIsSubmitting(false);
    void loadExistingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

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
            (profile as any)[`testmark${courseNumber}`] != null ? true : undefined,
          goalScore: (profile as any)[`course_${courseNumber}_goal`]
            ? parseInt((profile as any)[`course_${courseNumber}_goal`], 10)
            : undefined,
        });
      }
    } catch (e) {
      console.error("Error loading existing data:", e);
    }
  };

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

    const baseline = (data.basicLevel || 3) * 15; // heuristic
    const mock = data.tookMock ? data.mockScore ?? baseline : baseline;
    const gap = (data.goalScore ?? 0) - mock;

    if (data.goalScore >= 90) return "Супер-цель! Будем работать как профи 🔥";
    if (gap >= 25) return "Амбициозно — построим умный маршрут к цели 💪";
    if (data.goalScore < 50) return "Можно смелее — ты явно можешь больше 😉";
    return "Звучит реалистично. Начинаем!";
  };

  // per-course scoring
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
    if (currentStep < TOTAL_STEPS && canProceed()) setCurrentStep((p) => p + 1);
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
        [`testmark${courseNumber}`]: data.tookMock ? data.mockScore ?? null : null,
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

  // ---------- Steps ----------
  const StepHeader = ({
    icon,
    title,
    subtitle,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="text-center mb-2"
    >
      <motion.div 
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a8e063]/20 to-[#56ab2f]/20 ring-2 ring-[#a8e063]/30 shadow-lg shadow-[#a8e063]/20"
        whileHover={{ scale: 1.05, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {icon}
      </motion.div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">{title}</h2>
      <p className="text-[#9ca3af] text-sm md:text-base">{subtitle}</p>
    </motion.div>
  );

  const Step1 = () => (
    <div className="space-y-10">
      <StepHeader
        icon={<GraduationCap className="h-8 w-8 text-[#a8e063]" />}
        title="Твоя школьная оценка"
        subtitle="Средняя по математике"
      />
      <div className="grid grid-cols-4 gap-3 px-2">
        {gradePills.map((grade, i) => {
          const selected = data.schoolGrade === grade;
          return (
            <motion.button
              key={grade}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                delay: i * 0.08,
                type: "spring",
                damping: 15,
                stiffness: 300
              }}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateData({ schoolGrade: grade })}
              className={[
                "relative h-16 rounded-2xl font-bold text-2xl transition-all border-2",
                selected
                  ? "bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white border-transparent shadow-xl shadow-green-500/40 scale-105"
                  : "bg-[#1f2937] text-[#d1d5db] hover:bg-[#253044] border-white/10 hover:border-[#a8e063]/30",
              ].join(" ")}
              aria-pressed={selected}
            >
              {grade}
              {selected && (
                <motion.span
                  layoutId="grade-check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#56ab2f] shadow-lg"
                >
                  <Check className="w-5 h-5" strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-10">
      <StepHeader
        icon={<Gauge className="h-8 w-8 text-[#a8e063]" />}
        title="Самооценка уровня"
        subtitle="Выбери уровень, как ты себя ощущаешь"
      />
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {([1, 2, 3, 4, 5] as const).map((lvl, i) => {
          const selected = data.basicLevel === lvl;
          return (
            <motion.button
              key={lvl}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                delay: i * 0.08,
                type: "spring",
                damping: 15,
                stiffness: 300
              }}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateData({ basicLevel: lvl })}
              className={[
                "group relative flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 text-center transition-all",
                selected
                  ? "bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white border-transparent shadow-xl shadow-green-500/40 scale-105"
                  : "bg-[#1f2937] text-[#e5e7eb] hover:bg-[#253044] border-white/10 hover:border-[#a8e063]/30",
              ].join(" ")}
              aria-pressed={selected}
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <motion.div
                    key={s}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.08 + s * 0.03 }}
                  >
                    <Star
                      className={
                        s < lvl
                          ? "w-3 h-3 md:w-4 md:h-4 text-current"
                          : "w-3 h-3 md:w-4 md:h-4 text-white/30"
                      }
                      fill={s < lvl ? "currentColor" : "none"}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="text-[10px] md:text-xs font-medium opacity-90">{levelLabels[lvl - 1]}</div>
              {selected && (
                <motion.span
                  layoutId="level-check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#56ab2f] shadow-lg"
                >
                  <Check className="w-5 h-5" strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const Step3 = () => (
    <div className="space-y-10">
      <StepHeader
        icon={<ClipboardCheck className="h-8 w-8 text-[#a8e063]" />}
        title="Пробный тест"
        subtitle="Проходил(а) ли ты недавно пробник?"
      />
      <div className="grid grid-cols-2 gap-4 px-4">
        {[{ label: "Нет", v: false }, { label: "Да", v: true }].map(
          ({ label, v }, i) => {
            const selected = data.tookMock === v;
            return (
              <motion.button
                key={label}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  delay: i * 0.1,
                  type: "spring",
                  damping: 15,
                  stiffness: 300
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateData({ tookMock: v, mockScore: undefined })}
                className={[
                  "relative h-16 rounded-2xl font-semibold text-lg border-2 transition-all",
                  selected
                    ? "bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white border-transparent shadow-xl shadow-green-500/40"
                    : "bg-[#1f2937] text-[#e5e7eb] hover:bg-[#253044] border-white/10 hover:border-[#a8e063]/30",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2">
                  {v ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <X className="w-5 h-5" strokeWidth={2.5} />}
                  {label}
                </span>
              </motion.button>
            );
          }
        )}
      </div>

      <AnimatePresence mode="wait">
        {data.tookMock && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.9 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="space-y-4"
          >
            <Label className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#a8e063]" />
              Баллы по пробнику (0–100)
            </Label>
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
                      : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                })
              }
              placeholder="Например, 62"
              className="h-14 text-center text-xl font-bold bg-[#1f2937] border-2 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#a8e063] focus-visible:border-[#a8e063] transition-all rounded-xl"
            />
            {data.mockScore !== undefined &&
              (data.mockScore < 0 || data.mockScore > 100) && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 text-center"
                >
                  Введи число от 0 до 100.
                </motion.p>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const Step4 = () => {
    const defaultScore = isOGE ? 15 : isEgeBasic ? 12 : 50;
    const currentGoal = data.goalScore ?? defaultScore;

    return (
      <div className="space-y-8">
        <StepHeader
          icon={<Target className="h-8 w-8 text-[#a8e063]" />}
          title="Цель по баллам"
          subtitle={`Выбери цель (макс: ${maxScore})`}
        />

        <motion.div
          key={currentGoal}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="text-center py-4"
        >
          <motion.div 
            className="text-7xl md:text-8xl font-black bg-gradient-to-r from-[#a8e063] via-[#7fc84f] to-[#56ab2f] bg-clip-text text-transparent drop-shadow-2xl"
            animate={{ 
              backgroundPosition: ["0%", "100%", "0%"],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {currentGoal}
          </motion.div>
          <div className="text-sm text-white/60 mt-2 font-medium">баллов</div>
        </motion.div>

        <div className="relative py-6 px-2">
          <Slider
            value={[currentGoal]}
            onValueChange={([val]) => updateData({ goalScore: val })}
            min={0}
            max={maxScore}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm font-medium text-white/70 mt-4 px-1">
            <span>0</span>
            <span>{maxScore}</span>
          </div>
        </div>

        {/* quick legend */}
        {isOGE && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { grade: "2", range: "0–7", cls: "text-red-400" },
              { grade: "3", range: "8–14", cls: "text-orange-400" },
              { grade: "4", range: "15–21", cls: "text-blue-400" },
              { grade: "5", range: "22–31", cls: "text-green-400" },
            ].map(({ grade, range, cls }) => (
              <div
                key={grade}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-center"
              >
                <div className={`font-semibold ${cls}`}>{grade}</div>
                <div className="text-[11px] text-white/60">{range}</div>
              </div>
            ))}
          </div>
        )}

        {isEgeBasic && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { grade: "3", range: "7–11", cls: "text-orange-400" },
              { grade: "4", range: "12–16", cls: "text-blue-400" },
              { grade: "5", range: "17–21", cls: "text-green-400" },
            ].map(({ grade, range, cls }) => (
              <div
                key={grade}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-center"
              >
                <div className={`font-semibold ${cls}`}>{grade}</div>
                <div className="text-[11px] text-white/60">{range}</div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {data.goalScore != null && (
            <motion.div
              key={getSmartComment()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="text-center text-base font-medium text-white bg-gradient-to-r from-white/10 to-white/5 border-2 border-white/20 py-4 px-5 rounded-2xl shadow-xl backdrop-blur-sm"
            >
              <Sparkles className="inline-block w-5 h-5 text-[#a8e063] mr-2 mb-1" />
              {getSmartComment()}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300 text-center font-medium"
          >
            {error}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(168, 224, 99, 0.3)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 bg-gradient-to-r from-[#a8e063] to-[#56ab2f] text-white text-lg font-bold rounded-xl shadow-2xl shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div 
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              Сохраняем…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5" strokeWidth={3} />
              Готово
            </span>
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

  // stepper UI
  const Stepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const idx = i + 1;
          const active = idx === currentStep;
          const done = idx < currentStep;
          return (
            <React.Fragment key={idx}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                className={[
                  "h-3 w-3 rounded-full transition-all duration-300",
                  active
                    ? "bg-gradient-to-r from-[#a8e063] to-[#56ab2f] shadow-lg shadow-green-500/50 scale-125"
                    : done
                    ? "bg-[#a8e063]/70 scale-110"
                    : "bg-white/20",
                ].join(" ")}
              />
              {idx < TOTAL_STEPS && (
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: done ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  className={`h-[3px] w-12 rounded-full origin-left ${done ? "bg-[#a8e063]/70" : "bg-white/10"}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-sm font-medium text-white/80 text-center"
      >
        Шаг {currentStep} из {TOTAL_STEPS}
      </motion.div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 bg-[#0b1220]/90 backdrop-blur-xl flex items-center justify-center p-4 z-50"
      onClick={() => {
        if (closeOnBackdrop) onDone();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-[#a8e063]"
          initial={{ x: p.x, y: p.y, opacity: p.opa, scale: p.scl }}
          animate={{
            y: [p.y, p.y - viewport.h * 0.25, p.y],
            x: [p.x, p.x + (Math.random() * viewport.w) / 10, p.x],
          }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f172a]/90 via-[#0f172a]/85 to-[#1a2942]/90 border-2 border-white/20 rounded-3xl shadow-2xl backdrop-blur-xl p-6 md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="mb-6 flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-2xl md:text-3xl font-black text-white mb-1 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              {course.title}
            </h1>
            <p className="text-sm md:text-base text-[#9ca3af] font-medium">
              Несколько ответов — и мы настроим курс под тебя
            </p>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDone}
            aria-label="Закрыть"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
          >
            ✕
          </motion.button>
        </div>

        <Stepper />

        {/* body */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="min-h-[280px]"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* footer nav (not on step 4) */}
        {currentStep < 4 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex items-center justify-between gap-4"
          >
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="h-12 px-6 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-xl transition-all"
            >
              Назад
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="h-12 px-8 bg-gradient-to-r from-[#a8e063] to-[#56ab2f] hover:from-[#98d653] hover:to-[#4c9b2b] text-white font-bold rounded-xl shadow-lg shadow-green-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Далее
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
