import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, AlertCircle, RefreshCw, Calculator, Square, Triangle, Circle, Hexagon, Star, Zap, Target, BookOpen, Brain, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Course, Topic } from '@/lib/courses.registry';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// OGE Math Topics - 32 topics total
const OGE_MATH_TOPICS = [
  { topic_number: "1.1", topic_name: "Натуральные и целые числа" },
  { topic_number: "1.2", topic_name: "Дроби и проценты" },
  { topic_number: "1.3", topic_name: "Рациональные числа и арифметические действия" },
  { topic_number: "1.4", topic_name: "Действительные числа" },
  { topic_number: "1.5", topic_name: "Приближённые вычисления" },
  { topic_number: "2.1", topic_name: "Буквенные выражения" },
  { topic_number: "2.2", topic_name: "Степени" },
  { topic_number: "2.3", topic_name: "Многочлены" },
  { topic_number: "2.4", topic_name: "Алгебраические дроби" },
  { topic_number: "2.5", topic_name: "Арифметические корни" },
  { topic_number: "3.1", topic_name: "Уравнения и системы" },
  { topic_number: "3.2", topic_name: "Неравенства и системы" },
  { topic_number: "3.3", topic_name: "Текстовые задачи" },
  { topic_number: "4.1", topic_name: "Последовательности" },
  { topic_number: "4.2", topic_name: "Арифметическая и геометрическая прогрессии. Формула сложных процентов" },
  { topic_number: "5.1", topic_name: "Свойства и графики функций" },
  { topic_number: "6.1", topic_name: "Координатная прямая" },
  { topic_number: "6.2", topic_name: "Декартовы координаты" },
  { topic_number: "7.1", topic_name: "Геометрические фигуры" },
  { topic_number: "7.2", topic_name: "Треугольники" },
  { topic_number: "7.3", topic_name: "Многоугольники" },
  { topic_number: "7.4", topic_name: "Окружность и круг" },
  { topic_number: "7.5", topic_name: "Измерения" },
  { topic_number: "7.6", topic_name: "Векторы" },
  { topic_number: "7.7", topic_name: "Дополнительные темы по геометрии" },
  { topic_number: "8.1", topic_name: "Описательная статистика" },
  { topic_number: "8.2", topic_name: "Вероятность" },
  { topic_number: "8.3", topic_name: "Комбинаторика" },
  { topic_number: "8.4", topic_name: "Множества" },
  { topic_number: "8.5", topic_name: "Графы" },
  { topic_number: "9.1", topic_name: "Работа с данными и графиками" },
  { topic_number: "9.2", topic_name: "Прикладная геометрия / Чтение и анализ графических схем" }
];

interface CourseTreeCardProps {
  course: Course;
  onStart: (courseId: string) => void;
}

// Icon mapping for different topics - using mathematical/educational icons
const getTopicIcon = (index: number, topicName: string) => {
  const icons = [
    Calculator, Square, Triangle, Circle, Hexagon, Star, 
    Zap, Target, BookOpen, Brain, Layers, Play
  ];
  if (topicName.toLowerCase().includes('алгебра') || topicName.toLowerCase().includes('algebra')) return Calculator;
  if (topicName.toLowerCase().includes('геометр') || topicName.toLowerCase().includes('geometry')) return Triangle;
  if (topicName.toLowerCase().includes('функц') || topicName.toLowerCase().includes('function')) return Zap;
  if (topicName.toLowerCase().includes('число') || topicName.toLowerCase().includes('number')) return Circle;
  if (topicName.toLowerCase().includes('уравн') || topicName.toLowerCase().includes('equation')) return Target;
  return icons[index % icons.length];
};

// Color mapping for topic icons
const getTopicColor = (index: number) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
    'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-red-500',
    'bg-yellow-500', 'bg-teal-500', 'bg-violet-500', 'bg-emerald-500'
  ];
  return colors[index % colors.length];
};

export const CourseTreeCard: React.FC<CourseTreeCardProps> = ({ 
  course, 
  onStart 
}) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(10);
  const [progress, setProgress] = useState(1);
  const [topicProgress, setTopicProgress] = useState<{[key: string]: number}>({});

  const useStaticTopics = course.id === 'oge-math';
  
  const getVisibleTopics = (allTopics: Topic[], currentIndex: number) => {
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(allTopics.length, currentIndex + 3);
    return allTopics.slice(start, end).map((topic, index) => ({
      ...topic,
      originalIndex: start + index,
      isCurrent: start + index === currentIndex
    }));
  };

  const getCourseId = (courseId: string) => {
    switch (courseId) {
      case 'oge-math': return '1';
      case 'ege-basic': return '2';
      case 'ege-advanced': return '3';
      default: return '1';
    }
  };

  const loadProgressData = async () => {
    if (!user) return;
    try {
      const courseIdNum = getCourseId(course.id);
      const { data: snapshot, error } = await supabase
        .from('mastery_snapshots')
        .select('computed_summary')
        .eq('user_id', user.id)
        .eq('course_id', courseIdNum)
        .order('run_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !snapshot?.computed_summary) {
        setProgress(1);
        return;
      }

      const computedSummary = snapshot.computed_summary as any[];
      let generalProgress = 1;
      const topicProgressMap: {[key: string]: number} = {};

      computedSummary.forEach((item: any) => {
        if (item.general_progress !== undefined) {
          generalProgress = Math.round(item.general_progress * 100);
        } else if (item.topic && item.prob !== undefined) {
          const topicMatch = item.topic.match(/^(\d+\.\d+)/);
          if (topicMatch) {
            const topicNumber = topicMatch[1];
            topicProgressMap[topicNumber] = Math.round(item.prob * 100);
          }
        }
      });

      setProgress(generalProgress);
      setTopicProgress(topicProgressMap);
    } catch (e) {
      console.error('Error loading progress data:', e);
      setProgress(1);
    }
  };

  useEffect(() => {
    if (user) loadProgressData();
    if (useStaticTopics) {
      const topicsArray = OGE_MATH_TOPICS.map(item => ({
        name: item.topic_name,
        number: item.topic_number,
        importance: 1
      }));
      setTopics(topicsArray);
      setIsLoadingTopics(false);
    } else {
      fetchTopics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.topicsUrl, useStaticTopics, user]);

  const fetchTopics = async () => {
    setIsLoadingTopics(true);
    setTopicsError(null);
    try {
      const response = await fetch(course.topicsUrl);
      if (!response.ok) throw new Error(`Failed to fetch topics: ${response.status}`);
      const data = await response.json();
      let topicsArray: Topic[] = [];
      if (Array.isArray(data)) {
        topicsArray = data.map(item => ({
          name: item.topic_name || item.name || item.title || String(item),
          number: item.topic_number || item.number,
          importance: item.importance
        }));
      } else if (data && typeof data === 'object') {
        const possibleKeys = ['topics', 'data', 'items'];
        for (const key of possibleKeys) {
          if (data[key] && Array.isArray(data[key])) {
            topicsArray = data[key].map((item: any) => ({
              name: item.topic_name || item.name || item.title || String(item),
              number: item.topic_number || item.number,
              importance: item.importance
            }));
            break;
          }
        }
      }
      setTopics(topicsArray);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setTopicsError('Не удалось загрузить темы');
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const retryFetchTopics = () => fetchTopics();

  return (
    <Card className="rounded-2xl shadow-xl h-full flex flex-col bg-white/95 backdrop-blur border border-white/20">
      <CardHeader className="pb-4 bg-gradient-to-br from-yellow-500/10 to-emerald-500/10 rounded-t-2xl">
        {/* ---- Local styles must be inside JSX to take effect ---- */}
        <style>{`
          .start-cta {
            --from: #f8c978; --via: #dff3b2; --to: #8fe3c2;
            display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
            padding: 0.9rem 1.25rem; width: 100%; border-radius: 9999px;
            background: linear-gradient(90deg, var(--from), var(--via), var(--to));
            color: #0b0f19; font-weight: 700; letter-spacing: .02em; text-transform: uppercase;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 8px 18px rgba(16,185,129,.10);
            transition: transform .12s ease, filter .2s ease, box-shadow .2s ease;
            user-select: none; -webkit-tap-highlight-color: transparent;
          }
          .start-cta:hover {
            filter: brightness(1.06);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 10px 22px rgba(16,185,129,.14);
            transform: translateY(-1px);
          }
          .start-cta:active { transform: translateY(0); filter: brightness(.98); }
          .start-cta:focus-visible {
            outline: none;
            box-shadow: 0 0 0 3px rgba(255,255,255,.65), 0 0 0 6px rgba(16,185,129,.45);
          }
          .start-cta[disabled] { opacity: .5; cursor: not-allowed; transform: none; filter: none; }
          .start-cta__icon { width: 20px; height: 20px; opacity: .9; }
        `}</style>

        <div>
          <CardTitle 
            className="text-lg font-semibold text-[#1a1f36] hover:text-yellow-600 cursor-pointer transition-colors"
            onClick={() => onStart(course.id)}
          >
            {course.title}
          </CardTitle>

          <div className="flex items-center gap-2 mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="text-sm text-[#1a1f36] hover:text-[#1a1f36] hover:underline cursor-pointer font-medium">
                  Всего ({topics.length})
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                {topics.map((topic, index) => {
                  const IconComponent = getTopicIcon(index, topic.name);
                  const colorClass = getTopicColor(index);
                  const isCurrent = index === currentTopicIndex;
                  const prog = topic.number ? (topicProgress[topic.number] || 1) : 1;

                  return (
                    <DropdownMenuItem
                      key={`${topic.number}-header-dropdown-${index}`}
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => setCurrentTopicIndex(index)}
                    >
                      <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0 ${
                        isCurrent ? 'ring-2 ring-yellow-500 ring-offset-1' : ''
                      }`}>
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isCurrent ? 'text-yellow-700' : 'text-gray-900'}`}>
                          {topic.name}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">{topic.number}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-1 rounded-full transition-all duration-300" 
                            style={{ width: `${prog}%` }}
                          />
                        </div>
                      </div>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                          Current
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Start Button (custom, not shadcn Button) */}
        <button
          type="button"
          className="start-cta max-w-xs mx-auto"
          onClick={() => onStart(course.id)}
        >
          <svg
            className="start-cta__icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7-11-7z"></path>
          </svg>
          Начать изучение
        </button>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Общий прогресс</span>
            <span className="font-bold text-[#1a1f36]">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-gray-200 [&>div]:bg-gradient-to-r [&>div]:from-yellow-500 [&>div]:to-emerald-500"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Topics Tree */}
        <div className="flex-1">
          <ScrollArea className="h-80">
            {isLoadingTopics ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topicsError ? (
              <div className="text-center py-8 space-y-3">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">{topicsError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retryFetchTopics}
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Повторить попытку
                </Button>
              </div>
            ) : topics.length > 0 ? (
              <div className="space-y-4">
                {/* Visible Topics (5 around current) */}
                <div className="space-y-3 relative">
                  {/* Vertical line connecting topics */}
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200"></div>
                  
                  {getVisibleTopics(topics, currentTopicIndex).map((topic: any) => {
                    const IconComponent = getTopicIcon(topic.originalIndex, topic.name);
                    const colorClass = getTopicColor(topic.originalIndex);
                    
                    return (
                      <div key={`${topic.number}-${topic.originalIndex}`} className="flex items-center gap-4 relative z-10">
                        {/* Topic Icon */}
                        <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0 ${
                          topic.isCurrent ? 'ring-2 ring-yellow-500 ring-offset-2' : ''
                        }`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Topic Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium leading-tight ${
                            topic.isCurrent ? 'text-yellow-700 font-semibold' : 'text-gray-700'
                          }`}>
                            {topic.name}
                          </h4>
                          {/* Topic progress bar */}
                          {topic.number && topicProgress[topic.number] !== undefined && (
                            <div className="mt-1">
                              <div className="w-full bg-secondary/20 rounded-full h-1.5">
                                <div 
                                  className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${topicProgress[topic.number]}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {/* Hidden topic number for data purposes */}
                          <span className="sr-only">{topic.number}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Темы не найдены</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
