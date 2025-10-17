import React, { useMemo, useState, useEffect } from "react";
import { LayoutGrid, ListOrdered, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * EGE Basic Progress — Minimal, Spacious Preview with Real Data
 */

// ---------- Types ----------
export type ModuleItem = {
  id: number;
  title: string;
  progress: number;
  mastered: number;
  total: number;
};
export type ProblemItem = {
  key: string;
  label: string;
  progress: number;
};
export type SkillItem = {
  id: string;
  label: string;
  progress: number;
};

// Topic names mapping for EGE Basic
const TOPIC_NAMES: {
  [key: string]: string;
} = {
  '1.1': 'Натуральные и целые числа',
  '1.2': 'Дроби и проценты',
  '1.3': 'Арифметический корень (n-й)',
  '1.4': 'Степени',
  '1.5': 'Тригонометрические функции (sin, cos, tg) как числа',
  '1.6': 'Логарифм числа',
  '1.7': 'Действительные числа',
  '1.8': 'Преобразование выражений',
  '2.1': 'Целые и дробно-рациональные уравнения',
  '2.2': 'Иррациональные уравнения',
  '2.3': 'Тригонометрические уравнения',
  '2.4': 'Показательные и логарифмические уравнения',
  '2.5': 'Целые и дробно-рациональные неравенства',
  '2.6': 'Иррациональные неравенства',
  '2.7': 'Показательные и логарифмические неравенства',
  '2.9': 'Системы и совокупности уравнений и неравенств',
  '3.1': 'Функции',
  '3.2': 'Свойства функции',
  '3.3': 'Степенная функция',
  '3.4': 'Тригонометрические функции',
  '3.5': 'Показательная и логарифмическая функции',
  '3.7': 'Последовательности',
  '3.8': 'Арифметическая и геометрическая прогрессии. Формула сложных процентов',
  '4.1': 'Производная функции',
  '4.2': 'Применение производной к исследованию функций',
  '4.3': 'Первообразная. Интеграл',
  '5.1': 'Множества. Диаграммы Эйлера–Венна',
  '5.2': 'Логика',
  '6.1': 'Описательная статистика',
  '6.2': 'Вероятность',
  '7.1': 'Фигуры на плоскости',
  '7.2': 'Прямые и плоскости в пространстве',
  '7.3': 'Многогранники',
  '8.1': 'Чтение и анализ графических схем',
  '8.2': 'Прикладные задачи'
};

interface ProgressData {
  [key: string]: number;
}

// ---------- Utils ----------
const clamp01 = (n: number) => Math.min(100, Math.max(0, n));
const hueForProgress = (p: number) => Math.round(clamp01(p) / 100 * 120); // 0=red→120=green
const statusText = (p: number) => p >= 100 ? "Готово!" : p >= 80 ? "Почти мастер" : p >= 40 ? "В процессе" : "Начни здесь";
function Radial({
  value,
  size = 60
}: {
  value: number;
  size?: number;
}) {
  const angle = clamp01(value) * 3.6;
  const hue = hueForProgress(value);
  const ringColor = `hsl(${hue} 72% 44%)`;
  return <div className="relative rounded-full" style={{
    width: size,
    height: size,
    background: `conic-gradient(${ringColor} ${angle}deg, #eceef1 0deg)`
  }} aria-label={`Прогресс ${Math.round(value)}%`}>
      <div className="absolute inset-[12%] rounded-full bg-white/90 grid place-items-center text-[11px] font-semibold text-gray-800">
        {Math.round(value)}%
      </div>
    </div>;
}
function LegendItem({
  label,
  mid
}: {
  label: string;
  mid: number;
}) {
  const hue = hueForProgress(mid);
  return <span className="inline-flex items-center gap-2 text-[11px] text-gray-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{
      backgroundColor: `hsl(${hue} 72% 44%)`
    }} />
      {label}
    </span>;
}

// ---------- Placeholders ----------
const PLACEHOLDER_MODULES: ModuleItem[] = [{
  id: 1,
  title: "Числа и вычисления",
  progress: 0,
  mastered: 0,
  total: 0
}, {
  id: 2,
  title: "Уравнения и неравенства",
  progress: 0,
  mastered: 0,
  total: 0
}, {
  id: 3,
  title: "Функции и графики",
  progress: 0,
  mastered: 0,
  total: 0
}, {
  id: 4,
  title: "Начала математического анализа",
  progress: 0,
  mastered: 0,
  total: 0
}, {
  id: 5,
  title: "Множества и логика",
  progress: 0,
  mastered: 0,
  total: 0
}, {
  id: 6,
  title: "Вероятность и статистика",
  progress: 0,
  mastered: 0,
  total: 0
}, {
  id: 7,
  title: "Геометрия",
  progress: 0,
  mastered: 0,
  total: 0
}, {
  id: 8,
  title: "Применение математики к прикладным задачам",
  progress: 0,
  mastered: 0,
  total: 0
}];
const PLACEHOLDER_PROBLEMS: ProblemItem[] = (() => {
  const arr: ProblemItem[] = [];
  for (let n = 1; n <= 21; n++) arr.push({
    key: String(n),
    label: String(n),
    progress: 0
  });
  return arr;
})();

// ---------- Skeletons ----------
function SkeletonBar() {
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full w-1/3 animate-pulse rounded-full bg-gray-300" /></div>;
}
function ModuleCardSkeleton({
  title
}: {
  title: string;
}) {
  return <div className="relative rounded-2xl border border-gray-200 bg-white/90 p-4">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 animate-pulse rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-gray-400">{title}</h3>
          <div className="mt-2"><SkeletonBar /></div>
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>;
}
function ProblemCardSkeleton({
  label
}: {
  label: string;
}) {
  return <div className="rounded-xl border border-gray-200 bg-white/90 p-2.5">
      <div className="flex items-center justify-center mb-2">
        <span className="text-[12px] font-medium text-gray-400">№ {label}</span>
      </div>
      <div className="grid place-items-center mb-2">
        <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
      </div>
      <div className="mb-1"><SkeletonBar /></div>
      <div className="h-2 w-16 animate-pulse rounded bg-gray-200 mx-auto" />
    </div>;
}

// ---------- Topic Progress Modal ----------
function TopicProgressModal({
  isOpen,
  onClose,
  module,
  topicProgress,
  moduleDefinitions
}: {
  isOpen: boolean;
  onClose: () => void;
  module: ModuleItem | null;
  topicProgress: {
    [key: string]: number;
  };
  moduleDefinitions: Array<{
    id: number;
    name: string;
    topicCodes: string[];
  }>;
}) {
  if (!isOpen || !module) return null;
  const moduleDefinition = moduleDefinitions.find(m => m.id === module.id);
  const topics = moduleDefinition?.topicCodes || [];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{module.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="space-y-3">
          {topics.map(topicCode => {
          const progress = topicProgress[topicCode] || 0;
          const hue = hueForProgress(progress);
          const ringColor = `hsl(${hue} 72% 44%)`;
          return <div key={topicCode} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{TOPIC_NAMES[topicCode] || `Тема ${topicCode}`}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{
                  width: `${progress}%`,
                  backgroundColor: ringColor
                }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-10 text-right">{progress}%</span>
                </div>
              </div>;
        })}
        </div>
      </div>
    </div>;
}

// ---------- Components ----------
function ModuleCard({
  m,
  onClick
}: {
  m: ModuleItem;
  onClick?: () => void;
}) {
  const ring = `hsl(${hueForProgress(m.progress)} 72% 44%)`;
  return <div className="group relative rounded-2xl border border-gray-200 bg-white/90 p-4 hover:border-gray-300 transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex items-start gap-4">
        <Radial value={m.progress} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-gray-900">{m.title}</h3>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full" style={{
            width: `${m.progress}%`,
            backgroundColor: ring
          }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-gray-600">
            <span>Освоено: <b>{m.mastered}</b>/<b>{m.total}</b></span>
            <span className="opacity-70">{statusText(m.progress)}</span>
          </div>
        </div>
      </div>
    </div>;
}
function ModuleView({
  modules,
  topicProgress,
  moduleDefinitions
}: {
  modules: ModuleItem[];
  topicProgress: {
    [key: string]: number;
  };
  moduleDefinitions: Array<{
    id: number;
    name: string;
    topicCodes: string[];
  }>;
}) {
  const hasRealData = modules.some(m => m.progress > 0 || m.total > 0 || m.mastered > 0);
  const [sortByLow, setSortByLow] = useState(false);
  const [onlyNeedsWork, setOnlyNeedsWork] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const list = useMemo(() => {
    let arr = [...modules];
    if (onlyNeedsWork) arr = arr.filter(m => m.progress < 80);
    arr.sort((a, b) => sortByLow ? a.progress - b.progress : a.id - b.id);
    return arr;
  }, [modules, sortByLow, onlyNeedsWork]);
  const handleModuleClick = (module: ModuleItem) => {
    setSelectedModule(module);
    setIsModalOpen(true);
  };
  return <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setOnlyNeedsWork(v => !v)} className="rounded-xl border px-3 py-1.5 text-[13px] hover:bg-gray-50">
            {onlyNeedsWork ? "Показать все" : "Только < 80%"}
          </button>
          <button onClick={() => setSortByLow(v => !v)} className="rounded-xl border px-3 py-1.5 text-[13px] hover:bg-gray-50">
            {sortByLow ? "Сортировать: снизу вверх" : "Сортировать: сверху вниз"}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-gray-600">
          <LegendItem label="< 40%" mid={20} />
          <LegendItem label="40–79%" mid={60} />
          <LegendItem label="80–99%" mid={90} />
          <LegendItem label="100%" mid={100} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {hasRealData ? list.map(m => <ModuleCard key={m.id} m={m} onClick={() => handleModuleClick(m)} />) : PLACEHOLDER_MODULES.map(m => <ModuleCardSkeleton key={m.id} title={m.title} />)}
      </div>

      <TopicProgressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} module={selectedModule} topicProgress={topicProgress} moduleDefinitions={moduleDefinitions} />
    </div>;
}
function ProblemView({
  problems
}: {
  problems: ProblemItem[];
}) {
  const hasRealData = problems.some(p => p.progress > 0);
  const [showOnlyNeedsWork, setShowOnlyNeedsWork] = useState(false);
  const filtered = useMemo(() => showOnlyNeedsWork ? problems.filter(i => i.progress < 80) : problems, [problems, showOnlyNeedsWork]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") setShowOnlyNeedsWork(v => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setShowOnlyNeedsWork(v => !v)} className="rounded-xl border px-3 py-1.5 text-[13px] hover:bg-gray-50" title="Клавиша F — переключить фильтр">
          {showOnlyNeedsWork ? "Показать все" : "Только < 80%"}
        </button>
        <div className="flex flex-wrap gap-4 text-gray-600">
          <LegendItem label="< 40%" mid={20} />
          <LegendItem label="40–79%" mid={60} />
          <LegendItem label="80–99%" mid={90} />
          <LegendItem label="100%" mid={100} />
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4">
        {hasRealData ? filtered.map(it => <div key={it.key} className="rounded-xl border border-gray-200 bg-white/90 p-2.5 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-[12px] font-medium text-gray-800">№ {it.label}</span>
                </div>
                <div className="grid place-items-center mb-2">
                  <Radial value={it.progress} size={48} />
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 mb-1">
                  <div className="h-full rounded-full" style={{
            width: `${it.progress}%`,
            backgroundColor: `hsl(${hueForProgress(it.progress)} 72% 44%)`
          }} />
                </div>
                <div className="text-center text-[10px] text-gray-500">{statusText(it.progress)}</div>
              </div>) : PLACEHOLDER_PROBLEMS.map(it => <ProblemCardSkeleton key={it.key} label={it.label} />)}
      </div>
    </div>;
}

// ---------- Skills View ----------
function SkillView({
  skills
}: {
  skills: SkillItem[];
}) {
  const hasRealData = skills.some(s => s.progress > 0);
  const [showOnlyNeedsWork, setShowOnlyNeedsWork] = useState(false);
  const filtered = useMemo(() => showOnlyNeedsWork ? skills.filter(s => s.progress < 80) : skills, [skills, showOnlyNeedsWork]);
  return <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setShowOnlyNeedsWork(v => !v)} className="rounded-xl border px-3 py-1.5 text-[13px] hover:bg-gray-50">
          {showOnlyNeedsWork ? "Показать все" : "Только < 80%"}
        </button>
        <div className="flex flex-wrap gap-4 text-gray-600">
          <LegendItem label="< 40%" mid={20} />
          <LegendItem label="40–79%" mid={60} />
          <LegendItem label="80–99%" mid={90} />
          <LegendItem label="100%" mid={100} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {hasRealData ? filtered.map(skill => <div key={skill.id} className="rounded-xl border border-gray-200 bg-white/90 p-3 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-[12px] font-medium text-gray-800">Навык {skill.label}</span>
                </div>
                <div className="grid place-items-center mb-2">
                  <Radial value={skill.progress} size={48} />
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 mb-1">
                  <div className="h-full rounded-full" style={{
            width: `${skill.progress}%`,
            backgroundColor: `hsl(${hueForProgress(skill.progress)} 72% 44%)`
          }} />
                </div>
                <div className="text-center text-[10px] text-gray-500">{statusText(skill.progress)}</div>
              </div>) : Array.from({
        length: 20
      }, (_, i) => <div key={i} className="rounded-xl border border-gray-200 bg-white/90 p-3">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-[12px] font-medium text-gray-400">Навык {i + 1}</span>
                </div>
                <div className="grid place-items-center mb-2">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
                </div>
                <SkeletonBar />
                <div className="h-2 w-16 animate-pulse rounded bg-gray-200 mx-auto mt-1" />
              </div>)}
      </div>
    </div>;
}

// ---------- Sticky Tab Bar ----------
function TabBar({
  mode,
  setMode
}: {
  mode: "module" | "problem" | "skill";
  setMode: (m: "module" | "problem" | "skill") => void;
}) {
  return <div className="sticky top-0 z-30 -mx-4 sm:mx-0 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/95 border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center gap-2 py-3">
          <nav className="relative inline-flex rounded-xl border bg-white shadow-sm">
            <button onClick={() => setMode("module")} className={`flex items-center gap-2 px-3 py-2 text-[13px] ${mode === "module" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}`} aria-pressed={mode === "module"}>
              <LayoutGrid className="h-4 w-4" /> Модули
            </button>
            <button onClick={() => setMode("problem")} className={`flex items-center gap-2 px-3 py-2 text-[13px] ${mode === "problem" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}`} aria-pressed={mode === "problem"}>
              <ListOrdered className="h-4 w-4" /> Задания
            </button>
            <button onClick={() => setMode("skill")} className={`flex items-center gap-2 px-3 py-2 text-[13px] ${mode === "skill" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}`} aria-pressed={mode === "skill"}>
              <ListOrdered className="h-4 w-4" /> Навыки
            </button>
          </nav>
        </div>
      </div>
    </div>;
}

// ---------- Data Fetching Hook ----------
function useEgemathbasicProgressData() {
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [topicProgress, setTopicProgress] = useState<{
    [key: string]: number;
  }>({});
  const [refreshing, setRefreshing] = useState(false);
  const moduleDefinitions = [{
    id: 1,
    name: 'Числа и вычисления',
    topicCodes: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8']
  }, {
    id: 2,
    name: 'Уравнения и неравенства',
    topicCodes: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.9']
  }, {
    id: 3,
    name: 'Функции и графики',
    topicCodes: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.7', '3.8']
  }, {
    id: 4,
    name: 'Начала математического анализа',
    topicCodes: ['4.1', '4.2', '4.3']
  }, {
    id: 5,
    name: 'Множества и логика',
    topicCodes: ['5.1', '5.2']
  }, {
    id: 6,
    name: 'Вероятность и статистика',
    topicCodes: ['6.1', '6.2']
  }, {
    id: 7,
    name: 'Геометрия',
    topicCodes: ['7.1', '7.2', '7.3']
  }, {
    id: 8,
    name: 'Применение математики к прикладным задачам',
    topicCodes: ['8.1', '8.2']
  }];

  // Function to load from cached snapshots
  const loadFromSnapshot = async () => {
    if (!user) return false;
    try {
      const {
        data: snapshot,
        error
      } = await supabase.from('mastery_snapshots').select('raw_data').eq('user_id', user.id).eq('course_id', '2').order('run_timestamp', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error || !snapshot?.raw_data) {
        console.log('No snapshot found, using default 1% values');
        return false;
      }
      const rawData = snapshot.raw_data as any[];
      console.log('Loaded from snapshot:', rawData);

      // Parse the snapshot data
      const topicProgressMap: {
        [key: string]: number;
      } = {};
      const problemsData: ProblemItem[] = [];
      const skillsData: SkillItem[] = [];
      rawData.forEach((item: any) => {
        if (item.topic && !item.topic.includes('задача ФИПИ') && !item.topic.includes('навык')) {
          const topicMatch = item.topic.match(/^(\d+\.\d+)/);
          if (topicMatch) {
            const topicCode = topicMatch[1];
            topicProgressMap[topicCode] = Math.round(item.prob * 100);
          }
        } else if (item['задача ФИПИ']) {
          problemsData.push({
            key: item['задача ФИПИ'],
            label: item['задача ФИПИ'],
            progress: Math.round(item.prob * 100)
          });
        } else if (item['навык']) {
          skillsData.push({
            id: item['навык'],
            label: item['навык'],
            progress: Math.round(item.prob * 100)
          });
        }
      });
      setTopicProgress(topicProgressMap);

      const modulesData: ModuleItem[] = moduleDefinitions.map(moduleDef => {
        const moduleTopics = moduleDef.topicCodes;
        let totalProgress = 0;
        let validTopics = 0;
        moduleTopics.forEach(topicCode => {
          if (topicProgressMap[topicCode] !== undefined) {
            totalProgress += topicProgressMap[topicCode];
            validTopics++;
          }
        });
        const progress = validTopics > 0 ? Math.round(totalProgress / validTopics) : 1;
        const mastered = moduleTopics.filter(code => (topicProgressMap[code] || 0) >= 80).length;
        const total = moduleTopics.length;
        return {
          id: moduleDef.id,
          title: moduleDef.name,
          progress,
          mastered,
          total
        };
      });
      setProblems(problemsData.length > 0 ? problemsData : PLACEHOLDER_PROBLEMS.map(p => ({
        ...p,
        progress: 1
      })));
      setModules(modulesData);
      setSkills(skillsData.length > 0 ? skillsData : Array.from({
        length: 20
      }, (_, i) => ({
        id: String(i + 1),
        label: String(i + 1),
        progress: 1
      })));
      return true;
    } catch (err) {
      console.error('Error loading from snapshot:', err);
      return false;
    }
  };

  // Function to recalculate progress
  const recalculateProgress = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      setError(null);

      const response = await supabase.functions.invoke('student-progress-calculate', {
        body: {
          user_id: user.id,
          course_id: '2'
        }
      });
      if (response.error) {
        throw new Error('Ошибка загрузки прогресса');
      }
      const progressData = response.data || [];
      console.log('Recalculated progress data:', progressData);

      const topicProgressMap: {
        [key: string]: number;
      } = {};
      const problemsData: ProblemItem[] = [];
      const skillsData: SkillItem[] = [];
      progressData.forEach((item: any) => {
        if (item.topic && !item.topic.includes('задача ФИПИ') && !item.topic.includes('навык')) {
          const topicMatch = item.topic.match(/^(\d+\.\d+)/);
          if (topicMatch) {
            const topicCode = topicMatch[1];
            topicProgressMap[topicCode] = Math.round(item.prob * 100);
          }
        } else if (item['задача ФИПИ']) {
          problemsData.push({
            key: item['задача ФИПИ'],
            label: item['задача ФИПИ'],
            progress: Math.round(item.prob * 100)
          });
        } else if (item['навык']) {
          skillsData.push({
            id: item['навык'],
            label: item['навык'],
            progress: Math.round(item.prob * 100)
          });
        }
      });
      setTopicProgress(topicProgressMap);

      const modulesData: ModuleItem[] = moduleDefinitions.map(moduleDef => {
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
        const mastered = moduleTopics.filter(code => (topicProgressMap[code] || 0) >= 80).length;
        const total = moduleTopics.length;
        return {
          id: moduleDef.id,
          title: moduleDef.name,
          progress,
          mastered,
          total
        };
      });
      setProblems(problemsData);
      setModules(modulesData);
      setSkills(skillsData);

      await insertMasterySnapshot(progressData);
    } catch (err) {
      console.error('Error recalculating progress data:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
    } finally {
      setRefreshing(false);
    }
  };

  // Function to compute summary from progress data
  const computeSummary = (progressData: any[]) => {
    try {
      const summary = [];
      const probabilities = [];

      if (Array.isArray(progressData)) {
        for (const item of progressData) {
          if (item.topic && typeof item.prob === 'number') {
            summary.push({
              topic: item.topic,
              prob: item.prob
            });
            probabilities.push(item.prob);
          }
        }
      }

      const general_progress = probabilities.length > 0 ? probabilities.reduce((sum, prob) => sum + prob, 0) / probabilities.length : 0;

      summary.unshift({
        general_progress
      });
      return summary;
    } catch (error) {
      console.error('Error computing summary:', error);
      return [{
        general_progress: 0
      }];
    }
  };

  // Function to insert mastery snapshot
  const insertMasterySnapshot = async (progressData: any[]) => {
    if (!user) return;
    try {
      const raw_data = progressData;
      const computed_summary = computeSummary(progressData);
      const {
        error: insertError
      } = await supabase.from('mastery_snapshots').insert({
        user_id: user.id,
        course_id: '2',
        raw_data,
        computed_summary
      });
      if (insertError) {
        console.error('Error inserting mastery snapshot:', insertError);
      }
    } catch (err) {
      console.error('Error in insertMasterySnapshot:', err);
    }
  };

  // Load initial data
  const loadInitialData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const loadedFromSnapshot = await loadFromSnapshot();
      if (!loadedFromSnapshot) {
        const defaultTopicProgress: {
          [key: string]: number;
        } = {};
        moduleDefinitions.forEach(module => {
          module.topicCodes.forEach(code => {
            defaultTopicProgress[code] = 1;
          });
        });
        setTopicProgress(defaultTopicProgress);
        const defaultModules = moduleDefinitions.map(moduleDef => ({
          id: moduleDef.id,
          title: moduleDef.name,
          progress: 1,
          mastered: 0,
          total: moduleDef.topicCodes.length
        }));
        setModules(defaultModules);
        setProblems(PLACEHOLDER_PROBLEMS.map(p => ({
          ...p,
          progress: 1
        })));
        setSkills(Array.from({
          length: 20
        }, (_, i) => ({
          id: String(i + 1),
          label: String(i + 1),
          progress: 1
        })));
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);
  return {
    modules,
    problems,
    skills,
    loading,
    error,
    refreshing,
    recalculateProgress,
    topicProgress,
    moduleDefinitions
  };
}

// ---------- Page Shell ----------
export default function EgemathbasicProgress2() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"module" | "problem" | "skill">("module");
  const {
    modules,
    problems,
    skills,
    loading,
    error,
    refreshing,
    recalculateProgress,
    topicProgress,
    moduleDefinitions
  } = useEgemathbasicProgressData();
  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 h-16 w-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin mx-auto" style={{
            animationDirection: 'reverse',
            animationDuration: '0.8s'
          }}></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900 animate-pulse">Загружаем ваш прогресс</p>
            <div className="flex items-center justify-center space-x-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{
              animationDelay: '0ms'
            }}></div>
              <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{
              animationDelay: '150ms'
            }}></div>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce" style={{
              animationDelay: '300ms'
            }}></div>
            </div>
          </div>
        </div>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button onClick={() => navigate('/egemathbasic-progress')} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
            Вернуться к старой версии
          </button>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-center">
            <button onClick={recalculateProgress} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-slate-950 hover:bg-slate-800 font-bold rounded-sm">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Обновление...' : 'Обновить прогресс'}</span>
            </button>
            <button onClick={() => navigate('/egemathbasic')} className="absolute left-0 flex items-center gap-2 transition-colors text-lg font-normal rounded-md bg-slate-50 text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              <span>Назад</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        <TabBar mode={mode} setMode={setMode} />

        <main className="py-8 space-y-10">
          {mode === "module" ? <ModuleView modules={modules} topicProgress={topicProgress} moduleDefinitions={moduleDefinitions} /> : mode === "problem" ? <ProblemView problems={problems} /> : <SkillView skills={skills} />}
        </main>

        <footer className="pb-16 pt-4 text-[12px] text-gray-500">
          Новый дизайн страницы прогресса. Данные взяты из реального API.
        </footer>
      </div>
    </div>;
}