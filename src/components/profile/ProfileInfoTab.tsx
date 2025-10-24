import { User, Edit2, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { ProfileEditForm } from "./ProfileEditForm";
import { useProfile, Profile } from "@/hooks/useProfile";
import { getBadgeForPoints } from "@/utils/streakBadges";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { MyCoursesCard } from "./MyCoursesCard";

interface ProfileInfoTabProps {
  userName: string;
  userEmail: string;
  joinedDate: string;
  lastActivityDate?: string;
}

export const ProfileInfoTab = ({ userName, userEmail, joinedDate, lastActivityDate = 'Сегодня' }: ProfileInfoTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { profile, updateProfile, getDisplayName, getAvatarUrl } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [energyPoints, setEnergyPoints] = useState(0);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  useEffect(() => {
    const fetchEnergyPoints = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('user_statistics')
          .select('energy_points')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setEnergyPoints(data.energy_points);
        }
      } catch (error) {
        console.error('Error fetching energy points:', error);
      }
    };
    
    fetchEnergyPoints();
  }, [user]);

  const handleSaveProfile = (newProfile: Profile) => {
    updateProfile(newProfile);
    setIsEditing(false);
  };

  const generateTelegramCode = async () => {
    if (!user || !profile) return;

    setIsGeneratingCode(true);
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

  const displayName = getDisplayName();
  const avatarUrl = getAvatarUrl();
  const earnedBadge = getBadgeForPoints(energyPoints);

  if (isEditing) {
    return (
      <ProfileEditForm
        profile={profile}
        onSave={handleSaveProfile}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Profile Card - Left Half */}
        <Card className="p-4 md:p-6 bg-white shadow-md rounded-xl border-0">
          <div className="flex flex-col items-center text-center mb-4 md:mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4 overflow-hidden">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile picture" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 md:h-12 md:w-12 text-primary" />
              )}
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2 mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{userName}</h1>
              <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                <span className="text-lg md:text-xl">{earnedBadge.emoji}</span>
                <span className="text-xs font-semibold text-primary">{earnedBadge.name}</span>
              </div>
            </div>
            <p className="text-sm md:text-base text-gray-600 mb-2">{userEmail}</p>
            {profile?.bio && (
              <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-xs">{profile.bio}</p>
            )}
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-500 mt-2">
              <span>Присоединился: {joinedDate}</span>
              <span className="hidden md:inline">•</span>
              <span>Последняя активность: {lastActivityDate}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="mt-3 text-xs md:text-sm"
            >
              <Edit2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              Редактировать
            </Button>
          </div>
        </Card>

        {/* My Courses Card - Right Half */}
        <MyCoursesCard />
      </div>

      {/* Telegram Bot Integration */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg rounded-xl overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Telegram Бот</h3>
              <p className="text-xs md:text-sm text-gray-600">Загружай фото решений</p>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                size="lg"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {profile?.telegram_user_id ? 'Управление Telegram ботом' : 'Подключить Telegram бот'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Telegram бот
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">
                    Через бот в Telegram ты сможешь загружать фото решения и задач на платформу
                  </p>
                </div>
                {profile?.telegram_code ? (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Ваш Telegram код:</p>
                        <p className="text-blue-800 font-mono text-xl font-bold">
                          {profile.telegram_code}
                        </p>
                      </div>
                      {profile?.telegram_user_id ? (
                        <div className="flex items-center text-green-600 text-sm font-medium bg-green-100 px-3 py-1 rounded-full">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Telegram код подтвержден
                        </div>
                      ) : null}
                    </div>
                    {!profile?.telegram_user_id && (
                      <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-700 font-medium">
                          📱 Введите этот код в телеграм-боте @egechat_bot
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={generateTelegramCode}
                    disabled={isGeneratingCode}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                    size="lg"
                  >
                    {isGeneratingCode ? 'Создаю код...' : 'Создать Telegram код'}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
};
