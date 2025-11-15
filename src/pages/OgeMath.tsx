import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/contexts/ChatContext";
import CourseChatMessages from "@/components/chat/CourseChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import { sendChatMessage } from "@/services/chatService";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useKaTeXInitializer } from "@/hooks/useMathJaxInitializer";
import { loadChatHistory, saveChatLog, type ChatLog } from "@/services/chatLogsService";
import { StreakDisplay } from "@/components/streak/StreakDisplay";
import { DailyTaskStory } from "@/components/DailyTaskStory";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { generateAIHomeworkFeedback } from "@/services/homeworkAIFeedbackService";
import { type Message } from "@/contexts/ChatContext";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
const OgeMath = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    messages,
    isTyping,
    isDatabaseMode,
    setMessages,
    setIsTyping,
    addMessage
  } = useChatContext();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь';
  const {
    toast
  } = useToast();

  // State for chat history pagination
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  
  // State for homework context
  const [homeworkContext, setHomeworkContext] = useState<any>(null);
  const [contextExpiresAt, setContextExpiresAt] = useState<Date | null>(null);
  
  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Initialize KaTeX
  useKaTeXInitializer();

  // Load initial chat history and handle pending feedback
  useEffect(() => {
    const loadInitialHistory = async () => {
      if (user && !isHistoryLoaded) {
        // Check URL parameter for pending_feedback_id
        const urlParams = new URLSearchParams(window.location.search);
        const pendingFeedbackId = urlParams.get('pending_feedback');

        if (pendingFeedbackId && !handledFeedbackRef.current) {
          handledFeedbackRef.current = true;
          console.log('📋 Checking for pending feedback:', pendingFeedbackId);

          // Query the pending_homework_feedback table
          const { data: feedbackRecord, error: feedbackError } = await supabase
            .from('pending_homework_feedback')
            .select('*, chat_context, context_data')
            .eq('id', pendingFeedbackId)
            .eq('user_id', user.id)
            .single();

          if (!feedbackError && feedbackRecord) {
            console.log('✅ Feedback record found:', feedbackRecord);

            if (feedbackRecord.processed && feedbackRecord.feedback_message) {
              // Store homework context for follow-up questions - prefer chat_context
              const contextForFollowup = feedbackRecord.chat_context || feedbackRecord.context_data || null;
              if (contextForFollowup) {
                setHomeworkContext(contextForFollowup);
                setContextExpiresAt(new Date(Date.now() + 30 * 60 * 1000)); // 30 min timeout
                console.log('📚 Loaded homework context:', contextForFollowup);
              }
              
              // Feedback already generated - display immediately and save to chat logs with sentinel user message.
              const feedbackText = `🎯 **Автоматический анализ домашнего задания "${feedbackRecord.homework_name}"**

${feedbackRecord.feedback_message}

---

💬 **Теперь можешь спросить:**
- "Объясни, почему задача 3 неправильная"
- "Покажи решение задачи 5 подробнее"
- "Как правильно решать такие задачи?"
- "Почему мой ответ в задаче 7 не подходит?"

Я помню все детали твоего ДЗ и готов обсудить любой вопрос! 🎓`;
              addMessage({ id: Date.now(), text: feedbackText, isUser: false, timestamp: new Date(feedbackRecord.processed_at) });
              lastFeedbackTextRef.current = feedbackText;
              if (!savedFeedbackLoggedRef.current) {
                try {
                  await saveChatLog('Домашнее задание завершено - автоматический анализ ИИ учителя', feedbackText, feedbackRecord.course_id);
                  savedFeedbackLoggedRef.current = true;
                } catch (e) {
                  console.error('Error saving chat log (initial feedback OGE):', e);
                }
              }

              // Clear URL parameter
              window.history.replaceState({}, '', '/ogemath');
            } else if (feedbackRecord.error_message) {
              // Generation failed
              toast({
                title: 'Ошибка генерации обратной связи',
                description: feedbackRecord.error_message,
                variant: 'destructive'
              });
              window.history.replaceState({}, '', '/ogemath');
            } else {
              // Still processing - show loading indicator and poll
              toast({
                title: 'Обратная связь генерируется...',
                description: 'Пожалуйста, подождите',
                duration: 3000
              });

              // Poll for completion
              const pollInterval = setInterval(async () => {
                const { data: updated } = await supabase
                  .from('pending_homework_feedback')
                  .select('processed, feedback_message, error_message, homework_name, course_id, processed_at, chat_context, context_data')
                  .eq('id', pendingFeedbackId)
                  .single();

                  if (updated?.processed) {
                  clearInterval(pollInterval);
                  
                  if (updated.feedback_message) {
                    // Store homework context when polling completes - prefer chat_context
                    const contextForFollowup = updated.chat_context || updated.context_data || null;
                    if (contextForFollowup) {
                      setHomeworkContext(contextForFollowup);
                      setContextExpiresAt(new Date(Date.now() + 30 * 60 * 1000));
                      console.log('📚 Loaded homework context (from polling):', contextForFollowup);
                    }
                    
                    const feedbackText = `🎯 **Автоматический анализ домашнего задания "${updated.homework_name}"**

${updated.feedback_message}

---

💬 **Теперь можешь спросить:**
- "Объясни, почему задача 3 неправильная"
- "Покажи решение задачи 5 подробнее"
- "Как правильно решать такие задачи?"
- "Почему мой ответ в задаче 7 не подходит?"

Я помню все детали твоего ДЗ и готов обсудить любой вопрос! 🎓`;
                    addMessage({ id: Date.now(), text: feedbackText, isUser: false, timestamp: new Date(updated.processed_at || new Date()) });
                    lastFeedbackTextRef.current = feedbackText;
                    if (!savedFeedbackLoggedRef.current) {
                      try {
                        await saveChatLog('Домашнее задание завершено - автоматический анализ ИИ учителя', feedbackText, updated.course_id || '1');
                        savedFeedbackLoggedRef.current = true;
                      } catch (e) {
                        console.error('Error saving chat log (polling feedback OGE):', e);
                      }
                    }
                    
                    toast({
                      title: 'Обратная связь готова! ✨',
                      description: 'Проверьте чат для деталей'
                    });
                  } else if (updated.error_message) {
                    toast({
                      title: 'Ошибка генерации',
                      description: updated.error_message,
                      variant: 'destructive'
                    });
                  }
                  
                  // Clear URL parameter after handling
                  window.history.replaceState({}, '', '/ogemath');
                }
              }, 2000); // Poll every 2 seconds

              // Cleanup polling after 60 seconds
              setTimeout(() => clearInterval(pollInterval), 60000);
            }
          } else {
            console.warn('⚠️ Feedback record not found or error:', feedbackError);
            window.history.replaceState({}, '', '/ogemath');
          }
        }

        try {
          const history = await loadChatHistory('1', 3, 0);
          
          if (history.length > 0) {
            // Convert chat logs to messages format and reverse to show chronologically
            const historyMessages = history.reverse().flatMap((log, index) => [{
              id: index * 2 + 1,
              text: log.user_message,
              isUser: true,
              timestamp: new Date(log.time_of_user_message)
            }, {
              id: index * 2 + 2,
              text: log.response,
              isUser: false,
              timestamp: new Date(log.time_of_response)
            }]);
            setMessages(historyMessages);
            setHistoryOffset(3);
            setHasMoreHistory(history.length === 3);
          } else {
            // Set welcome messages if no history
            const welcomeMessages = [{
              id: 1,
              text: `Привет, ${userName}! Я твой ИИ-репетитор по ОГЭ математике. Готов помочь тебе подготовиться к экзамену!`,
              isUser: false,
              timestamp: new Date()
            }, {
              id: 2,
              text: "Хочешь пройти тренировочные задания или разобрать конкретную тему?",
              isUser: false,
              timestamp: new Date()
            }];
            setMessages(welcomeMessages);
            setHasMoreHistory(false);
          }
          setIsHistoryLoaded(true);
        } catch (error) {
          console.error('Error loading chat history:', error);
          // Fallback to welcome messages
          const fallbackMessages = [{
            id: 1,
            text: `Привет, ${userName}! Я твой ИИ-репетитор по ОГЭ математике. Готов помочь тебе подготовиться к экзамену!`,
            isUser: false,
            timestamp: new Date()
          }, {
            id: 2,
            text: "Хочешь пройти тренировочные задания или разобрать конкретную тему?",
            isUser: false,
            timestamp: new Date()
          }];
          setMessages(fallbackMessages);
          setIsHistoryLoaded(true);
          setHasMoreHistory(false);
        }
      }
    };
    loadInitialHistory();
  }, [user, userName, setMessages, isHistoryLoaded]);

  // Create a ref to store the addMessage function to avoid subscription recreation
  const addMessageRef = useRef(addMessage);
  addMessageRef.current = addMessage;

  // Ref to avoid duplicate subscriptions in StrictMode
  const channelRef = useRef<any>(null);
  // Ref to mark handling of pending feedback and deduplicate realtime echo
  const handledFeedbackRef = useRef<boolean>(false);
  const lastFeedbackTextRef = useRef<string | null>(null);
  const savedFeedbackLoggedRef = useRef<boolean>(false);

  // Set up real-time subscription for new chat messages
  useEffect(() => {
    if (!user) return;
    if (channelRef.current) return; // already subscribed
    const channel = supabase
      .channel('chat_logs_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_logs',
        filter: `user_id=eq.${user.id}&course_id=eq.1`
      }, payload => {
        console.log('New chat log received:', payload);
        const newLog = payload.new as any;

        // Global dedup: if this response matches the last shown feedback, skip
        if (lastFeedbackTextRef.current && newLog.response === lastFeedbackTextRef.current) {
          return;
        }
 
        // Check if this is a homework feedback message (generic completion message)
        const isHomeworkFeedback = newLog.user_message === 'Домашнее задание завершено - автоматический анализ ИИ учителя';
        if (isHomeworkFeedback) {
          // For homework feedback, only add the AI response
          addMessageRef.current({ id: Date.now(), text: newLog.response, isUser: false, timestamp: new Date(newLog.time_of_response) });
        } else {
          // For regular chat messages, add both user and AI messages
          addMessageRef.current({
            id: Date.now() * 2 + 1,
            text: newLog.user_message,
            isUser: true,
            timestamp: new Date(newLog.time_of_user_message)
          });
          addMessageRef.current({
            id: Date.now() * 2 + 2,
            text: newLog.response,
            isUser: false,
            timestamp: new Date(newLog.time_of_response)
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pending_homework_feedback',
        filter: `user_id=eq.${user.id}&course_id=eq.1`
      }, async payload => {
        const updated = payload.new as any;
        console.log('Pending homework feedback updated (OGE):', updated);
        if (updated?.processed && updated?.feedback_message) {
          // Set context for follow-up questions - prefer chat_context
          const contextForFollowup = updated.chat_context || updated.context_data || null;
          if (contextForFollowup) {
            setHomeworkContext(contextForFollowup);
            setContextExpiresAt(new Date(Date.now() + 30 * 60 * 1000));
          }
          const feedbackText = `🎯 **Автоматический анализ домашнего задания "${updated.homework_name}"**

${updated.feedback_message}

---

💬 **Теперь можешь спросить:**
- "Объясни, почему задача 3 неправильная"
- "Покажи решение задачи 5 подробнее"
- "Как правильно решать такие задачи?"
- "Почему мой ответ в задаче 7 не подходит?"

Я помню все детали твоего ДЗ и готов обсудить любой вопрос! 🎓`;
          if (lastFeedbackTextRef.current !== feedbackText) {
            addMessageRef.current({ id: Date.now(), text: feedbackText, isUser: false, timestamp: new Date(updated.processed_at || new Date()) });
            lastFeedbackTextRef.current = feedbackText;
          }
        }
      })
      .subscribe(status => {
        console.log('Chat realtime subscription status:', status);
      });
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);
  const loadMoreHistory = async () => {
    if (!hasMoreHistory || isLoadingHistory) return;
    setIsLoadingHistory(true);
    try {
      const history = await loadChatHistory('1', 3, historyOffset);
      if (history.length > 0) {
        // Convert chat logs to messages format and reverse to show chronologically
        const historyMessages = history.reverse().flatMap((log, index) => [{
          id: (historyOffset + index) * 2 + 1,
          text: log.user_message,
          isUser: true,
          timestamp: new Date(log.time_of_user_message)
        }, {
          id: (historyOffset + index) * 2 + 2,
          text: log.response,
          isUser: false,
          timestamp: new Date(log.time_of_response)
        }]);

        // Prepend history messages to current messages
        setMessages([...historyMessages, ...messages]);
        setHistoryOffset(prev => prev + 3);
        setHasMoreHistory(history.length === 3);
      } else {
        setHasMoreHistory(false);
      }
    } catch (error) {
      console.error('Error loading more history:', error);
      setHasMoreHistory(false);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const handleSendMessage = async (userInput: string) => {
    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      text: userInput,
      isUser: true,
      timestamp: new Date()
    };
    addMessage(newUserMessage);
    setIsTyping(true);
    try {
      // Check if homework context is still valid
      const validContext = homeworkContext && contextExpiresAt && new Date() < contextExpiresAt 
        ? homeworkContext 
        : null;
      
      if (validContext) {
        console.log('💬 Using homework context for AI response');
      }
      
      // Send message to AI and get response with context
      const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode, user.id, validContext);
      setIsTyping(false); // Clear typing indicator before adding message to prevent flash
      addMessage(aiResponse);

      // Save chat interaction to database
      await saveChatLog(userInput, aiResponse.text, '1');
    } catch (error) {
      console.error('Error saving chat log:', error);
      setIsTyping(false); // Clear typing on error too
    }
  };
  const handleNavigateToProfile = () => {
    navigate("/mydashboard");
  };
  const handlePracticeClick = () => {
    navigate("/ogemath-practice");
  };
  const handleTextbookClick = () => {
    navigate("/learning-platform");
  };
  const handleProgressClick = () => {
    navigate("/ogemath-progress2");
  };
  const handleCreateTask = async () => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive"
      });
      return;
    }

    const userMessageText = "Создать задание";
    const courseId = "1";
    
    try {
      // Add user message to chat
      const userMessage: Message = {
        id: Date.now(),
        text: userMessageText,
        isUser: true,
        timestamp: new Date()
      };
      addMessage(userMessage);

      // Show typing animation
      setIsTyping(true);

      // Call create-task edge function
      const {
        data,
        error
      } = await supabase.functions.invoke('create-task', {
        body: {
          user_id: user.id,
          course_id: 1
        }
      });

      if (error) throw error;

      // Task created successfully
      const successMessageText = "Твое задание создано! 🎉Нажми на мой аватар в сториc выше, чтобы прочитать его. Ееее! 😎";
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: successMessageText,
        isUser: false,
        timestamp: new Date()
      };
      setIsTyping(false); // Clear typing indicator before adding message to prevent flash
      addMessage(aiMessage);

      // Save complete chat log with response
      await saveChatLog(userMessageText, successMessageText, courseId);

      toast({
        title: "Задание создано",
        description: "Персональное задание успешно создано!"
      });
    } catch (error) {
      console.error('Error creating task:', error);
      
      // Add error message to chat
      const errorMessageText = "Ошибка при создании задания";
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: errorMessageText,
        isUser: false,
        timestamp: new Date()
      };
      setIsTyping(false); // Clear typing indicator before adding message to prevent flash
      addMessage(errorMessage);

      // Save error response to chat_logs
      await saveChatLog(userMessageText, errorMessageText, courseId);

      toast({
        title: "Ошибка",
        description: "Не удалось создать задание",
        variant: "destructive"
      });
    }
  };

  // Sidebar content component
  const SidebarContent = () => (
    <>
      <div className="p-4 space-y-2 flex-shrink-0">
        <Button 
          onClick={() => { handlePracticeClick(); if (isMobile) setIsSidebarOpen(false); }} 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Практика
        </Button>
        
        <Button 
          onClick={() => { navigate('/cellard-lp2'); if (isMobile) setIsSidebarOpen(false); }} 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Платформа
        </Button>
        
        <Button 
          onClick={() => { navigate('/textbook'); if (isMobile) setIsSidebarOpen(false); }} 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Учебник
        </Button>
        
        <Button 
          onClick={() => { handleProgressClick(); if (isMobile) setIsSidebarOpen(false); }} 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Прогресс
        </Button>
        
        <Button 
          onClick={() => { handleCreateTask(); if (isMobile) setIsSidebarOpen(false); }} 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Создать задание
        </Button>

      </div>

      <div className="px-4 mt-[144px] flex-1 overflow-y-auto">
        <DailyTaskStory />
      </div>
    </>
  );

  return <div className="flex h-[calc(100vh-68px)] w-full max-w-full bg-background overflow-hidden overflow-x-hidden">
      {/* Mobile Hamburger Button */}
      {isMobile && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-20 left-4 z-50 p-2 rounded-lg bg-background border border-border shadow-lg hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
      )}

      {/* Mobile Drawer Overlay + Sidebar */}
      {isMobile && isSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-border z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col">
            <div className="flex justify-end p-4">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-sidebar-accent"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-sidebar-foreground" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* Desktop Fixed Sidebar */}
      {!isMobile && (
        <div className="w-64 h-full bg-sidebar border-r border-border flex-shrink-0 flex flex-col overflow-hidden">
          <SidebarContent />
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full min-h-0 ${isMobile ? 'w-full' : ''}`}>
        {/* Homework Context Indicator */}
        {homeworkContext && contextExpiresAt && new Date() < contextExpiresAt && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-emerald-500/20 border border-yellow-400/40 text-[#1a1f36] text-xs font-medium shadow-sm">
                  Контекст активен
                </div>
                <div className="text-sm text-[#1a1f36] dark:text-blue-100">
                  <span className="font-semibold">Домашнее задание:</span>
                  <span className="ml-2">
                    {homeworkContext.homework_name || homeworkContext.homeworkName || 'без названия'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setHomeworkContext(null);
                  setContextExpiresAt(null);
                  toast({
                    title: 'Контекст очищен',
                    description: 'Теперь можно обсудить другие темы',
                  });
                }}
                className="text-xs px-3 py-1 rounded-full bg-white/60 backdrop-blur border border-white/60 text-[#1a1f36] hover:bg-white/80 transition"
              >
                Очистить
              </button>
            </div>
          </div>
        )}
        
        {/* Chat Messages Area - Scrollable */}
        <div className="flex-1 overflow-hidden min-h-0">
          <CourseChatMessages messages={messages} isTyping={isTyping} onLoadMoreHistory={loadMoreHistory} isLoadingHistory={isLoadingHistory} hasMoreHistory={hasMoreHistory} />
        </div>

        {/* Chat Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-background p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} isTyping={isTyping} />
          </div>
        </div>
      </div>
    </div>;
};
export default OgeMath;
