import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ChatRenderer2 from './chat/ChatRenderer2';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { findTopicRoute } from '@/lib/topic-routing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StoryData {
  upload_id: number;
  task: string;
  seen: number;
  created_at: string;
}

interface DailyTaskStoryProps {
  courseId?: string | null;
}

export const DailyTaskStory: React.FC<DailyTaskStoryProps> = ({ courseId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        // Fetch avatar and tutor name from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('tutor_avatar_url, tutor_name')
          .eq('user_id', user.id)
          .single();

        if (profile?.tutor_avatar_url) {
          setAvatarUrl(profile.tutor_avatar_url);
        } else {
          // Use a default avatar URL if none exists
          setAvatarUrl('https://api.dicebear.com/7.x/avataaars/svg?seed=tutor');
        }

        if (profile?.tutor_name) {
          setTutorName(profile.tutor_name);
        }

        // Fetch latest story for this user, filtered by course_id if provided
        let query = supabase
          .from('stories_and_telegram')
          .select('upload_id, task, created_at, seen, hardcode_task, previously_failed_topics')
          .eq('user_id', user.id);
        
        if (courseId) {
          query = query.eq('course_id', courseId);
        }
        
        const { data: stories } = await query
          .order('created_at', { ascending: false })
          .limit(1);

        if (stories && stories.length > 0) {
          const story = stories[0] as any;
          setTask(story.task || '');
          setStoryId(story.upload_id);
          setSeen(story.seen);
          
          // Parse learning topics from hardcode_task
          if (story.hardcode_task) {
            try {
              const parsedTask = JSON.parse(story.hardcode_task);
              const topics = parsedTask["темы для изучения"];
              if (Array.isArray(topics)) {
                setLearningTopics(topics);
              }
            } catch (error) {
              console.error('Error parsing hardcode_task:', error);
            }
          }
          
          // Parse failed topics from previously_failed_topics
          if (story.previously_failed_topics) {
            try {
              const parsedFailedTopics = JSON.parse(story.previously_failed_topics);
              const topics = parsedFailedTopics["темы с ошибками"];
              if (Array.isArray(topics) && topics.length > 0) {
                setFailedTopics(topics);
              }
            } catch (error) {
              console.error('Error parsing previously_failed_topics:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching story data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, courseId]);

  // Helper function to convert tutor name to genitive case for Russian grammar
  const getTutorNameGenitive = (name: string) => {
    // Russian names that need genitive case
    if (name === 'Ёжик') return 'Ёжика';
    if (name === 'Сакура') return 'Сакуры';
    // Foreign names like Kenji don't change
    return name;
  };

  async function handleOpen() {
    setIsOpen(true);

    // Mark story as seen
    if (storyId && seen === 0) {
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

  // Don't render if no user or loading
  if (!user || isLoading) return null;

  // Don't render if no avatar URL
  if (!avatarUrl) return null;
  
  // Show default message if no course_id provided
  if (!courseId) {
    return (
      <>
        <div className="flex justify-center">
          <div
            className="w-12 h-12 rounded-full overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 border-2 border-muted"
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

        {isOpen && ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4">
            <div className="relative w-full max-w-md bg-gradient-to-br from-background to-muted rounded-3xl overflow-hidden shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
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
              <p className="text-foreground text-center">Привет! Пока для тебя нет заданий.</p>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      {/* Avatar Circle */}
      <div className="flex justify-center">
        <div
          className={`w-12 h-12 rounded-full overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 ${
            seen === 0 
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

      {/* Story Modal - Rendered via Portal */}
      {isOpen && ReactDOM.createPortal(
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
              
              {/* Close button */}
              <button
                className="ml-auto w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Work for Today Section */}
            <div className="flex-shrink-0 px-6 pt-4 pb-6 border-b border-border/20">
              <h2 className="text-xl font-bold text-center mb-4 text-foreground">
                Работа на сегодня:
              </h2>
              <div className="flex flex-wrap gap-3 justify-center">
                {/* Повторить Dropdown - Only show if there are failed topics */}
                {failedTopics.length > 0 && (
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

                {/* Изучить Dropdown */}
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

                {/* Homework Button */}
                <Button
                  onClick={() => {
                    navigate('/homework');
                    setIsOpen(false);
                  }}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Домашнее Задание
                </Button>
              </div>
            </div>

            {/* Detailed Feedback Section */}
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4 text-foreground">
                Подробная обратная связь от {getTutorNameGenitive(tutorName)}:
              </h2>
              <div className="max-w-none prose prose-lg dark:prose-invert">
                <ChatRenderer2 
                  text={task || 'У вас пока нет новых заданий. Продолжайте практиковаться!'} 
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