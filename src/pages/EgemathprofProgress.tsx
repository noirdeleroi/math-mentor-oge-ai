import React, { useMemo, useState, useEffect } from "react";
import { LayoutGrid, ListOrdered, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import FlyingMathBackground from '@/components/FlyingMathBackground';

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

// ---------- Прокачка Types ----------
export type ParsedSnapshot = {
  date: Date;
  timestamp: string;
  general_progress: number;
  fipi_tasks: { id: string; prob: number }[];
  topics: { topic: string; prob: number }[];
};

export type Period = '7d' | '30d' | 'all';
export type AnalyticsMode = 'modules' | 'tasks' | 'topics';

export type TrendItem = {
  id: string;
  label: string;
  currentPercent: number;
  delta: number;
  sparklineData: number[];
};

// Topic names mapping for EGE Prof
const TOPIC_NAMES: { [key: string]: string } = {
  '1.1': 'Натуральные и целые числа',
  '1.2': 'Дроби и проценты',
  '1.3': 'Арифметический корень (n-й)',
  '1.4': 'Степени',
  '1.5': 'Тригонометрические функции (sin, cos, tg) как числа',
  '1.6': 'Логарифм числа',
  '1.7': 'Действительные числа',
  '1.8': 'Преобразование выражений',
  '1.9': 'Комплексные числа',
  '2.1': 'Целые и дробно-рациональные уравнения',
  '2.2': 'Иррациональные уравнения',
  '2.3': 'Тригонометрические уравнения',
  '2.4': 'Показательные и логарифмические уравнения',
  '2.5': 'Целые и дробно-рациональные неравенства',
  '2.6': 'Иррациональные неравенства',
  '2.7': 'Показательные и логарифмические неравенства',
  '2.8': 'Тригонометрические неравенства',
  '2.9': 'Системы и совокупности уравнений и неравенств',
  '2.10': 'Уравнения, неравенства и системы с параметрами',
  '2.11': 'Матрица системы линейных уравнений',
  '2.12': 'Графические методы решения уравнений и неравенств',
  '3.1': 'Функции',
  '3.2': 'Свойства функции',
  '3.3': 'Степенная функция',
  '3.4': 'Тригонометрические функции',
  '3.5': 'Показательная и логарифмическая функции',
  '3.6': 'Непрерывность функций и асимптоты',
  '3.7': 'Последовательности',
  '3.8': 'Арифметическая и геометрическая прогрессии. Формула сложных процентов',
  '4.1': 'Производная функции',
  '4.2': 'Применение производной к исследованию функций',
  '4.3': 'Первообразная. Интеграл',
  '5.1': 'Множества. Диаграммы Эйлера–Венна',
  '5.2': 'Логика',
  '6.1': 'Описательная статистика',
  '6.2': 'Вероятность',
  '6.3': 'Комбинаторика',
  '7.1': 'Фигуры на плоскости',
  '7.2': 'Прямые и плоскости в пространстве',
  '7.3': 'Многогранники',
  '7.4': 'Тела и поверхности вращения',
  '7.5': 'Координаты и векторы',
  '8.1': 'Чтение и анализ графических схем',
  '8.2': 'Прикладные задачи'
};

interface ProgressData {
  [key: string]: number;
}

// ---------- Utils ----------
const clamp01 = (n: number) => Math.min(100, Math.max(0, n));
const hueForProgress = (p: number) => Math.round(clamp01(p) / 100 * 120);
const statusText = (p: number) => p >= 100 ? "Готово!" : p >= 80 ? "Почти мастер" : p >= 40 ? "В процессе" : "Начни здесь";

// ---------- Прокачка Utils ----------
function parseSnapshot(snapshot: any): ParsedSnapshot {
  const rawData = snapshot.raw_data || [];
  const computedSummary = snapshot.computed_summary || [];
  
  const fipi_tasks: { id: string; prob: number }[] = [];
  const topics: { topic: string; prob: number }[] = [];
  let general_progress = 0;

  const generalItem = computedSummary.find((item: any) => item.general_progress !== undefined);
  if (generalItem) {
    general_progress = generalItem.general_progress;
  }

  rawData.forEach((item: any) => {
    if (item['задача ФИПИ']) {
      fipi_tasks.push({
        id: String(item['задача ФИПИ']),
        prob: item.prob || 0
      });
    }
  });

  computedSummary.forEach((item: any) => {
    if (item.topic && !item.topic.includes('задача ФИПИ') && !item.topic.includes('навык')) {
      topics.push({
        topic: item.topic,
        prob: item.prob || 0
      });
    }
  });

  return {
    date: new Date(snapshot.run_timestamp),
    timestamp: snapshot.run_timestamp,
    general_progress,
    fipi_tasks,
    topics
  };
}

function groupByDate(snapshots: ParsedSnapshot[], period: Period): ParsedSnapshot[] {
  if (period === 'all') return snapshots;
  
  const now = new Date();
  const cutoffDate = new Date();
  
  if (period === '7d') {
    cutoffDate.setDate(now.getDate() - 7);
  } else if (period === '30d') {
    cutoffDate.setDate(now.getDate() - 30);
  }
  
  return snapshots.filter(s => s.date >= cutoffDate);
}

function getAverageProgress(snapshots: ParsedSnapshot[], mode: AnalyticsMode): number[] {
  return snapshots.map(snapshot => {
    if (mode === 'modules') {
      return snapshot.general_progress * 100;
    } else if (mode === 'tasks') {
      const tasks = snapshot.fipi_tasks;
      if (tasks.length === 0) return 0;
      const avg = tasks.reduce((sum, task) => sum + task.prob, 0) / tasks.length;
      return avg * 100;
    } else {
      const topics = snapshot.topics;
      if (topics.length === 0) return 0;
      const avg = topics.reduce((sum, topic) => sum + topic.prob, 0) / topics.length;
      return avg * 100;
    }
  });
}

function computeDelta(series: number[]): number {
  if (series.length < 2) return 0;
  const first = series[0];
  const last = series[series.length - 1];
  return last - first;
}

function topKByDelta(items: TrendItem[], k: number, ascending: boolean): TrendItem[] {
  const sorted = [...items].sort((a, b) => ascending ? a.delta - b.delta : b.delta - a.delta);
  return sorted.slice(0, k);
}

function getItemTimeSeries(snapshots: ParsedSnapshot[], itemId: string, mode: AnalyticsMode): number[] {
  return snapshots.map(snapshot => {
    if (mode === 'tasks') {
      const task = snapshot.fipi_tasks.find(t => t.id === itemId);
      return task ? task.prob * 100 : 0;
    } else {
      const topic = snapshot.topics.find(t => t.topic === itemId);
      return topic ? topic.prob * 100 : 0;
    }
  });
}

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
      <div className="absolute inset-[12%] rounded-full bg-white/95 grid place-items-center text-[11px] font-semibold text-gray-800">
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
  return <div className="relative rounded-2xl border border-white/20 bg-white/95 p-4">
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
  return <div className="rounded-xl border border-white/20 bg-white/95 p-2.5">
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
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{module.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
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
  return <div className="group relative rounded-2xl border border-white/20 bg-white/95 p-4 hover:border-white/30 transition-colors cursor-pointer" onClick={onClick}>
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
        {hasRealData ? filtered.map(it => <div key={it.key} className="rounded-xl border border-white/20 bg-white/95 p-2.5 hover:border-white/30 transition-colors">
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
        {hasRealData ? filtered.map(skill => <div key={skill.id} className="rounded-xl border border-white/20 bg-white/95 p-3 hover:border-white/30 transition-colors">
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
      }, (_, i) => <div key={i} className="rounded-xl border border-white/20 bg-white/95 p-3">
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

// ---------- Прокачка UI Components ----------

function PeriodToggle({ 
  period, 
  onChange 
}: { 
  period: Period; 
  onChange: (p: Period) => void;
}) {
  const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7д' },
    { value: '30d', label: '30д' },
    { value: 'all', label: 'Все' }
  ];
  
  return (
    <div className="inline-flex rounded-lg border border-white/20 bg-white/10 backdrop-blur p-1 gap-1">
      {periods.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            period === p.value 
              ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 text-white shadow-lg' 
              : 'text-black hover:bg-white/20'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function ModeSwitch({ 
  mode, 
  onChange 
}: { 
  mode: AnalyticsMode; 
  onChange: (m: AnalyticsMode) => void;
}) {
  const modes: { value: AnalyticsMode; label: string }[] = [
    { value: 'modules', label: 'Модули' },
    { value: 'tasks', label: 'Задачи' },
    { value: 'topics', label: 'Темы' }
  ];
  
  return (
    <div className="inline-flex rounded-lg border border-white/20 bg-white/10 backdrop-blur p-1 gap-1">
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            mode === m.value 
              ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 text-white shadow-lg' 
              : 'text-black hover:bg-white/20'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function MainChart({
  snapshots,
  mode,
  period,
  selectedItemId,
  selectedItemData,
  onPeriodChange,
  onModeChange
}: {
  snapshots: ParsedSnapshot[];
  mode: AnalyticsMode;
  period: Period;
  selectedItemId: string | null;
  selectedItemData: number[] | null;
  onPeriodChange: (p: Period) => void;
  onModeChange: (m: AnalyticsMode) => void;
}) {
  const filteredSnapshots = useMemo(() => groupByDate(snapshots, period), [snapshots, period]);
  
  const chartData = useMemo(() => {
    return filteredSnapshots.map((snapshot, index) => {
      let progress: number;
      
      if (selectedItemId && selectedItemData) {
        progress = selectedItemData[index] || 0;
      } else {
        progress = getAverageProgress([snapshot], mode)[0];
      }
      
      return {
        name: new Date(snapshot.date).toLocaleDateString('ru-RU', { 
          month: 'short', 
          day: 'numeric' 
        }),
        progress: Math.round(progress),
        index
      };
    });
  }, [filteredSnapshots, mode, selectedItemId, selectedItemData]);

  const delta = useMemo(() => {
    if (selectedItemId && selectedItemData) {
      return computeDelta(selectedItemData);
    } else {
      const series = getAverageProgress(filteredSnapshots, mode);
      return computeDelta(series);
    }
  }, [filteredSnapshots, mode, selectedItemId, selectedItemData]);

  const chartTitle = useMemo(() => {
    if (selectedItemId) {
      if (mode === 'tasks') {
        return `Задача ${selectedItemId}`;
      } else {
        const lastSnapshot = filteredSnapshots[filteredSnapshots.length - 1];
        if (lastSnapshot) {
          const topic = lastSnapshot.topics.find(t => t.topic === selectedItemId);
          if (topic) {
            const topicCode = topic.topic.match(/^(\d+\.\d+)/)?.[1] || topic.topic;
            return TOPIC_NAMES[topicCode] || topic.topic;
          }
        }
        return selectedItemId;
      }
    }
    return 'Общий прогресс';
  }, [selectedItemId, mode, filteredSnapshots]);

  if (filteredSnapshots.length < 2) {
    return (
      <div className="bg-white/95 rounded-2xl border border-white/20 p-12 text-center">
        <p className="text-gray-600 text-lg">
          Недостаточно данных для анализа прогресса. Вернитесь позже!
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Нужно минимум 2 снимка прогресса
        </p>
      </div>
    );
  }

  const deltaColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600';
  const deltaSign = delta > 0 ? '+' : '';
  const lineColor = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#6b7280';

  return (
    <div className="bg-white/95 rounded-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {chartTitle}
          </h3>
          <p className="text-sm text-gray-600">Динамика прогресса</p>
        </div>
        
        {/* Controls on the same line */}
        <div className="flex flex-wrap gap-3 items-end justify-end">
          <PeriodToggle period={period} onChange={onPeriodChange} />
          <ModeSwitch mode={mode} onChange={onModeChange} />
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500">Изменение</p>
          <p className={`text-2xl font-bold ${deltaColor}`}>
            {deltaSign}{Math.round(delta)}%
          </p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px'
            }}
            formatter={(value: number) => [`${value}%`, 'Прогресс']}
          />
          <ReferenceLine 
            y={70} 
            stroke="#f59e0b" 
            strokeDasharray="5 5"
            label={{ value: 'Цель 70%', position: 'right', fill: '#f59e0b', fontSize: 12 }}
          />
          <Area 
            type="monotone" 
            dataKey="progress" 
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#colorProgress)" 
          />
          <Line 
            type="monotone" 
            dataKey="progress" 
            stroke={lineColor}
            strokeWidth={3}
            dot={{ fill: lineColor, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendCard({
  label,
  currentPercent,
  delta,
  sparklineData,
  isSelected,
  onClick
}: TrendItem & {
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const deltaColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600';
  const borderColor = delta > 0 ? 'border-green-300' : delta < 0 ? 'border-red-300' : 'border-white/20';
  const bgColor = isSelected ? (delta > 0 ? 'bg-green-50' : delta < 0 ? 'bg-red-50' : 'bg-white/95') : 'bg-white/95';
  const deltaSign = delta > 0 ? '+' : '';
  const lineColor = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#6b7280';

  const miniData = sparklineData.map((value, index) => ({ index, value }));

  return (
    <div 
      onClick={onClick}
      className={`${bgColor} rounded-xl border-2 ${borderColor} p-4 hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{label}</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">{currentPercent}%</p>
        </div>
        <div className={`text-right ${deltaColor}`}>
          <p className="text-lg font-bold">{deltaSign}{Math.round(delta)}%</p>
        </div>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={miniData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={lineColor} 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SmallMultiples({
  snapshots,
  mode,
  period,
  selectedItemId,
  onSelectItem,
  onSelectGeneral
}: {
  snapshots: ParsedSnapshot[];
  mode: AnalyticsMode;
  period: Period;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onSelectGeneral: () => void;
}) {
  const filteredSnapshots = useMemo(() => groupByDate(snapshots, period), [snapshots, period]);

  const trendItems = useMemo(() => {
    if (filteredSnapshots.length < 2) return [];

    const items: TrendItem[] = [];
    const lastSnapshot = filteredSnapshots[filteredSnapshots.length - 1];

    if (mode === 'tasks') {
      lastSnapshot.fipi_tasks.forEach(task => {
        const series = getItemTimeSeries(filteredSnapshots, task.id, mode);
        const delta = computeDelta(series);
        items.push({
          id: task.id,
          label: `Задача ${task.id}`,
          currentPercent: Math.round(task.prob * 100),
          delta,
          sparklineData: series
        });
      });
    } else {
      lastSnapshot.topics.forEach(topic => {
        const series = getItemTimeSeries(filteredSnapshots, topic.topic, mode);
        const delta = computeDelta(series);
        const topicCode = topic.topic.match(/^(\d+\.\d+)/)?.[1] || topic.topic;
        const topicName = TOPIC_NAMES[topicCode] || topic.topic;
        items.push({
          id: topic.topic,
          label: topicName,
          currentPercent: Math.round(topic.prob * 100),
          delta,
          sparklineData: series
        });
      });
    }

    if (mode === 'tasks') {
      return items.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    }
    return items;
  }, [filteredSnapshots, mode]);

  if (filteredSnapshots.length < 2) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* General Progress Button */}
      <div>
            <button
          onClick={onSelectGeneral}
          className={`w-full px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
            selectedItemId === null
              ? 'bg-blue-50 border-blue-300 text-blue-900'
              : 'bg-white/95 border-white/20 text-gray-900 hover:border-blue-200'
          }`}
        >
          Общий прогресс
            </button>
          </div>

      {/* All Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {trendItems.map(item => (
          <TrendCard 
            key={item.id} 
            {...item}
            isSelected={selectedItemId === item.id}
            onClick={() => onSelectItem(item.id)}
          />
        ))}
        </div>
      </div>
    );
}

// ---------- Sticky Tab Bar ----------
function TabBar({
  mode,
  setMode
}: {
  mode: "module" | "problem" | "analytics";
  setMode: (m: "module" | "problem" | "analytics") => void;
}) {
  return <div className="inline-flex rounded-lg border border-white/20 bg-white/10 backdrop-blur p-1 gap-1">
    <button 
      onClick={() => setMode("module")} 
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
        mode === "module" 
          ? "bg-gradient-to-r from-yellow-500 to-emerald-500 text-white shadow-lg" 
          : "text-gray-300 hover:text-white hover:bg-white/10"
      }`} 
      aria-pressed={mode === "module"}
    >
      <LayoutGrid className="h-4 w-4" /> 
      <span className="hidden sm:inline">Модули</span>
      <span className="sm:hidden">Мод.</span>
    </button>

    <button 
      onClick={() => setMode("problem")} 
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
        mode === "problem" 
          ? "bg-gradient-to-r from-yellow-500 to-emerald-500 text-white shadow-lg" 
          : "text-gray-300 hover:text-white hover:bg-white/10"
      }`} 
      aria-pressed={mode === "problem"}
    >
      <ListOrdered className="h-4 w-4" /> 
      <span className="hidden sm:inline">Задания</span>
      <span className="sm:hidden">Зад.</span>
    </button>

    <button 
      onClick={() => setMode("analytics")} 
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
        mode === "analytics" 
          ? "bg-gradient-to-r from-yellow-500 to-emerald-500 text-white shadow-lg" 
          : "text-gray-300 hover:text-white hover:bg-white/10"
      }`} 
      aria-pressed={mode === "analytics"}
    >
      <RefreshCw className="h-4 w-4" /> 
      <span className="hidden sm:inline">Прокачка</span>
      <span className="sm:hidden">Проч.</span>
    </button>
  </div>;
}

// ---------- Прокачка Data Hook ----------
function useMasterySnapshots() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ParsedSnapshot[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchSnapshots = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('mastery_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', '3')
          .order('run_timestamp', { ascending: true });

        if (fetchError) throw fetchError;

        if (data) {
          const parsed = data.map(parseSnapshot);
          setSnapshots(parsed);
        }
      } catch (err) {
        console.error('Error fetching mastery snapshots:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, [user]);

  return { snapshots, loading, error };
}

// ---------- Data Fetching Hook ----------
function useEgemathprofProgressData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [topicProgress, setTopicProgress] = useState<{ [key: string]: number; }>({});
  const [refreshing, setRefreshing] = useState(false);
  const moduleDefinitions = [
    { id: 1, name: 'Числа и вычисления', topicCodes: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'] },
    { id: 2, name: 'Уравнения и неравенства', topicCodes: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12'] },
    { id: 3, name: 'Функции и графики', topicCodes: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'] },
    { id: 4, name: 'Начала математического анализа', topicCodes: ['4.1', '4.2', '4.3'] },
    { id: 5, name: 'Множества и логика', topicCodes: ['5.1', '5.2'] },
    { id: 6, name: 'Вероятность и статистика', topicCodes: ['6.1', '6.2', '6.3'] },
    { id: 7, name: 'Геометрия', topicCodes: ['7.1', '7.2', '7.3', '7.4'] },
    { id: 8, name: 'Применение математики к прикладным задачам', topicCodes: ['8.1', '8.2'] }
  ];

  const loadFromSnapshot = async () => {
    if (!user) return false;
    try {
      const { data: snapshot, error } = await supabase
        .from('mastery_snapshots')
        .select('raw_data')
        .eq('user_id', user.id)
        .eq('course_id', '3')
        .order('run_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !snapshot?.raw_data) {
        return false;
      }
      const rawData = snapshot.raw_data as any[];

      const topicProgressMap: { [key: string]: number; } = {};
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
      setProblems(problemsData.length > 0 ? problemsData : PLACEHOLDER_PROBLEMS.map(p => ({ ...p, progress: 1 })));
      setModules(modulesData);
      setSkills(skillsData.length > 0 ? skillsData : Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), label: String(i + 1), progress: 1 })));
      return true;
    } catch (err) {
      console.error('Error loading from snapshot:', err);
      return false;
    }
  };

  const recalculateProgress = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      setError(null);

      const response = await supabase.functions.invoke('student-progress-calculate', {
        body: { user_id: user.id, course_id: '3' }
      });
      if (response.error) {
        throw new Error('Ошибка загрузки прогресса');
      }
      const progressData = response.data || [];

      const topicProgressMap: { [key: string]: number; } = {};
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

  const computeSummary = (progressData: any[]) => {
    try {
      const summary = [] as any[];
      const probabilities = [] as number[];
      if (Array.isArray(progressData)) {
        for (const item of progressData) {
          if (item.topic && typeof item.prob === 'number') {
            summary.push({ topic: item.topic, prob: item.prob });
            probabilities.push(item.prob);
          }
        }
      }
      const general_progress = probabilities.length > 0 ? probabilities.reduce((sum, prob) => sum + prob, 0) / probabilities.length : 0;
      summary.unshift({ general_progress });
      return summary;
    } catch (error) {
      console.error('Error computing summary:', error);
      return [{ general_progress: 0 }];
    }
  };

  const insertMasterySnapshot = async (progressData: any[]) => {
    if (!user) return;
    try {
      const raw_data = progressData;
      const computed_summary = computeSummary(progressData);
      const { error: insertError } = await supabase.from('mastery_snapshots').insert({
        user_id: user.id,
        course_id: '3',
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

  const loadInitialData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const loadedFromSnapshot = await loadFromSnapshot();
      if (!loadedFromSnapshot) {
        const defaultTopicProgress: { [key: string]: number; } = {};
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
        setProblems(PLACEHOLDER_PROBLEMS.map(p => ({ ...p, progress: 1 })));
        setSkills(Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), label: String(i + 1), progress: 1 })));
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

// ---------- Progress Analytics View ----------
function ProgressAnalyticsView() {
  const [period, setPeriod] = useState<Period>('30d');
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>('modules');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { snapshots, loading, error } = useMasterySnapshots();

  const filteredSnapshots = useMemo(() => groupByDate(snapshots, period), [snapshots, period]);

  useMemo(() => {
    const series = getAverageProgress(filteredSnapshots, analyticsMode);
    return computeDelta(series);
  }, [filteredSnapshots, analyticsMode]);

  const selectedItemData = useMemo(() => {
    if (!selectedItemId || filteredSnapshots.length < 2) return null;
    return getItemTimeSeries(filteredSnapshots, selectedItemId, analyticsMode);
  }, [selectedItemId, filteredSnapshots, analyticsMode]);

  const handleModeChange = (newMode: AnalyticsMode) => {
    setAnalyticsMode(newMode);
    setSelectedItemId(null);
  };

  const handleSelectGeneral = () => {
    setSelectedItemId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Загружаем данные анализа...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-white/95 rounded-2xl border border-white/20 p-12 text-center">
        <p className="text-gray-600 text-lg">
          Данные о прогрессе еще не собраны. Начните решать задачи!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Chart - shows selected item or general progress */}
      <MainChart 
        snapshots={snapshots} 
        mode={analyticsMode} 
        period={period}
        selectedItemId={selectedItemId}
        selectedItemData={selectedItemData}
        onPeriodChange={setPeriod}
        onModeChange={handleModeChange}
      />

      {/* Small Multiples - clickable boxes */}
      <SmallMultiples 
        snapshots={snapshots} 
        mode={analyticsMode} 
        period={period}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        onSelectGeneral={handleSelectGeneral}
      />
    </div>
  );
}

// ---------- Page Shell ----------
export default function EgemathprofProgress() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"module" | "problem" | "analytics">("module");
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
  } = useEgemathprofProgressData();

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
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
          <button onClick={() => navigate('/egemathprof-progress')} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
            Вернуться к старой версии
          </button>
        </div>
      </div>;
  }

  return <div className="min-h-screen relative overflow-hidden" style={{
    background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)'
  }}>
      {/* Flying Math Symbols Background */}
      <FlyingMathBackground />

      <div className="relative z-10 pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Back Button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/egemathprof")}
              className="hover:bg-white/20 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>

          {/* Header - Compact Layout */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
                Прогресс ЕГЭ Профиль
              </h1>
              <p className="text-sm text-gray-300 font-body">
                Отслеживайте ваш прогресс по модулям, заданиям и темам
              </p>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={recalculateProgress} 
              disabled={refreshing} 
              className="flex items-center gap-2 px-4 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 font-bold rounded-lg shadow-lg whitespace-nowrap flex-shrink-0"
            >
              <RefreshCw className={`${refreshing ? 'animate-spin' : ''} h-4 w-4`} />
              <span>{refreshing ? 'Обновление...' : 'Обновить'}</span>
            </button>
          </div>

          {/* Tab Bar - Now integrated inline */}
          <div className="mb-8">
            <TabBar mode={mode} setMode={setMode} />
          </div>
      
          <main className="py-8 space-y-10">
            {mode === "module" ? (
              <ModuleView modules={modules} topicProgress={topicProgress} moduleDefinitions={moduleDefinitions} />
            ) : mode === "problem" ? (
              <ProblemView problems={problems} />
            ) : (
              <ProgressAnalyticsView />
            )}
          </main>

          <footer className="pb-16 pt-4 text-[12px] text-gray-400 text-center">
            Данные взяты из реального API.
          </footer>
        </div>
      </div>
    </div>;
}