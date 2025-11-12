  import { useEffect, useMemo, useState } from 'react';
  import { supabase } from '@/integrations/supabase/client';
  import FlyingCyrillicBackground from '@/components/FlyingCyrillicBackground';
  import { Button } from '@/components/ui/button';
  import { ArrowLeft, History } from 'lucide-react';

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
    const [essayType, setEssayType] = useState<'ege' | 'oge'>('ege');

    const [starting, setStarting] = useState(false);
    const [loadingPending, setLoadingPending] = useState(true);
    const [errorText, setErrorText] = useState<string | null>(null);

    const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
    const [currentEssay, setCurrentEssay] = useState<EssayRow | null>(null);

    const [essayText, setEssayText] = useState<string>('');

    const [checking, setChecking] = useState(false);
    const [statusStep, setStatusStep] = useState<number>(0);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [showTask, setShowTask] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [essayHistory, setEssayHistory] = useState<EssayRow[]>([]);
    const [highlightedText, setHighlightedText] = useState<string>('');
    const [smoothProgress, setSmoothProgress] = useState<number>(0);
    const [keyboardInset, setKeyboardInset] = useState<number>(0);

    const pageBg = useMemo(
      () => ({ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }),
      []
    );

    // Disable body/html scroll and confine scrolling to the in-page container (mobile bounce fix)
    useEffect(() => {
      const html = document.documentElement;
      const body = document.body;
      const prevHtmlOverflow = html.style.overflow;
      const prevBodyOverflow = body.style.overflow;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      return () => {
        html.style.overflow = prevHtmlOverflow;
        body.style.overflow = prevBodyOverflow;
      };
    }, []);

    // Keyboard-safe positioning for the mobile fixed button
    useEffect(() => {
      const vv = (window as any).visualViewport as VisualViewport | undefined;
      if (!vv) return;
      const handler = () => {
        const inset = Math.max(0, window.innerHeight - vv.height);
        setKeyboardInset(inset);
      };
      handler();
      vv.addEventListener('resize', handler);
      vv.addEventListener('scroll', handler);
      return () => {
        vv.removeEventListener('resize', handler);
        vv.removeEventListener('scroll', handler);
      };
    }, []);

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
          // First get essay topic IDs that match the current essay type
          const { data: topicIds, error: topicError } = await supabase
            .from('essay_topics')
            .select('id')
            .eq('subject', essayType);
          
          if (topicError) throw topicError;
          
          const topicIdList = topicIds?.map(t => t.id) || [];
          
          if (topicIdList.length === 0) {
            setEssayHistory([]);
            setLoadingPending(false);
            return;
          }
          
          // Load essay history filtered by essay type
          const { data: history, error: historyErr } = await supabase
            .from('student_essay1')
            .select('id,user_id,essay_topic_id,text_scan,analysis,score,created_at')
            .eq('user_id', userId)
            .in('essay_topic_id', topicIdList)
            .order('created_at', { ascending: false });
          
          if (historyErr) throw historyErr;
          setEssayHistory(history as EssayRow[] || []);

          // Don't automatically load pending attempts - start with empty state
          // User must click "Получить другую тему" to get a task
        } catch {
          setErrorText('Ошибка в сети... Попробуй позже');
        } finally {
          setLoadingPending(false);
        }
      };
      loadPending();
    }, [userId, essayType]);

    // Smooth progress animation
    useEffect(() => {
      if (checking && statusStep > 0) {
        const targetProgress = Math.min(statusStep * 8.33, 100);
        const startProgress = smoothProgress;
        const duration = 1000; // 1 second
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const currentProgress = startProgress + (targetProgress - startProgress) * progress;
          
          setSmoothProgress(currentProgress);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
      } else if (!checking) {
        setSmoothProgress(0);
      }
    }, [statusStep, checking]);

    const pickRandom = <T,>(arr: T[]): T | null => {
      if (!arr.length) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    };

    const handleGetTopic = async () => {
      if (!userId) {
        setErrorText('Ошибка в сети... Попробуй позже');
        return;
      }
      setStarting(true);
      setErrorText(null);
      setAnalysisData(null);
      setEssayText('');
      try {
        const { data: attempted, error: attemptedErr } = await supabase
          .from('student_essay1')
          .select('essay_topic_id')
          .eq('user_id', userId);
        
        if (attemptedErr) throw attemptedErr;
        
        const attemptedIds = new Set<string>((attempted || []).map((r: any) => r.essay_topic_id));

        const { data: allTopics, error: topErr } = await supabase
          .from('essay_topics')
          .select('id,subject,essay_topic,rules')
          .eq('subject', essayType);
        
        if (topErr) throw topErr;

        const unattempted = (allTopics || []).filter((t: any) => !attemptedIds.has(t.id));
        const chosen = pickRandom(unattempted.length ? unattempted : (allTopics || []));
        
        if (!chosen) {
          setErrorText('Ошибка в сети... Попробуй позже');
          return;
        }

        const { data: inserted, error: insErr } = await supabase
          .from('student_essay1')
          .insert({ 
            user_id: userId, 
            essay_topic_id: (chosen as any).id, 
            text_scan: null, 
            analysis: null, 
            score: null 
          })
          .select('id,user_id,essay_topic_id,text_scan,analysis,score,created_at')
          .single();
        
        if (insErr) throw insErr;

        setCurrentTopic(chosen as Topic);
        setCurrentEssay(inserted as EssayRow);
      } catch {
        setErrorText('Ошибка в сети... Попробуй позже');
      } finally {
        setStarting(false);
      }
    };

    const runStatusSequence = () =>
      new Promise<void>((resolve) => {
        setStatusStep(1);
        setTimeout(() => {
          setStatusStep(2);
          setTimeout(() => {
            setStatusStep(3);
            setTimeout(() => {
              setStatusStep(4);
              setTimeout(() => {
                setStatusStep(5);
                setTimeout(() => {
                  setStatusStep(6);
                  setTimeout(() => {
                    setStatusStep(7);
                    setTimeout(() => {
                      setStatusStep(8);
                      setTimeout(() => {
                        setStatusStep(9);
                        setTimeout(() => {
                          setStatusStep(10);
                          setTimeout(() => {
                            setStatusStep(11);
                            setTimeout(() => {
                              setStatusStep(12);
            setTimeout(() => resolve(), 2000);
          }, 2000);
                          }, 3000);
                        }, 3000);
                      }, 3000);
                    }, 3000);
                  }, 3000);
                }, 3000);
              }, 3000);
            }, 3000);
          }, 3000);
        }, 3000);
      });

    const handleCheck = async () => {
      if (!userId || !currentEssay) return;
      if (!essayText.trim()) {
        setErrorText('Введите текст сочинения');
        return;
      }
      
      setChecking(true);
      setStatusStep(0);
      setAnalysisData(null);
      setErrorText(null);
      
      try {
        const { error: updateErr } = await supabase
            .from('student_essay1')
          .update({ text_scan: essayText.trim() })
            .eq('id', currentEssay.id);
        
        if (updateErr) throw updateErr;

        const seq = runStatusSequence();
        const api = supabase.functions.invoke('openrouter-essay-check', {
          body: { subject: essayType, user_id: userId }
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
            .from('student_essay1')
            .select('id,analysis')
            .eq('id', currentEssay.id)
            .maybeSingle();
          
          if (latestErr) {
            setErrorText('Ошибка в сети... Попробуй позже');
          } else {
            const analysisValue = latest?.analysis ?? null;
            if (analysisValue) {
            try {
              const parsed = typeof analysisValue === 'string' ? JSON.parse(analysisValue) : analysisValue;
              setAnalysisData(parsed);
            } catch {
                setErrorText('Ошибка обработки результатов');
              }
            }
          }
        } else {
          try {
            const parsed = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
            setAnalysisData(parsed);
          } catch {
            setErrorText('Ошибка обработки результатов');
          }
        }
      } catch {
        setErrorText('Ошибка в сети... Попробуй позже');
      } finally {
        setChecking(false);
        setStatusStep(0);
      }
    };

    const getScoreColor = (score: number, max: number) => {
      const percentage = (score / max) * 100;
      if (percentage >= 80) return 'bg-emerald-500';
      if (percentage >= 50) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    const getCriterionColor = (criterion: string) => {
      const colorMap: { [key: string]: string } = {
        'K1': 'border-orange-400 bg-orange-400/10', // Content - Author's position
        'K2': 'border-blue-400 bg-blue-400/10',     // Content - Commentary
        'K3': 'border-green-400 bg-green-400/10',   // Content - Personal attitude
        'K4': 'border-cyan-400 bg-cyan-400/10',     // Speech - Factual accuracy
        'K5': 'border-indigo-400 bg-indigo-400/10', // Speech - Logic
        'K6': 'border-purple-400 bg-purple-400/10', // Speech - Ethical norms
        'K7': 'border-pink-400 bg-pink-400/10',     // Grammar - Spelling
        'K8': 'border-rose-400 bg-rose-400/10',     // Grammar - Punctuation
        'K9': 'border-amber-400 bg-amber-400/10',   // Grammar - Grammar rules
        'K10': 'border-lime-400 bg-lime-400/10'     // Grammar - Speech norms
      };
      return colorMap[criterion] || 'border-gray-400 bg-gray-400/10';
    };

    const getCriterionHighlightColor = (criterion: string) => {
      const colorMap: { [key: string]: string } = {
        'K1': 'bg-orange-400/30 border-orange-400/60 text-white',
        'K2': 'bg-blue-400/30 border-blue-400/60 text-white',
        'K3': 'bg-green-400/30 border-green-400/60 text-white',
        'K4': 'bg-cyan-400/30 border-cyan-400/60 text-white',
        'K5': 'bg-indigo-400/30 border-indigo-400/60 text-white',
        'K6': 'bg-purple-400/30 border-purple-400/60 text-white',
        'K7': 'bg-pink-400/30 border-pink-400/60 text-white',
        'K8': 'bg-rose-400/30 border-rose-400/60 text-white',
        'K9': 'bg-amber-400/30 border-amber-400/60 text-white',
        'K10': 'bg-lime-400/30 border-lime-400/60 text-white'
      };
      return colorMap[criterion] || 'bg-gray-400/30 border-gray-400/60 text-white';
    };

    // Whitespace/line-break tolerant finder
    const findContextIndex = (text: string, snippet: string) => {
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      const t = norm(text);
      const s = norm(snippet);
      // Map indices from normalized to original using a rolling window approach
      const raw = text;
      const rawLower = raw.toLowerCase();
      // naive fallback when mapping is complex: use includes on raw lower as well
      const idxRaw = rawLower.indexOf(snippet.toLowerCase());
      if (idxRaw !== -1) return idxRaw;
      // fallback to normalized search and approximate original index
      const idx = t.indexOf(s);
      if (idx === -1) return -1;
      // approximate: walk raw and count normalized characters
      let iRaw = 0; let iNorm = 0;
      // advance to idx in normalized space
      while (iRaw < raw.length && iNorm < idx) {
        const ch = raw[iRaw];
        iRaw++;
        iNorm += (/\s/.test(ch) ? (iNorm===0||/\s/.test(raw[iRaw-2])?0:1) : 1); // coarse approximation
      }
      return iRaw;
    };

    const highlightTextWithErrors = (text: string, errors: any[]) => {
      if (!errors || errors.length === 0) return text;
      
      console.log('highlightTextWithErrors called with:', { textLength: text.length, errorsCount: errors.length });
      console.log('First error sample:', errors[0]);
      
      // Get sorted errors (same order as displayed)
      const sortedErrors = getSortedErrors();
      console.log('Sorted errors:', sortedErrors.length);
      
      // Track replacements to maintain accurate indices
      interface Replacement {
        start: number;
        end: number;
        sortedIndex: number;
        criterion: string;
        original: string;
      }
      
      const replacements: Replacement[] = [];
      const usedPositions = new Set<string>(); // Track used positions to ensure one-to-one mapping
      
      // For each error, find its exact location using original text first, then context_snippet for disambiguation
      sortedErrors.forEach((error, sortedIndex) => {
        console.log(`Processing error ${sortedIndex}:`, { 
          original: error.original, 
          context_snippet: error.context_snippet,
          criterion: error.criterion 
        });
        
        if (!error.original) {
          console.log('Skipping error - no original');
          return;
        }
        
        // Skip errors without criterion or with empty criterion
        if (!error.criterion || error.criterion.trim() === '') {
          console.log('Skipping error - no criterion');
          return;
        }
        
        // Step 1: Find all occurrences of the original text
        const originalText = error.original;
        const originalLower = originalText.toLowerCase();
        const textLower = text.toLowerCase();
        
        const allOccurrences: number[] = [];
        let searchIndex = 0;
        
        while (true) {
          const foundIndex = textLower.indexOf(originalLower, searchIndex);
          if (foundIndex === -1) break;
          allOccurrences.push(foundIndex);
          searchIndex = foundIndex + 1;
        }
        
        console.log(`Found ${allOccurrences.length} occurrences of "${originalText}"`);
        
        let targetIndex = -1;
        
        if (allOccurrences.length === 0) {
          console.log('Original text not found in essay');
          return;
        } else if (allOccurrences.length === 1) {
          // Only one occurrence, use it directly
          targetIndex = allOccurrences[0];
          console.log('Using single occurrence at index:', targetIndex);
        } else {
          // Multiple occurrences, use context_snippet to disambiguate
          if (error.context_snippet && error.context_snippet.trim() !== '') {
            console.log('Multiple occurrences found, using context_snippet for disambiguation');
            
            // Find the context_snippet in the text
            const contextIndex = findContextIndex(text, error.context_snippet);
            if (contextIndex !== -1) {
              // Find which occurrence is closest to the context
              let closestIndex = -1;
              let minDistance = Infinity;
              
              for (const occurrence of allOccurrences) {
                const distance = Math.abs(occurrence - contextIndex);
                if (distance < minDistance) {
                  minDistance = distance;
                  closestIndex = occurrence;
                }
              }
              
              if (closestIndex !== -1) {
                targetIndex = closestIndex;
                console.log('Using occurrence closest to context at index:', targetIndex);
              } else {
                console.log('Could not determine which occurrence to use');
                return;
              }
            } else {
              console.log('Context snippet not found, using first occurrence');
              targetIndex = allOccurrences[0];
            }
          } else {
            console.log('No context snippet available, using first occurrence');
            targetIndex = allOccurrences[0];
          }
        }
        
        if (targetIndex !== -1) {
          const absoluteStart = targetIndex;
          const absoluteEnd = targetIndex + originalText.length;
          
          // Check if this position is already used (ensure one-to-one mapping)
          const positionKey = `${absoluteStart}-${absoluteEnd}`;
          if (usedPositions.has(positionKey)) {
            console.log('Position already used, skipping this error');
            return;
          }
          
          console.log('Final target position:', absoluteStart, absoluteEnd);
          
          // Mark this position as used
          usedPositions.add(positionKey);
          
          replacements.push({
            start: absoluteStart,
            end: absoluteEnd,
            sortedIndex,
            criterion: error.criterion,
            original: error.original
          });
        }
      });
      
      console.log('Total replacements found:', replacements.length);
      
      // Sort replacements by position ascending
      replacements.sort((a, b) => a.start - b.start);
      
      // Filter out overlapping ranges
      const nonOverlapping: typeof replacements = [];
      let lastEnd = -1;
      for (const rep of replacements) {
        if (rep.start >= lastEnd) {
          nonOverlapping.push(rep);
          lastEnd = rep.end;
        }
      }
      
      // Build final HTML without index shifting
      let result = '';
      let cursor = 0;
      for (const rep of nonOverlapping) {
        if (cursor < rep.start) {
          result += text.substring(cursor, rep.start);
        }
        const word = text.substring(rep.start, rep.end);
        result += `<span class="error-highlight inline-block px-1 rounded border cursor-pointer hover:scale-105 transition-transform ${getCriterionHighlightColor(rep.criterion)}" data-error-index="${rep.sortedIndex}" data-criterion="${rep.criterion}" onclick="handleHighlightedWordClick(${rep.sortedIndex}, '${rep.criterion}')">${word}</span>`;
        cursor = rep.end;
      }
      if (cursor < text.length) {
        result += text.substring(cursor);
      }
      
      console.log('Final highlighted text length:', result.length);
      console.log('Contains spans:', result.includes('<span'));
      
      return result;
    };

    const handleErrorClick = (errorIndex: number, criterion: string) => {
      // Prefer a direct lookup by index attribute for robustness
      const direct = document.querySelector(`[data-error-item-index="${errorIndex}"]`);
      const targetElement = direct || document.querySelectorAll('[data-error-item]')[errorIndex];
      
      if (targetElement) {
        // Scroll to the error element
        (targetElement as HTMLElement).scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add glow effect with criterion-specific color
        const glowColor = getCriterionGlowColor(criterion);
        targetElement.classList.add('error-glow', glowColor);
        setTimeout(() => {
          targetElement.classList.remove('error-glow', glowColor);
        }, 2000);
      }
    };

    const handleErrorBoxClick = (error: any, errorIndex: number) => {
      // Find the highlighted text in the essay
      const highlightedSpans = document.querySelectorAll(`[data-error-index="${errorIndex}"]`);
      
      if (highlightedSpans.length > 0) {
        // Scroll to the first highlighted span
        highlightedSpans[0].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add glow effect to all matching spans
        const glowColor = getCriterionGlowColor(error.criterion);
        highlightedSpans.forEach(span => {
          span.classList.add('error-glow', glowColor);
          setTimeout(() => {
            span.classList.remove('error-glow', glowColor);
          }, 2000);
        });
      }
    };

    const handleHighlightedWordClick = (errorIndex: number, criterion: string) => {
      // Find the error item in the Найденные ошибки section
      const errorElement = document.querySelector(`[data-error-item-index="${errorIndex}"]`);
      
      if (errorElement) {
        // Scroll to the error in the Найденные ошибки section
        errorElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add glow effect to the error box
        const glowColor = getCriterionGlowColor(criterion);
        errorElement.classList.add('error-glow', glowColor);
        setTimeout(() => {
          errorElement.classList.remove('error-glow', glowColor);
        }, 2000);
      }
    };

    // Make the function available globally for onclick handlers
    useEffect(() => {
      (window as any).handleHighlightedWordClick = handleHighlightedWordClick;
      return () => {
        delete (window as any).handleHighlightedWordClick;
      };
    }, []);

    const getSortedErrors = () => {
      if (!analysisData?.errors) return [];
      
      // Filter out errors without criteria first
      const filteredErrors = analysisData.errors.filter((error: any) => 
        error.criterion && error.criterion.trim() !== ''
      );
      
      // Sort errors by their position in the essay text using context_snippet
      return [...filteredErrors].sort((a, b) => {
        const textA = essayText.toLowerCase();
        const textB = essayText.toLowerCase();
        
        // Use context_snippet for more accurate positioning
        const posA = a.context_snippet ? findContextIndex(essayText, a.context_snippet) : -1;
        const posB = b.context_snippet ? findContextIndex(essayText, b.context_snippet) : -1;
        
        // If both found, sort by position
        if (posA !== -1 && posB !== -1) {
          return posA - posB;
        }
        
        // If only one found, prioritize the found one
        if (posA !== -1) return -1;
        if (posB !== -1) return 1;
        
        // If neither found, maintain original order
        return 0;
      });
    };

    const getCriterionGlowColor = (criterion: string) => {
      // Use yellow glow for all criteria for better visibility
      return 'glow-yellow';
    };

  const loadEssayHistory = async () => {
    if (!userId) return;
    try {
      // First get essay topic IDs that match the current essay type
      const { data: topicIds, error: topicError } = await supabase
        .from('essay_topics')
        .select('id')
        .eq('subject', essayType);
      
      if (topicError) throw topicError;
      
      const topicIdList = topicIds?.map(t => t.id) || [];
      
      if (topicIdList.length === 0) {
        setEssayHistory([]);
        return;
      }
      
      // Then get essays that match these topic IDs
      const { data: history, error } = await supabase
        .from('student_essay1')
        .select('id,user_id,essay_topic_id,text_scan,analysis,score,created_at')
        .eq('user_id', userId)
        .in('essay_topic_id', topicIdList)
        .not('analysis', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEssayHistory(history as EssayRow[] || []);
    } catch {
      setErrorText('Ошибка загрузки истории');
    }
  };

    const loadEssayFromHistory = async (essay: EssayRow) => {
      try {
        const { data: topic, error } = await supabase
          .from('essay_topics')
          .select('id,subject,essay_topic,rules')
          .eq('id', essay.essay_topic_id)
          .maybeSingle();
        
        if (error) throw error;
        if (topic) {
          setCurrentTopic(topic as Topic);
          setEssayType(topic.subject as 'ege' | 'oge');
          setCurrentEssay(essay);
          setEssayText(essay.text_scan || '');
          
          if (essay.analysis) {
            try {
              const parsed = typeof essay.analysis === 'string' ? JSON.parse(essay.analysis) : essay.analysis;
              setAnalysisData(parsed);
            } catch {
              setAnalysisData(null);
            }
          } else {
            setAnalysisData(null);
          }
        }
      } catch {
        setErrorText('Ошибка загрузки сочинения');
      }
    };

    const renderCriterion = (key: string, title: string, comment: string, score: number, max: number, colorClass: string) => (
      <div className={`bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 sm:p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xs sm:text-sm font-semibold ${colorClass}`}>{key}</div>
          <div className="text-base sm:text-lg font-bold text-white">
            {score}/{max}
          </div>
        </div>
        <div className="text-xs sm:text-sm font-medium text-white mb-2 break-words">{title}</div>
        <div className="text-xs text-white/70 mb-3 break-words">{comment}</div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${getScoreColor(score, max)}`}
            style={{ width: `${(score / max) * 100}%` }}
          ></div>
        </div>
      </div>
    );

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
      <div className="fixed left-0 right-0 bottom-0 top-16 overflow-hidden" style={pageBg}>
        <FlyingCyrillicBackground />
        <div
          className="relative z-10 h-full md:overflow-hidden overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' as any }}
        >
          <div className="container mx-auto px-4 md:pb-0 pb-20 h-full overflow-hidden flex flex-col">
            <div className="max-w-7xl mx-auto flex flex-col h-full">
              {/* Title and Navigation */}
              <div className="flex flex-col gap-3 mb-4 flex-shrink-0 pt-4">
                {/* Top row: Back button and title */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/mydb3'}
                    className="hover:bg-white/20 text-white flex-shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Назад</span>
                  </Button>
                  <h1 className="text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent text-center flex-1 truncate">
                    Проверка сочинения
                  </h1>
                  <div className="w-16 sm:w-auto flex-shrink-0" />
                </div>
                {/* Bottom row: Action buttons - wrap on mobile */}
                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/egeruses-analytics'}
                    className="hover:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Аналитика
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowHistory(true);
                      loadEssayHistory();
                    }}
                    className="hover:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">История сочинений</span>
                    <span className="sm:hidden">История</span>
                  </Button>
                  {analysisData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAnalysisData(null);
                        setEssayText('');
                        setCurrentTopic(null);
                        setCurrentEssay(null);
                      }}
                      className="hover:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-3"
                    >
                      Новое сочинение
                    </Button>
                  )}
                </div>
            </div>

              {/* Main content */}
              <div className="flex-1 overflow-hidden min-h-0">
                {!analysisData ? (
                  /* Main mode - Input */
                  <div className="h-full flex flex-col">
                    {/* Essay type selector */}
                    <div className="mb-4 flex-shrink-0">
                      <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 sm:p-4">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <span className="text-white font-medium text-sm sm:text-base flex-shrink-0">тип сочинения:</span>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => {
                                  setEssayType('ege');
                                  setCurrentTopic(null);
                                  setCurrentEssay(null);
                                  setEssayText('');
                                  setAnalysisData(null);
                                  setErrorText(null);
                                }}
                                disabled={checking}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-medium transition text-sm sm:text-base min-h-[44px] touch-manipulation ${
                                  essayType === 'ege'
                                    ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]'
                                    : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                                }`}
                              >
                                ЕГЭ
                              </button>
                              <button
                                onClick={() => {
                                  setEssayType('oge');
                                  setCurrentTopic(null);
                                  setCurrentEssay(null);
                                  setEssayText('');
                                  setAnalysisData(null);
                                  setErrorText(null);
                                }}
                                disabled={checking}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-medium transition text-sm sm:text-base min-h-[44px] touch-manipulation ${
                                  essayType === 'oge'
                                    ? 'bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]'
                                    : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                                }`}
                              >
                                ОГЭ
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={handleGetTopic}
                            disabled={starting || loadingPending || checking}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] font-semibold rounded-lg hover:from-yellow-600 hover:to-emerald-600 transition disabled:opacity-50 text-sm sm:text-base min-h-[44px] touch-manipulation"
                          >
                            Получить тему
                          </button>
                        </div>
                      </div>
                  </div>

                    {/* Two column layout: Task left, Essay right */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden min-h-0">
                      {/* Task column */}
                      <div
                        className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 sm:p-4 min-h-0 md:h-full md:max-h-full md:overflow-auto overflow-y-auto flex flex-col"
                        style={{ WebkitOverflowScrolling: 'touch' as any, minHeight: '200px', maxHeight: '40vh' }}
                      >
                        <div className="text-white font-semibold mb-3 text-sm sm:text-base flex-shrink-0">Задание</div>
                        <div className="text-white/90 whitespace-pre-wrap text-sm sm:text-base flex-1 overflow-y-auto">
                          {currentTopic?.essay_topic || <span className="text-white/50 italic">Получите тему для начала работы</span>}
                        </div>
                      </div>

                      {/* Essay column */}
                      <div
                        className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 sm:p-4 flex flex-col min-h-0 md:h-full md:max-h-full overflow-hidden"
                        style={{ minHeight: '300px', maxHeight: '60vh' }}
                      >
                        <div className="flex items-center justify-between mb-3 flex-shrink-0">
                          <div className="text-white font-semibold text-sm sm:text-base">Сочинение</div>
                          <button
                            onClick={handleCheck}
                            disabled={!essayText.trim() || checking || !currentTopic}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] font-semibold rounded-lg hover:from-yellow-600 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base hidden md:block"
                          >
                            Проверить
                          </button>
                        </div>

                        <textarea
                          value={essayText}
                          onChange={(e) => setEssayText(e.target.value)}
                          placeholder="Начните писать ваше сочинение..."
                          disabled={checking}
                          className="flex-1 min-h-[200px] w-full p-3 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-white/50 disabled:opacity-50 overflow-auto text-sm sm:text-base md:pb-0 pb-24"
                          style={{ WebkitOverflowScrolling: 'touch' as any }}
                        />

                        {/* Mobile spacer to keep text area above the fixed button */}
                        <div className="h-24 md:hidden" />
                      </div>

                    </div>

                    {/* Checking animation overlay */}
                    {checking && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 sm:p-6 md:p-12 w-full max-w-[500px] min-h-[250px] sm:min-h-[300px]">
                          <div className="flex flex-col items-center space-y-4 sm:space-y-6 h-full">
                            <div className="relative">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white/20 rounded-full"></div>
                              <div className="absolute top-0 left-0 w-16 h-16 sm:w-20 sm:h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full">
                              <div className="flex justify-between text-xs sm:text-sm text-white/70 mb-2">
                                <span>Прогресс проверки</span>
                                <span>{smoothProgress.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-300 ease-out"
                                  style={{ 
                                    width: `${smoothProgress}%`,
                                    transform: 'translateZ(0)',
                                    willChange: 'width'
                                  }}
                                ></div>
                              </div>
                            </div>

                            <div className="text-center space-y-2 flex-1 flex items-center justify-center">
                              <div className="text-sm sm:text-lg font-medium text-white min-h-[60px] flex items-center justify-center px-2 text-center break-words">
                                {statusStep === 0 && 'Подготовка...'}
                                {statusStep === 1 && 'К1: Отражение позиции автора...'}
                                {statusStep === 2 && 'К2: Комментарий к позиции автора...'}
                                {statusStep === 3 && 'К3: Собственное отношение...'}
                                {statusStep === 4 && 'К4: Фактическая точность речи...'}
                                {statusStep === 5 && 'К5: Логичность речи...'}
                                {statusStep === 6 && 'К6: Соблюдение этических норм...'}
                                {statusStep === 7 && 'К7: Соблюдение орфографических норм...'}
                                {statusStep === 8 && 'К8: Соблюдение пунктуационных норм...'}
                                {statusStep === 9 && 'К9: Соблюдение грамматических норм...'}
                                {statusStep === 10 && 'К10: Соблюдение речевых норм...'}
                                {statusStep === 11 && 'Завершаем проверку...'}
                                {statusStep >= 12 && 'Еще чуть-чуть...'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {errorText && (
                      <div className="mt-4 p-3 sm:p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-xs sm:text-sm break-words">
                        {errorText}
                            </div>
                    )}
                            </div>
                ) : (
                  /* Review mode - Results */
                  <div className="flex flex-col overflow-hidden min-h-0 h-full">
                    {/* Results grid */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 overflow-hidden min-h-0">
                    {/* Left column - Task (collapsible) and Essay with unified scroll */}
                    <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4 overflow-hidden min-h-0 order-2 lg:order-1">
                      {/* Combined Task and Essay container with single scroll */}
                      <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 sm:p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* Task header */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => setShowTask(!showTask)}
                            className="flex items-center justify-between w-full text-white font-semibold text-sm sm:text-base touch-manipulation min-h-[44px]"
                          >
                            <span>Задание</span>
                            <svg className={`w-5 h-5 transition-transform ${showTask ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Task content gets its own scroll and a max height */}
                        <div
                          className={`${showTask ? 'max-h-[40%] mt-3' : 'h-0'} overflow-auto transition-all duration-300`}
                          style={{ WebkitOverflowScrolling: 'touch' as any }}
                        >
                          <div className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 text-white/90 whitespace-pre-wrap text-sm sm:text-base">
                            {currentTopic?.essay_topic}
                          </div>
                        </div>

                        {/* Essay area always visible and fills the rest */}
                        <div className="flex-1 min-h-0 mt-3 flex flex-col">
                          <div className="text-white font-semibold mb-3 flex-shrink-0 text-sm sm:text-base">Сочинение</div>
                          <div className="text-white/90 whitespace-pre-wrap pr-2 overflow-y-auto min-h-0 flex-1 text-sm sm:text-base" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                            {analysisData?.errors && analysisData.errors.length > 0 ? (
                              <div dangerouslySetInnerHTML={{ __html: highlightTextWithErrors(essayText, analysisData.errors) }} />
                            ) : (
                              essayText
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Right column - Scrollable criteria with errors first, overall score last */}
                    <div className="flex flex-col overflow-hidden lg:order-2 order-1 min-h-0">
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                        {/* Errors Summary */}
                        {analysisData.errors && analysisData.errors.length > 0 && (
                          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 sm:p-4">
                            <div className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="break-words">
                                Найденные ошибки ({analysisData.errors_summary?.total || analysisData.errors?.length || 0}) 
                                {analysisData.errors && `(показано: ${analysisData.errors.filter((error: any) => error.criterion && error.criterion.trim() !== '').length})`}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {analysisData.errors && analysisData.errors.length > 0 ? (
                                (() => {
                                  // Sort errors by their position in the essay text
                                  // Use the same sorting logic as highlights: by context_snippet position
                                  const sortedErrors = [...analysisData.errors].sort((a, b) => {
                                    const posA = a?.context_snippet ? findContextIndex(essayText, a.context_snippet) : -1;
                                    const posB = b?.context_snippet ? findContextIndex(essayText, b.context_snippet) : -1;
                                    
                                    // If both found, sort by position
                                    if (posA !== -1 && posB !== -1) {
                                      return posA - posB;
                                    }
                                    
                                    // If only one found, prioritize the found one
                                    if (posA !== -1) return -1;
                                    if (posB !== -1) return 1;
                                    
                                    // If neither found, maintain original order
                                    return 0;
                                  });
                                  
                                  return sortedErrors
                                    .filter((error: any) => error.criterion && error.criterion.trim() !== '')
                                    .map((error: any, index: number) => (
                                    <div 
                                      key={index} 
                                      data-error-item
                                      data-error-item-index={index}
                                      onClick={() => handleErrorBoxClick(error, index)}
                                      className={`rounded-lg p-2.5 sm:p-3 border cursor-pointer transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] hover:shadow-lg touch-manipulation ${getCriterionColor(error.criterion)}`}
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-1 gap-2">
                                        <div className="flex items-start gap-2 flex-1">
                                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                                            {index + 1}
                                          </div>
                                          <div className="text-xs sm:text-sm font-medium text-white break-words flex-1">
                                            {error.original} → {error.correction}
                                          </div>
                                        </div>
                                        <div className="text-xs text-white/60 font-semibold flex-shrink-0 ml-8 sm:ml-0">
                                          {error.criterion}
                                        </div>
                                      </div>
                                      <div className="text-xs text-white/70 break-words mt-1">
                                        {error.explanation}
                                      </div>
                                      <div className="text-xs text-white/50 mt-1 break-words">
                                        {error.type && error.category ? `${error.type} • ${error.category}` : error.category || error.type}
                                      </div>
                            </div>
                                  ));
                                })()
                              ) : (
                                <div className="text-white/70 text-center py-4 text-sm">
                                  Ошибки не найдены
                            </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Criteria */}
                        {analysisData.k1_title && renderCriterion('K1', analysisData.k1_title, analysisData.k1_comment, analysisData.k1_score, analysisData.k1_max, 'text-orange-400')}
                        {analysisData.k2_title && renderCriterion('K2', analysisData.k2_title, analysisData.k2_comment, analysisData.k2_score, analysisData.k2_max, 'text-blue-400')}
                        {analysisData.k3_title && renderCriterion('K3', analysisData.k3_title, analysisData.k3_comment, analysisData.k3_score, analysisData.k3_max, 'text-green-400')}
                        {analysisData.k4_title && renderCriterion('K4', analysisData.k4_title, analysisData.k4_comment, analysisData.k4_score, analysisData.k4_max, 'text-cyan-400')}
                        {analysisData.k5_title && renderCriterion('K5', analysisData.k5_title, analysisData.k5_comment, analysisData.k5_score, analysisData.k5_max, 'text-indigo-400')}
                        {analysisData.k6_title && renderCriterion('K6', analysisData.k6_title, analysisData.k6_comment, analysisData.k6_score, analysisData.k6_max, 'text-purple-400')}
                        {analysisData.k7_title && renderCriterion('K7', analysisData.k7_title, analysisData.k7_comment, analysisData.k7_score, analysisData.k7_max, 'text-pink-400')}
                        {analysisData.k8_title && renderCriterion('K8', analysisData.k8_title, analysisData.k8_comment, analysisData.k8_score, analysisData.k8_max, 'text-rose-400')}
                        {analysisData.k9_title && renderCriterion('K9', analysisData.k9_title, analysisData.k9_comment, analysisData.k9_score, analysisData.k9_max, 'text-amber-400')}
                        {analysisData.k10_title && renderCriterion('K10', analysisData.k10_title, analysisData.k10_comment, analysisData.k10_score, analysisData.k10_max, 'text-lime-400')}
                        
                        {/* Conclusion */}
                        {analysisData.conclusion && (
                          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 sm:p-4">
                            <div className="text-white font-medium mb-2 text-sm sm:text-base">{analysisData.conclusion_title || 'Общий вывод'}</div>
                            <div className="text-xs sm:text-sm text-white/80 break-words">{analysisData.conclusion}</div>
                        </div>
                        )}

                        {/* Overall score - moved to last */}
                        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 sm:p-6 flex flex-col items-center">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3 sm:mb-4">
                            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="text-xs sm:text-sm text-white/70 mb-2">Итоговая оценка</div>
                          <div className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">
                            {analysisData.total_score} / {analysisData.max_score}
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2.5 sm:h-3 mb-2">
                            <div
                              className={`h-2.5 sm:h-3 rounded-full transition-all ${getScoreColor(analysisData.total_score, analysisData.max_score)}`}
                              style={{ width: `${(analysisData.total_score / analysisData.max_score) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-white/70 text-center break-words px-2">{analysisData.overall_quality}</div>
                        </div>
                      </div>
                    </div>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Mobile fixed action button */}
          <div
            className="md:hidden fixed left-0 right-0 z-50 pointer-events-none"
            style={{ bottom: Math.max(16, 16 + keyboardInset) }}
          >
            <button
              onClick={handleCheck}
              disabled={!essayText.trim() || checking || !currentTopic}
              className="pointer-events-auto mx-auto w-[90%] max-w-md px-4 py-3.5 bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] font-bold rounded-xl backdrop-blur-md border border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px] text-base"
              style={{
                backdropFilter: 'blur(8px)',
              }}
            >
              Проверить
            </button>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex h-screen overflow-hidden">
            {/* Backdrop */}
            <div 
              className="flex-1 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
            
            {/* Sidebar */}
            <div className="w-full sm:w-96 bg-white/10 backdrop-blur border-l border-white/20 p-4 sm:p-6 overflow-auto h-full">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white">История сочинений</h2>
              <button
                  onClick={() => setShowHistory(false)}
                  className="text-white/70 hover:text-white transition touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  </button>
                </div>

              <div className="space-y-3">
                {essayHistory.length === 0 ? (
                  <div className="text-white/70 text-center py-8 text-sm sm:text-base">
                    Пока нет сочинений
                  </div>
                ) : (
                  essayHistory.map((essay, index) => {
                    const previewText = essay.text_scan 
                      ? essay.text_scan.split(' ').slice(0, 10).join(' ') + (essay.text_scan.split(' ').length > 10 ? '...' : '')
                      : 'Текст недоступен';
                    
                    return (
                      <div
                        key={essay.id}
                        onClick={() => {
                          loadEssayFromHistory(essay);
                          setShowHistory(false);
                        }}
                        className="bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-lg p-3 sm:p-4 cursor-pointer transition touch-manipulation"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white font-medium text-sm sm:text-base">
                            Сочинение #{essayHistory.length - index}
                          </div>
                          <div className="text-white/70 text-xs sm:text-sm flex-shrink-0 ml-2">
                            {new Date(essay.created_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <div className="text-white/70 text-xs sm:text-sm mb-2">
                          {essay.text_scan ? 'Завершено' : 'В процессе'}
                        </div>
                        <div className="text-white/60 text-xs mb-2 italic break-words">
                          "{previewText}"
                        </div>
                        {essay.score !== null && (
                          <div className="text-emerald-400 font-medium text-sm sm:text-base">
                            Оценка: {essay.score}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  export default Egeruses2;
