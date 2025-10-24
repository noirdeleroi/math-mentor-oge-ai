// src/pages/ModulePage.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, BookOpen, Target, Crown, Zap, Star, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreakDisplay } from "@/components/streak/StreakDisplay";
import VideoPlayerWithChat from "@/components/video/VideoPlayerWithChat";
import ArticleRenderer from "@/components/ArticleRenderer";
import OgeExerciseQuiz from "@/components/OgeExerciseQuiz";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import type { TopicContent, QuizContent } from "@/lib/modules.registry";
import { modulesRegistry } from "@/lib/modules.registry";
import { ModuleProgressBar } from "@/components/ModuleProgressBar";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./NotFound";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getTopicTestSkills, getTopicTestQuestionCount } from "@/lib/topicTestHelpers";

const ModulePage = () => {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const navigate = useNavigate();
  const { refetch, getProgressStatus } = useModuleProgress();
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedVideo, setSelectedVideo] = useState<{ videoId: string; title: string; description: string } | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<{ title: string; content: string } | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<{
    title: string;
    skills: number[];
    questionCount?: number;
    isAdvanced?: boolean;
    isModuleTest?: boolean;
    isTest?: boolean;
    moduleTopics?: string[];
    courseId?: string;
    itemId?: string;
  } | null>(null);

  if (!moduleSlug || !modulesRegistry[moduleSlug]) {
    return <NotFound />;
  }

  const module = modulesRegistry[moduleSlug];

  const loadOverviewByTopicNumber = async (topicNumber: string) => {
    const { data, error } = await supabase
      .from("topic_articles")
      .select("topic_text")
      .eq("topic_id", topicNumber)
      .maybeSingle();
    if (error) {
      console.error("Failed to load topic overview:", error);
      return null;
    }
    return data ? { title: `Тема ${topicNumber}`, content: data.topic_text } : null;
  };

  const renderTopicItem = (topic: TopicContent, topicIndex: number) => (
    <motion.div
      key={topic.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: topicIndex * 0.05 }}
      className="bg-white/95 text-[#1a1f36] rounded-lg p-6 mb-4 border border-white/20 shadow-sm"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <h3 className="text-xl font-semibold mb-6">
        <Link
          to={`/module/${moduleSlug}/topic/${topic.id}`}
          className="inline-block relative z-10 hover:underline focus:outline-none focus:underline"
        >
          {topic.title}
        </Link>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column - Learn */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">Изучение</h4>
          <div className="space-y-3">
            {/* Videos */}
            {Array.from({ length: topic.videos }, (_, i) => (
              <div
                key={`video-${i}`}
                className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-black/5 hover:bg-white/90 cursor-pointer transition-colors"
                onClick={() => {
                  if (topic.videoData && topic.videoData[i]) {
                    setSelectedVideo(topic.videoData[i]);
                  }
                }}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                    <Play className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium truncate">Видео {i + 1}</span>
                </div>
                <span className="text-sm text-blue-600 flex-shrink-0 ml-2">
                  {topic.videoData && topic.videoData[i] ? "Доступно" : "Не начато"}
                </span>
              </div>
            ))}

            {/* Article (Обзор) */}
            <div
              className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-purple-200/40 hover:bg-white/90 cursor-pointer transition-colors"
              onClick={async () => {
                const topicNumber = module.topicMapping[topicIndex];

                const dbArt = await loadOverviewByTopicNumber(topicNumber);
                if (dbArt?.content) {
                  setSelectedArticle({
                    title: dbArt.title ?? `Тема ${topicNumber}: ${topic.title}`,
                    content: dbArt.content,
                  });
                  return;
                }

                if (module.articleContent && module.articleContent[topic.id]) {
                  setSelectedArticle(module.articleContent[topic.id]);
                  return;
                }

                setSelectedArticle({
                  title: `Тема ${topicNumber}: ${topic.title}`,
                  content:
                    `<p>Обзор для этой темы пока не добавлен. Откройте «Читать учебник», затем посмотрите видео и переходите к практике.</p>`,
                });
              }}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2 bg-purple-100 rounded-full flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium truncate">Обзор</span>
              </div>
              <span className="text-sm text-purple-600 flex-shrink-0 ml-2">Откроется</span>
            </div>

            {/* Read Textbook */}
            <div
              className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-purple-200/40 hover:bg-white/90 cursor-pointer transition-colors"
              onClick={() => (window.location.href = `/textbook?topic=${module.topicMapping[topicIndex]}`)}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2 bg-purple-100 rounded-full flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium truncate">Читать учебник</span>
              </div>
              <span className="text-sm text-gray-600 flex-shrink-0 ml-2">Доступно</span>
            </div>
          </div>
        </div>

        {/* Right Column - Practice */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">Практика</h4>
          <div className="space-y-3">
            {Array.from({ length: topic.exercises }, (_, i) => {
              const exerciseData = module.getExerciseData
                ? module.getExerciseData(topic.id, i)
                : { title: `${topic.title} (упражнение ${i + 1})`, skills: [] };

              const itemId = `${moduleSlug}-${topic.id}-ex${i}`;
              const status = getProgressStatus(itemId, 'exercise');

              const renderProgressCell = () => {
                switch (status) {
                  case 'mastered':
                    return (
                      <div className="relative w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    );
                  case 'proficient':
                    return <div className="w-6 h-6 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded" />;
                  case 'familiar':
                    return <div className="w-6 h-6 rounded border border-orange-500 bg-[linear-gradient(to_top,theme(colors.orange.500)_20%,white_20%)]" />;
                  case 'attempted':
                    return <div className="w-6 h-6 border-2 border-orange-400 rounded bg-white" />;
                  default:
                    return <div className="w-6 h-6 border-2 border-gray-300 rounded bg-white" />;
                }
              };

              return (
                <div 
                  key={`exercise-${i}`} 
                  onClick={() => exerciseData.skills.length > 0 ? setSelectedExercise({ ...exerciseData, itemId }) : null}
                  className={`p-3 bg-white/70 rounded-lg border border-green-200/40 flex items-center justify-between gap-3 transition-all ${
                    exerciseData.skills.length > 0 ? 'hover:bg-white hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                      <Target className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium truncate">
                      {exerciseData.title}
                      {exerciseData.isAdvanced && (
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          * Не в программе ОГЭ
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {renderProgressCell()}
                  </div>
                </div>
              );
            })}

            {/* Topic Test */}
            {(() => {
              const testSkills = getTopicTestSkills(moduleSlug!, topic.id);
              const testQuestionCount = getTopicTestQuestionCount(testSkills);
              const testItemId = `${moduleSlug}-${topic.id}-topic-test`;
              const testStatus = getProgressStatus(testItemId, 'exercise');

              const renderTestProgressCell = () => {
                switch (testStatus) {
                  case 'mastered':
                    return (
                      <div className="relative w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    );
                  case 'proficient':
                    return <div className="w-6 h-6 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded" />;
                  case 'familiar':
                    return <div className="w-6 h-6 rounded border border-orange-500 bg-[linear-gradient(to_top,theme(colors.orange.500)_20%,white_20%)]" />;
                  case 'attempted':
                    return <div className="w-6 h-6 border-2 border-orange-400 rounded bg-white" />;
                  default:
                    return <div className="w-6 h-6 border-2 border-gray-300 rounded bg-white" />;
                }
              };

              if (testSkills.length === 0) return null;

              return (
                <div 
                  key="topic-test"
                  onClick={() => setSelectedExercise({
                    title: `Тест по теме: ${topic.title}`,
                    skills: testSkills,
                    questionCount: testQuestionCount,
                    isTest: true,
                    itemId: testItemId
                  })}
                  className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border-2 border-orange-300 flex items-center justify-between gap-3 transition-all hover:shadow-md cursor-pointer hover:from-orange-100 hover:to-amber-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-orange-900">
                      Тест по теме
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {renderTestProgressCell()}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderQuiz = (quiz: QuizContent, index: number) => (
    <motion.div
      key={quiz.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (module.topics.length + index) * 0.05 }}
      className="bg-white/95 text-[#1a1f36] rounded-lg p-6 mb-6 border border-white/20 shadow-sm"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-3">{quiz.title}</h3>
          <p className="text-sm text-gray-700 mb-4">{quiz.description}</p>
          <Button
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            onClick={() => {
              if (!module.getQuizData) return;
              const quizData = module.getQuizData(quiz.id);
              if (!quizData) return;

              const isFinal = quiz.id === "module-exam";
              const itemId = `${moduleSlug}-${quiz.id}`;
              setSelectedExercise({
                ...quizData,
                isModuleTest: isFinal,
                moduleTopics: isFinal ? module.topicMapping : undefined,
                courseId: isFinal ? "1" : undefined,
                itemId
              });
            }}
          >
            Начать тест
          </Button>
        </div>
        <div className="ml-8">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-16 h-20 bg-gradient-to-br from-orange-300 to-amber-300 rounded-lg shadow-inner"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const totalExercises = module.topics.reduce((sum, topic) => sum + topic.exercises, 0);

  return (
    <>
      {/* Modals (stay above navbar/background) */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-white rounded-lg overflow-hidden">
            <VideoPlayerWithChat
              video={{
                videoId: selectedVideo.videoId,
                title: selectedVideo.title,
                description: selectedVideo.description
              }}
              onClose={() => setSelectedVideo(null)}
            />
          </div>
        </div>
      )}

      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-20 p-4 overflow-y-auto">
          <div className="w-full max-w-6xl bg-white rounded-lg overflow-hidden max-h-[85vh] relative">
            <div className="">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-xl font-bold">{selectedArticle.title}</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedArticle(null)} className="absolute top-2 right-2 z-10">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[calc(85vh-4rem)] p-6">
                <ArticleRenderer
                  text={selectedArticle.content}
                  article={{ skill: 1, art: selectedArticle.content }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <OgeExerciseQuiz
              title={selectedExercise.title}
              skills={selectedExercise.skills}
              onBack={() => {
                setSelectedExercise(null);
                refetch();
                setRefreshKey(prev => prev + 1);
              }}
              questionCount={selectedExercise.questionCount}
              isModuleTest={selectedExercise.isModuleTest}
              courseId={selectedExercise.courseId}
              itemId={selectedExercise.itemId}
            />
          </div>
        </div>
      )}

      {/* Content wrapper that sits on top of the layout background */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/cellard-lp2")}
            className="mr-4 hover:bg-white/20 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к карте
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              {module.title.replace(/Модуль/g, 'Урок')}
            </h1>
            <p className="text-gray-200/90 mt-1">{module.subtitle}</p>
          </div>
        </motion.div>

        {/* Module Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/95 text-[#1a1f36] backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/20 shadow-lg max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg font-semibold"> {module.masteryPoints} возможных баллов мастерства </span>
            <Info className="h-4 w-4 text-gray-500" />
          </div>

          <div className="text-sm text-gray-700 mb-4">{module.skillsDescription}</div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-700" />
              <span className="text-sm">Освоено</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded" />
              <span className="text-sm">Владею</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-300
             bg-gradient-to-t from-orange-500 from-[20%] to-gray-200 to-[20%]" />
              <span className="text-sm">Знаком</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-400 rounded" />
              <span className="text-sm">Попытался</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 rounded bg-white" />
              <span className="text-sm">Не начато</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Тест</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">Итоговый тест</span>
            </div>
          </div>

          {/* Progress Grid */}
          <ModuleProgressBar
            key={refreshKey}
            moduleSlug={moduleSlug!}
            orderedContent={module.orderedContent}
            topics={module.topics}
            quizzes={module.quizzes}
            getExerciseData={module.getExerciseData}
            onExerciseClick={(topicId, exerciseIndex) => {
              const exerciseData = module.getExerciseData?.(topicId, exerciseIndex);
              if (exerciseData) {
                const itemId = `${moduleSlug}-${topicId}-ex${exerciseIndex}`;
                setSelectedExercise({ ...exerciseData, itemId });
              }
            }}
            onQuizClick={(quizId) => {
              const quizData = module.getQuizData?.(quizId);
              if (quizData) {
                const itemId = `${moduleSlug}-${quizId}`;
                setSelectedExercise({ ...quizData, itemId });
              }
            }}
            onExamClick={() => {
              const examData = module.getQuizData?.('module-exam');
              if (examData) {
                const itemId = `${moduleSlug}-module-exam`;
                setSelectedExercise({
                  ...examData,
                  isModuleTest: true,
                  moduleTopics: module.topicMapping,
                  courseId: "1",
                  itemId
                });
              }
            }}
          />
        </motion.div>

        {/* Content List */}
        <div className="max-w-4xl mx-auto">
          {module.orderedContent.map((item, globalIndex) => {
            if (item.type === "topic" && item.topicIndex !== undefined) {
              return renderTopicItem(module.topics[item.topicIndex], item.topicIndex);
            }
            if (item.type === "quiz") {
              if (item.isFinalTest) {
                return renderQuiz(
                  {
                    id: "module-exam",
                    title: "Итоговый тест модуля",
                    description: `Проверьте свои знания по всему модулю "${module.title.split(": ")[1]}"`
                  },
                  globalIndex
                );
              }
              if (item.quizIndex !== undefined) {
                return renderQuiz(module.quizzes[item.quizIndex], item.quizIndex);
              }
            }
            return null;
          })}
        </div>
      </div>
    </>
  );
};

export default ModulePage;
