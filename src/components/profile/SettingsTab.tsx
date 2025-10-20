
import { Settings, Lock, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SettingsTab = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Settings className="h-6 w-6 text-yellow-500" />
        Настройки профиля
      </h2>
      
      <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl">
        <p className="text-white/80 text-center mb-6">
          Функции настройки профиля будут доступны в ближайшем обновлении.
        </p>
        
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 transition-all rounded-xl h-12 text-base justify-start gap-3"
          >
            <Lock className="w-5 h-5" />
            Изменить пароль
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 transition-all rounded-xl h-12 text-base justify-start gap-3"
          >
            <Bell className="w-5 h-5" />
            Настройки уведомлений
          </Button>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        className="w-full bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all rounded-xl h-12 text-base justify-center gap-3 mt-8"
      >
        <LogOut className="w-5 h-5" />
        Выйти из аккаунта
      </Button>
    </div>
  );
};
