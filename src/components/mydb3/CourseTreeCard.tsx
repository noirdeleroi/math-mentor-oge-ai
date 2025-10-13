import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, AlertCircle, RefreshCw, Calculator, Square, Triangle, Circle, Hexagon, Star, Zap, Target, BookOpen, Brain, Layers, ChevronDown } from 'lucide-react';
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
  
  // Choose icon based on topic content or just cycle through
  if (topicName.toLowerCase().includes('алгебра') || topicName.toLowerCase().includes('algebra')) return Calculator;
  if (topicName.toLowerCase().includes('геометр') || topicName.toLowerCase().includes('geometry')) return Triangle;
  if (topicName.toLowerCase().includes('функц') || topicName.toLowerCase().includes('function')) return Zap;
  if (topicName.toLowerCase().includes('число') || topicName.toLowerCase().includes('number')) return Circle;
  if (topicName.toLowerCase().includes('уравн') || topicName.toLowerCase().includes('equation')) return Target;
  
  // Default to cycling through icons
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
  const [currentTopicIndex, setCurrentTopicIndex] = useState(10); // Current topic position
  const [progress, setProgress] = useState(1); // General progress
  const [topicProgress, setTopicProgress] = useState<{[key: string]: number}>({});

  // Use OGE topics if this is OGE course, otherwise fetch from API
  const useStaticTopics = course.id === 'oge-math';
  
  // Get 5 topics around current (2 before, current, 2 after)
  const getVisibleTopics = (allTopics: Topic[], currentIndex: number) => {
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(allTopics.length, currentIndex + 3);
    return allTopics.slice(start, end).map((topic, index) => ({
      ...topic,
      originalIndex: start + index,
      isCurrent: start + index === currentIndex
    }));
  };

  // Course ID mapping
  const getCourseId = (courseId: string) => {
    switch (courseId) {
      case 'oge-math': return '1';
      case 'ege-basic': return '2';
      case 'ege-advanced': return '3';
      default: return '1';
    }
  };

  // Load progress data from mastery_snapshots
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
        console.log('No snapshot found, using default 1% values');
        setProgress(1);
        return;
      }

      const computedSummary = snapshot.computed_summary as any[];
      console.log('Loaded progress from snapshot:', computedSummary);

      // Parse computed_summary data
      let generalProgress = 1;
      const topicProgressMap: {[key: string]: number} = {};

      computedSummary.forEach((item: any) => {
        if (item.general_progress !== undefined) {
          generalProgress = Math.round(item.general_progress * 100);
        } else if (item.topic && item.prob !== undefined) {
          // Extract topic number from topic name like "1.1 Натуральные и целые числа"
          const topicMatch = item.topic.match(/^(\d+\.\d+)/);
          if (topicMatch) {
            const topicNumber = topicMatch[1];
            topicProgressMap[topicNumber] = Math.round(item.prob * 100);
          }
        }
      });

      setProgress(generalProgress);
      setTopicProgress(topicProgressMap);
    } catch (error) {
      console.error('Error loading progress data:', error);
      setProgress(1);
    }
  };

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
    
    if (useStaticTopics) {
      // Use static OGE topics
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
  }, [course.topicsUrl, useStaticTopics, user]);

  const fetchTopics = async () => {
    setIsLoadingTopics(true);
    setTopicsError(null);
    
    try {
      const response = await fetch(course.topicsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch topics: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Normalize the data
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

  const retryFetchTopics = () => {
    fetchTopics();
  };

  return (
    <Card className="rounded-lg shadow-sm h-full flex flex-col bg-white">
      <CardHeader className="pb-4">
        <div>
          <CardTitle 
            className="text-lg font-semibold text-gray-900 hover:text-yellow-500 cursor-pointer transition-colors"
            onClick={() => onStart(course.id)}
          >
            {course.title}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="text-sm text-yellow-600 hover:text-yellow-700 hover:underline cursor-pointer">
                  Всего ({topics.length})
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                {topics.map((topic, index) => {
                  const IconComponent = getTopicIcon(index, topic.name);
                  const colorClass = getTopicColor(index);
                  const isCurrent = index === currentTopicIndex;
                  const progress = topic.number ? topicProgress[topic.number] || 1 : 1;
                  
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
                        <div className={`text-sm font-medium ${
                          isCurrent ? 'text-yellow-700' : 'text-gray-900'
                        }`}>
                          {topic.name}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">{topic.number}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-1 rounded-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
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
        
        {/* Start Button */}
        <Button 
          onClick={() => onStart(course.id)}
          className="w-full bg-gradient-to-r from-yellow-500 to-emerald-500 hover:shadow-lg text-white mt-3"
          size="sm"
        >
          <Play className="w-4 h-4 mr-2" />
          Начать изучение
        </Button>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Общий прогресс</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
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
                  
                  {getVisibleTopics(topics, currentTopicIndex).map((topic: any, index) => {
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
                          topic.isCurrent 
                            ? 'text-yellow-700 font-semibold' 
                            : 'text-gray-700'
                        }`}>
                          {topic.name}
                        </h4>
                          {/* Topic progress bar */}
                        {topic.number && topicProgress[topic.number] !== undefined && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300" 
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