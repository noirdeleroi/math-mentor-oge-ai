import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FeedbackButtonProps {
  contentType: 'mcq' | 'frq_question' | 'article' | 'skill_explainer' | 'simulation' | 'other';
  contentRef: string;
}

type Severity = 'typo' | 'math_wrong' | 'confusing_explanation' | 'ui_bug' | 'other';

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'typo', label: 'Опечатка / русский' },
  { value: 'math_wrong', label: 'Математика неверна' },
  { value: 'confusing_explanation', label: 'Непонятно / запутано' },
  { value: 'ui_bug', label: 'Глючит экран / рендер' },
  { value: 'other', label: 'Другое' },
];

const RATE_LIMIT_KEY_PREFIX = 'feedback_timestamps_';
const MAX_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1000;

export default function FeedbackButton({ contentType, contentRef }: FeedbackButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [severity, setSeverity] = useState<Severity>('other');
  const [message, setMessage] = useState('');
  

  const rateKey = useMemo(() => `${RATE_LIMIT_KEY_PREFIX}${user?.id || 'anon'}`, [user?.id]);

  const deviceInfo = useMemo(() => {
    if (typeof navigator === 'undefined') return 'unknown';
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    return `${isMobile ? 'mobile' : 'desktop'} | ${navigator.userAgent}`;
  }, []);

  const checkRateLimit = (): boolean => {
    try {
      const raw = localStorage.getItem(rateKey);
      const now = Date.now();
      const recent = (raw ? JSON.parse(raw) as number[] : []).filter((t) => now - t < ONE_HOUR_MS);
      if (recent.length >= MAX_PER_HOUR) return false;
      recent.push(now);
      localStorage.setItem(rateKey, JSON.stringify(recent));
      return true;
    } catch {
      // if localStorage not available, allow submit
      return true;
    }
  };

  const submitFeedback = async () => {
    if (!user) {
      toast.error('Нужно войти в аккаунт, чтобы отправить обратную связь');
      return;
    }

    if (!checkRateLimit()) {
      toast.error('Слишком много сообщений. Попробуйте через час.');
      return;
    }

    setSubmitting(true);
    try {
      const insertPayload: Record<string, any> = {
        user_id: user.id,
        content_type: contentType,
        content_ref: contentRef,
        user_comment: message?.trim() || '',
      };
      if (severity) insertPayload.severity = severity;
      if (deviceInfo) insertPayload.device_info = deviceInfo;

      const { data, error } = await supabase
        .from('content_feedback')
        .insert(insertPayload)
        .select('id, created_at')
        .single();

      if (error) {
        console.error('feedback insert error:', error);
        toast.error('Не удалось отправить. Попробуйте позже.');
      } else {
        if (data?.id) {
          toast.success('Спасибо! Мы получили вашу обратную связь.');
        } else {
          toast.success('Отправлено.');
        }
        setOpen(false);
        setMessage('');
        setSeverity('other');
      }
    } catch (e) {
      console.error(e);
      toast.error('Ошибка при отправке');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-navy/20 text-navy/70 hover:bg-sage/10 rounded-lg"
        onClick={() => setOpen(true)}
      >
        Сообщить об ошибке
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Обратная связь</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-navy/70 mb-1">Тип проблемы</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={`text-xs px-3 py-2 rounded-lg border transition ${
                      severity === opt.value
                        ? 'border-sage bg-sage/10 text-sage-900'
                        : 'border-navy/20 text-navy/70 hover:bg-sage/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy/70 mb-1">Комментарий (необязательно)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Опишите проблему или дайте подсказку"
                className="min-h-[96px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-gold to-sage text-white"
                onClick={submitFeedback}
                disabled={submitting}
              >
                {submitting ? 'Отправка…' : 'Отправить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


