import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import FlyingStarsBackground from '@/components/FlyingStarsBackground';
import { toast } from "sonner";

/**
 * Mock payment gateway page
 * Simulates a payment gateway where user can complete payment
 */
export default function CheckoutMock() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState("");
  const [promocode, setPromocode] = useState("");

  // Get parameters from URL
  const invoiceId = searchParams.get('InvId');
  const customerNumber = searchParams.get('CustomerNumber');
  const outSum = searchParams.get('OutSum');
  const courseId = searchParams.get('ShpCourseId');
  const urlPromocode = searchParams.get('ShpPromocode');

  useEffect(() => {
    if (outSum) {
      setAmount(outSum);
    }
    if (urlPromocode) {
      setPromocode(urlPromocode);
    }
  }, [outSum, urlPromocode]);

  // Simple hash function for mock signature
  function simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0').toUpperCase();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!invoiceId || !customerNumber || !amount) {
      toast.error("Отсутствуют необходимые параметры платежа");
      return;
    }

    setIsProcessing(true);

    try {
      // Generate signature for mock callback
      const secret = 'mock-secret-key'; // Should match MOCK_PAYMENT_SECRET in Edge Function
      const signatureParts = [
        amount,
        invoiceId,
        customerNumber,
        courseId || '',
        promocode || '',
        secret,
      ];
      const signature = simpleHash(signatureParts.join(':'));

      // Prepare callback payload (matching Robokassa format)
      const payload = new URLSearchParams({
        OutSum: amount,
        InvId: invoiceId,
        CustomerNumber: customerNumber,
        Signature: signature,
        ...(courseId && { ShpCourseId: courseId }),
        ...(promocode && { ShpPromocode: promocode }),
      });

      // Call payment callback API
      const supabaseUrl = "https://kbaazksvkvnafrwtmkcw.supabase.co";
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Ошибка при обработке платежа');
      }

      // Success - redirect to success page
      toast.success("Платеж успешно обработан!");
      navigate('/subscribe/success');
    } catch (err: any) {
      console.error('Payment processing error:', err);
      toast.error(err.message || 'Ошибка при обработке платежа');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}>
      <FlyingStarsBackground />

      <div className="relative z-10 pt-8 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-yellow-400" />
                <CardTitle className="text-2xl text-white">Mock Payment Gateway</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* TEST MODE Banner */}
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-300">
                  TEST MODE: This is a mock payment gateway for testing
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="amount" className="text-white">Сумма платежа (₽)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isProcessing}
                    required
                    className="bg-white/10 border-white/20 text-white"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                {courseId && (
                  <div>
                    <Label className="text-white">ID курса</Label>
                    <Input
                      value={courseId}
                      disabled
                      className="bg-white/5 border-white/10 text-gray-300"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="promocode" className="text-white">Промокод (опционально)</Label>
                  <Input
                    id="promocode"
                    type="text"
                    value={promocode}
                    onChange={(e) => setPromocode(e.target.value)}
                    disabled={isProcessing}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Введите промокод"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold shadow-lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Обработка платежа...
                      </>
                    ) : (
                      "Оплатить"
                    )}
                  </Button>
                </div>
              </form>

              {invoiceId && (
                <div className="mt-4 text-sm text-gray-400">
                  Invoice ID: {invoiceId}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


