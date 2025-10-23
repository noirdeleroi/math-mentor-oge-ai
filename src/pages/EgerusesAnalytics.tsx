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
      const { data } = await supabase
        .from('student_essay1')
        .select('*')
        .eq('user_id', userId)
        .not('analysis', 'is', null)
        .order('created_at', { ascending: false });
      
      setEssays(data || []);
      setLoading(false);
    };

    loadEssays();
  }, [userId]);

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

    // Prepare chart data - Criteria Radar
    const radarData = criteriaInfo.map(c => ({
      name: c.label,
      score: (criteriaAverage[c.id.toLowerCase()] || 0),
      fullMark: c.maxMark,
      fill: c.color
    }));

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
            {/* Criteria Radar Chart */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6">Профиль критериев</h2>
              
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={stats.radarData}>
                  <PolarGrid stroke="#ffffff30" />
                  <PolarAngleAxis dataKey="name" stroke="#ffffff70" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis stroke="#ffffff70" style={{ fontSize: '12px' }} />
                  <Radar 
                    name="Средний балл" 
                    dataKey="score" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Criteria Bar Chart - Individual Performance */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6">Средний результат по критериям</h2>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.radarData}>
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
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {stats.radarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
