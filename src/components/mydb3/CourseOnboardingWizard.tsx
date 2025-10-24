import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GraduationCap,
  Gauge,
  ClipboardCheck,
  Target,
  Star,
  Check,
  X,
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
      className="text-center"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a8e063]/15 to-[#56ab2f]/15 ring-1 ring-white/10">
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
      <p className="text-[#9ca3af] text-sm">{subtitle}</p>
    </motion.div>
  );

  const Step1 = () => (
    <div className="space-y-8">
      <StepHeader
        icon={<GraduationCap className="h-7 w-7 text-[#a8e063]" />}
        title="Твоя школьная оценка"
        subtitle="Средняя по математике"
      />
      <div className="grid grid-cols-4 gap-3">
        {gradePills.map((grade, i) => {
          const selected = data.schoolGrade === grade;
          return (
            <motion.button
              key={grade}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => updateData({ schoolGrade: grade })}
              className={[
                "relative h-14 rounded-xl font-semibold transition-all border",
                selected
                  ? "bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white border-transparent shadow-lg shadow-green-500/30"
                  : "bg-[#1f2937] text-[#d1d5db] hover:bg-[#253044] border-white/10",
              ].join(" ")}
              aria-pressed={selected}
            >
              <span className="text-xl">{grade}</span>
              {selected && (
                <motion.span
                  layoutId="grade-check"
                  className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-8">
      <StepHeader
        icon={<Gauge className="h-7 w-7 text-[#a8e063]" />}
        title="Самооценка уровня"
        subtitle="Выбери уровень, как ты себя ощущаешь"
      />
      <div className="grid grid-cols-5 gap-3">
        {([1, 2, 3, 4, 5] as const).map((lvl, i) => {
          const selected = data.basicLevel === lvl;
          return (
            <motion.button
              key={lvl}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => updateData({ basicLevel: lvl })}
              className={[
                "group relative flex h-20 flex-col items-center justify-center gap-1 rounded-xl border text-center",
                selected
                  ? "bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white border-transparent shadow-lg shadow-green-500/30"
                  : "bg-[#1f2937] text-[#e5e7eb] hover:bg-[#253044] border-white/10",
              ].join(" ")}
              aria-pressed={selected}
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={
                      s < lvl
                        ? "w-4 h-4 text-current"
                        : "w-4 h-4 text-white/30"
                    }
                    fill={s < lvl ? "currentColor" : "none"}
                  />
                ))}
              </div>
              <div className="text-xs opacity-90">{levelLabels[lvl - 1]}</div>
              {selected && (
                <motion.span
                  layoutId="level-check"
                  className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const Step3 = () => (
    <div className="space-y-8">
      <StepHeader
        icon={<ClipboardCheck className="h-7 w-7 text-[#a8e063]" />}
        title="Пробный тест"
        subtitle="Проходил(а) ли ты недавно пробник?"
      />
      <div className="grid grid-cols-2 gap-3">
        {[{ label: "Нет", v: false }, { label: "Да", v: true }].map(
          ({ label, v }, i) => {
            const selected = data.tookMock === v;
            return (
              <motion.button
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => updateData({ tookMock: v, mockScore: undefined })}
                className={[
                  "relative h-12 rounded-xl font-medium border",
                  selected
                    ? "bg-gradient-to-br from-[#a8e063] to-[#56ab2f] text-white border-transparent shadow-lg shadow-green-500/30"
                    : "bg-[#1f2937] text-[#e5e7eb] hover:bg-[#253044] border-white/10",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2">
                  {v ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {label}
                </span>
              </motion.button>
            );
          }
        )}
      </div>

      <AnimatePresence>
        {data.tookMock && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="space-y-3"
          >
            <Label className="text-sm font-medium text-white">
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
              className="h-12 text-center text-lg font-semibold bg-[#1f2937] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-[#a8e063]"
            />
            {data.mockScore !== undefined &&
              (data.mockScore < 0 || data.mockScore > 100) && (
                <p className="text-xs text-red-400">
                  Введи число от 0 до 100.
                </p>
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
          icon={<Target className="h-7 w-7 text-[#a8e063]" />}
          title="Цель по баллам"
          subtitle={`Выбери цель (макс: ${maxScore})`}
        />

        <motion.div
          key={currentGoal}
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl font-black bg-gradient-to-r from-[#a8e063] to-[#56ab2f] bg-clip-text text-transparent">
            {currentGoal}
          </div>
        </motion.div>

        <div className="relative py-2">
          <input
            type="range"
            min={0}
            max={maxScore}
            step={1}
            value={currentGoal}
            onChange={(e) => updateData({ goalScore: parseInt(e.target.value, 10) })}
            className="w-full h-3 bg-[#1f2937] rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right,#a8e063 0%,#56ab2f ${
                (currentGoal / maxScore) * 100
              }%,#1f2937 ${(currentGoal / maxScore) * 100}%,#1f2937 100%)`,
            }}
            aria-valuemin={0}
            aria-valuemax={maxScore}
            aria-valuenow={currentGoal}
          />
          <div className="flex justify-between text-xs text-white/60 mt-2">
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center text-sm text-white/90 bg-white/[0.06] border border-white/10 py-3 px-4 rounded-xl"
            >
              {getSmartComment()}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 bg-gradient-to-r from-[#a8e063] to-[#56ab2f] text-white font-semibold rounded-xl shadow-lg shadow-green-500/20 disabled:opacity-50"
        >
          {isSubmitting ? "Сохраняем…" : "Готово"}
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
    <div className="mb-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const idx = i + 1;
          const active = idx === currentStep;
          const done = idx < currentStep;
          return (
            <React.Fragment key={idx}>
              <div
                className={[
                  "h-2 w-2 rounded-full",
                  active
                    ? "bg-gradient-to-r from-[#a8e063] to-[#56ab2f]"
                    : done
                    ? "bg-white/70"
                    : "bg-white/25",
                ].join(" ")}
              />
              {idx < TOTAL_STEPS && (
                <div className="h-[2px] w-8 bg-white/10" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-[#9ca3af] text-right">
        Шаг {currentStep} из {TOTAL_STEPS}
      </div>
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
      <div
        className="relative w-full max-w-2xl bg-[#0f172a]/70 border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              {course.title}
            </h1>
            <p className="text-sm text-[#9ca3af]">
              Несколько ответов — и мы настроим курс под тебя
            </p>
          </div>
          <button
            onClick={onDone}
            aria-label="Закрыть"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <Stepper />

        {/* body */}
        <div className="space-y-8">{renderStep()}</div>

        {/* footer nav (not on step 4) */}
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
