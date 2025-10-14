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

const EgeMathBasic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, isTyping, isDatabaseMode, setMessages, setIsTyping, addMessage } = useChatContext();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь';
  
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
        setMessages(historyMessages);
        setHistoryOffset(3);
        setHasMoreHistory(history.length === 3);
      } else {
        // Show welcome messages if no history
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

  return (
    <div className="flex h-[calc(100vh-68px)] w-full bg-background overflow-hidden">
      {/* Left Sidebar - keep fewer buttons */}
      <div className="w-64 h-full bg-sidebar border-r border-border flex-shrink-0">
        {/* Logo area */}
        <div className="p-4">
          <button 
            onClick={() => navigate("/mydb3")}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <img 
              src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/txtbkimg/1001egechat_logo.png" 
              alt="EGEChat Logo" 
              className="w-8 h-8"
            />
            <span className="font-bold text-lg text-sidebar-foreground">EGEChat</span>
          </button>
        </div>
        
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