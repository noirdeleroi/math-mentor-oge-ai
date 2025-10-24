
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import ChatMessages from "./chat/ChatMessages";
import ChatInput from "./chat/ChatInput";
import { sendChatMessage } from "@/services/chatService";

export interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  problemId?: string; // Add problemId to track current problem
}

const ChatSection = () => {
  const { user } = useAuth();
  const { messages, isTyping, isDatabaseMode, setMessages, setIsTyping, addMessage } = useChatContext();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь';
  
  // Initialize welcome messages if chat is empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          text: `Привет, ${userName}! Я твой ИИ-репетитор по математике. Давай проверим твой уровень знаний!`,
          isUser: false,
          timestamp: new Date()
        },
        {
          id: 2,
          text: "Хочешь пройти входное тестирование или решить несколько тренировочных задач?",
          isUser: false,
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length, userName, setMessages]);
  
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
      const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode, user.id);
      addMessage(aiResponse);
    } finally {
      setIsTyping(false);
    }
  };
  
  return (
    <section id="ai-tutor" className="py-16 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ваш ИИ-репетитор по математике</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Задавайте вопросы, получайте объяснения и решайте задачи с мгновенной обратной связью.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white backdrop-blur-lg shadow-xl rounded-xl overflow-hidden border-0 relative">
            <div className="bg-gradient-to-r from-primary to-secondary p-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse"></span>
                Ёжик AI
              </h3>
            </div>
            
            <ChatMessages messages={messages} isTyping={isTyping} />
            <ChatInput onSendMessage={handleSendMessage} isTyping={isTyping} />
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ChatSection;
