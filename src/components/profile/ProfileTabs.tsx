export const ProfileTabs = ({ userData, userName, userEmail, joinedDate, lastActivityDate }: ProfileTabsProps) => {
  const navigate = useNavigate();
  
  return (
    <Tabs defaultValue="profile" orientation="vertical" className="w-full flex gap-6">
      {/* Vertical Tab List with Button */}
      <div className="flex flex-col gap-4">
        <TabsList className="flex flex-col h-fit w-48 bg-white shadow-md rounded-xl p-2 gap-1">
          <TabsTrigger value="profile" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="guide" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            Как пользоваться
          </TabsTrigger>
          <TabsTrigger value="streak" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Flame className="h-4 w-4" />
            Серии
          </TabsTrigger>
          <TabsTrigger value="activity" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Activity className="h-4 w-4" />
            Активность
          </TabsTrigger>
          <TabsTrigger value="teacher" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
            Преподаватель
          </TabsTrigger>
          <TabsTrigger value="achievements" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Award className="h-4 w-4" />
            Достижения
          </TabsTrigger>
          <TabsTrigger value="settings" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        {/* Курсы Button */}
        <Button
          onClick={() => navigate('/mydb3')}
          size="lg"
          className="w-48 bg-gradient-to-br from-[#f59e0b] to-[#10b981] hover:from-[#fbbf24] hover:to-[#34d399] text-white shadow-xl text-lg py-6 px-8 rounded-xl transform transition-all duration-200 hover:scale-105"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Курсы
        </Button>

        {/* Подписки Button */}
        <Button
          onClick={() => navigate('/subscribe')}
          size="lg"
          className="w-48 bg-gradient-to-br from-[#f59e0b] to-[#10b981] hover:from-[#fbbf24] hover:to-[#34d399] text-white shadow-xl text-lg py-6 px-8 rounded-xl transform transition-all duration-200 hover:scale-105"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Подписки
        </Button>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        <TabsContent value="profile" className="bg-white rounded-xl shadow-md p-6 border-0 mt-0">
          <ProfileInfoTab 
            userName={userName}
            userEmail={userEmail}
            joinedDate={joinedDate}
            lastActivityDate={lastActivityDate}
          />
        </TabsContent>

        <TabsContent value="streak" className="bg-white rounded-xl shadow-md p-6 border-0 mt-0">
          <StreakSettings />
        </TabsContent>

        <TabsContent value="guide" className="bg-white rounded-xl shadow-md p-6 border-0 mt-0">
          <HowToTab />
        </TabsContent>

        <TabsContent value="activity" className="bg-white rounded-xl shadow-md p-6 border-0 mt-0">
          <ActivityTab />
        </TabsContent>

        <TabsContent value="teacher" className="bg-white rounded-xl shadow-md p-6 border-0 mt-0">
          <TeacherTab />
        </TabsContent>

        <TabsContent value="achievements" className="bg-white rounded-xl shadow-md p-6 border-0 mt-0">
          <AchievementsTab achievements={userData.achievements} />
        </TabsContent>

        <TabsContent value="settings" className="bg-white rounded-xl shadow-md p-6 border-0 mt-0">
          <SettingsTab />
        </TabsContent>
      </div>
    </Tabs>
  );
};
