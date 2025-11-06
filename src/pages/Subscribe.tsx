import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, ArrowLeft, Sparkles, Check } from "lucide-react";
import FlyingStarsBackground from '@/components/FlyingStarsBackground';

export default function Subscribe() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}>
      {/* Flying Stars Background */}
      <FlyingStarsBackground />

      {/* Main Content */}
      <div className="relative z-10 pt-8 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Top Navigation Bar */}
          <div className="mb-8">
            <Button
              onClick={() => navigate('/mydb3')}
              variant="ghost"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>

          {/* Page Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Crown className="w-16 h-16 text-yellow-500" />
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              Премиум подписка
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Получите доступ к расширенным возможностям платформы
            </p>
          </div>

          {/* Subscription Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Basic Plan */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Базовый</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">Бесплатно</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Доступ к базовым курсам</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Ограниченное количество заданий</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Базовый профиль прогресса</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  disabled
                >
                  Текущий план
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="bg-gradient-to-br from-yellow-500/20 to-emerald-500/20 backdrop-blur-sm border-2 border-yellow-500/50 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-[#1a1f36] px-4 py-1 text-sm font-bold rounded-bl-lg">
                РЕКОМЕНДУЕТСЯ
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  Премиум
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-400" />
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">999 ₽</span>
                  <span className="text-gray-300 ml-2">/месяц</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Неограниченный доступ ко всем курсам</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Неограниченные задания и практика</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Расширенная статистика прогресса</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Приоритетная поддержка</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Ранний доступ к новым функциям</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Выбрать Премиум
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg text-gray-300 mb-4">
                  Данная страница находится в разработке. Скоро здесь появится полная система подписок с возможностью оплаты.
                </p>
                <Button 
                  onClick={() => navigate('/mydb3')}
                  variant="ghost"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
                >
                  Вернуться к курсам
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
