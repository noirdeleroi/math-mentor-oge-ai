import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import FlyingStarsBackground from '@/components/FlyingStarsBackground';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Subscription {
  id: string;
  start_date: string;
  end_date: string;
  paid: number;
  course_id: string | null;
  promocode: string | null;
  is_active: boolean;
}

/**
 * Success page after payment
 * Displays subscription confirmation
 */
export default function SubscribeSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/subscribe');
      return;
    }

    // Fetch latest subscription for user
    async function fetchSubscription() {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
        } else if (data) {
          setSubscription(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubscription();
  }, [user, navigate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}>
      <FlyingStarsBackground />

      <div className="relative z-10 pt-8 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-emerald-500" />
              </div>
              <CardTitle className="text-3xl text-center text-white">
                Платеж успешно обработан!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : subscription ? (
                <>
                  <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-300">Подписка активирована</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {subscription.paid} ₽
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Дата начала:</span>
                      <span className="text-white font-semibold">
                        {formatDate(subscription.start_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Дата окончания:</span>
                      <span className="text-white font-semibold">
                        {formatDate(subscription.end_date)}
                      </span>
                    </div>
                    {subscription.course_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Курс:</span>
                        <span className="text-white font-semibold">
                          {subscription.course_id}
                        </span>
                      </div>
                    )}
                    {subscription.promocode && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Промокод:</span>
                        <span className="text-white font-semibold">
                          {subscription.promocode}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/20">
                    <p className="text-sm text-gray-300 text-center mb-4">
                      Спасибо за вашу подписку! Теперь у вас есть доступ ко всем премиум функциям.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-300 mb-4">
                    Подписка не найдена. Если вы только что оплатили, подождите несколько секунд.
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button
                  onClick={() => navigate('/mydb3')}
                  className="w-full bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
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

