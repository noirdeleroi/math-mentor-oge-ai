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

  // Initialize KaTeX
  useKaTeXInitializer();

  // Load initial chat history and handle pending feedback
  useEffect(() => {
    const loadInitialHistory = async () => {
      if (user && !isHistoryLoaded) {
        // Check URL parameter for pending_feedback_id
        const urlParams = new URLSearchParams(window.location.search);
        const pendingFeedbackId = urlParams.get('pending_feedback');

        if (pendingFeedbackId) {
          console.log('📋 Checking for pending feedback:', pendingFeedbackId);

          // Query the pending_homework_feedback table
          const { data: feedbackRecord, error: feedbackError } = await supabase
            .from('pending_homework_feedback')
            .select('*')
            .eq('id', pendingFeedbackId)
            .eq('user_id', user.id)
            .single();

          if (!feedbackError && feedbackRecord) {
            console.log('✅ Feedback record found:', feedbackRecord);

            if (feedbackRecord.processed && feedbackRecord.feedback_message) {
              // Feedback already generated - display immediately
              const feedbackMsg: Message = {
                id: Date.now(),
                text: `🎯 **Автоматический анализ домашнего задания "${feedbackRecord.homework_name}"**\n\n${feedbackRecord.feedback_message}`,
                isUser: false,
                timestamp: new Date(feedbackRecord.processed_at)
              };
              addMessage(feedbackMsg);
              
              // Save to chat_logs for history
              await saveChatLog('', feedbackMsg.text, feedbackRecord.course_id);

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
                  .select('processed, feedback_message, error_message, homework_name, course_id, processed_at')
                  .eq('id', pendingFeedbackId)
                  .single();

                if (updated?.processed) {
                  clearInterval(pollInterval);
                  
                  if (updated.feedback_message) {
                    const feedbackMsg: Message = {
                      id: Date.now(),
                      text: `🎯 **Автоматический анализ домашнего задания "${updated.homework_name}"**\n\n${updated.feedback_message}`,
                      isUser: false,
                      timestamp: new Date(updated.processed_at || new Date())
                    };
                    addMessage(feedbackMsg);
                    await saveChatLog('', feedbackMsg.text, updated.course_id || '1');
                    
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

  // Set up real-time subscription for new chat messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('chat_logs_realtime').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_logs',
      filter: `user_id=eq.${user.id}&course_id=eq.1`
    }, payload => {
      console.log('New chat log received:', payload);
      const newLog = payload.new as any;

      // Check if this is a homework feedback message (generic completion message)
      const isHomeworkFeedback = newLog.user_message === 'Домашнее задание завершено - автоматический анализ ИИ учителя';
      if (isHomeworkFeedback) {
        // For homework feedback, only add the AI response
        addMessageRef.current({
          id: Date.now(),
          text: newLog.response,
          isUser: false,
          timestamp: new Date(newLog.time_of_response)
        });
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
    }).subscribe(status => {
      console.log('Chat realtime subscription status:', status);
    });
    return () => {
      supabase.removeChannel(channel);
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
      // Send message to AI and get response
      const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode);
      addMessage(aiResponse);

      // Save chat interaction to database
      await saveChatLog(userInput, aiResponse.text, '1');
    } catch (error) {
      console.error('Error saving chat log:', error);
    } finally {
      setIsTyping(false);
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
          user_id: user.id
        }
      });

      if (error) throw error;

      // Task created successfully
      const successMessageText = "Задание создано";
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: successMessageText,
        isUser: false,
        timestamp: new Date()
      };
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
      addMessage(errorMessage);

      // Save error response to chat_logs
      await saveChatLog(userMessageText, errorMessageText, courseId);

      toast({
        title: "Ошибка",
        description: "Не удалось создать задание",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };
  return <div className="flex h-[calc(100vh-68px)] w-full bg-background overflow-hidden">
      {/* Left Sidebar - Fixed */}
      <div className="w-64 h-full bg-sidebar border-r border-border flex-shrink-0 flex flex-col overflow-hidden">
        {/* Logo area */}
        
        
        {/* Menu items */}
        <div className="p-4 space-y-2 flex-shrink-0">
          <Button onClick={handlePracticeClick} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            Практика
          </Button>
          
          <Button onClick={() => navigate('/cellard-lp2')} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            Платформа
          </Button>
          
          <Button onClick={() => navigate('/textbook')} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            Учебник
          </Button>
          
          <Button onClick={handleProgressClick} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            Прогресс
          </Button>
          
          <Button onClick={handleCreateTask} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            Создать задание
          </Button>
        </div>

        {/* Daily Task Story - 2 inches below Progress button */}
        <div className="px-4 mt-[144px] flex-1 overflow-y-auto">
          <DailyTaskStory />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-h-0">
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