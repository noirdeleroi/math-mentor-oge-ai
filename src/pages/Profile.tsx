import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { sendChatMessage } from "@/services/chatService";
import { useChatContext } from "@/contexts/ChatContext";
import { useStudentSkills } from "@/hooks/useStudentSkills";
import { useOptimizedProfile } from "@/hooks/useOptimizedProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  problemId?: string;
}


const PLATFORM_GUIDE_MD = `
Это твой Воркспейс: здесь есть чат для любого вопроса и навигация по всем разделам. Вот краткое руководство, чтобы быстро разобраться:

🧩 **1. Страница "Практика"**
Здесь можно решать задачи по номерам, как на экзамене.
Также доступны:

* **Пробный Экзамен** — тренировочный вариант, максимально похожий на реальный;
* **Домашнее Задание** — задания на день, которые система создает для тебя;
* **Повторение** — задачи по темам, где у тебя раньше были ошибки.

🏫 **2. Страница "Платформа"**
Тут собрана теория, задачи с вариантами ответов и ссылки на **📖 Учебник**. Используй эту страницу, чтобы разбираться в темах глубже.

📊 **3. Страница "Прогресс"**
Здесь ты видишь свой успех по темам и номерам задач.
Нажми **"Обновить Прогресс"**, чтобы учесть последние результаты. По умолчанию показывается статистика до сегодняшнего дня.

📝 **4. Твой ИИ-учитель создаёт задание каждый день**
После твоей активности ИИ-учитель автоматически подберёт новое задание на следующий день.

🔭 **5. Где найти задание**
Зайди в сторис c аватаркой твоего ИИ-учителя. Там ты найдёшь кнопки «Уроки на сегодня» и «Перейти к домашнему заданию».

🖍️ **6. Выделение текста**
Если что-то непонятно — нажми **"Включить Выделение"** и выдели текст (в учебнике, в задаче, где угодно). Платформа сразу объяснит выделенный фрагмент с помощью встроенного чата.

💙 **7. Подключи Telegram-бота!**
Используй код из своего профиля, чтобы подключить Telegram-бота. Это нужно, чтобы отправлять фото своих решений на проверку!

**Начинай заниматься прямо сейчас. Ты быстро привыкнешь к платформе, и обучение станет проще и интереснее каждый день!**
**Здесь ты можешь готовиться к экзаменам легко, интересно и эффективно!**
`;



const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, isTyping, isDatabaseMode, setMessages, setIsTyping, addMessage } = useChatContext();
  const { topicProgress, generalPreparedness, isLoading: skillsLoading } = useStudentSkills();
  
  // Use optimized hook for all profile data (consolidates multiple queries)
  const {
    profile,
    streak,
    statistics,
    isLoading: profileLoading,
    getDisplayName,
    getLastActivityText,
  } = useOptimizedProfile();
  
  const { toast } = useToast();
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  
  // Extract user information from Supabase user data and profile
  const userName = getDisplayName();
  const userEmail = user?.email || '';
  const joinedDate = new Date(user?.created_at || Date.now()).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const lastActivityDate = getLastActivityText();

  const generateTelegramCode = async () => {
    if (!user || !profile) return;

    setIsGeneratingCode(true);
    // Generate random 6-digit number
    const randomCode = Math.floor(100000 + Math.random() * 900000);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_code: randomCode })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving telegram code:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать Telegram код",
          variant: "destructive",
        });
        return;
      }

      // Update local state (optimized hook will refetch on next mount)
      toast({
        title: "Telegram код создан",
        description: "Обновите страницу чтобы увидеть изменения",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error creating telegram code:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать Telegram код",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Initialize welcome message if chat is empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 1,
        text: `Привет, ${userName}! Я могу помочь тебе разобраться с любыми вопросами по математике. Чем я могу тебе помочь?`,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [messages.length, userName, setMessages]);
  
  const handleSendMessage = async (userInput: string) => {
    if (userInput.trim() === "") return;

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
      // Send message to AI and get response using Groq API
      const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode);
      addMessage(aiResponse);
    } finally {
      setIsTyping(false);
    }
  };
  
  // Create progress data from topic progress
  const progressData = {
    overall: generalPreparedness,
    algebra: topicProgress.find(t => t.topic === "2")?.averageScore || 0,
    geometry: topicProgress.find(t => t.topic === "7")?.averageScore || 0,
    probability: topicProgress.find(t => t.topic === "8")?.averageScore || 0
  };

  const userData = {
    progress: progressData,
    topicProgress: topicProgress,
    completedLessons: statistics?.completed_lessons || 0,
    practiceProblems: statistics?.practice_problems || 0,
    quizzesCompleted: statistics?.quizzes_completed || 0,
    averageScore: Math.round(statistics?.average_score || 0),
    streakDays: streak?.current_streak || 0,
    achievements: [
      { id: 1, name: "Первые шаги", description: "Завершено 5 уроков", date: "15 марта 2025", completed: (statistics?.completed_lessons || 0) >= 5 },
      { id: 2, name: "Математический гений", description: "Решено 100+ задач", date: "2 апреля 2025", completed: (statistics?.practice_problems || 0) >= 100 },
      { id: 3, name: "На отлично", description: "Получена оценка 90% или выше на 5 тестах подряд", date: "Не получено", completed: (statistics?.average_score || 0) >= 90 && (statistics?.quizzes_completed || 0) >= 5 },
      { id: 4, name: "Геометрический мастер", description: "Завершены все темы по геометрии", date: "Не получено", completed: (topicProgress.find(t => t.topic === "7")?.averageScore || 0) >= 80 }
    ],
    recentActivity: [
      { date: "9 мая 2025", activity: "Завершен урок: Подобие треугольников", type: "lesson" },
      { date: "8 мая 2025", activity: "Решено 12 задач по теме 'Функции и графики'", type: "practice" },
      { date: "7 мая 2025", activity: "Пройден тест: Уравнения и неравенства (89%)", type: "quiz" },
      { date: "5 мая 2025", activity: "Просмотрен видеоурок: Статистика и вероятность", type: "video" }
    ]
  };

  if (skillsLoading || profileLoading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center overflow-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка профиля...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 pt-16 flex flex-col overflow-hidden">
        <div className="flex-1 container mx-auto px-4 py-4 overflow-auto">
          <ProfileTabs 
            userData={userData}
            userName={userName}
            userEmail={userEmail}
            joinedDate={joinedDate}
            lastActivityDate={lastActivityDate}
          />
        </div>
      </main>
    </div>
  );
};

export default Profile;
