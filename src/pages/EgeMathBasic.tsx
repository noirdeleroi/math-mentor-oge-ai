import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/contexts/ChatContext";
import CourseChatMessages from "@/components/chat/CourseChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import { sendChatMessage } from "@/services/chatService";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useMathJaxInitializer } from "@/hooks/useMathJaxInitializer";
import { saveChatLog, loadChatHistory } from "@/services/chatLogsService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const EgeMathBasic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, isTyping, isDatabaseMode, setMessages, setIsTyping, addMessage } = useChatContext();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь';
  const { toast } = useToast();
  
  // Chat history state
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  
  // Initialize MathJax
  useMathJaxInitializer();

  // Initialize chat history or welcome messages
  useEffect(() => {
    if (!isHistoryLoaded && user) {
      loadInitialHistory();
    }
  }, [user, isHistoryLoaded]);

  const loadInitialHistory = async () => {
    if (!user) return;

    try {
      setIsLoadingHistory(true);
      // Homework feedback autoshow (course 2)
      const homeworkData = localStorage.getItem('homeworkCompletionData');
      let shouldGenerateHomeworkFeedback = false;
      let homeworkFeedbackMessage = '';
      if (homeworkData) {
        try {
          const completionData = JSON.parse(homeworkData);
          if (!completionData.homeworkName) {
            localStorage.removeItem('homeworkCompletionData');
            throw new Error('Missing homeworkName');
          }
          const { data: sessionRows, error } = await supabase
            .from('homework_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('homework_name', completionData.homeworkName)
            .order('created_at', { ascending: true });
          if (error) throw error;
          if (sessionRows && sessionRows.length > 0) {
            // Keep the same structure: summary of results
            const total = sessionRows.filter(r => r.question_id && r.question_id !== 'Summary').length;
            const correct = sessionRows.filter(r => r.is_correct).length;
            const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
            homeworkFeedbackMessage = `**ДОМАШНЕЕ ЗАДАНИЕ (ЕГЭ база)**\n\n` +
              `✅ Правильных ответов: ${correct} из ${total}\n` +
              `📊 Точность: ${accuracy}%`;
            shouldGenerateHomeworkFeedback = true;
            localStorage.removeItem('homeworkCompletionData');
          } else {
            localStorage.removeItem('homeworkCompletionData');
          }
        } catch (err) {
          console.error('Error processing EGE basic homework completion data:', err);
          localStorage.removeItem('homeworkCompletionData');
        }
      }

      const history = await loadChatHistory('2', 3, 0);
      
      if (history.length > 0) {
        // Convert chat logs to messages format
        const historyMessages: any[] = [];
        for (const log of history.reverse()) {
          historyMessages.push({
            id: historyMessages.length + 1,
            text: log.user_message,
            isUser: true,
            timestamp: new Date(log.time_of_user_message)
          });
          historyMessages.push({
            id: historyMessages.length + 1,
            text: log.response,
            isUser: false,
            timestamp: new Date(log.time_of_response)
          });
        }
        if (shouldGenerateHomeworkFeedback) {
          setMessages([
            { id: 1, text: `🎯 **Автоматический анализ домашнего задания**\n\n${homeworkFeedbackMessage}`, isUser: false, timestamp: new Date() },
            ...historyMessages
          ]);
          try { await saveChatLog('Домашнее задание завершено - автоматический анализ ИИ учителя', `🎯 **Автоматический анализ домашнего задания**\n\n${homeworkFeedbackMessage}`, '2'); } catch {}
        } else {
          setMessages(historyMessages);
        }
        setHistoryOffset(3);
        setHasMoreHistory(history.length === 3);
      } else {
        // Show welcome messages if no history
        const baseWelcome = [
          { id: 1, text: `Привет, ${userName}! Я твой ИИ-репетитор по ЕГЭ базовой математике. Помогу тебе освоить все необходимые темы!`, isUser: false, timestamp: new Date() },
          { id: 2, text: "Хочешь потренироваться решать задачи или изучить теорию?", isUser: false, timestamp: new Date() }
        ];
        if (shouldGenerateHomeworkFeedback) {
          setMessages([
            { id: 0, text: `🎯 **Автоматический анализ домашнего задания**\n\n${homeworkFeedbackMessage}`, isUser: false, timestamp: new Date() },
            ...baseWelcome
          ]);
          try { await saveChatLog('Домашнее задание завершено - автоматический анализ ИИ учителя', `🎯 **Автоматический анализ домашнего задания**\n\n${homeworkFeedbackMessage}`, '2'); } catch {}
        } else {
          setMessages(baseWelcome);
        }
        setHasMoreHistory(false);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Fallback to welcome messages on error
      setMessages([
        {
          id: 1,
          text: `Привет, ${userName}! Я твой ИИ-репетитор по ЕГЭ базовой математике. Помогу тебе освоить все необходимые темы!`,
          isUser: false,
          timestamp: new Date()
        },
        {
          id: 2,
          text: "Хочешь потренироваться решать задачи или изучить теорию?",
          isUser: false,
          timestamp: new Date()
        }
      ]);
      setHasMoreHistory(false);
    } finally {
      setIsLoadingHistory(false);
      setIsHistoryLoaded(true);
    }
  };

  const loadMoreHistory = async () => {
    if (!user || isLoadingHistory || !hasMoreHistory) return;

    try {
      setIsLoadingHistory(true);
      const history = await loadChatHistory('2', 3, historyOffset);
      
      if (history.length > 0) {
        // Convert chat logs to messages format and prepend to existing messages
        const historyMessages: any[] = [];
        for (const log of history.reverse()) {
          historyMessages.push({
            id: Date.now() + historyMessages.length,
            text: log.user_message,
            isUser: true,
            timestamp: new Date(log.time_of_user_message)
          });
          historyMessages.push({
            id: Date.now() + historyMessages.length + 1,
            text: log.response,
            isUser: false,
            timestamp: new Date(log.time_of_response)
          });
        }
        setMessages([...historyMessages, ...messages]);
        setHistoryOffset(prev => prev + 3);
        setHasMoreHistory(history.length === 3);
      } else {
        setHasMoreHistory(false);
      }
    } catch (error) {
      console.error('Error loading more chat history:', error);
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

      // Save interaction to chat logs with course_id='2'
      if (user) {
        try {
          await saveChatLog(userInput, aiResponse.text, '2');
        } catch (error) {
          console.error('Error saving chat log:', error);
        }
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handlePracticeClick = () => {
    navigate("/egemathbasic-practice");
  };

  const handleTextbookClick = () => {
    navigate("/new-textbook");
  };

  const handleProgressClick = () => {
    navigate("/egemathbasic-progress");
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
    const courseId = '2';

    try {
      // Add user message to chat
      const userMessage: any = {
        id: Date.now(),
        text: userMessageText,
        isUser: true,
        timestamp: new Date()
      };
      addMessage(userMessage);
      setIsTyping(true);

      // Call create-task edge function with course_id=2 and fixed date
      const { data, error } = await supabase.functions.invoke('create-task', {
        body: {
          user_id: user.id,
          course_id: 2,
          date_string: '25 may 2026'
        }
      });

      if (error) throw error as any;

      const successMessageText = "Твое задание создано! 🎉Нажми на мой аватар в сториc выше, чтобы прочитать его. Ееее! 😎";
      const aiMessage: any = {
        id: Date.now() + 1,
        text: successMessageText,
        isUser: false,
        timestamp: new Date()
      };
      addMessage(aiMessage);

      // Save chat log with course_id '2'
      await saveChatLog(userMessageText, successMessageText, courseId);

      toast({
        title: "Задание создано",
        description: "Персональное задание успешно создано!"
      });
    } catch (err) {
      console.error('Error creating task:', err);
      const errorMessageText = "Ошибка при создании задания";
      addMessage({
        id: Date.now() + 1,
        text: errorMessageText,
        isUser: false,
        timestamp: new Date()
      } as any);
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

  return (
    <div className="flex h-[calc(100vh-68px)] w-full bg-background overflow-hidden">
      {/* Left Sidebar - keep fewer buttons */}
      <div className="w-64 h-full bg-sidebar border-r border-border flex-shrink-0">
        
        {/* Menu items (fewer than OGE, keep as-is) */}
        <div className="p-4 space-y-2">
          <Button
            onClick={handlePracticeClick}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Практика
          </Button>
          
          <Button
            onClick={handleTextbookClick}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Учебник
          </Button>
          
          <Button
            onClick={handleProgressClick}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Прогресс
          </Button>

          <Button
            onClick={handleCreateTask}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Создать задание
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-h-0">
        {/* NOTE: Removed the page-level header (keep LearningLayout header only) */}

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden min-h-0">
          <CourseChatMessages 
            messages={messages} 
            isTyping={isTyping}
            onLoadMoreHistory={loadMoreHistory}
            isLoadingHistory={isLoadingHistory}
            hasMoreHistory={hasMoreHistory}
          />
        </div>

        {/* Chat Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-background p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} isTyping={isTyping} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EgeMathBasic;