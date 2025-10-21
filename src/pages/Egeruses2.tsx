import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import FlyingMathBackground from '@/components/FlyingMathBackground';

interface Topic {
  id: string;
  subject: string;
  essay_topic: string;
  rules: string | null;
}

interface EssayRow {
  id: string;
  user_id: string;
  essay_topic_id: string;
  text_scan: string | null;
  analysis: string | null;
  score: number | null;
  created_at: string;
}

const Egeruses2 = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [starting, setStarting] = useState(false);
  const [loadingPending, setLoadingPending] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [currentEssay, setCurrentEssay] = useState<EssayRow | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [telegramInput, setTelegramInput] = useState<string>('');
  const [telegramInputLoading, setTelegramInputLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);

  const [checking, setChecking] = useState(false);
  const [statusStep, setStatusStep] = useState<number>(0);
  const [analysisText, setAnalysisText] = useState<string | null>(null);

  const modalBackdropRef = useRef<HTMLDivElement>(null);

  const pageBg = useMemo(
    () => ({ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setUserId(data.user?.id ?? null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoadingPending(false);
      return;
    }
    const loadPending = async () => {
      setErrorText(null);
      setLoadingPending(true);
      try {
        const { data: essays, error } = await supabase
          .from('student_essay')
          .select('id,user_id,essay_topic_id,text_scan,analysis,score,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (essays && essays.length > 0 && essays[0]?.text_scan == null) {
          const attempt = essays[0] as EssayRow;
          setCurrentEssay(attempt);
          const { data: topic, error: topicErr } = await supabase
            .from('rus_essay_topics')
            .select('id,subject,essay_topic,rules')
            .eq('id', attempt.essay_topic_id)
            .maybeSingle();
          if (topicErr) throw topicErr;
          if (topic) setCurrentTopic(topic as Topic);
        }
      } catch {
        setErrorText('Ошибка в сети... Попробуй позже');
      } finally {
        setLoadingPending(false);
      }
    };
    loadPending();
  }, [userId]);

  const pickRandom = <T,>(arr: T[]): T | null => {
    if (!arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const handleStart = async () => {
    if (!userId) {
      setErrorText('Ошибка в сети... Попробуй позже');
      return;
    }
    setStarting(true);
    setErrorText(null);
    try {
      // Fetch all topics the user has attempted
      const { data: attempted, error: attemptedErr } = await supabase
        .from('student_essay')
        .select('essay_topic_id')
        .eq('user_id', userId);
      
      if (attemptedErr) throw attemptedErr;
      
      const attemptedIds = new Set<string>((attempted || []).map((r: any) => r.essay_topic_id));

      // Fetch all available topics
      const { data: allTopics, error: topErr } = await supabase
        .from('rus_essay_topics')
        .select('id,subject,essay_topic,rules');
      
      if (topErr) throw topErr;

      // Filter unattempted topics
      const unattempted = (allTopics || []).filter((t: any) => !attemptedIds.has(t.id));
      
      // Pick random from unattempted, or from all if all attempted
      const chosen = pickRandom(unattempted.length ? unattempted : (allTopics || []));
      if (!chosen) {
        setErrorText('Ошибка в сети... Попробуй позже');
        return;
      }

      // Insert new essay attempt
      const { data: inserted, error: insErr } = await supabase
        .from('student_essay')
        .insert({ user_id: userId, essay_topic_id: (chosen as any).id, text_scan: null, analysis: null, score: null })
        .select('id,user_id,essay_topic_id,text_scan,analysis,score,created_at')
        .single();
      
      if (insErr) throw insErr;

      setCurrentTopic(chosen as Topic);
      setCurrentEssay(inserted as EssayRow);
      setAnalysisText(null);
    } catch {
      setErrorText('Ошибка в сети... Попробуй позже');
    } finally {
      setStarting(false);
    }
  };

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalBackdropRef.current) closeModal();
  };

  const handleConfirmTelegram = async () => {
    if (!userId) return;
    setTelegramInputLoading(true);
    setErrorText(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('telegram_input')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      const txt = (data?.telegram_input ?? '').toString();
      if (!txt.trim()) setErrorText('Ошибка в сети... Попробуй позже');
      setTelegramInput(txt);
      setEditMode(false);
    } catch {
      setErrorText('Ошибка в сети... Попробуй позже');
    } finally {
      setTelegramInputLoading(false);
      closeModal();
    }
  };

  const handleSaveTelegram = async () => {
    if (!userId) return;
    if (!editMode) {
      setEditMode(true);
      return;
    }
    setSavingTelegram(true);
    setErrorText(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_input: telegramInput })
        .eq('id', userId);
      if (error) throw error;
      setEditMode(false);
    } catch {
      setErrorText('Ошибка в сети... Попробуй позже');
    } finally {
      setSavingTelegram(false);
    }
  };

  const runStatusSequence = () =>
    new Promise<void>((resolve) => {
      setStatusStep(1);
      setTimeout(() => {
        setStatusStep(2);
        setTimeout(() => {
          setStatusStep(3);
          setTimeout(() => resolve(), 2000);
        }, 2000);
      }, 2000);
    });

  const handleCheck = async () => {
    if (!userId || !currentEssay) return;
    setChecking(true);
    setStatusStep(0);
    setAnalysisText(null);
    setErrorText(null);
    try {
      const textToUse = telegramInput?.toString().trim();
      if (!textToUse) {
        setErrorText('Ошибка в сети... Попробуй позже');
        setChecking(false);
        return;
      }
      {
        const { error } = await supabase
          .from('student_essay')
          .update({ text_scan: textToUse })
          .eq('id', currentEssay.id);
        if (error) throw error;
      }
      const seq = runStatusSequence();
      const api = supabase.functions.invoke('openrouter-essay-check', {
        body: { subject: 'ege', user_id: userId }
      })
        .then((res) => {
          if (res.error) throw new Error('bad');
          return (res.data?.analysis as string) || null;
        })
        .catch(() => {
          throw new Error('network');
        });
      const [_, analysis] = await Promise.all([seq, api]);
      if (!analysis) {
        const { data: latest, error: latestErr } = await supabase
          .from('student_essay')
          .select('id,analysis')
          .eq('id', currentEssay.id)
          .maybeSingle();
        if (latestErr) {
          setErrorText('Ошибка в сети... Попробуй позже');
        } else {
          setAnalysisText(latest?.analysis ?? '—');
        }
      } else {
        setAnalysisText(analysis);
      }
    } catch {
      setErrorText('Ошибка в сети... Попробуй позже');
    } finally {
      setChecking(false);
      setStatusStep(0);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={pageBg}>
        Загрузка...
      </div>
    );
  }
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={pageBg}>
        Войдите в систему
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={pageBg}>
      <FlyingMathBackground />
      <div className="relative z-10 pt-8 pb-16 container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              Сочинение ЕГЭ
            </h1>
            <p className="text-white/80">Выберите тему и загрузите текст через Telegram</p>
          </div>

          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-xl text-white">
            {!currentEssay && (
              <div className="text-center">
                <button
                  onClick={handleStart}
                  disabled={starting || loadingPending}
                  className="inline-flex items-center justify-center px-6 h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] font-bold shadow hover:from-yellow-600 hover:to-emerald-600 transition"
                >
                  Получить тему сочинения
                </button>
                {loadingPending && <div className="mt-4 text-white/70">Загрузка...</div>}
                {!!errorText && <div className="mt-4 text-red-300">{errorText}</div>}
              </div>
            )}

            {currentEssay && currentTopic && (
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-white/70">Тема сочинения</div>
                  <div className="text-xl font-semibold mt-1">{currentTopic.essay_topic}</div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="px-4 h-11 rounded-xl border border-white/30 hover:bg-white/10 transition"
                  >
                    Прикрепить фото
                  </button>
                </div>

                {telegramInput !== '' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Текст из Telegram</div>
                      <button
                        onClick={handleSaveTelegram}
                        disabled={savingTelegram}
                        className="px-3 h-10 rounded-lg border border-white/30 hover:bg-white/10 transition"
                      >
                        {editMode ? 'Сохранить' : 'Редактировать'}
                      </button>
                    </div>
                    {editMode ? (
                      <textarea
                        value={telegramInput}
                        onChange={(e) => setTelegramInput(e.target.value)}
                        className="w-full min-h-[160px] p-3 rounded-xl bg-white/10 border border-white/20 outline-none"
                      />
                    ) : (
                      <div className="w-full min-h-[120px] p-3 rounded-xl bg-white/10 border border-white/20">
                        <pre className="whitespace-pre-wrap font-sans">{telegramInput}</pre>
                      </div>
                    )}
                  </div>
                )}

                {telegramInput !== '' && (
                  <div>
                    <button
                      onClick={handleCheck}
                      disabled={checking}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] font-bold hover:from-yellow-600 hover:to-emerald-600 transition"
                    >
                      Проверить
                    </button>
                  </div>
                )}

                {checking && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      {statusStep >= 1 ? 'Проверяем содержание сочинения' : 'Подготовка...'}
                    </div>
                    {statusStep >= 2 && <div>Проверяем речевое оформление сочинения</div>}
                    {statusStep >= 3 && <div>Проверяем грамотность</div>}
                  </div>
                )}

                {!!analysisText && (
                  <div className="mt-6">
                    <div className="text-sm text-white/70 mb-2">Анализ</div>
                    <div className="p-4 rounded-xl bg-white/10 border border-white/20">
                      <pre className="whitespace-pre-wrap font-sans">{analysisText}</pre>
                    </div>
                  </div>
                )}

                {!!errorText && <div className="text-red-300">{errorText}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          ref={modalBackdropRef}
          onClick={onBackdropClick}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white/95 border border-white/20 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-3 top-3 w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#1a1f36]"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="p-6 text-[#1a1f36]">
              <div className="font-semibold text-lg mb-2">Прикрепить фото</div>
              <p className="text-sm leading-relaxed mb-6">
                Загрузили фото сочинения в Телеграм бот egechat_bot? Нажмите кнопку &quot;Да&quot;. А если вы еще не
                подключили бот, то сделайте это в своем профиле.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleConfirmTelegram}
                  disabled={telegramInputLoading}
                  className="px-5 h-10 rounded-xl bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] font-bold hover:from-yellow-600 hover:to-emerald-600 transition"
                >
                  {telegramInputLoading ? 'Загрузка...' : 'Да'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Egeruses2;
