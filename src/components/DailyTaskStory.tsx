import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ChatRenderer2 from './chat/ChatRenderer2';
import { useNavigate, useLocation } from 'react-router-dom';
import { findTopicRoute } from '@/lib/topic-routing';
import { COURSES, getCourseFromRoute } from '@/lib/courses.registry';

export interface DailyTaskStoryProps {
  /** Optional fallback; route-derived course takes precedence. */
  courseId?: string | null;
}

export const DailyTaskStory: React.FC<DailyTaskStoryProps> = ({ courseId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve course from route
  const routeCourse = getCourseFromRoute(location.pathname);
  const routeCourseId = routeCourse?.numericId ?? null;

  // Neutral mode: pages without a course
  const neutral =
    routeCourseId == null && (courseId == null || Number.isNaN(Number(courseId)));

  // Effective course id (null in neutral mode)
  const effectiveCourseIdNum: number | null = neutral
    ? null
    : typeof routeCourseId === 'number'
    ? routeCourseId
    : courseId != null
    ? Number(courseId)
    : null;

  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [tutorName, setTutorName] = useState('AI Tutor');
  const [task, setTask] = useState('');
  const [storyId, setStoryId] = useState<number | null>(null);
  const [seen, setSeen] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [learningTopics, setLearningTopics] = useState<string[]>([]);
  const [failedTopics, setFailedTopics] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Profile (avatar + tutor name)
        const { data: profile } = await supabase
          .from('profiles')
          .select('tutor_avatar_url, tutor_name')
          .eq('user_id', user.id)
          .single();

        setAvatarUrl(
          profile?.tutor_avatar_url ||
            'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor'
        );
        if (profile?.tutor_name) setTutorName(profile.tutor_name);

        // Neutral: skip stories query and show generic message
        if (neutral) {
          setTask(
            'Молодец! Продолжай в том же духе 🎯 Зайди в курс, чтобы увидеть сообщение от своего ИИ-репетитора.'
          );
          setStoryId(null);
          setSeen(1);
          setLearningTopics([]);
          setFailedTopics([]);
          return;
        }

        // Course-scoped story
        let query = supabase
          .from('stories_and_telegram')
          .select(
            'upload_id, task, created_at, seen, hardcode_task, previously_failed_topics, course_id'
          )
          .eq('user_id', user.id);

        if (effectiveCourseIdNum !== null) {
          query = query.eq('course_id', String(effectiveCourseIdNum));
        }

        const { data: stories, error } = await query
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching stories:', error);
        }

        if (stories && stories.length > 0) {
          const story: any = stories[0];
          setTask(story.task || '');
          setStoryId(story.upload_id);
          setSeen(story.seen);

          // Learning topics
          if (story.hardcode_task) {
            try {
              const parsedTask = JSON.parse(story.hardcode_task);
              const topics = parsedTask['темы для изучения'];
              setLearningTopics(Array.isArray(topics) ? topics : []);
            } catch {
              setLearningTopics([]);
            }
          } else {
            setLearningTopics([]);
          }

          // Failed topics
          if (story.previously_failed_topics) {
            try {
              const parsedFailed = JSON.parse(story.previously_failed_topics);
              const topics = parsedFailed['темы с ошибками'];
              setFailedTopics(Array.isArray(topics) ? topics : []);
            } catch {
              setFailedTopics([]);
            }
          } else {
            setFailedTopics([]);
          }
        } else {
          setTask('');
          setStoryId(null);
          setFailedTopics([]);
          setLearningTopics([]);
        }
      } catch (error) {
        console.error('Error fetching story data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, location.pathname, routeCourseId, effectiveCourseIdNum, neutral]);

  const getTutorNameGenitive = (name: string) => {
    if (name === 'Ёжик') return 'Ёжика';
    if (name === 'Сакура') return 'Сакуры';
    return name;
  };

  async function handleOpen() {
    setIsOpen(true);
    // Only mark seen for course-scoped stories
    if (!neutral && storyId && seen === 0) {
      try {
        await supabase
          .from('stories_and_telegram')
          .update({ seen: 1 })
          .eq('upload_id', storyId);
        setSeen(1);
      } catch (error) {
        console.error('Error updating story seen status:', error);
      }
    }
  }

  if (!user || isLoading) return null;

  return (
    <>
      {/* Avatar Circle */}
      <div className="flex justify-center">
        <div
          className={`w-12 h-12 rounded-full overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 ${
            !neutral && seen === 0
              ? 'p-0.5 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
              : 'border-2 border-muted'
          }`}
          onClick={handleOpen}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-background">
            <img
              src={avatarUrl}
              alt={`${tutorName} Avatar`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Story Modal */}
      {isOpen &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl max-h-[85vh] my-auto bg-gradient-to-br from-background to-muted rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 p-6 border-b border-border/20 flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img
                    src={avatarUrl}
                    alt={`${tutorName} Avatar`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-semibold text-foreground text-lg">{tutorName}</span>

                <button
                  className="ml-auto w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Work for Today (buttons hidden on neutral pages) */}
              {!neutral && (
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-b border-border/20">
                  <h2 className="text-xl font-bold text-center mb-4 text-foreground">
                    Работа на сегодня:
                  </h2>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {/* "Повторить" dropdown */}
                    {failedTopics.length > 0 && (
                      <div className="inline-flex">
                        <details className="group relative">
                          <summary className="list-none px-6 py-2 rounded-full text-white font-medium bg-gradient-to-r from-orange-500 to-orange-600 cursor-pointer shadow-lg transition-all duration-200">
                            Повторить
                          </summary>
                          <div className="absolute mt-2 min-w-[260px] bg-background border border-border rounded-md p-1 shadow-xl z-[10000]">
                            {failedTopics.map((topicIdentifier, i) => {
                              const route = findTopicRoute(topicIdentifier);
                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (route) {
                                      navigate(`/module/${route.moduleSlug}/topic/${route.topicId}`);
                                    } else {
                                      navigate(`/learning-platform?topic=${topicIdentifier}`);
                                    }
                                    setIsOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted"
                                >
                                  {route?.topicName || topicIdentifier}
                                </button>
                              );
                            })}
                          </div>
                        </details>
                      </div>
                    )}

                    {/* "Изучить" dropdown */}
                    <div className="inline-flex">
                      <details className="group relative">
                        <summary className="list-none px-6 py-2 rounded-full text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 cursor-pointer shadow-lg transition-all duration-200">
                          Изучить
                        </summary>
                        <div className="absolute mt-2 min-w-[260px] bg-background border border-border rounded-md p-1 shadow-xl z-[10000]">
                          {learningTopics.length > 0 ? (
                            learningTopics.map((topicIdentifier, i) => {
                              const route = findTopicRoute(topicIdentifier);
                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (route) {
                                      navigate(`/module/${route.moduleSlug}/topic/${route.topicId}`);
                                    } else {
                                      navigate(`/learning-platform?topic=${topicIdentifier}`);
                                    }
                                    setIsOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted"
                                >
                                  {route?.topicName || topicIdentifier}
                                </button>
                              );
                            })
                          ) : (
                            <button
                              onClick={() => {
                                navigate('/learning-platform');
                                setIsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-md hover:bg-muted"
                            >
                              Платформа для изучения
                            </button>
                          )}
                        </div>
                      </details>
                    </div>

                    {/* Homework button */}
                    <button
                      onClick={() => {
                        let homeworkPath = '/homework'; // OGE default
                        if (effectiveCourseIdNum === 3) homeworkPath = '/homework-egeprof';
                        else if (effectiveCourseIdNum === 2) homeworkPath = '/homework-egeb';
                        navigate(homeworkPath);
                        setIsOpen(false);
                      }}
                      className="px-6 py-2 rounded-full text-white font-medium bg-gradient-to-r from-green-500 to-green-600 shadow-lg transition-all duration-200"
                    >
                      Домашнее Задание
                    </button>
                  </div>
                </div>
              )}

              {/* Detailed Feedback */}
              <div className="flex-1 overflow-y-auto p-6">
                <h2 className="text-xl font-bold mb-4 text-foreground">
                  Подробная обратная связь от {getTutorNameGenitive(tutorName)}:
                </h2>
                <div className="max-w-none prose prose-lg dark:prose-invert">
                  <ChatRenderer2
                    text={
                      task ||
                      (neutral
                        ? 'Молодец! Продолжай в том же духе 🎯 Зайди в курс, чтобы увидеть сообщение от своего ИИ-репетитора.'
                        : 'У вас пока нет новых заданий. Продолжайте практиковаться!')
                    }
                    isUserMessage={false}
                    className="text-foreground"
                  />
                </div>
              </div>

              {/* Progress bar (decorative) */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                <div className="h-full w-full bg-primary"></div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
