// src/pages/TopicPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Play, BookOpen, Target, X, Crown, Clock, CheckCircle2, Zap, Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StreakDisplay } from "@/components/streak/StreakDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ArticleRenderer from "@/components/ArticleRenderer";
import OgeExerciseQuiz, { QuizMode } from "@/components/OgeExerciseQuiz";
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
import { OGE_TOPIC_SKILL_MAPPING, EGE_BASIC_TOPIC_SKILL_MAPPING, EGE_PROFIL_TOPIC_SKILL_MAPPING } from "@/lib/topic-skill-mappings";

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

type TopicSkillMeta = {
  number: number | null;
  label: string;
  importance: number | null;
};

const getCourseMapping = (courseId: string) => {
  switch (courseId) {
    case "oge-math":
      return OGE_TOPIC_SKILL_MAPPING;
    case "ege-basic":
      return EGE_BASIC_TOPIC_SKILL_MAPPING;
    case "ege-advanced":
      return EGE_PROFIL_TOPIC_SKILL_MAPPING;
    default:
      return null;
  }
};

const normalizeSkillEntry = (entry: any): TopicSkillMeta | null => {
  if (entry === null || entry === undefined) return null;

  if (typeof entry === "number") {
    return {
      number: entry,
      label: `Навык ${entry}`,
      importance: null,
    };
  }

  if (typeof entry === "string") {
    return {
      number: null,
      label: entry.trim(),
      importance: null,
    };
  }

  if (typeof entry === "object") {
    const number =
      typeof entry.number === "number"
        ? entry.number
        : typeof entry.id === "number"
        ? entry.id
        : null;
    const label =
      (typeof entry.Темы === "string" && entry.Темы.trim()) ||
      (typeof entry.Навык === "string" && entry.Навык.trim()) ||
      (typeof entry.Тема === "string" && entry.Тема.trim()) ||
      (typeof entry.name === "string" && entry.name.trim()) ||
      (typeof entry.title === "string" && entry.title.trim()) ||
      (number !== null ? `Навык ${number}` : null) ||
      "Навык";
    const importance =
      typeof entry.importance === "number"
        ? entry.importance
        : typeof entry.важность === "number"
        ? entry.важность
        : null;

    return {
      number,
      label,
      importance,
    };
  }

  return null;
};

const extractSkillEntriesFromTopic = (topicData: any): TopicSkillMeta[] => {
  if (!topicData) return [];

  const possibleArrays = [
    topicData?.навыки,
    topicData?.Навыки,
    topicData?.skills,
    topicData?.skillList,
    topicData,
  ];

  for (const candidate of possibleArrays) {
    if (Array.isArray(candidate)) {
      const seen = new Set<string>();
      const entries: TopicSkillMeta[] = [];
      candidate.forEach((item: any) => {
        const normalized = normalizeSkillEntry(item);
        if (!normalized) return;
        const key =
          normalized.number !== null
            ? `num-${normalized.number}`
            : `label-${normalized.label.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({
            number: normalized.number,
            label: normalized.label,
            importance: normalized.importance,
          });
        }
      });
      if (entries.length > 0) {
        return entries;
      }
    }
  }

  return [];
};

const getTopicSkillsFromMapping = (
  courseId: string,
  topicNumberRaw: string
): { entries: TopicSkillMeta[]; numbers: number[] } => {
  const mapping = getCourseMapping(courseId);
  if (!mapping) return { entries: [], numbers: [] };

  const normalizedTopicNumber =
    courseId === "oge-math"
      ? topicNumberRaw.replace(/E/gi, "")
      : topicNumberRaw;

  const matchesTopicKey = (topicKey: string) => {
    if (topicKey === topicNumberRaw) return true;
    if (topicKey === normalizedTopicNumber) return true;
    const normalizedTopicKey =
      courseId === "oge-math" ? topicKey.replace(/E/gi, "") : topicKey;
    if (normalizedTopicKey === normalizedTopicNumber) return true;
    if (topicKey.replace(/E/gi, "") === topicNumberRaw) return true;
    return false;
  };

  const tryExtract = (topicKey: string, topicData: any) => {
    if (!matchesTopicKey(topicKey)) return null;
    const entries = extractSkillEntriesFromTopic(topicData);
    return entries.length > 0 ? entries : null;
  };

  if (typeof mapping === "object" && !Array.isArray(mapping)) {
    if (mapping[topicNumberRaw]) {
      const entries = extractSkillEntriesFromTopic(mapping[topicNumberRaw]);
      if (entries.length > 0) {
        return {
          entries,
          numbers: entries
            .map((entry) => entry.number)
            .filter((num): num is number => num !== null),
        };
      }
    }
    if (mapping[normalizedTopicNumber]) {
      const entries = extractSkillEntriesFromTopic(mapping[normalizedTopicNumber]);
      if (entries.length > 0) {
        return {
          entries,
          numbers: entries
            .map((entry) => entry.number)
            .filter((num): num is number => num !== null),
        };
      }
    }

    for (const moduleKey of Object.keys(mapping)) {
      const moduleValue = (mapping as Record<string, any>)[moduleKey];
      if (
        moduleValue &&
        typeof moduleValue === "object" &&
        !Array.isArray(moduleValue)
      ) {
        for (const topicKey of Object.keys(moduleValue)) {
          const entries = tryExtract(topicKey, moduleValue[topicKey]);
          if (entries) {
            return {
              entries,
              numbers: entries
                .map((entry) => entry.number)
                .filter((num): num is number => num !== null),
            };
          }
        }
      } else if (Array.isArray(moduleValue)) {
        const entries = tryExtract(moduleKey, moduleValue);
        if (entries) {
          return {
            entries,
            numbers: entries
              .map((entry) => entry.number)
              .filter((num): num is number => num !== null),
          };
        }
      }
    }
  }

  return { entries: [], numbers: [] };
};

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
  const [topicSkillsMeta, setTopicSkillsMeta] = useState<TopicSkillMeta[]>([]);

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

    if (!topicNumber || !moduleEntry?.courseId) {
      if (!ignore) {
        setTopicArticles([]);
        setTopicSkillsMeta([]);
        setLoadingArticles(false);
      }
      return;
    }

    const { entries, numbers } = getTopicSkillsFromMapping(
      moduleEntry.courseId,
      topicNumber
    );

    if (!ignore) {
      setTopicSkillsMeta(entries);
    }

    if (numbers.length === 0) {
      console.warn(`[Articles] No skills found for topic ${topicNumber}`);
      if (!ignore) {
        setTopicArticles([]);
        setLoadingArticles(false);
      }
      return;
    }

    (async () => {
      try {
        const articlesPromises = numbers.map(async (skillId) => {
          const { data, error } = await supabase
            .from("articles_oge_full")
            .select("*")
            .eq("ID", skillId)
            .maybeSingle();

          if (error) {
            console.error(
              `[Articles] Error fetching article for skill ${skillId}:`,
              error
            );
            return { skillId, article: null };
          }

          if (!data) {
            console.log(`[Articles] No article found for skill ${skillId}`);
          } else {
            console.log(
              `[Articles] Found article for skill ${skillId}:`,
              data.ID,
              data.article_text ? "has text" : "no text"
            );
          }

          return { skillId, article: data };
        });

        const articles = await Promise.all(articlesPromises);
        console.log(
          `[Articles] Total articles loaded: ${
            articles.length
          }, with content: ${
            articles.filter((a) => a.article?.article_text).length
          }`
        );

        if (!ignore) {
          setTopicArticles(articles);
          setLoadingArticles(false);
        }
      } catch (error) {
        console.error("Error loading articles:", error);
        if (!ignore) {
          setTopicArticles([]);
          setTopicSkillsMeta([]);
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
    (ExerciseConfig & {
      itemId?: string;
      mode?: QuizMode;
      courseId?: string;
      isModuleTest?: boolean;
      isMidTest?: boolean;
    }) | null
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

  const skillsChips = useMemo(() => {
    if (!topicSkillsMeta || topicSkillsMeta.length === 0) return [];
    return topicSkillsMeta.slice(0, 8);
  }, [topicSkillsMeta]);

  const learningGoals = useMemo(() => {
    if (!topicSkillsMeta || topicSkillsMeta.length === 0) return [];
    const sorted = [...topicSkillsMeta].sort((a, b) => {
      const importanceA = a.importance ?? 0;
      const importanceB = b.importance ?? 0;
      if (importanceA === importanceB) return 0;
      return importanceB - importanceA;
    });
    const prioritized = sorted.filter((entry) => entry.label).slice(0, 4);
    if (prioritized.length > 0) return prioritized;
    return topicSkillsMeta.slice(0, 4);
  }, [topicSkillsMeta]);

  const topicTestData = useMemo(() => {
    if (!moduleEntry || !topic) return null;

    const testSkills = getTopicTestSkills(moduleSlug, topicId);
    const testQuestionCount = getTopicTestQuestionCount(testSkills);
    const testItemId = `${moduleSlug}-${topicId}-topic-test`;

    const matchingItems = progressData.filter(
      (p) => p.item_id === testItemId && (p.activity_type === "topic_test" || p.activity_type === "test")
    );
    const correctCount =
      matchingItems.length > 0
        ? Math.max(
            ...matchingItems.map((item) => parseInt(item.correct_count || "0"))
          )
        : 0;
    const testStatus = getTopicTestStatus(correctCount, testQuestionCount);

    return {
      testSkills,
      testQuestionCount,
      testItemId,
      testStatus,
      correctCount,
    };
  }, [moduleEntry, topic, moduleSlug, topicId, progressData]);

  // ✅ Use global simulation opener
  const { open } = useSimulation();

  const renderTestStatusBadge = (
    status: ReturnType<typeof getTopicTestStatus> | "not_started",
    size: "lg" | "sm" = "lg"
  ) => {
    const sizeClasses = size === "lg" ? "w-9 h-9" : "w-6 h-6";
    const iconClasses = size === "lg" ? "h-4 w-4" : "h-3 w-3";

    const baseClasses = `flex items-center justify-center rounded-full border-2 ${sizeClasses}`;

    switch (status) {
      case "mastered":
        return (
          <div className={`${baseClasses} bg-purple-100 border-purple-400 text-purple-800`}>
            <Sparkles className={iconClasses} />
          </div>
        );
      case "proficient":
        return (
          <div className={`${baseClasses} bg-orange-100 border-orange-400 text-orange-700`}>
            <Sparkles className={iconClasses} />
          </div>
        );
      case "familiar":
        return (
          <div className={`${baseClasses} bg-emerald-50 border-emerald-300 text-emerald-600`}>
            <Sparkles className={iconClasses} />
          </div>
        );
      case "attempted":
        return (
          <div className={`${baseClasses} bg-slate-100 border-slate-300 text-slate-500`}>
            <Sparkles className={iconClasses} />
          </div>
        );
      default:
        return (
          <div className={`${baseClasses} bg-white border-slate-200 text-slate-400`}>
            <Sparkles className={iconClasses} />
          </div>
        );
    }
  };

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
              mode={selectedExercise.mode}
              isModuleTest={Boolean(selectedExercise.isModuleTest)}
              itemId={selectedExercise.itemId}
              courseId={selectedExercise.courseId}
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
              mode="skill_quiz"
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
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/module/${moduleSlug}`)}
              className="hover:bg-white/20 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к модулю
            </Button>
            <div>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-white font-semibold"
              title="Подробная теория, примеры и упражнения для практики."
              onClick={() => {
                const textbookRoute =
                  moduleEntry.courseId === "ege-basic"
                    ? "/textbook-base"
                    : moduleEntry.courseId === "ege-advanced"
                    ? "/textbook-prof"
                    : "/textbook";
                window.location.href = `${textbookRoute}?topic=${topicNumber}`;
              }}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Открыть учебник
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
              title="Пройдите этот тест, чтобы охватить все навыки по этой теме"
              onClick={() => {
                if (!topicTestData) return;
                setSelectedExercise({
                  title: `Тест по теме: ${topic?.title}`,
                  skills: topicTestData.testSkills,
                  questionCount: topicTestData.testQuestionCount,
                  itemId: topicTestData.testItemId,
                  courseId: getNumericCourseId(moduleEntry?.courseId || 'oge-math'),
                  mode: 'topic_test',
                });
              }}
              disabled={!topicTestData || topicTestData.testSkills.length === 0}
            >
              <span className="mr-2 inline-flex">
                {renderTestStatusBadge(topicTestData?.testStatus ?? "not_started", "sm")}
              </span>
              Итоговый тест по теме
            </Button>
          </div>
        </div>

        {/* Lesson Description */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-white/20 shadow-sm p-4 mb-4">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Skills */}
            <div>
              <h3 className="font-semibold text-[#1a1f36] text-sm mb-2">Навыки:</h3>
              <div className="flex flex-wrap gap-1.5">
                {skillsChips.length > 0 ? (
                  skillsChips.map((skill) => {
                    const key = `${skill.number ?? skill.label}`;
                    const textbookRoute = moduleEntry.courseId === "ege-basic"
                      ? "/textbook-base"
                      : moduleEntry.courseId === "ege-advanced"
                      ? "/textbook-prof"
                      : "/textbook";

                    if (skill.number !== null && skill.number !== undefined) {
                      return (
                        <a
                          key={key}
                          href={`${textbookRoute}?skill=${skill.number}`}
                          className="px-2 py-1 text-xs text-gray-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          {skill.label}
                        </a>
                      );
                    }

                    return (
                      <span key={key} className="px-2 py-1 text-xs text-gray-600">
                        {skill.label}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-gray-500">
                    Навыки для этой темы появятся позже.
                  </span>
                )}
              </div>
            </div>

            {/* Learning Goals */}
            <div>
              <h3 className="font-semibold text-[#1a1f36] text-sm mb-2">Цели обучения:</h3>
              <ul className="space-y-1 text-xs text-gray-700">
                {learningGoals.length > 0 ? (
                  learningGoals.map((goal) => (
                    <li
                      key={`${goal.number ?? goal.label}`}
                      className="flex items-start gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Освоить «{goal.label}»</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-1.5 text-gray-500">
                    <CheckCircle2 className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>Цели обучения появятся позже.</span>
                  </li>
                )}
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
                className="relative flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-[#1a1f36] data-[state=active]:border-orange-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-orange-200 data-[state=inactive]:bg-gray-50/70 data-[state=inactive]:text-gray-500 data-[state=inactive]:opacity-80"
              >
                <span className="hidden sm:inline">Обзор</span>
                <span className="sm:hidden">Обзор</span>
              </TabsTrigger>
              <TabsTrigger
                value="articles"
                className="relative flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-[#1a1f36] data-[state=active]:border-orange-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-orange-200 data-[state=inactive]:bg-gray-50/70 data-[state=inactive]:text-gray-500 data-[state=inactive]:opacity-80"
              >
                <span className="hidden sm:inline">Статьи ({topicArticles.length})</span>
                <span className="sm:hidden">Статьи</span>
              </TabsTrigger>
              <TabsTrigger
                value="demonstrations"
                className="relative flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-[#1a1f36] data-[state=active]:border-orange-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-orange-200 data-[state=inactive]:bg-gray-50/70 data-[state=inactive]:text-gray-500 data-[state=inactive]:opacity-80"
              >
                <span className="hidden sm:inline">Демонстрации</span>
                <span className="sm:hidden">Демо</span>
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="relative flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-[#1a1f36] data-[state=active]:border-orange-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-orange-200 data-[state=inactive]:bg-gray-50/70 data-[state=inactive]:text-gray-500 data-[state=inactive]:opacity-80"
              >
                <span className="hidden sm:inline">Видео ({topic.videoData?.length || topic.videos || 0})</span>
                <span className="sm:hidden">Видео</span>
              </TabsTrigger>
              <TabsTrigger
                value="practice"
                className="relative flex-1 rounded-t-lg rounded-b-none border border-b-0 border-gray-200 px-2 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-[#1a1f36] data-[state=active]:border-orange-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-orange-200 data-[state=inactive]:bg-gray-50/70 data-[state=inactive]:text-gray-500 data-[state=inactive]:opacity-80"
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
                  <div
                    key={topicArticle.skillId}
                    className="space-y-4 rounded-xl border border-gray-200 bg-white/95 shadow-sm p-4 md:p-6"
                  >
                    {topicArticle.article?.article_text ? (
                      <>
                        <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-[#1a1f36]">
                            Статья {index + 1} (Навык {topicArticle.skillId})
                          </h3>
                          <span className="text-xs uppercase tracking-wide text-orange-500">
                            Учебник
                          </span>
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
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
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
                  <div className="grid gap-4 sm:grid-cols-2 pt-1">
                    <button
                      type="button"
                      onClick={() => open("divisibility")}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      <img
                        src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/img/divisibility_sim.png"
                        alt="Предпросмотр симуляции «Признаки делимости»"
                        className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="text-xs uppercase tracking-wide text-white/80">Симуляция</p>
                        <p className="text-base font-semibold">Открыть «Признаки делимости»</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => open("sci-notation")}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      <img
                        src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/img/scientific_sim.png"
                        alt="Предпросмотр симуляции «Научная запись»"
                        className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="text-xs uppercase tracking-wide text-white/80">Симуляция</p>
                        <p className="text-base font-semibold">Открыть «Научная запись»</p>
                      </div>
                    </button>
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

            <TabsContent value="practice" className="m-0 space-y-4 p-4 sm:p-6">
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
                  <button
                    key={`ex-${i}`}
                    type="button"
                    onClick={() => {
                      if (!ex.skills.length) return;
                      setSelectedExercise({
                        title: ex.title,
                        skills: ex.skills,
                        questionCount: ex.questionCount,
                        itemId,
                        courseId: getNumericCourseId(moduleEntry?.courseId || 'oge-math'),
                        mode: 'exercise',
                      });
                    }}
                    className="relative w-full p-0 text-left rounded-lg border border-gray-200 bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-lg"
                    disabled={!ex.skills.length}
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                      {/* Progress Cell - same as module page */}
                      <div className="flex-shrink-0 self-start sm:self-auto">
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
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="text-base font-semibold text-[#1a1f36] sm:text-lg">
                          {ex.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Базовые упражнения на закрепление материала темы
                        </p>

                        {/* Metadata badges */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 sm:gap-3 sm:text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>15 минут</span>
                          </div>
                          <span className="rounded-md bg-green-100 px-3 py-1 font-medium text-green-700">
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
                      <div className="flex w-full flex-shrink-0 items-center justify-center sm:w-auto sm:justify-end">
                        <span className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto">
                          Начать упражнение
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Topic Test - Different styling */}
              {(() => {
                const testSkills = getTopicTestSkills(moduleSlug, topicId);
                const testQuestionCount = getTopicTestQuestionCount(testSkills);
                const testItemId = `${moduleSlug}-${topicId}-topic-test`;
                const testStatus = getProgressStatus(testItemId, "topic_test");

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
                  <button
                    key="topic-test"
                    type="button"
                    onClick={() =>
                      setSelectedExercise({
                        title: `Тест по теме: ${topic?.title}`,
                        skills: testSkills,
                        questionCount: testQuestionCount,
                        itemId: testItemId,
                        courseId: getNumericCourseId(moduleEntry?.courseId || 'oge-math'),
                        mode: 'topic_test',
                      })
                    }
                    className="relative mt-6 w-full rounded-lg border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 p-0 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                      {/* Progress Cell */}
                      <div className="flex-shrink-0 self-start sm:self-auto">
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
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-orange-700 sm:text-sm">
                          <Zap className="h-4 w-4" />
                          Тест по теме
                        </div>
                        <h4 className="text-base font-semibold text-[#1a1f36] sm:text-xl">
                          {`(${testQuestionCount} вопросов)`}
                        </h4>
                        <p className="text-sm text-gray-700">
                          Закрепите тему, решив подборку задач из банка.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700 sm:gap-3 sm:text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>25 минут</span>
                          </div>
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md font-medium">
                            Средний уровень
                          </span>
                          <span
                            className={`px-3 py-1 rounded-md font-medium ${testStatusBadge.color}`}
                          >
                            {testStatusBadge.text}
                          </span>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="flex w-full flex-shrink-0 items-center justify-center sm:w-auto sm:justify-end">
                        <span className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto">
                          Пройти тест по теме
                        </span>
                      </div>
                    </div>
                  </button>
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
