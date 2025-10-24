import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import { sendChatMessage } from "@/services/chatService";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useStudentSkills } from "@/hooks/useStudentSkills";
import { useEffect } from "react";
import { motion } from "framer-motion";

const ChatDock = () => {
  const { messages, isTyping, isDatabaseMode, setMessages, setIsTyping, addMessage } = useChatContext();
  const { user } = useAuth();
  const { getDisplayName } = useProfile();
  const { topicProgress, generalPreparedness, isLoading } = useStudentSkills();
  const userName = getDisplayName();

  // Initialize welcome messages exactly like in Dashboard
  useEffect(() => {
    if (messages.length === 0 && !isLoading && topicProgress.length > 0) {
      // Find topics that need improvement (below 70%)
      const topicsToImprove = topicProgress
        .filter(topic => topic.averageScore < 70)
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, 3);

      let welcomeMessage = `Привет, ${userName}! Рад видеть тебя снова. `;
      
      if (generalPreparedness >= 80) {
        welcomeMessage += `Отличный прогресс — ${generalPreparedness}%! Ты на правильном пути к успеху на ОГЭ. 🎯`;
      } else if (generalPreparedness >= 60) {
        welcomeMessage += `У тебя хороший прогресс — ${generalPreparedness}%. Продолжай в том же духе! 💪`;
      } else {
        welcomeMessage += `Твой текущий прогресс — ${generalPreparedness}%. Есть над чем поработать, но я помогу тебе улучшить результаты! 📚`;
      }

      let recommendationMessage = "";
      
      if (topicsToImprove.length > 0) {
        recommendationMessage = `**Рекомендую сегодня поработать над этими темами:**\n\n`;
        
        topicsToImprove.forEach((topic, index) => {
          const topicNumber = topic.topic;
          recommendationMessage += `${index + 1}. **${topic.name}** (${topic.averageScore}%)\n`;
          recommendationMessage += `   📖 [Изучить материал](/textbook?topic=${topicNumber})\n\n`;
        });

        recommendationMessage += `Начни с изучения теории, а затем переходи к практическим заданиям. Удачи! 🚀`;
      } else {
        recommendationMessage = `📌 Вчера ты завершил тему <b>Признаки равенства треугольников</b> — красавчик!  
Давай начнём с небольшого повторения и разогрева перед новой темой:  
📝 <a href="/mcq-practice-skill-120" style="color: #10b981; text-decoration: underline;">Быстрый тест на повторение</a>

<br> 
🔥 Ну что, поехали дальше! Сегодня у нас: <b>Признаки подобия треугольников</b>

Ты уже прошёл немало тем — движемся по плану как по рельсам 🚂  
Сегодняшняя тема важная и частая в ОГЭ, так что разложим всё по полочкам:

📘 <a href="/triangle-similarity" style="color: #10b981; text-decoration: underline;">Изучить теорию</a> — разберись в признаках и основах  
🎥 <a href="/triangle-similarity-video" style="color: #10b981; text-decoration: underline;">Посмотри видео</a> — объясняю всё на простых примерах  
🧠 <a href="/triangle-similarity-brainrot" style="color: #10b981; text-decoration: underline;">А можно и «brainrot»-видео</a>, если хочется учиться под мемчики 😏  
✍️ <a href="/practice" style="color: #10b981; text-decoration: underline;">Попрактикуйся на задачах</a> — сначала простые, потом ОГЭ-уровень

---

🎯 И, как всегда, **обязательная часть дня** —  
🔎 <a href="/fipi-bank" style="color: #10b981; text-decoration: underline;">Банк заданий ФИПИ</a>  
Это топ-инструмент для подготовки. Решай хотя бы 1–2 задачи каждый день — и ты реально будешь на голову выше остальных 💪

---

Начни с теории — дальше всё пойдёт как по маслу.  
Если что — я рядом 😉
`;
      }

      const welcomeMessages = [
        {
          id: 1,
          text: welcomeMessage,
          isUser: false,
          timestamp: new Date()
        },
        {
          id: 2,
          text: recommendationMessage,
          isUser: false,
          timestamp: new Date()
        }
      ];
      
      setMessages(welcomeMessages);
    }
  }, [messages.length, userName, generalPreparedness, topicProgress, isLoading, setMessages]);

  const handleSendMessage = async (userInput: string) => {
    if (userInput.trim() === "") return;

    const newUserMessage = {
      id: messages.length + 1,
      text: userInput,
      isUser: true,
      timestamp: new Date()
    };
    
    addMessage(newUserMessage);
    setIsTyping(true);

    try {
      const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode, user.id);
      addMessage(aiResponse);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="h-full max-h-[800px]"
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            🤖 Чат-помощник
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Chat Messages Area - scrollable */}
          <div className="flex-1 overflow-hidden">
            <ChatMessages 
              messages={messages} 
              isTyping={isTyping}
            />
          </div>
          
          {/* Chat Input - always visible at bottom */}
          <div className="flex-shrink-0 border-t border-border bg-card">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isTyping={isTyping}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ChatDock;