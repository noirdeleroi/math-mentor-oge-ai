// src/pages/TopicPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Play, BookOpen, Target, X, Crown, Clock, CheckCircle2, Zap
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StreakDisplay } from "@/components/streak/StreakDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ArticleRenderer from "@/components/ArticleRenderer";
import OgeExerciseQuiz from "@/components/OgeExerciseQuiz";
import VideoPlayerWithChat from "@/components/video/VideoPlayerWithChat";

import { supabase } from "@/integrations/supabase/client";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import {
  modulesRegistry,
  type TopicContent,
  type ExerciseConfig,
} from "@/lib/modules.registry";
import {
  getTopicTestSkills,
  getTopicTestQuestionCount,
  getTopicTestStatus,
} from "@/lib/topicTestHelpers";

// ✅ Import global simulation opener
import { useSimulation } from "@/contexts/SimulationProvider";
import { OGE_TOPIC_SKILL_MAPPING } from "@/lib/topic-skill-mappings";

type TopicArticleRow = {
  topic_id: string;
  topic_text: string | null;
};

interface Article {
  ID: number;
  article_text: string | null;
  img1?: string | null;
  img2?: string | null;
  img3?: string | null;
  img4?: string | null;
  img5?: string | null;
  img6?: string | null;
  img7?: string | null;
  image_recommendations?: string | null;
}

interface TopicArticle {
  skillId: number;
  article: Article | null;
}

// Helper to get JSON file ID from course ID (topic-skill mapping files)
// Based on boost-low-mastery-skills/index.ts and user confirmation
const getJsonFileIdForCourse = (courseId: string): number => {
  switch (courseId) {
    case 'oge-math': return 10;  // OGE uses file ID 10
    case 'ege-basic': return 9;   // EGE Basic uses file ID 9
    case 'ege-advanced': return 11; // EGE Profil uses file ID 11
    default: return 10;
  }
};

// Helper to get numeric course ID from course ID string
const getNumericCourseId = (courseId: string): string => {
  switch (courseId) {
    case 'oge-math': return '1';
    case 'ege-basic': return '2';
    case 'ege-advanced': return '3';
    default: return '1';
  }
};

const TopicPage: React.FC = () => {
  const navigate = useNavigate();
  const { refetch, getProgressStatus, progressData } = useModuleProgress();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string;
    title: string;
    description: string;
  } | null>(null);

  // /module/:moduleSlug/topic/:topicId
  const { moduleSlug = "", topicId = "" } = useParams<{
    moduleSlug: string;
    topicId: string;
  }>();

  const moduleEntry = modulesRegistry[moduleSlug];
  const topicIndex = useMemo(() => {
    if (!moduleEntry) return -1;
    return moduleEntry.topics.findIndex((t) => t.id === topicId);
  }, [moduleEntry, topicId]);

  const topic: TopicContent | null =
    moduleEntry && topicIndex >= 0 ? moduleEntry.topics[topicIndex] : null;

  const topicNumber = useMemo(() => {
    if (!moduleEntry || topicIndex < 0) return "";
    return moduleEntry.topicMapping[topicIndex] || "";
  }, [moduleEntry, topicIndex]);

  // Check if this is OGE topic 1.1 (the only one with demonstrations)
  const hasDemonstrations = moduleSlug === 'numbers-calculations' && topicId === 'natural-integers';

  // Right-pane: load Обзор (article) from DB by topic_number
  const [loadingArticle, setLoadingArticle] = useState<boolean>(true);
  const [article, setArticle] = useState<TopicArticleRow | null>(null);

  // Articles tab: load articles from articles_oge_full based on topic-skill mapping
  const [loadingArticles, setLoadingArticles] = useState<boolean>(true);
  const [topicArticles, setTopicArticles] = useState<TopicArticle[]>([]);
  const [selectedArticleQuiz, setSelectedArticleQuiz] = useState<{
    skillId: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoadingArticle(true);
    (async () => {
      if (!topicNumber) {
        if (!ignore) setLoadingArticle(false);
        return;
      }
      const { data, error } = await supabase
        .from("topic_articles")
        .select("topic_id, topic_text")
        .eq("topic_id", topicNumber)
        .maybeSingle();

      if (!ignore) {
        if (error) console.error("Failed to load topic article:", error);
        setArticle(data ?? null);
        setLoadingArticle(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [topicNumber]);

  // Load articles for Articles tab
  useEffect(() => {
    let ignore = false;
    setLoadingArticles(true);
    (async () => {
      if (!topicNumber || !moduleEntry?.courseId) {
        if (!ignore) {
          setTopicArticles([]);
          setLoadingArticles(false);
        }
        return;
      }

      try {
        // Use hardcoded mapping for OGE (course_id=1)
        let mapping: any = null;
        
        if (moduleEntry.courseId === 'oge-math') {
          // Use hardcoded OGE mapping
          mapping = OGE_TOPIC_SKILL_MAPPING;
          console.log('[Articles] Using hardcoded OGE mapping');
        } else {
          // For EGE courses, still fetch from database (can be hardcoded later if needed)
          const jsonFileId = getJsonFileIdForCourse(moduleEntry.courseId);
          const numericCourseId = getNumericCourseId(moduleEntry.courseId);

          const { data: jsonData, error: jsonError } = await supabase
            .from('json_files')
            .select('content')
            .eq('id', jsonFileId)
            .eq('course_id', numericCourseId)
            .maybeSingle();

          if (jsonError || !jsonData?.content) {
            console.error('Failed to load topic-skill mapping:', jsonError);
            if (!ignore) {
              setTopicArticles([]);
              setLoadingArticles(false);
            }
            return;
          }

          mapping = jsonData.content as any;
          console.log('[Articles] Fetched mapping from database for EGE course');
        }

        // Parse the mapping - OGE uses nested structure: { "Module Name": { "Topic Code": { "Темы": "...", "навыки": [...] } } }
        
        // Normalize topicNumber - remove E suffix for OGE (OGE uses "1.1", not "1.1E")
        const normalizedTopicNumber = topicNumber.replace('E', '');
        
        console.log('[Articles] Using mapping:', {
          courseId: moduleEntry.courseId,
          topicNumber,
          normalizedTopicNumber,
          mappingType: Array.isArray(mapping) ? 'array' : typeof mapping,
          moduleKeys: mapping ? Object.keys(mapping).slice(0, 5) : null,
        });
        
        // Find skills for current topicNumber
        let skills: number[] = [];
        
        // Try flat structure first: Record<string, number[]> like { "1.1": [1, 2, 3] }
        if (mapping && typeof mapping === 'object' && !Array.isArray(mapping)) {
          // Check if it's a flat structure (topic codes as direct keys)
          const firstKey = Object.keys(mapping)[0];
          if (firstKey && /^\d+\.\d+/.test(firstKey)) {
            // Flat structure - topic codes are direct keys
            if (mapping[topicNumber] && Array.isArray(mapping[topicNumber])) {
              skills = mapping[topicNumber].filter((s: any) => typeof s === 'number');
              console.log('[Articles] Found skills in flat structure (exact match):', skills);
            } else if (mapping[normalizedTopicNumber] && Array.isArray(mapping[normalizedTopicNumber])) {
              skills = mapping[normalizedTopicNumber].filter((s: any) => typeof s === 'number');
              console.log('[Articles] Found skills in flat structure (normalized):', skills);
            }
          }
        }
        
        // If not found in flat structure, try nested structure (OGE format)
        if (skills.length === 0 && mapping && typeof mapping === 'object') {
          for (const moduleKey in mapping) {
            const module = mapping[moduleKey];
            if (typeof module === 'object' && module !== null && !Array.isArray(module)) {
              for (const topicKey in module) {
                // Try exact match, normalized match (without E), and vice versa
                const topicMatch = topicKey === topicNumber || 
                                  topicKey === normalizedTopicNumber ||
                                  topicKey.replace('E', '') === normalizedTopicNumber ||
                                  topicKey === topicNumber.replace('E', '');
                if (topicMatch) {
                  console.log('[Articles] Found topic match:', { topicKey, topicNumber, normalizedTopicNumber, topicData: module[topicKey] });
                  const topicData = module[topicKey];
                  if (topicData?.навыки && Array.isArray(topicData.навыки)) {
                    // Extract skill numbers from the навыки array (each skill is an object with 'number' property)
                    skills = topicData.навыки
                      .map((s: any) => {
                        if (typeof s === 'number') return s;
                        if (typeof s === 'object' && s !== null && s.number !== undefined) return s.number;
                        return null;
                      })
                      .filter((s: any) => s !== null && typeof s === 'number');
                    console.log('[Articles] Extracted skills from навыки:', skills);
                    break;
                  } else if (topicData?.skills && Array.isArray(topicData.skills)) {
                    // Try English key as fallback
                    skills = topicData.skills
                      .map((s: any) => {
                        if (typeof s === 'number') return s;
                        if (typeof s === 'object' && s !== null && s.number !== undefined) return s.number;
                        return null;
                      })
                      .filter((s: any) => s !== null && typeof s === 'number');
                    console.log('[Articles] Extracted skills from skills:', skills);
                    break;
                  } else if (Array.isArray(topicData)) {
                    // If skills is directly an array of numbers
                    skills = topicData.filter((s: any) => typeof s === 'number');
                    console.log('[Articles] Extracted skills from array:', skills);
                    break;
                  }
                }
              }
              if (skills.length > 0) break;
            }
          }
        }

        if (skills.length === 0) {
          console.warn(`[Articles] No skills found for topic ${topicNumber}. Available topics:`, 
            mapping ? Object.keys(mapping).flatMap(mk => Object.keys(mapping[mk] || {})) : []);
          if (!ignore) {
            setTopicArticles([]);
            setLoadingArticles(false);
          }
          return;
        }
        
        console.log(`[Articles] Found ${skills.length} skills for topic ${topicNumber}:`, skills);

        // Fetch articles for each skill, maintaining order
        const articlesPromises = skills.map(async (skillId) => {
          const { data, error } = await supabase
            .from('articles_oge_full')
            .select('*')
            .eq('ID', skillId)
            .maybeSingle();

          if (error) {
            console.error(`[Articles] Error fetching article for skill ${skillId}:`, error);
            return { skillId, article: null };
          }

          if (!data) {
            console.log(`[Articles] No article found for skill ${skillId}`);
          } else {
            console.log(`[Articles] Found article for skill ${skillId}:`, data.ID, data.article_text ? 'has text' : 'no text');
          }

          return { skillId, article: data };
        });

        const articles = await Promise.all(articlesPromises);
        console.log(`[Articles] Total articles loaded: ${articles.length}, with content: ${articles.filter(a => a.article?.article_text).length}`);

        if (!ignore) {
          setTopicArticles(articles);
          setLoadingArticles(false);
        }
      } catch (error) {
        console.error('Error loading articles:', error);
        if (!ignore) {
          setTopicArticles([]);
          setLoadingArticles(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [topicNumber, moduleEntry?.courseId]);

  // State for exercise
  const [selectedExercise, setSelectedExercise] = useState<
    (ExerciseConfig & { itemId?: string }) | null
  >(null);

  // Exercises resolved from registry
  const exercises: ExerciseConfig[] = useMemo(() => {
    if (!moduleEntry || !topic) return [];
    const count = topic.exercises || 0;
    const getExerciseData = moduleEntry.getExerciseData;
    const list: ExerciseConfig[] = [];
    for (let i = 0; i < count; i += 1) {
      const cfg = getExerciseData
        ? getExerciseData(topic.id, i)
        : { title: `${topic.title} (упражнение ${i + 1})`, skills: [] };
      list.push(cfg);
    }
    return list;
  }, [moduleEntry, topic]);

  // ✅ Use global simulation opener
  const { open } = useSimulation();

  // Guards
  if (!moduleEntry || !topic) {
    return (
      <div className="relative z-20 max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/learning-platform")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к карте
          </Button>
        </div>
        <div className="max-w-3xl mx-auto bg-white/95 text-[#1a1f36] backdrop-blur-sm rounded-lg p-6 border border-white/20 shadow-sm">
          <div className="text-lg font-semibold mb-2">Тема не найдена</div>
          <div className="text-sm text-gray-700">
            Проверьте адрес страницы:{" "}
            <span className="font-mono">{moduleSlug}/{topicId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-white rounded-lg overflow-hidden">
            <VideoPlayerWithChat
              video={{
                videoId: selectedVideo.videoId,
                title: selectedVideo.title,
                description: selectedVideo.description,
              }}
              onClose={() => setSelectedVideo(null)}
            />
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <OgeExerciseQuiz
              key={refreshKey}
              title={selectedExercise.title}
              skills={selectedExercise.skills}
              questionCount={selectedExercise.questionCount}
              isModuleTest={false}
              itemId={selectedExercise.itemId}
              courseId={getNumericCourseId(moduleEntry?.courseId || 'oge-math')}
              onBack={() => {
                setSelectedExercise(null);
                refetch();
                setRefreshKey((prev) => prev + 1);
              }}
            />
          </div>
        </div>
      )}

      {/* Article Quiz Modal */}
      {selectedArticleQuiz && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <OgeExerciseQuiz
              key={`article-quiz-${selectedArticleQuiz.skillId}-${refreshKey}`}
              title={selectedArticleQuiz.title}
              skills={[selectedArticleQuiz.skillId]}
              questionCount={4}
              isModuleTest={false}
              itemId={`article-quiz-${moduleSlug}-${topicId}-skill-${selectedArticleQuiz.skillId}`}
              courseId={getNumericCourseId(moduleEntry?.courseId || 'oge-math')}
              onBack={() => {
                setSelectedArticleQuiz(null);
                refetch();
                setRefreshKey((prev) => prev + 1);
              }}
            />
          </div>
        </div>
      )}

      {/* Page content lives above the layout background */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 py-4 pb-12">
        {/* Header */}
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/module/${moduleSlug}`)}
            className="mr-4 hover:bg-white/20 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к модулю
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-display bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              {topic.title}
            </h1>
            <Link
              to={`/module/${moduleSlug}`}
              className="text-gray-200/90 hover:text-yellow-400 inline-block cursor-pointer transition-colors"
            >
              Тема {topicNumber} • Урок {moduleEntry.moduleNumber}:{" "}
              {moduleEntry.title
                .replace(/^Модуль \d+:\s*/, "")
                .replace(/Модуль/g, "Урок")}
            </Link>
          </div>
        </div>

        {/* Lesson Description */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-white/20 shadow-sm p-4 mb-4">
          {/* Textbook Link - Full Width */}
          <div className="bg-gradient-to-br from-yellow-50 to-emerald-50 border border-yellow-300/50 rounded-lg p-3 mb-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-sm font-semibold text-[#1a1f36] mb-0.5">
                  Углубленное изучение в учебнике
                </h3>
                <p className="text-xs text-gray-700">
                  Подробная теория, примеры и упражнения для практики.
                </p>
              </div>
              <Button
                onClick={() => {
                  const textbookRoute = moduleEntry.courseId === 'ege-basic' ? '/textbook-base'
                    : moduleEntry.courseId === 'ege-advanced' ? '/textbook-prof'
                    : '/textbook';
                  window.location.href = `${textbookRoute}?topic=${topicNumber}`;
                }}
                className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-white font-semibold h-9 w-full md:w-auto flex-shrink-0 px-5 text-sm"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Открыть учебник
              </Button>
            </div>
          </div>

          {/* Topic Test - Same style as Textbook */}
          {(() => {
            const testSkills = getTopicTestSkills(moduleSlug, topicId);
            const testQuestionCount = getTopicTestQuestionCount(testSkills);
            const testItemId = `${moduleSlug}-${topicId}-topic-test`;

            // Get progress data and calculate status
            const matchingItems = progressData.filter(
              (p) => p.item_id === testItemId && p.activity_type === "test"
            );
            const correctCount =
              matchingItems.length > 0
                ? Math.max(
                    ...matchingItems.map((item) =>
                      parseInt(item.correct_count || "0")
                    )
                  )
                : 0;
            const testStatus = getTopicTestStatus(
              correctCount,
              testQuestionCount
            );

            return (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-300/50 rounded-lg p-3 mb-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                  <div className="flex-shrink-0">
                    {(() => {
                      switch (testStatus) {
                        case "mastered":
                          return (
                            <div className="relative w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center">
                              <Crown className="h-5 w-5 text-white" />
                            </div>
                          );
                        case "proficient":
                          return (
                            <div className="w-9 h-9 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded-lg" />
                          );
                        case "familiar":
                          return (
                            <div className="w-9 h-9 rounded-lg border-2 border-orange-500 bg-[linear-gradient(to_top,theme(colors.orange.500)_20%,white_20%)]" />
                          );
                        case "attempted":
                          return (
                            <div className="w-9 h-9 border-2 border-orange-400 rounded-lg bg-white" />
                          );
                        default:
                          return (
                            <div className="w-9 h-9 border-2 border-gray-300 rounded-lg bg-white" />
                          );
                      }
                    })()}
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-semibold text-[#1a1f36] mb-0.5">
                      Тест по теме
                    </h3>
                    <p className="text-xs text-gray-700">
                      Take this test to cover ALL the skills taught in this topic
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      setSelectedExercise({
                        title: `Тест по теме: ${topic?.title}`,
                        skills: testSkills,
                        questionCount: testQuestionCount,
                        isTest: true,
                        itemId: testItemId,
                      })
                    }
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold h-9 w-full md:w-auto flex-shrink-0 px-5 text-sm"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Начать тест
                  </Button>
                </div>
              </div>
            );
          })()}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Skills */}
            <div>
              <h3 className="font-semibold text-[#1a1f36] text-sm mb-2">Навыки:</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Натуральные числа</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Целые числа</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Модуль числа</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Делимость</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">НОД и НОК</span>
              </div>
            </div>

            {/* Learning Goals */}
            <div>
              <h3 className="font-semibold text-[#1a1f36] text-sm mb-2">Цели обучения:</h3>
              <ul className="space-y-1 text-xs text-gray-700">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Понимать разницу между натуральными и целыми числами</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Выполнять операции с целыми числами</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Применять признаки делимости и находить НОД/НОК</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Single block with tabs */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 text-[#1a1f36] backdrop-blur-sm rounded-lg border border-white/20 shadow-sm"
        >
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-between rounded-none border-b-0 bg-transparent p-0 h-auto gap-1 md:gap-2 px-2 md:px-4 pt-4">
              <TabsTrigger
                value="overview"
                className="flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:bg-gray-50/50 data-[state=inactive]:text-gray-600 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Обзор</span>
                <span className="sm:hidden">Обзор</span>
              </TabsTrigger>
              <TabsTrigger
                value="articles"
                className="flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:bg-gray-50/50 data-[state=inactive]:text-gray-600 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Статьи ({topicArticles.length})</span>
                <span className="sm:hidden">Статьи</span>
              </TabsTrigger>
              <TabsTrigger
                value="demonstrations"
                className="flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:bg-gray-50/50 data-[state=inactive]:text-gray-600 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Демонстрации</span>
                <span className="sm:hidden">Демо</span>
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:bg-gray-50/50 data-[state=inactive]:text-gray-600 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Видео ({topic.videoData?.length || topic.videos || 0})</span>
                <span className="sm:hidden">Видео</span>
              </TabsTrigger>
              <TabsTrigger
                value="practice"
                className="flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:bg-gray-50/50 data-[state=inactive]:text-gray-600 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Упражнения ({exercises.length})</span>
                <span className="sm:hidden">Упр.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="m-0 p-6">
              {loadingArticle ? (
                <div className="text-sm text-gray-700">Загружаем обзор…</div>
              ) : article?.topic_text ? (
                <ArticleRenderer
                  text={article.topic_text}
                  article={{ skill: 0, art: article.topic_text }}
                />
              ) : (
                <div className="text-sm text-gray-700">
                  Обзор для этой темы пока не добавлен. Используйте учебник, видео и
                  упражнения.
                </div>
              )}
            </TabsContent>

            {/* Articles tab */}
            <TabsContent value="articles" className="m-0 p-6 space-y-8">
              {loadingArticles ? (
                <div className="text-sm text-gray-700">Загружаем статьи…</div>
              ) : topicArticles.length === 0 ? (
                <div className="text-sm text-gray-700">
                  Статьи для этой темы пока не найдены.
                </div>
              ) : (
                topicArticles.map((topicArticle, index) => (
                  <div key={topicArticle.skillId} className="space-y-4">
                    {topicArticle.article?.article_text ? (
                      <>
                        <div className="border-b border-gray-200 pb-2">
                          <h3 className="text-lg font-semibold text-[#1a1f36]">
                            Статья {index + 1} (Навык {topicArticle.skillId})
                          </h3>
                        </div>
                        <ArticleRenderer
                          text={topicArticle.article.article_text}
                          article={{
                            skill: topicArticle.skillId,
                            art: topicArticle.article.article_text
                          }}
                        />
                        <div className="flex justify-start pt-2">
                          <Button
                            onClick={() => {
                              setSelectedArticleQuiz({
                                skillId: topicArticle.skillId,
                                title: `Тест по статье ${index + 1} (Навык ${topicArticle.skillId})`
                              });
                            }}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Пройти тест по статье
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="text-sm text-gray-600">
                          Статья для навыка {topicArticle.skillId} пока не добавлена.
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* ✅ Demonstrations tab */}
            <TabsContent value="demonstrations" className="m-0 p-6 space-y-3">
              {hasDemonstrations ? (
                <>
                  <div className="text-sm text-gray-700">
                    Запусти интерактивные симуляции по теме.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="bg-[#1a1f36] text-white hover:bg-[#2d3748]"
                      onClick={() => open("divisibility")}
                    >
                      Открыть «Признаки делимости»
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => open("sci-notation")}
                    >
                      Открыть «Scientific notation»
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-700">
                  Демонстрации скоро появятся.
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="m-0 p-6 space-y-6">
              {(!topic.videoData || topic.videoData.length === 0) ? (
                <div className="text-sm text-gray-600">Видео для темы пока нет</div>
              ) : (
                topic.videoData.map((video, index) => (
                  <div key={video.videoId} className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-[#1a1f36] mb-1 flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-600" />
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-600">{video.description}</p>
                    </div>

                    {/* Embedded YouTube Player */}
                    <div className="bg-gray-100 rounded-lg overflow-hidden aspect-video w-full max-w-4xl">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${video.videoId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="practice" className="m-0 p-6 space-y-4">
              {exercises.map((ex, i) => {
                const itemId = `${moduleSlug}-${topicId}-ex${i}`;
                const status = getProgressStatus(itemId, "exercise");
                const exerciseWithId = { ...ex, itemId };

                const getStatusBadge = () => {
                  switch (status) {
                    case "mastered":
                      return { text: "Освоено", color: "bg-purple-100 text-purple-700" };
                    case "proficient":
                      return { text: "В процессе", color: "bg-orange-100 text-orange-700" };
                    case "familiar":
                      return { text: "Начато", color: "bg-blue-100 text-blue-700" };
                    case "attempted":
                      return { text: "Начато", color: "bg-blue-100 text-blue-700" };
                    default:
                      return { text: "Не начато", color: "bg-gray-100 text-gray-700" };
                  }
                };

                const statusBadge = getStatusBadge();
                const difficultyLabel = ex.isAdvanced ? "Сложный" : "Легкий";

                return (
                  <div
                    key={`ex-${i}`}
                    className="relative p-6 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Progress Cell - same as module page */}
                      <div className="flex-shrink-0">
                        {(() => {
                          switch (status) {
                            case "mastered":
                              return (
                                <div className="relative w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                                  <Crown className="h-6 w-6 text-white" />
                                </div>
                              );
                            case "proficient":
                              return (
                                <div className="w-12 h-12 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded-lg" />
                              );
                            case "familiar":
                              return (
                                <div className="w-12 h-12 rounded-lg border-2 border-orange-500 bg-[linear-gradient(to_top,theme(colors.orange.500)_20%,white_20%)]" />
                              );
                            case "attempted":
                              return (
                                <div className="w-12 h-12 border-2 border-orange-400 rounded-lg bg-white" />
                              );
                            default:
                              return (
                                <div className="w-12 h-12 border-2 border-gray-300 rounded-lg bg-white" />
                              );
                          }
                        })()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-[#1a1f36] mb-2">
                          {ex.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Базовые упражнения на закрепление материала темы
                        </p>

                        {/* Metadata badges */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>15 минут</span>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                            {difficultyLabel}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-md font-medium ${statusBadge.color}`}
                          >
                            {statusBadge.text}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Button
                          onClick={() =>
                            !ex.skills.length ? null : setSelectedExercise(exerciseWithId)
                          }
                          disabled={!ex.skills.length}
                          className="bg-[#1a1f36] text-white hover:bg-[#2d3748] px-6"
                        >
                          Начать упражнение
                        </Button>
                        <Button
                          variant="outline"
                          className="text-gray-700 border-gray-300 hover:bg-gray-50"
                        >
                          Отметить
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Topic Test - Different styling */}
              {(() => {
                const testSkills = getTopicTestSkills(moduleSlug, topicId);
                const testQuestionCount = getTopicTestQuestionCount(testSkills);
                const testItemId = `${moduleSlug}-${topicId}-topic-test`;
                const testStatus = getProgressStatus(testItemId, "exercise");

                if (testSkills.length === 0) return null;

                const getTestStatusBadge = () => {
                  switch (testStatus) {
                    case "mastered":
                      return { text: "Освоено", color: "bg-purple-100 text-purple-700" };
                    case "proficient":
                      return { text: "В процессе", color: "bg-orange-100 text-orange-700" };
                    case "familiar":
                      return { text: "Начато", color: "bg-blue-100 text-blue-700" };
                    case "attempted":
                      return { text: "Попытка", color: "bg-yellow-100 text-yellow-700" };
                    default:
                      return { text: "Не начато", color: "bg-gray-100 text-gray-700" };
                  }
                };

                const testStatusBadge = getTestStatusBadge();

                return (
                  <div
                    key="topic-test"
                    className="relative p-6 rounded-lg border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-all mt-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Progress Cell */}
                      <div className="flex-shrink-0">
                        {(() => {
                          switch (testStatus) {
                            case "mastered":
                              return (
                                <div className="relative w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                                  <Crown className="h-6 w-6 text-white" />
                                </div>
                              );
                            case "proficient":
                              return (
                                <div className="w-12 h-12 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded-lg" />
                              );
                            case "familiar":
                              return (
                                <div className="w-12 h-12 rounded-lg border-2 border-orange-500 bg-[linear-gradient(to_top,theme(colors.orange.500)_20%,white_20%)]" />
                              );
                            case "attempted":
                              return (
                                <div className="w-12 h-12 border-2 border-orange-400 rounded-lg bg-white" />
                              );
                            default:
                              return (
                                <div className="w-12 h-12 border-2 border-gray-300 rounded-lg bg-white" />
                              );
                          }
                        })()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-orange-900 mb-2 flex items-center gap-2">
                          <Zap className="h-5 w-5 text-orange-600" />
                          Тест по теме: {topic?.title}
                        </h4>
                        <p className="text-sm text-orange-800 mb-3">
                          Проверьте усвоение материала этой темы • {testQuestionCount}{" "}
                          {testQuestionCount === 1
                            ? "вопрос"
                            : testQuestionCount < 5
                            ? "вопроса"
                            : "вопросов"}
                        </p>

                        {/* Metadata badges */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-orange-700">
                            <Clock className="h-4 w-4" />
                            <span>10-15 минут</span>
                          </div>
                          <span className="px-3 py-1 bg-orange-200 text-orange-900 rounded-md font-semibold">
                            Тест
                          </span>
                          <span
                            className={`px-3 py-1 rounded-md font-medium ${testStatusBadge.color}`}
                          >
                            {testStatusBadge.text}
                          </span>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Button
                          onClick={() =>
                            setSelectedExercise({
                              title: `Тест по теме: ${topic?.title}`,
                              skills: testSkills,
                              questionCount: testQuestionCount,
                              isTest: true,
                              itemId: testItemId,
                            })
                          }
                          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 font-semibold"
                        >
                          Начать тест
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {exercises.length === 0 && (
                <div className="text-sm text-gray-600">Упражнения для темы пока нет</div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </>
  );
};

export default TopicPage;
