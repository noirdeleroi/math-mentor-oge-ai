import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Gift, CheckCircle } from "lucide-react";

const InviteFriendTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPromoCodeAndUsage = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // First, get the promo code from subscriptions
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('promocode')
          .eq('user_id', user.id)
          .maybeSingle();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('Error fetching promo code:', subscriptionError);
          setIsLoading(false);
          return;
        }

        if (subscriptionData?.promocode) {
          const code = subscriptionData.promocode;
          setPromoCode(code);

          // Then, count how many times this promo code was used
          const { count, error: usageError } = await supabase
            .from('promo_usage')
            .select('*', { count: 'exact', head: true })
            .eq('promocode', code);

          if (usageError) {
            console.error('Error fetching promo usage:', usageError);
          } else {
            setUsageCount(count || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching promo data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromoCodeAndUsage();
  }, [user]);

  const handleCopyCode = async () => {
    if (!promoCode) return;

    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      toast({
        title: "Код скопирован!",
        description: "Промокод скопирован в буфер обмена",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать код",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-emerald-500/20 rounded-full">
            <Users className="h-12 w-12 text-yellow-500" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
          Пригласи друга
        </h2>
        <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto">
          Поделись своим промокодом с другом и получи месяц подписки бесплатно!
        </p>
      </div>

      {/* Explanation Card */}
      <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Gift className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Как это работает?</h3>
              <p className="text-gray-300 leading-relaxed">
                Поделись своим промокодом с другом. Когда он оплатит подписку, ты автоматически получишь <strong className="text-yellow-500">один месяц подписки бесплатно</strong>! Это отличный способ помочь другу начать подготовку к экзаменам и получить бонус для себя.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Promo Code Card */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 backdrop-blur border-2 border-yellow-500/30 rounded-2xl p-6 md:p-8 shadow-xl">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="text-gray-300 mt-4">Загрузка промокода...</p>
          </div>
        ) : promoCode ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-300 uppercase tracking-wide">Твой промокод</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-6 py-4">
                  <code className="text-2xl md:text-3xl font-mono font-bold text-white tracking-wider">
                    {promoCode}
                  </code>
                </div>
                <Button
                  onClick={handleCopyCode}
                  className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold shadow-lg transform hover:scale-105 transition-all duration-200 rounded-xl h-12 px-6"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5 mr-2" />
                      Копировать
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <p className="text-sm text-gray-300 text-center mb-3">
                <strong className="text-yellow-500">Инструкция:</strong> Отправь этот промокод другу. Он должен использовать его при оплате подписки, и ты получишь месяц бесплатно!
              </p>
              <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/20">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-gray-300">
                  <strong className="text-emerald-400">{usageCount}</strong> {usageCount === 1 ? 'человек использовал' : usageCount >= 2 && usageCount <= 4 ? 'человека использовали' : 'человек использовали'} твой промокод
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <p className="text-gray-300">
              У вас пока нет промокода. Промокод будет доступен после оформления подписки.
            </p>
            <Button
              onClick={() => window.location.href = '/subscribe'}
              className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold shadow-lg"
            >
              Перейти к подписке
            </Button>
          </div>
        )}
      </Card>

      {/* Benefits Section */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Для тебя</h4>
              <p className="text-sm text-gray-300">
                Получи <strong className="text-emerald-400">месяц подписки бесплатно</strong> за каждого друга
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Users className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Для друга</h4>
              <p className="text-sm text-gray-300">
                Полный доступ ко всем функциям платформы для подготовки к экзаменам
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InviteFriendTab;

