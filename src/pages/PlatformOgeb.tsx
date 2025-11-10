import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { animate } from "animejs";
import p5 from "p5";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { moduleImgs } from "@/lib/assets";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ModuleCard = {
  n: number;
  title: string;
  subtitle: string;
  img: string;
  progress: number; // 0..100
  locked?: boolean;
  isLoading?: boolean;
};

const moduleDefinitions = [
  { n: 1, title: "1. Числа и вычисления", subtitle: "Основы арифметики и работа с числами", img: moduleImgs[1], topicCodes: ['1.1E', '1.2E', '1.3E', '1.4E', '1.5E', '1.6E', '1.7E', '1.8E'] },
  { n: 2, title: "2. Уравнения и неравенства", subtitle: "Решение уравнений и систем", img: moduleImgs[3], topicCodes: ['2.1E', '2.2E', '2.3E', '2.4E', '2.5E', '2.6E', '2.7E', '2.9E'] },
  { n: 3, title: "3. Функции и графики", subtitle: "Графики и свойства функций", img: moduleImgs[5], topicCodes: ['3.1E', '3.2E', '3.3E', '3.4E', '3.5E', '3.7E', '3.8E'] },
  { n: 4, title: "4. Начала математического анализа", subtitle: "Производная и исследование функций", img: moduleImgs[4], topicCodes: ['4.1E', '4.2E', '4.3E'] },
  { n: 5, title: "5. Множества и логика", subtitle: "Операции с множествами и логические высказывания", img: moduleImgs[8], topicCodes: ['5.1E', '5.2E'] },
  { n: 6, title: "6. Вероятность и статистика", subtitle: "Теория вероятностей и анализ данных", img: moduleImgs[8], topicCodes: ['6.1E', '6.2E'] },
  { n: 7, title: "7. Геометрия", subtitle: "Планиметрия и стереометрия", img: moduleImgs[7], topicCodes: ['7.1E', '7.2E', '7.3E'] },
  { n: 8, title: "8. Применение математики", subtitle: "Реальные задачи и прикладные проблемы", img: moduleImgs[9], topicCodes: ['8.1E', '8.2E'] },
];

const circumference = 2 * Math.PI * 28; // radius 28 in your SVG

const PlatformOgeb: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasParentRef = useRef<HTMLDivElement | null>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const [modules, setModules] = useState<ModuleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    solvedProblems: 0,
    correctAnswers: 0,
    studyTime: 0,
    streak: 0
  });
  const [generalProgress, setGeneralProgress] = useState(0);

  const placeholderModules = useMemo<ModuleCard[]>(
    () =>
      moduleDefinitions.map((moduleDef) => ({
        n: moduleDef.n,
        title: moduleDef.title,
        subtitle: moduleDef.subtitle,
        img: moduleDef.img,
        progress: 0,
        locked: false,
        isLoading: true,
      })),
    []
  );

  const defaultModules = useMemo<ModuleCard[]>(
    () =>
      moduleDefinitions.map((moduleDef) => ({
        n: moduleDef.n,
        title: moduleDef.title,
        subtitle: moduleDef.subtitle,
        img: moduleDef.img,
        progress: 0,
        locked: false,
        isLoading: false,
      })),
    []
  );

  const goToModule = (n: number) => {
    const moduleSlugMap: Record<number, string> = {
      1: 'ege-basic-numbers',
      2: 'ege-basic-equations',
      3: 'ege-basic-functions',
      4: 'ege-basic-analysis',
      5: 'ege-basic-sets',
      6: 'ege-basic-probability',
      7: 'ege-basic-geometry',
      8: 'ege-basic-applied'
    };
    
    const slug = moduleSlugMap[n];
    if (slug) {
      navigate(`/module/${slug}`);
    }
  };

  const startMock = () => {
    navigate("/egemathbasic-mock");
  };

  // Load progress data from mastery snapshots
  useEffect(() => {
    const loadProgressData = async () => {
      if (!user) {
        // Set default modules with 0 progress if not logged in
        setModules(defaultModules);
        setLoading(false);
        return;
      }

      try {
        const { data: snapshot, error } = await supabase
          .from('mastery_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', '2') // EGE Basic
          .order('run_timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !snapshot?.raw_data) {
          console.log('No snapshot found, using default values');
          setModules(defaultModules);
          setLoading(false);
          return;
        }

        const rawData = snapshot.raw_data as any[];
        
        // Parse topic progress from snapshot
        const topicProgressMap: {[key: string]: number} = {};
        rawData.forEach((item: any) => {
          if (item.topic && !item.topic.includes('задача ФИПИ') && !item.topic.includes('навык')) {
            const topicMatch = item.topic.match(/^(\d+\.\d+E?)/);
            if (topicMatch) {
              const topicCode = topicMatch[1];
              topicProgressMap[topicCode] = Math.round(item.prob * 100);
            }
          }
        });

        // Calculate module progress based on topic progress
        const modulesWithProgress: ModuleCard[] = moduleDefinitions.map(moduleDef => {
          const moduleTopics = moduleDef.topicCodes;
          let totalProgress = 0;
          let validTopics = 0;
          
          moduleTopics.forEach(topicCode => {
            if (topicProgressMap[topicCode] !== undefined) {
              totalProgress += topicProgressMap[topicCode];
              validTopics++;
            }
          });
          
          const progress = validTopics > 0 ? Math.round(totalProgress / validTopics) : 0;

          return {
            n: moduleDef.n,
            title: moduleDef.title,
            subtitle: moduleDef.subtitle,
            img: moduleDef.img,
            progress,
            locked: false, // All modules are accessible
            isLoading: false,
          };
        });

        setModules(modulesWithProgress);

        // Extract stats from the stats column (using type assertion as types may be outdated)
        const snapshotData = snapshot as any;
        if (snapshotData.stats) {
          const statsData = snapshotData.stats;
          setStats({
            solvedProblems: statsData['Решено задач'] || 0,
            correctAnswers: statsData['Правильных ответов'] || 0,
            studyTime: statsData['Время обучения'] || 0,
            streak: statsData['Дней подряд'] || 0
          });
        }

        // Extract general progress from computed_summary
        if (snapshotData.computed_summary) {
          const summary = snapshotData.computed_summary;
          setGeneralProgress(Math.round(summary.general_progress || 0));
        }
      } catch (err) {
        console.error('Error loading progress data:', err);
        setModules(defaultModules);
      } finally {
        setLoading(false);
      }
    };

    loadProgressData();
  }, [user, defaultModules]);

  // Animate module cards on view
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate(e.target as Element, {
              translateY: [50, 0],
              opacity: [0, 1],
              easing: "out(4)",
              duration: 800,
            });
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".module-card").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Animate progress rings
  useEffect(() => {
    if (loading || modules.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const ring = e.target as SVGCircleElement;
          const pct = Number(ring.getAttribute("data-progress") || "0");
          const targetOffset = circumference - (pct / 100) * circumference;
          
          animate(ring, {
            strokeDashoffset: [circumference, targetOffset],
            easing: "out(4)",
            duration: 1500,
            delay: 300,
          });
          io.unobserve(ring);
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll<SVGCircleElement>(".progress-ring-circle").forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, [loading, modules]);

  // p5 background (flying math symbols)
  useEffect(() => {
    if (!canvasParentRef.current) return;

    const sketch = (p: p5) => {
      const syms = ["∑", "∫", "π", "∞", "√", "Δ", "θ", "α", "β"];
      type Part = { x: number; y: number; vx: number; vy: number; size: number; opacity: number; sym: string };
      const parts: Part[] = [];

      p.setup = () => {
        const c = p.createCanvas(p.windowWidth, p.windowHeight);
        c.parent(canvasParentRef.current!);
        p.pixelDensity(p.displayDensity());
        p.clear();

        for (let i = 0; i < 50; i++) {
          parts.push({
            x: p.random(p.width),
            y: p.random(p.height),
            vx: p.random(-0.5, 0.5),
            vy: p.random(-0.5, 0.5),
            size: p.random(2, 4),
            opacity: p.random(0.1, 0.3),
            sym: syms[Math.floor(p.random(syms.length))],
          });
        }
      };

      p.draw = () => {
        p.clear();

        parts.forEach((pt) => {
          pt.x += pt.vx;
          pt.y += pt.vy;
          if (pt.x < 0) pt.x = p.width;
          if (pt.x > p.width) pt.x = 0;
          if (pt.y < 0) pt.y = p.height;
          if (pt.y > p.height) pt.y = 0;

          p.fill(245, 158, 11, pt.opacity * 255);
          p.noStroke();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(pt.size * 8);
          p.text(pt.sym, pt.x, pt.y);
        });

        p.stroke(245, 158, 11, 60);
        p.strokeWeight(1);
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            const d = p.dist(parts[i].x, parts[i].y, parts[j].x, parts[j].y);
            if (d < 100) p.line(parts[i].x, parts[i].y, parts[j].x, parts[j].y);
          }
        }
      };

      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p5InstanceRef.current = new p5(sketch);

    return () => {
      p5InstanceRef.current?.remove();
      p5InstanceRef.current = null;
    };
  }, []);

  const completedCount = useMemo(() => modules.filter((m) => m.progress === 100).length, [modules]);
  
  const overallProgress = useMemo(() => {
    // Use general_progress from computed_summary if available, otherwise calculate from modules
    if (generalProgress > 0) return generalProgress;
    if (modules.length === 0) return 0;
    const totalProgress = modules.reduce((sum, m) => sum + m.progress, 0);
    return Math.round(totalProgress / modules.length);
  }, [modules, generalProgress]);

  return (
    <div
      className="min-h-screen text-white relative"
      style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}
    >
      {/* p5 background */}
      <div
        ref={canvasParentRef}
        className="fixed inset-0 z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-30 backdrop-blur-lg bg-[#1a1f36]/80 border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-[#1a1f36] font-bold text-lg sm:text-xl">M</span>
            </div>
            <span className="font-display text-sm sm:text-xl font-semibold">Математика ЕГЭ (База)</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <a href="#modules" className="text-xs sm:text-base hover:text-yellow-500 hidden sm:block">Модули</a>
            <a href="#progress" className="text-xs sm:text-base hover:text-yellow-500 hidden sm:block">Прогресс</a>
            <button onClick={startMock} className="bg-yellow-500 text-[#1a1f36] px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-yellow-400 font-medium text-xs sm:text-base">
              Экзамен
            </button>
          </div>
        </div>
      </nav>

      {/* Modules */}
      <section id="modules" className="pt-24 pb-20 relative">
        <div className="relative z-20 max-w-7xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16 relative px-2">
            {/* Back button - positioned to the left */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/egemathbasic")}
              className="absolute left-0 top-0 hover:bg-white/20 text-white text-xs sm:text-sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Назад к странице чата</span>
              <span className="sm:hidden">Назад</span>
            </Button>
            
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">
              Путь к успеху
            </h2>
            <p className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto px-2">
              Пройди все 8 модулей и стань мастером математики. Каждый модуль содержит теорию, практику и интерактивные задания.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {(loading ? placeholderModules : modules.length ? modules : defaultModules).map((m, i) => {
              const isLoadingCard = Boolean(m.isLoading);
              const offsetClass = ["mt-24", "mt-12", "mt-36", "mt-20", "mt-28", "mt-16", "mt-24", "mt-20"][i] || "mt-16";
              const strokeColor = isLoadingCard
                ? "#cbd5f5"
                : m.progress === 100
                ? "#10b981"
                : m.progress > 0
                ? "#f59e0b"
                : "#64748b";
              const statusText = isLoadingCard
                ? "Загрузка..."
                : m.locked
                ? "Заблокировано"
                : m.progress === 100
                ? "Завершено"
                : m.progress > 0
                ? "В процессе"
                : "Не начато";
              const ctaText = isLoadingCard
                ? "..."
                : m.locked
                ? "Скоро →"
                : m.progress === 100
                ? "Повторить →"
                : "Продолжить →";

              const progressOffset = circumference - (m.progress / 100) * circumference;
              
              return (
                <div
                  key={m.n}
                  className={`module-card rounded-xl p-4 sm:p-6 cursor-pointer bg-white/95 text-[#1a1f36] border border-white/20 ${offsetClass} sm:${offsetClass}`}
                  onClick={() => goToModule(m.n)}
                  style={{ backdropFilter: "blur(10px)" }}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <img src={m.img} alt={m.title} className="w-12 h-12 sm:w-16 sm:h-16" />
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="24" cy="24" r="20" stroke="#e5e7eb" strokeWidth="3" fill="none" className="sm:hidden" />
                        <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="4" fill="none" className="hidden sm:block" />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="3"
                          strokeLinecap="round"
                          className="progress-ring-circle sm:hidden"
                          data-progress={m.progress}
                          style={{ 
                            strokeDasharray: 2 * Math.PI * 20, 
                            strokeDashoffset: 2 * Math.PI * 20 - (m.progress / 100) * 2 * Math.PI * 20,
                            transition: 'stroke-dashoffset 0.3s ease'
                          }}
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="4"
                          strokeLinecap="round"
                          className="progress-ring-circle hidden sm:block"
                          data-progress={m.progress}
                          style={{ 
                            strokeDasharray: circumference, 
                            strokeDashoffset: progressOffset,
                            transition: 'stroke-dashoffset 0.3s ease'
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-bold text-[#1a1f36]">
                          {isLoadingCard ? "--" : `${m.progress}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-display text-base sm:text-xl font-semibold mb-2">{m.title}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">{m.subtitle}</p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${
                        isLoadingCard ? "text-gray-500" : m.locked ? "text-gray-500" : "text-emerald-600"
                      }`}
                    >
                      {statusText}
                    </span>
                    <span
                      className={`${
                        isLoadingCard
                          ? "text-gray-400"
                          : m.locked
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-yellow-600 hover:text-yellow-700"
                      } font-medium text-xs sm:text-sm`}
                    >
                      {ctaText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mock exam */}
          <div className="text-center mt-12 sm:mt-20">
            <div
              className="rounded-xl p-6 sm:p-8 max-w-md mx-auto cursor-pointer bg-white/95 text-[#1a1f36] border border-white/20"
              onClick={() => window.location.href = "/egemathbasic-mock"}
            >
              <img src={moduleImgs.mock} alt="Пробный экзамен" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6" />
              <h3 className="font-display text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Пробный экзамен</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Проверь свои знания перед настоящим ЕГЭ</p>
              <button className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg font-semibold hover:shadow-lg transition-all text-sm sm:text-base">
                Начать экзамен
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Progress */}
      <section id="progress" className="py-12 sm:py-20 bg-[#1a1f36]/50">
        <div className="relative z-20 max-w-7xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="font-display text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">
              Твой прогресс
            </h2>
            <p className="text-base sm:text-xl text-gray-300">Отслеживай свое развитие и достижения</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Overall Progress */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 relative">
                <svg className="w-20 h-20 sm:w-24 sm:h-24" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="40" cy="40" r="32" stroke="#e5e7eb" strokeWidth="5" fill="none" className="sm:hidden" />
                  <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="6" fill="none" className="hidden sm:block" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="32" 
                    stroke="#f59e0b" 
                    strokeWidth="5" 
                    fill="none"
                    className="sm:hidden"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - overallProgress / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    stroke="#f59e0b" 
                    strokeWidth="6" 
                    fill="none"
                    className="hidden sm:block"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallProgress / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-bold">{overallProgress}%</span>
                </div>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-2">Общий прогресс</h3>
              <p className="text-sm sm:text-base text-gray-300">{completedCount} из 8 модулей завершено</p>
            </div>

            {/* Badges */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center">Достижения</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-yellow-500 to-emerald-500 rounded-lg p-2 sm:p-3 text-center animate-pulse">
                  <div className="text-xl sm:text-2xl mb-1">🏆</div>
                  <div className="text-xs">Первый модуль</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-emerald-500 rounded-lg p-2 sm:p-3 text-center animate-pulse">
                  <div className="text-xl sm:text-2xl mb-1">⭐</div>
                  <div className="text-xs">Отличник</div>
                </div>
                <div className="bg-gray-600 rounded-lg p-2 sm:p-3 text-center opacity-50">
                  <div className="text-xl sm:text-2xl mb-1">🎯</div>
                  <div className="text-xs">Все модули</div>
                </div>
                <div className="bg-gray-600 rounded-lg p-2 sm:p-3 text-center opacity-50">
                  <div className="text-xl sm:text-2xl mb-1">🚀</div>
                  <div className="text-xs">Экзамен</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center">Статистика</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base"><span className="text-gray-300">Дней подряд</span><span className="font-bold text-yellow-500">{stats.streak}</span></div>
                <div className="flex justify-between text-sm sm:text-base"><span className="text-gray-300">Решено задач</span><span className="font-bold text-emerald-500">{stats.solvedProblems}</span></div>
                <div className="flex justify-between text-sm sm:text-base"><span className="text-gray-300">Правильных ответов</span><span className="font-bold text-yellow-500">{stats.correctAnswers}%</span></div>
                <div className="flex justify-between text-sm sm:text-base"><span className="text-gray-300">Время обучения</span><span className="font-bold text-emerald-500">{Math.floor(stats.studyTime)}ч {Math.round((stats.studyTime % 1) * 60)}м</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default PlatformOgeb;

