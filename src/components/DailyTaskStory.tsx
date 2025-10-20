import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ChatRenderer2 from './chat/ChatRenderer2';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { findTopicRoute } from '@/lib/topic-routing';
import { COURSES, getCourseFromRoute } from '@/lib/courses.registry'; // ← include COURSES for neutral chooser
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DailyTaskStoryProps {
  /** Optional fallback; route-derived course takes precedence. */
  courseId?: string | null;
}

export const DailyTaskStory: React.FC<DailyTaskStoryProps> = ({ courseId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect course from route (same logic as LearningLayout)
  const routeCourse = getCourseFromRoute(location.pathname);
  const routeCourseId = routeCourse?.numericId ?? null;

  // Neutral mode when no course can be resolved from route and no valid prop given
  const neutral =
    routeCourseId == null && (courseId == null || Number.isNaN(Number(courseId)));

  // Effective numeric course id (null in neutral mode)
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

        // Neutral mode: skip stories query, show generic message
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
          // course_id is stored as text in some schemas—use String for compatibility
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

          // Parse learning topics
          if (story.hardcode_task) {
            try {
              const parsedTask = JSON.parse(story.hardcode_task);
              const topics = parsedTask['темы для изучения'];
              if (Array.isArray(topics)) setLearningTopics(topics);
              else setLearningTopics([]);
            } catch (e) {
              console.error('Error parsing hardcode_task:', e);
              setLearningTopics([]);
            }
          } else {
            setLearningTopics([]);
          }

          // Parse failed topics
          if (story.previously_failed_topics) {
            try {
              const parsedFailed = JSON.parse(story.previously_failed_topics);
              const topics = parsedFailed['темы с ошибками'];
              if (Array.isArray(topics) && topics.length > 0) setFailedTopics(topics);
              else setFailedTopics([]);
            } catch (e) {
              console.error('Error parsing previously_failed_topics:', e);
              setFailedTopics([]);
            }
          } else {
            setFailedTopics([]);
          }
        } else {
          // No story for this course/user
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
    // Re-run when user logs in, or route/course changes
  }, [user, location.pathname, routeCourseId, effectiveCourseIdNum, neutral]);

  // Russian genitive for a couple of names
  const getTutorNameGenitive = (name: string) => {
    if (name === 'Ёжик') return 'Ёжика';
    if (name === 'Сакура') return 'Сакуры';
    return name;
  };

  async function handleOpen() {
    setIsOpen(true);

    // Mark seen (only for course-scoped story and unseen)
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

  // Loading / no user
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

              {/* Work for Today */}
              <div className="flex-shrink-0 px-6 pt-4 pb-6 border-b border-border/20">
                <h2 className="text-xl font-bold text-center mb-4 text-foreground">
                  Работа на сегодня:
                </h2>
                <div className="flex flex-wrap gap-3 justify-center">
                  {/* Повторить — only in course mode and if we have failed topics */}
                  {!neutral && failedTopics.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                          Повторить <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border-border shadow-xl z-[10000]">
                        {failedTopics.map((topicIdentifier, index) => {
                          const route = findTopicRoute(topicIdentifier);
                          return (
                            <DropdownMenuItem
                              key={index}
                              onClick={() => {
                                if (route) {
                                  navigate(`/module/${route.moduleSlug}/topic/${route.topicId}`);
                                } else {
                                  navigate(`/learning-platform?topic=${topicIdentifier}`);
                                }
                                setIsOpen(false);
                              }}
                              className="cursor-pointer hover:bg-muted"
                            >
                              {route?.topicName || topicIdentifier}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Изучить — course mode shows topics, neutral shows course chooser */}
                  {!neutral ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                          Изучить <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border-border shadow-xl z-[10000]">
                        {learningTopics.length > 0 ? (
                          learningTopics.map((topicIdentifier, index) => {
                            const route = findTopicRoute(topicIdentifier);
                            return (
                              <DropdownMenuItem
                                key={index}
                                onClick={() => {
                                  if (route) {
                                    navigate(`/module/${route.moduleSlug}/topic/${route.topicId}`);
                                  } else {
                                    navigate(`/learning-platform?topic=${topicIdentifier}`);
                                  }
                                  setIsOpen(false);
                                }}
                                className="cursor-pointer hover:bg-muted"
                              >
                                {route?.topicName || topicIdentifier}
                              </DropdownMenuItem>
                            );
                          })
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              navigate('/learning-platform');
                              setIsOpen(false);
                            }}
                            className="cursor-pointer hover:bg-muted"
                          >
                            Платформа для изучения
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                          Выбрать курс <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border-border shadow-xl z-[10000]">
                        {Object.values(COURSES).map((c) => (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => {
                              navigate(c.homeRoute);
                              setIsOpen(false);
                            }}
                            className="cursor-pointer hover:bg-muted"
                          >
                            {c.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Homework / action button */}
                  <Button
                    onClick={() => {
                      if (neutral) {
                        // Neutral: send to hub or course chooser
                        navigate('/learning-platform');
                      } else {
                        let homeworkPath = '/homework'; // OGE default
                        if (effectiveCourseIdNum === 3) homeworkPath = '/homework-egeprof';
                        else if (effectiveCourseIdNum === 2) homeworkPath = '/homework-egeb';
                        navigate(homeworkPath);
                      }
                      setIsOpen(false);
                    }}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {neutral ? 'Открыть платформу' : 'Домашнее Задание'}
                  </Button>
                </div>
              </div>

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
