import { useState } from 'react';
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

type SeverityType = 'typo' | 'math_wrong' | 'confusing_explanation' | 'ui_bug' | 'other';

const SEVERITY_OPTIONS: { value: SeverityType; label: string }[] = [
  { value: 'typo', label: 'Опечатка / русский' },
  { value: 'math_wrong', label: 'Математика неверна' },
  { value: 'confusing_explanation', label: 'Непонятно / запутано' },
  { value: 'ui_bug', label: 'Глючит экран / рендер' },
  { value: 'other', label: 'Другое' },
];

const RATE_LIMIT_KEY = 'last_feedback_timestamp';
const RATE_LIMIT_MS = 60000; // 1 minute

export function FeedbackButton({ contentType, contentRef }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [severity, setSeverity] = useState<SeverityType | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const checkRateLimit = (): boolean => {
    const lastTimestamp = localStorage.getItem(RATE_LIMIT_KEY);
    if (!lastTimestamp) return true;
    
    const elapsed = Date.now() - parseInt(lastTimestamp, 10);
    return elapsed > RATE_LIMIT_MS;
  };

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scale: 0.5,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  };

  const getDeviceInfo = (): string => {
    const ua = navigator.userAgent;
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    return 'desktop';
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Пожалуйста, войдите в систему, чтобы отправить отзыв');
      return;
    }

    if (!severity) {
      toast.error('Пожалуйста, выберите категорию проблемы');
      return;
    }

    if (!checkRateLimit()) {
      toast.error('Пожалуйста, подождите минуту перед отправкой следующего отзыва');
      return;
    }

    setIsSubmitting(true);

    try {
      const screenshotDataUrl = await captureScreenshot();

      const { error } = await supabase.from('content_feedback').insert({
        user_id: user.id,
        content_type: contentType,
        content_ref: contentRef,
        severity,
        user_comment: comment.trim() || null,
        screenshot_url: screenshotDataUrl,
        device_info: getDeviceInfo(),
        app_version: '1.0.0',
      });

      if (error) throw error;

      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());

      toast.success('Спасибо! Мы посмотрим 👀');

      setIsOpen(false);
      setSeverity(null);
      setComment('');
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      toast.error(error.message || 'Не удалось отправить отзыв');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        Нашёл ошибку 🐞
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Сообщить об ошибке</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 block">
                Выберите тип ошибки *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {SEVERITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    onClick={() => setSeverity(option.value)}
                    className={
                      severity === option.value
                        ? 'bg-gradient-to-r from-gold/20 to-sage/20 border-2 border-gold'
                        : 'bg-muted hover:bg-muted/80 border border-border'
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 block">
                Опишите проблему (необязательно)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Дополнительные детали..."
                className="min-h-[100px] bg-background text-foreground"
                maxLength={1000}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !severity}
                className="bg-gradient-to-r from-gold to-sage hover:from-gold/90 hover:to-sage/90 text-card-foreground"
              >
                {isSubmitting ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
