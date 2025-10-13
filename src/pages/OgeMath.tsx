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

  // Load initial chat history and welcome messages
  useEffect(() => {
    const loadInitialHistory = async () => {
      if (user && !isHistoryLoaded) {
        // Check for homework completion data
        const homeworkData = localStorage.getItem('homeworkCompletionData');
        const textbookData = localStorage.getItem('textbookExerciseCompletionData');
        let shouldGenerateHomeworkFeedback = false;
        let homeworkFeedbackMessage = '';
        if (homeworkData) {
          try {
            console.log('📋 Homework completion data found in localStorage:', homeworkData);
            const completionData = JSON.parse(homeworkData);
            console.log('✅ Parsed completion data:', completionData);
            if (!completionData.homeworkName) {
              console.error('❌ No homeworkName in completion data');
              localStorage.removeItem('homeworkCompletionData');
              throw new Error('Missing homeworkName in homework completion data');
            }

            // Query all records for this homework by homework_name
            console.log('🔍 Querying homework_progress for homework_name:', completionData.homeworkName);
            const {
              data: sessionRows,
              error
            } = await supabase.from('homework_progress').select('*').eq('user_id', user.id).eq('homework_name', completionData.homeworkName).order('created_at', {
              ascending: true
            });
            if (error) {
              console.error('❌ Database error fetching session:', error);
              throw error;
            }
            console.log(`📊 Found ${sessionRows?.length || 0} records for session`);
            if (sessionRows && sessionRows.length > 0) {
              // Show loading toast
              toast({
                title: "Генерация обратной связи",
                description: "ИИ анализирует ваше домашнее задание..."
              });
              console.log('🤖 Generating AI feedback for session data...');
              // Generate AI feedback from the session data
              homeworkFeedbackMessage = await generateAIHomeworkFeedback(sessionRows);
              console.log('✨ AI feedback generated successfully');
              shouldGenerateHomeworkFeedback = true;

              // prevent duplicate feedback on next open
              localStorage.removeItem('homeworkCompletionData');
            } else {
              console.warn('⚠️ No rows found for session');
              localStorage.removeItem('homeworkCompletionData');
            }
          } catch (err) {
            console.error('❌ Error processing homework completion data:', err);
            toast({
              title: "Ошибка",
              description: "Не удалось сгенерировать обратную связь по ДЗ",
              variant: "destructive"
            });
            localStorage.removeItem('homeworkCompletionData');
          }
        } else if (textbookData) {
          try {
            const completionData = JSON.parse(textbookData);
            // Generate feedback for textbook exercise
            const activityTypeRu = completionData.activityType === 'exam' ? 'экзамен' : completionData.activityType === 'test' ? 'тест' : 'упражнение';
            homeworkFeedbackMessage = `**${activityTypeRu.toUpperCase()}: ${completionData.activityName}**\n\n` + `✅ Правильных ответов: ${completionData.questionsCorrect} из ${completionData.totalQuestions}\n` + `📊 Точность: ${completionData.accuracy}%\n` + `🎯 Навыки: #${completionData.skills.join(', #')}\n\n` + (completionData.accuracy >= 75 ? '🎉 Отличная работа! Ты хорошо освоил этот материал.' : completionData.accuracy >= 50 ? '👍 Неплохой результат! Продолжай практиковаться.' : '💪 Не останавливайся! Изучи теорию и попробуй еще раз.');
            shouldGenerateHomeworkFeedback = true;

            // Clear the stored data to avoid repeated feedback
            localStorage.removeItem('textbookExerciseCompletionData');
          } catch (error) {
            console.error('Error processing textbook exercise data:', error);
            localStorage.removeItem('textbookExerciseCompletionData');
          }
        }
        try {
          const history = await loadChatHistory('1', 3, 0);
          let initialMessages = [];
          if (shouldGenerateHomeworkFeedback) {
            // Add homework feedback as the first message with special formatting
            initialMessages = [{
              id: 1,
              text: `🎯 **Автоматический анализ домашнего задания**\n\n${homeworkFeedbackMessage}`,
              isUser: false,
              timestamp: new Date()
            }];

            // Save the homework feedback to chat logs with context
            await saveChatLog('Домашнее задание завершено - автоматический анализ ИИ учителя', `🎯 **Автоматический анализ домашнего задания**\n\n${homeworkFeedbackMessage}`, '1');
          }
          if (history.length > 0) {
            // Convert chat logs to messages format and reverse to show chronologically
            const historyMessages = history.reverse().flatMap((log, index) => [{
              id: (index + initialMessages.length) * 2 + 1,
              text: log.user_message,
              isUser: true,
              timestamp: new Date(log.time_of_user_message)
            }, {
              id: (index + initialMessages.length) * 2 + 2,
              text: log.response,
              isUser: false,
              timestamp: new Date(log.time_of_response)
            }]);
            setMessages([...initialMessages, ...historyMessages]);
            setHistoryOffset(3);
            setHasMoreHistory(history.length === 3);
          } else {
            // Set welcome messages if no history
            const welcomeMessages = [{
              id: initialMessages.length + 1,
              text: `Привет, ${userName}! Я твой ИИ-репетитор по ОГЭ математике. Готов помочь тебе подготовиться к экзамену!`,
              isUser: false,
              timestamp: new Date()
            }, {
              id: initialMessages.length + 2,
              text: "Хочешь пройти тренировочные задания или разобрать конкретную тему?",
              isUser: false,
              timestamp: new Date()
            }];
            setMessages([...initialMessages, ...welcomeMessages]);
            setHasMoreHistory(false);
          }
          setIsHistoryLoaded(true);
        } catch (error) {
          console.error('Error loading chat history:', error);
          // Fallback to welcome messages
          const fallbackMessages = shouldGenerateHomeworkFeedback ? [{
            id: 1,
            text: homeworkFeedbackMessage,
            isUser: false,
            timestamp: new Date()
          }, {
            id: 2,
            text: `Привет, ${userName}! Я твой ИИ-репетитор по ОГЭ математике. Готов помочь тебе подготовиться к экзамену!`,
            isUser: false,
            timestamp: new Date()
          }] : [{
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