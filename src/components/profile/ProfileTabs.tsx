import React from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ActivityTab } from "./ActivityTab";
import { AchievementsTab } from "./AchievementsTab";
import { SettingsTab } from "./SettingsTab";
import { TeacherTab } from "./TeacherTab";
import { StreakSettings } from "../streak/StreakSettings";
import { ProfileInfoTab } from "./ProfileInfoTab";
import HowToTab from "./HowToTab";

import { Button } from "@/components/ui/button";
import {
  User,
  Flame,
  Activity,
  GraduationCap,
  Award,
  Settings,
  Crown,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileTabsProps {
  userData: {
    streakDays: number;
    recentActivity: Array<{
      date: string;
      activity: string;
      type: string;
    }>;
    achievements: Array<{
      id: number;
      name: string;
      description: string;
      date: string;
      completed: boolean;
    }>;
  };
  userName: string;
  userEmail: string;
  joinedDate: string;
  lastActivityDate?: string;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  userData,
  userName,
  userEmail,
  joinedDate,
  lastActivityDate,
}) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Tabs defaultValue="profile" orientation="vertical" className="w-full flex gap-8">
      {/* Left Sidebar */}
      <div className="flex flex-col gap-4 w-72">
        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl overflow-hidden p-2">
          <TabsList className="flex flex-col h-fit w-full bg-transparent gap-2">
            <TabsTrigger
              value="profile"
              className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border data-[state=active]:border-white/30 hover:bg-white/10 transition-all"
            >
              <User className="h-5 w-5 text-yellow-400" />
              <span className="font-medium">Профиль</span>
            </TabsTrigger>

            <TabsTrigger
              value="guide"
              className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border data-[state=active]:border-white/30 hover:bg-white/10 transition-all"
            >
              <GraduationCap className="h-5 w-5 text-emerald-400" />
              <span className="font-medium">Как пользоваться</span>
            </TabsTrigger>

            <TabsTrigger
              value="streak"
              className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border data-[state=active]:border-white/30 hover:bg-white/10 transition-all"
            >
              <Flame className="h-5 w-5 text-orange-400" />
              <span className="font-medium">Серии</span>
            </TabsTrigger>

            <TabsTrigger
              value="activity"
              className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border data-[state=active]:border-white/30 hover:bg-white/10 transition-all"
            >
              <Activity className="h-5 w-5 text-blue-400" />
              <span className="font-medium">Активность</span>
            </TabsTrigger>

            <TabsTrigger
              value="teacher"
              className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border data-[state=active]:border-white/30 hover:bg-white/10 transition-all"
            >
              <GraduationCap className="h-5 w-5 text-purple-400" />
              <span className="font-medium">Преподаватель</span>
            </TabsTrigger>

            <TabsTrigger
              value="achievements"
              className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border data-[state=active]:border-white/30 hover:bg-white/10 transition-all"
            >
              <Award className="h-5 w-5 text-pink-400" />
              <span className="font-medium">Достижения</span>
            </TabsTrigger>

            <TabsTrigger
              value="settings"
              className="w-full justify-start gap-3 px-4 py-3 rounded-lg text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border data-[state=active]:border-white/30 hover:bg-white/10 transition-all"
            >
              <Settings className="h-5 w-5 text-gray-400" />
              <span className="font-medium">Настройки</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/mydb3")}
            className="w-full bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold shadow-lg transform hover:scale-105 transition-all duration-200 rounded-xl h-12 text-base"
          >
            <Crown className="w-5 h-5 mr-2" />
            Курсы
          </Button>

          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 transition-all rounded-xl h-12 text-base"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Выход
          </Button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 min-w-0">
        <TabsContent value="profile" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 mt-0 shadow-xl">
          <ProfileInfoTab
            userName={userName}
            userEmail={userEmail}
            joinedDate={joinedDate}
            lastActivityDate={lastActivityDate}
          />
        </TabsContent>

        <TabsContent value="guide" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 mt-0 shadow-xl">
          <HowToTab />
        </TabsContent>

        <TabsContent value="streak" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 mt-0 shadow-xl">
          <StreakSettings />
        </TabsContent>

        <TabsContent value="activity" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 mt-0 shadow-xl">
          <ActivityTab />
        </TabsContent>

        <TabsContent value="teacher" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 mt-0 shadow-xl">
          <TeacherTab />
        </TabsContent>

        <TabsContent value="achievements" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 mt-0 shadow-xl">
          <AchievementsTab achievements={userData.achievements} />
        </TabsContent>

        <TabsContent value="settings" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 mt-0 shadow-xl">
          <SettingsTab />
        </TabsContent>
      </div>
    </Tabs>
  );
};
