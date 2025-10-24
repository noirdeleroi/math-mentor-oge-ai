import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import FlyingCyrillicBackground from '@/components/FlyingCyrillicBackground';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface EssayRow {
  id: string;
  user_id: string;
  essay_topic_id: string;
  text_scan: string | null;
  analysis: string | null;
  score: number | null;
  created_at: string;
}

interface AnalysisData {
  k1_score?: number;
  k1_max?: number;
  k2_score?: number;
  k2_max?: number;
  k3_score?: number;
  k3_max?: number;
  k4_score?: number;
  k4_max?: number;
  k5_score?: number;
  k5_max?: number;
  k6_score?: number;
  k6_max?: number;
  k7_score?: number;
  k7_max?: number;
  k8_score?: number;
  k8_max?: number;
  k9_score?: number;
  k9_max?: number;
  k10_score?: number;
  k10_max?: number;
  total_score?: number;
  max_score?: number;
  errors?: any[];
}

const EgerusesAnalytics = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [essays, setEssays] = useState<EssayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [essayType, setEssayType] = useState<'ege' | 'oge'>('ege');

  // Criteria data from JSON
  const criteriaData = {
    "критерии": [
      {
        "код": "К1",
        "название": "Отражение позиции автора (рассказчика) по указанной проблеме исходного текста",
        "категория": "Содержание сочинения",
        "макс_балл": 1
      },
      {
        "код": "К2",
        "название": "Комментарий к позиции автора (рассказчика) по указанной проблеме исходного текста",
        "категория": "Содержание сочинения",
        "макс_балл": 3
      },
      {
        "код": "К3",
        "название": "Собственное отношение экзаменуемого к позиции автора (рассказчика) по указанной проблеме исходного текста",
        "категория": "Содержание сочинения",
        "макс_балл": 2
      },
      {
        "код": "К4",
        "название": "Фактическая точность речи",
        "категория": "Речевое оформление",
        "макс_балл": 1
      },
      {
        "код": "К5",
        "название": "Логичность речи",
        "категория": "Речевое оформление",
        "макс_балл": 2
      },
      {
        "код": "К6",
        "название": "Соблюдение этических норм",
        "категория": "Речевое оформление",
        "макс_балл": 1
      },
      {
        "код": "К7",
        "название": "Соблюдение орфографических норм",
        "категория": "Грамотность",
        "макс_балл": 3
      },
      {
        "код": "К8",
        "название": "Соблюдение пунктуационных норм",
        "категория": "Грамотность",
        "макс_балл": 3
      },
      {
        "код": "К9",
        "название": "Соблюдение грамматических норм",
        "категория": "Грамотность",
        "макс_балл": 3
      },
      {
        "код": "К10",
        "название": "Соблюдение речевых норм",
        "категория": "Грамотность",
        "макс_балл": 3
      }
    ],
    "категории": {
      "Содержание сочинения": {
        "метка": "🧠 Содержание сочинения",
        "критерии": ["К1", "К2", "К3"]
      },
      "Речевое оформление": {
        "метка": "💬 Речевое оформление",
        "критерии": ["К4", "К5", "К6"]
      },
      "Грамотность": {
        "метка": "✍️ Грамотность",
        "критерии": ["К7", "К8", "К9", "К10"]
      }
    }
  };

  const pageBg = useMemo(
    () => ({ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }),
    []
  );

  const criteriaInfo = [
    { id: 'K1', label: 'K1', short: 'Позиция', color: '#f97316', icon: 'text-orange-400', maxMark: 1 },
    { id: 'K2', label: 'K2', short: 'Комментарий', color: '#3b82f6', icon: 'text-blue-400', maxMark: 3 },
    { id: 'K3', label: 'K3', short: 'Мнение', color: '#22c55e', icon: 'text-green-400', maxMark: 2 },
    { id: 'K4', label: 'K4', short: 'Факты', color: '#06b6d4', icon: 'text-cyan-400', maxMark: 1 },
    { id: 'K5', label: 'K5', short: 'Логика', color: '#6366f1', icon: 'text-indigo-400', maxMark: 2 },
    { id: 'K6', label: 'K6', short: 'Этика', color: '#a855f7', icon: 'text-purple-400', maxMark: 1 },
    { id: 'K7', label: 'K7', short: 'Орфография', color: '#ec4899', icon: 'text-pink-400', maxMark: 3 },
    { id: 'K8', label: 'K8', short: 'Пунктуация', color: '#f43f5e', icon: 'text-rose-400', maxMark: 3 },
    { id: 'K9', label: 'K9', short: 'Грамматика', color: '#f59e0b', icon: 'text-amber-400', maxMark: 3 },
    { id: 'K10', label: 'K10', short: 'Речь', color: '#84cc16', icon: 'text-lime-400', maxMark: 3 }
  ];

  // Load user and essays
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setAuthLoading(false);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadEssays = async () => {
      // First get essay topic IDs that match the current essay type
      const { data: topicIds, error: topicError } = await supabase
        .from('essay_topics')
        .select('id')
        .eq('subject', essayType);
      
      if (topicError) {
        console.error('Error loading topic IDs:', topicError);
        setEssays([]);
        setLoading(false);
        return;
      }
      
      const topicIdList = topicIds?.map(t => t.id) || [];
      
      if (topicIdList.length === 0) {
        setEssays([]);
        setLoading(false);
        return;
      }
      
      // Then get essays that match these topic IDs
      const { data } = await supabase
        .from('student_essay1')
        .select('*')
        .eq('user_id', userId)
        .in('essay_topic_id', topicIdList)
        .not('analysis', 'is', null)
        .order('created_at', { ascending: false });
      
      setEssays(data || []);
      setLoading(false);
    };

    loadEssays();
  }, [userId, essayType]);

  // Parse analysis data from JSON string
  const parseAnalysis = (analysisStr: string | null): AnalysisData | null => {
    if (!analysisStr) return null;
    try {
      return JSON.parse(analysisStr);
    } catch {
      return null;
    }
  };

  // Calculate statistics and prepare chart data
  const stats = useMemo(() => {
    const parsedEssays = essays.map(e => ({ essay: e, analysis: parseAnalysis(e.analysis) })).filter(e => e.analysis);
    
    if (parsedEssays.length === 0) return null;

    // Overall score progression
    const scores = parsedEssays.map(e => e.analysis.total_score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Criteria performance
    const criteriaStats: { [key: string]: { scores: number[], max: number } } = {};
    criteriaInfo.forEach(c => {
      const key = c.id.toLowerCase();
      criteriaStats[key] = {
        scores: [],
        max: 0
      };
    });

    parsedEssays.forEach(e => {
      criteriaInfo.forEach(c => {
        const scoreKey = `${c.id.toLowerCase()}_score`;
        const maxKey = `${c.id.toLowerCase()}_max`;
        if (e.analysis[scoreKey] !== undefined) {
          criteriaStats[c.id.toLowerCase()].scores.push(e.analysis[scoreKey]);
          criteriaStats[c.id.toLowerCase()].max = e.analysis[maxKey] || 0;
        }
      });
    });

    // Average scores per criteria
    const criteriaAverage: { [key: string]: number } = {};
    Object.entries(criteriaStats).forEach(([key, stat]) => {
      if (stat.scores.length > 0) {
        criteriaAverage[key] = stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length;
      }
    });

    // Error analysis
    const errorCounts: { [key: string]: number } = {};
    criteriaInfo.forEach(c => {
      errorCounts[c.id.toLowerCase()] = 0;
    });

    parsedEssays.forEach(e => {
      if (e.analysis.errors) {
        e.analysis.errors.forEach((error: any) => {
          const criterion = error.criterion?.toLowerCase();
          if (criterion && errorCounts[criterion] !== undefined) {
            errorCounts[criterion]++;
          }
        });
      }
    });

    // Prepare chart data - Progress Line Chart
    const progressData = parsedEssays.reverse().map((essayData, idx) => ({
      name: `Сочинение ${idx + 1}`,
      score: essayData.analysis.total_score || 0,
      maxScore: essayData.analysis.max_score || 42
    }));

    // Prepare chart data - Enhanced Criteria Radar with percentage
    const radarData = criteriaInfo.map(c => {
      const avgScore = criteriaAverage[c.id.toLowerCase()] || 0;
      const maxScore = c.maxMark;
      const percentage = maxScore > 0 ? (avgScore / maxScore) * 100 : 0;
      
      // Find the full criterion name from criteriaData
      const criterionInfo = criteriaData.критерии.find(crit => crit.код === c.label);
      const fullName = criterionInfo?.название || c.label;
      
      return {
        name: c.label,
        fullName: fullName,
        score: percentage, // Use percentage for radar
        actualScore: avgScore,
        maxScore: maxScore,
        fill: c.color,
        short: c.short
      };
    });

    // Prepare chart data - Enhanced Bar Chart with actual scores
    const barData = criteriaInfo.map(c => {
      const avgScore = criteriaAverage[c.id.toLowerCase()] || 0;
      const maxScore = c.maxMark;
      const percentage = maxScore > 0 ? (avgScore / maxScore) * 100 : 0;
      
      return {
        name: c.label,
        score: avgScore,
        maxScore: maxScore,
        percentage: percentage,
        fill: c.color,
        short: c.short
      };
    });

    // Prepare chart data - Errors Bar Chart
    const errorData = criteriaInfo
      .map(c => ({
        name: c.label,
        errors: errorCounts[c.id.toLowerCase()] || 0,
        fill: c.color
      }))
      .filter(d => d.errors > 0 || true);

    return {
      totalEssays: parsedEssays.length,
      avgScore,
      maxScore,
      minScore,
      criteriaAverage,
      criteriaStats,
      errorCounts,
      allEssays: parsedEssays,
      progressData,
      radarData,
      barData,
      errorData
    };
  }, [essays]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-white/30 rounded-lg p-2 text-white text-sm">
          <p>{label}</p>
          <p className="text-emerald-400">{payload[0].value} баллов</p>
        </div>
      );
    }
    return null;
  };

  // Enhanced tooltip for radar chart
  const RadarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = data.score;
      const actualScore = data.actualScore;
      const maxScore = data.maxScore;
      const fullName = data.fullName || label;
      
      let feedback = "";
      let feedbackColor = "";
      if (percentage >= 80) {
        feedback = "Сильно";
        feedbackColor = "text-green-400";
      } else if (percentage >= 50) {
        feedback = "Нужно улучшение";
        feedbackColor = "text-yellow-400";
      } else {
        feedback = "Работать над этим";
        feedbackColor = "text-red-400";
      }
      
      return (
        <div className="bg-black/90 border border-white/30 rounded-lg p-3 text-white text-sm max-w-sm">
          <p className="font-semibold text-emerald-400">{label}</p>
          <p className="text-white/70 text-xs mt-1 leading-tight">{fullName}</p>
          <p className="text-white/80 mt-2">{actualScore.toFixed(1)} / {maxScore}</p>
          <p className={`text-xs mt-1 ${feedbackColor}`}>
            {percentage.toFixed(0)}% ({feedback})
          </p>
        </div>
      );
    }
    return null;
  };

  // Enhanced tooltip for bar chart
  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const score = data.score;
      const maxScore = data.maxScore;
      const percentage = data.percentage;
      
      return (
        <div className="bg-black/90 border border-white/30 rounded-lg p-3 text-white text-sm">
          <p className="font-semibold text-emerald-400">{label}</p>
          <p className="text-white/80">{score.toFixed(1)} / {maxScore}</p>
          <p className="text-yellow-400 text-xs">{percentage.toFixed(0)}% от максимума</p>
        </div>
      );
    }
    return null;
  };

  if (authLoading || loading) {
    return (
      <div style={pageBg} className="min-h-screen w-full flex items-center justify-center">
        <FlyingCyrillicBackground />
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={pageBg} className="min-h-screen w-full flex flex-col items-center justify-center">
        <FlyingCyrillicBackground />
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Аналитика сочинений</h1>
          <p className="text-white/70">Пока нет проверенных сочинений для анализа</p>
          <Button onClick={() => window.location.href = '/egeruses2'} className="mt-6" variant="outline">
            Начать писать сочинение
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBg} className="min-h-screen w-full pt-8 pb-12">
      <FlyingCyrillicBackground />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button onClick={() => window.location.href = '/egeruses2'} variant="ghost" className="text-white/70 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <h1 className="text-4xl font-bold text-white">Аналитика сочинений</h1>
            <p className="text-white/70 mt-2">Проверено сочинений: {stats.totalEssays}</p>
          </div>
          
          {/* Essay Type Selector */}
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm">Тип сочинения:</span>
            <div className="flex bg-white/10 backdrop-blur border border-white/20 rounded-lg p-1">
              <button
                onClick={() => setEssayType('ege')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  essayType === 'ege'
                    ? 'bg-gradient-to-r from-yellow-500/30 to-emerald-500/30 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                ЕГЭ
              </button>
              <button
                onClick={() => setEssayType('oge')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  essayType === 'oge'
                    ? 'bg-gradient-to-r from-yellow-500/30 to-emerald-500/30 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                ОГЭ
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-1 w-full justify-start">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30">
              <TrendingUp className="w-4 h-4 mr-2" />
              Прогресс
            </TabsTrigger>
            <TabsTrigger value="criteria" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30">
              <BarChart3 className="w-4 h-4 mr-2" />
              Критерии
            </TabsTrigger>
            <TabsTrigger value="errors" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Ошибки
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Overall Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
                <div className="text-white/70 text-sm mb-2">Средний балл</div>
                <div className="text-4xl font-bold text-emerald-400">{stats.avgScore.toFixed(1)}</div>
                <div className="text-white/50 text-xs mt-2">из {stats.allEssays[0]?.analysis?.max_score || 42} баллов</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
                <div className="text-white/70 text-sm mb-2">Максимальный балл</div>
                <div className="text-4xl font-bold text-yellow-400">{stats.maxScore}</div>
                <div className="text-white/50 text-xs mt-2">Лучший результат</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
                <div className="text-white/70 text-sm mb-2">Минимальный балл</div>
                <div className="text-4xl font-bold text-red-400">{stats.minScore}</div>
                <div className="text-white/50 text-xs mt-2">Наименьший результат</div>
              </div>
            </div>

            {/* Score Progression Line Chart */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Прогресс по сочинениям
              </h2>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="name" stroke="#ffffff70" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#ffffff70" style={{ fontSize: '12px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 6 }}
                    activeDot={{ r: 8 }}
                    name="Баллы"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Criteria Tab */}
          <TabsContent value="criteria" className="space-y-6">
            {/* Centered Layout */}
            <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto">
              {/* 1️⃣ Radar (Spider) Chart — "Skill Map" */}
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl w-full">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  🕸️ Карта навыков
                </h2>
                
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={stats.radarData}>
                    <defs>
                      <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        {stats.radarData.map((point, index) => {
                          const percentage = point.score;
                          let color = '#ef4444'; // Red for <50%
                          if (percentage >= 80) color = '#22c55e'; // Green for 80-100%
                          else if (percentage >= 50) color = '#facc15'; // Yellow for 50-79%
                          
                          const offset = (index / (stats.radarData.length - 1)) * 100;
                          return (
                            <stop key={index} offset={`${offset}%`} stopColor={color} />
                          );
                        })}
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="#ffffff30" />
                    <PolarAngleAxis 
                      dataKey="name" 
                      stroke="#ffffff70" 
                      style={{ fontSize: '12px' }} 
                    />
                    <PolarRadiusAxis 
                      stroke="#ffffff70" 
                      style={{ fontSize: '12px' }}
                      domain={[0, 100]}
                      tickCount={6}
                    />
                    <Radar 
                      name="Процент выполнения" 
                      dataKey="score" 
                      stroke="url(#performanceGradient)" 
                      fill="url(#performanceGradient)" 
                      fillOpacity={0.7}
                      strokeWidth={3}
                    />
                    <Tooltip content={<RadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
                
                {/* Color Legend */}
                <div className="flex justify-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-white/70">80-100% Сильно</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="text-white/70">50-79% Нужно улучшить</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-white/70">&lt;50% Работать над этим</span>
                  </div>
                </div>
              </div>

              {/* Criteria Performance Cards - Below the radar chart */}
              <div className="w-full">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 text-center">
                  📊 Баллы по критериям
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.barData.map((criteria, idx) => {
                    // Find the full criterion name from criteriaData
                    const criterionInfo = criteriaData.критерии.find(c => c.код === criteria.name);
                    const fullName = criterionInfo?.название || criteria.name;
                    
                    const getPerformanceLevel = (percentage: number) => {
                      if (percentage >= 80) return { level: "Сильно", color: "text-green-400", bg: "bg-green-500/20" };
                      if (percentage >= 50) return { level: "Нужно улучшить", color: "text-yellow-400", bg: "bg-yellow-500/20" };
                      return { level: "Работать над этим", color: "text-red-400", bg: "bg-red-500/20" };
                    };
                    
                    const performance = getPerformanceLevel(criteria.percentage);
                    
                    return (
                      <div key={idx} className={`bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 shadow-lg ${performance.bg}`}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-white">{criteria.name}</span>
                          <span className={`text-xs font-semibold ${performance.color}`}>
                            {performance.level}
                          </span>
                        </div>
                        
                        <div className="text-sm text-white/80 mb-2 leading-tight">
                          {fullName}
                        </div>
                        
                        <div className="text-lg font-bold text-white mb-2">
                          {criteria.score.toFixed(1)} / {criteria.maxScore}
                        </div>
                        
                        <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${criteria.percentage}%`,
                              backgroundColor: criteria.percentage >= 80 ? '#22c55e' : 
                                             criteria.percentage >= 50 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        
                        <div className="text-xs text-white/60">
                          {criteria.percentage.toFixed(0)}% от максимума
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            {/* Error Distribution Bar Chart */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6">Количество ошибок по критериям</h2>
              
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stats.errorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="name" stroke="#ffffff70" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#ffffff70" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value) => [`${value} ошибок`, 'Количество']}
                  />
                  <Bar dataKey="errors" radius={[8, 8, 0, 0]} name="Ошибки">
                    {stats.errorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Error Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.errorData.map((criteria, idx) => {
                const totalErrors = stats.errorData.reduce((sum, c) => sum + c.errors, 0);
                const percentage = totalErrors > 0 ? (criteria.errors / totalErrors) * 100 : 0;
                
                return (
                  <div key={idx} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-white">{criteria.name}</span>
                      <span className="text-2xl font-bold" style={{ color: criteria.fill }}>{criteria.errors}</span>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: criteria.fill }}
                      />
                    </div>
                    
                    <div className="text-xs text-white/60 mt-2">
                      {percentage.toFixed(0)}% всех ошибок
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EgerusesAnalytics;
