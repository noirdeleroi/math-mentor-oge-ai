// src/pages/Homework.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  BookOpen, Trophy, Target, Clock, ArrowRight, Check, X, Eye,
  BarChart3, MessageSquare, ArrowLeft, Highlighter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import MathRenderer from '@/components/MathRenderer';
import { useMathJaxSelection } from '@/hooks/useMathJaxSelection';
import { getSelectedTextWithMath } from '@/utils/getSelectedTextWithMath';
import { useChatContext } from '@/contexts/ChatContext';
import CourseChatMessages from '@/components/chat/CourseChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { sendChatMessage } from '@/services/chatService';
import { saveChatLog } from '@/services/chatLogsService';
import { awardEnergyPoints } from '@/services/energyPoints';
import FlyingMathBackground from '@/components/FlyingMathBackground';

interface HomeworkData {
  mcq_questions: string[];
  fipi_questions: string[];
  assigned_date?: string;
  due_date?: string;
}

interface Question {
  id: string;
  text: string;
  options?: string[];
  correct_answer?: string;
  problem_number?: number;
  solution_text?: string;
  difficulty?: number;
  skills?: number;
  problem_image?: string;
}

interface ProgressStats {
  totalTime: number;
  avgTime: number;
  showedSolutionCount: number;
  skillsWorkedOn: number[];
  difficultyBreakdown: Record<string, number>;
}

const Homework = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [homeworkData, setHomeworkData] = useState<HomeworkData | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionType, setQuestionType] = useState<'mcq' | 'frq'>('mcq');
  const [showCongrats, setShowCongrats] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [homeworkName, setHomeworkName] = useState<string>('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [existingProgress, setExistingProgress] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [answerCheckMethod, setAnswerCheckMethod] = useState<'numeric' | 'ai' | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [allQuestionResults, setAllQuestionResults] = useState<Array<{
    question: Question;
    type: 'mcq' | 'frq';
    userAnswer: string;
    isCorrect: boolean;
    correctAnswer: string;
  }>>([]);

  // Mastery tracking (FIPI)
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
  const [attemptStartTime, setAttemptStartTime] = useState<Date | null>(null);

  // Selector tool states
  const [isSelecterActive, setIsSelecterActive] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Chat context
  const { messages, setMessages, isTyping, setIsTyping, addMessage, isDatabaseMode } = useChatContext();

  // ---------- Flicker guards (React 18 StrictMode) ----------
  const didInitRef = useRef(false);               // 🔒 run initial loads once
  const didCheckRef = useRef(false);              // 🔒 run checkExistingProgress once
  const didLoadQuestionsRef = useRef(false);      // 🔒 loadQuestions once per session
  const sessionStartedRef = useRef(false);        // 🔒 recordSessionStart once
  const mountedRef = useRef(false);               // helps avoid setState after unmount

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Initialize MathJax selection
  useMathJaxSelection();

  const loadHomeworkData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) {
        console.error('Error loading homework:', error);
        return;
      }
      if (data && (data as any).homework) {
        try {
          const parsedHomework = JSON.parse((data as any).homework);
          const transformedHomework: HomeworkData = {
            mcq_questions: parsedHomework.MCQ || parsedHomework.mcq_questions || [],
            fipi_questions: parsedHomework.FIPI || parsedHomework.fipi_questions || [],
            assigned_date: parsedHomework.assigned_date,
            due_date: parsedHomework.due_date
          };
          if (mountedRef.current) setHomeworkData(transformedHomework);
        } catch (parseError) {
          console.error('Error parsing homework JSON:', parseError);
          toast({ title: 'Ошибка', description: 'Неверный формат домашнего задания', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      if (mountedRef.current) setUserProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const startFIPIAttempt = async (questionId: string) => {
    if (!user) return;
    try {
      let skillsArray: number[] = [];
      let topicsArray: string[] = [];
      let problemNumberType = 1;

      try {
        const { data: detailsResp, error: detailsErr } = await supabase.functions.invoke('get-question-details', {
          body: { question_id: questionId, course_id: '1' }
        });
        if (!detailsErr && detailsResp?.data) {
          skillsArray = Array.isArray(detailsResp.data.skills_list) ? detailsResp.data.skills_list : [];
          topicsArray = Array.isArray(detailsResp.data.topics_list) ? detailsResp.data.topics_list : [];
          if (detailsResp.data.problem_number_type) {
            problemNumberType = parseInt(detailsResp.data.problem_number_type.toString(), 10);
          }
        }
      } catch (e) {
        console.warn('get-question-details failed, continuing:', e);
      }

      const { data, error } = await supabase
        .from('student_activity')
        .insert({
          user_id: user.id,
          question_id: questionId,
          answer_time_start: new Date().toISOString(),
          finished_or_not: false,
          problem_number_type: problemNumberType,
          is_correct: null,
          duration_answer: null,
          scores_fipi: null,
          skills: skillsArray.length ? skillsArray : null,
          topics: topicsArray.length ? topicsArray : null
        })
        .select('attempt_id')
        .single();

      if (!error && data) {
        if (mountedRef.current) {
          setCurrentAttemptId(data.attempt_id);
          setAttemptStartTime(new Date());
        }
      }
    } catch (error) {
      console.error('Error starting FIPI attempt:', error);
    }
  };

  // -------- Text selection handlers ----------
  useEffect(() => {
    if (!isSelecterActive) return;

    const handleTextSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const text = getSelectedTextWithMath();
      if (text.trim().length > 0) {
        if (!mountedRef.current) return;
        setSelectedText(text);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      }
    };

    const handleMouseUp = () => setTimeout(handleTextSelection, 10);

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isSelecterActive]);

  const closeSelectionPopup = () => {
    setSelectedText('');
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAskHedgehog = async () => {
    if (!selectedText) return;
    setIsChatOpen(true);
    closeSelectionPopup();

    const newUserMessage = {
      id: Date.now(),
      text: `Объясни мне это: "${selectedText}"`,
      isUser: true,
      timestamp: new Date()
    };

    addMessage(newUserMessage);
    setIsTyping(true);

    try {
      const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode);
      addMessage(aiResponse);
      try { await saveChatLog(newUserMessage.text, aiResponse.text, '1'); } catch (logError) {
        console.error('Error saving chat log:', logError);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({ title: "Ошибка", description: "Не удалось получить ответ от Ёжика", variant: "destructive" });
    } finally {
      setIsTyping(false);
    }
    setSelectedText('');
  };

  const handleSendChatMessage = async (userInput: string) => {
    if (!userInput.trim()) return;
    const userMessage = { id: Date.now(), text: userInput, isUser: true, timestamp: new Date() };
    setMessages([...messages, userMessage]);
    setIsTyping(true);

    try {
      const aiResponse = await sendChatMessage(userMessage, messages, false);
      setMessages([...messages, userMessage, aiResponse]);
      try { await saveChatLog(userInput, aiResponse.text, '1'); } catch (logError) {
        console.error('Error saving chat log:', logError);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    } finally {
      setIsTyping(false);
    }
  };


  // -------- Initial load: run once --------
  useEffect(() => {
    if (!user || didInitRef.current) return;
    didInitRef.current = true; // 🔒
    (async () => {
      await loadHomeworkData();
      await loadUserProfile();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // After both homework & profile are in, check previous progress (once)
  useEffect(() => {
    if (!user || !homeworkData || !userProfile || didCheckRef.current) return;
    didCheckRef.current = true; // 🔒
    checkExistingProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, homeworkData, userProfile]);

  // Set initial question index ONLY when questions first load (not when completedQuestions changes)
  useEffect(() => {
    if (!currentQuestions.length || didLoadQuestionsRef.current === false) return;
    const firstIncomplete = currentQuestions.findIndex(q => !completedQuestions.has(q.id));
    const nextIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
    setCurrentQuestionIndex(nextIndex);
  }, [currentQuestions]); // Remove completedQuestions dependency to prevent re-running

  // When question changes, prepare timer / FIPI attempt
  useEffect(() => {
    if (!currentQuestions.length) return;
    setQuestionStartTime(Date.now());
    const currentQuestion = currentQuestions[currentQuestionIndex];
    if (currentQuestion && questionType === 'frq' && user) {
      startFIPIAttempt(currentQuestion.id);
    }
  }, [currentQuestionIndex, currentQuestions, questionType, user]);

  // Start a session only once per mount
  useEffect(() => {
    if (!user?.id || !homeworkName || !currentQuestions.length || sessionStartedRef.current) return;
    sessionStartedRef.current = true; // 🔒
    recordSessionStart();
  }, [user?.id, homeworkName, currentQuestions.length]);


  const loadQuestions = async () => {
    if (!homeworkData || didLoadQuestionsRef.current) return;
    didLoadQuestionsRef.current = true; // 🔒
    setLoadingQuestions(true);
    if (homeworkData.mcq_questions?.length) {
      await loadMCQQuestions();
      setQuestionType('mcq');
    } else if (homeworkData.fipi_questions?.length) {
      await loadFRQQuestions();
      setQuestionType('frq');
    }
    setLoadingQuestions(false);
  };

  const loadMCQQuestions = async () => {
    if (!homeworkData?.mcq_questions?.length) return;
    try {
      const { data: mcqData, error } = await supabase
        .from('oge_math_skills_questions')
        .select('*')
        .in('question_id', homeworkData.mcq_questions);

      if (error) {
        console.error('Error loading MCQ questions:', error);
        toast({ title: 'Ошибка', description: 'Не удалось загрузить вопросы MCQ', variant: 'destructive' });
        return;
      }

      const sortedData = homeworkData.mcq_questions
        .map(qid => mcqData?.find(q => q.question_id === qid))
        .filter(Boolean) as any[];

      const mcqQuestions: Question[] = sortedData.map((q, index) => ({
        id: q.question_id,
        text: q.problem_text || '',
        options: [q.option1, q.option2, q.option3, q.option4].filter(Boolean),
        correct_answer: q.answer || '',
        solution_text: q.solution_text || '',
        problem_number: typeof q.problem_number_type === 'string'
          ? parseInt(q.problem_number_type) || index + 1
          : q.problem_number_type || index + 1,
        difficulty: q.difficulty || null,
        skills: q.skills || null,
        problem_image: q.problem_image || undefined
      }));

      if (mountedRef.current) setCurrentQuestions(mcqQuestions);
    } catch (error) {
      console.error('Error loading MCQ questions:', error);
      toast({ title: 'Ошибка', description: 'Произошла ошибка при загрузке вопросов', variant: 'destructive' });
    }
  };

  const loadFRQQuestions = async () => {
    if (!homeworkData?.fipi_questions?.length) return;
    try {
      const { data: frqData, error } = await supabase
        .from('oge_math_fipi_bank')
        .select('*')
        .in('question_id', homeworkData.fipi_questions);

      if (error) {
        console.error('Error loading FRQ questions:', error);
        toast({ title: 'Ошибка', description: 'Не удалось загрузить задачи ФИПИ', variant: 'destructive' });
        return;
      }

      const sortedData = homeworkData.fipi_questions
        .map(qid => frqData?.find(q => q.question_id === qid))
        .filter(Boolean) as any[];

      const frqQuestions: Question[] = sortedData.map((q, index) => ({
        id: q.question_id,
        text: q.problem_text || '',
        correct_answer: q.answer || '',
        solution_text: q.solution_text || '',
        problem_number: q.problem_number_type || index + 1,
        difficulty: q.difficulty || null,
        problem_image: q.problem_image || undefined
      }));

      if (mountedRef.current) {
        setCurrentQuestions(frqQuestions);
        // Reset to first unanswered FRQ question
        const firstIncomplete = frqQuestions.findIndex(q => !completedQuestions.has(q.id));
        setCurrentQuestionIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      }
    } catch (error) {
      console.error('Error loading FRQ questions:', error);
      toast({ title: 'Ошибка', description: 'Произошла ошибка при загрузке задач', variant: 'destructive' });
    }
  };

  const checkExistingProgress = async () => {
    if (!user?.id || !homeworkData || !userProfile?.homework) { await loadQuestions(); return; }

    try {
      const homeworkJson = typeof userProfile.homework === 'string'
        ? JSON.parse(userProfile.homework)
        : userProfile.homework;

      const currentHomeworkName = homeworkJson.homework_name || 'Homework';
      setHomeworkName(prev => (prev === currentHomeworkName ? prev : currentHomeworkName));

      const { data: existingSessions, error } = await supabase
        .from('homework_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('homework_name', currentHomeworkName)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking existing progress:', error);
        await loadQuestions();
        return;
      }

      if (existingSessions && existingSessions.length > 0) {
        const summaryRecord = existingSessions.find(s => s.question_id === 'Summary');

        const completedQuestionsList = existingSessions
          .filter(s => s.question_id && s.question_id !== 'Summary')
          .map(s => s.question_id as string);
        const correctQuestionsList = existingSessions
          .filter(s => s.question_id && s.question_id !== 'Summary' && s.is_correct)
          .map(s => s.question_id as string);

        setCompletedQuestions(new Set(completedQuestionsList));
        setCorrectAnswers(new Set(correctQuestionsList));

        await loadQuestions(); // guarded by didLoadQuestionsRef

        if (summaryRecord) {
          await loadReviewModeData(existingSessions);
          await loadProgressStats();
          setReviewMode(true);
          return;
        }

        const allMCQCompleted = homeworkData.mcq_questions?.every(qid => completedQuestionsList.includes(qid)) || false;
        if (allMCQCompleted && homeworkData?.fipi_questions?.length > 0) {
          await loadFRQQuestions();
          setQuestionType('frq');
        }

        setExistingProgress(existingSessions[0]);
      } else {
        await loadQuestions();
      }
    } catch (error) {
      console.error('Error checking existing progress:', error);
      await loadQuestions();
    }
  };

  const recordSessionStart = async () => {
    if (!user?.id || !homeworkName) return;
    try {
      const { data: existingStart, error: checkError } = await supabase
        .from('homework_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('homework_name', homeworkName)
        .ilike('homework_task', '%Session Start%')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing session start:', checkError);
        return;
      }
      if (existingStart) return;

      const totalQ = (homeworkData?.mcq_questions?.length || 0) + (homeworkData?.fipi_questions?.length || 0);

      const { error } = await supabase.from('homework_progress').insert({
        user_id: user.id,
        homework_task: `Homework ${new Date().toLocaleDateString()} - Session Start`,
        homework_name: homeworkName,
        total_questions: totalQ,
        questions_completed: 0,
        questions_correct: 0,
        completion_status: 'in_progress'
      });
      if (error) console.error('Error recording session start:', error);
    } catch (error) {
      console.error('Error recording session start:', error);
    }
  };

  const recordQuestionProgress = async (
    questionId: string,
    userAns: string,
    correctAns: string,
    wasCorrect: boolean,
    responseTime: number,
    showedSolution: boolean
  ) => {
    if (!user?.id || !homeworkName) return;
    try {
      // Check if this question already has a record to prevent duplicates
      const { data: existingRecord } = await supabase
        .from('homework_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('homework_name', homeworkName)
        .eq('question_id', questionId)
        .maybeSingle();

      if (existingRecord) {
        console.log('Question already recorded, skipping duplicate insert');
        return;
      }

      const currentQuestion = currentQuestions.find(q => q.id === questionId);
      const qType = homeworkData?.mcq_questions?.includes(questionId) ? 'mcq' : 'fipi';

      await supabase.from('homework_progress').insert({
        user_id: user.id,
        homework_task: `Homework ${new Date().toLocaleDateString()}`,
        homework_name: homeworkName,
        question_id: questionId,
        question_type: qType,
        user_answer: userAns,
        correct_answer: correctAns,
        is_correct: wasCorrect,
        showed_solution: showedSolution,
        response_time_seconds: responseTime,
        difficulty_level: currentQuestion?.difficulty || null,
        skill_ids: currentQuestion?.skills ? [currentQuestion.skills] : null,
        problem_number: currentQuestion?.problem_number || null
      });
    } catch (error) {
      console.error('Error recording progress:', error);
    }
  };

  const loadReviewModeData = async (progressRecords: any[]) => {
    const results: Array<{ question: Question; type: 'mcq' | 'frq'; userAnswer: string; isCorrect: boolean; correctAnswer: string; }> = [];

    for (const record of progressRecords) {
      if (record.question_id === 'Summary') continue;

      let question = currentQuestions.find(q => q.id === record.question_id);

      if (!question) {
        const isMCQ = homeworkData?.mcq_questions?.includes(record.question_id);
        if (isMCQ) {
          const { data } = await supabase
            .from('oge_math_skills_questions')
            .select('*')
            .eq('question_id', record.question_id)
            .maybeSingle();
          if (data) {
            question = {
              id: data.question_id,
              text: data.problem_text || '',
              options: [data.option1, data.option2, data.option3, data.option4].filter(Boolean),
              correct_answer: data.answer || '',
              solution_text: data.solution_text || '',
              problem_number: typeof data.problem_number_type === 'string' ? parseInt(data.problem_number_type) || 0 : data.problem_number_type || 0,
              difficulty: data.difficulty || null,
              skills: data.skills || null,
              problem_image: data.problem_image || undefined
            };
          }
        } else {
          const { data } = await supabase
            .from('oge_math_fipi_bank')
            .select('*')
            .eq('question_id', record.question_id)
            .maybeSingle();
          if (data) {
            question = {
              id: data.question_id,
              text: data.problem_text || '',
              correct_answer: data.answer || '',
              solution_text: data.solution_text || '',
              problem_number: data.problem_number_type || 0,
              difficulty: data.difficulty || null,
              problem_image: data.problem_image || undefined
            };
          }
        }
      }
      if (!question) continue;

      results.push({
        question,
        type: homeworkData?.mcq_questions?.includes(record.question_id) ? 'mcq' : 'frq',
        userAnswer: record.user_answer || '',
        isCorrect: record.is_correct || false,
        correctAnswer: record.correct_answer || question.correct_answer || ''
      });
    }
    if (mountedRef.current) setAllQuestionResults(results);
  };

  const loadProgressStats = async () => {
    if (!user?.id || !homeworkName) return;
    try {
      const { data, error } = await supabase
        .from('homework_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('homework_name', homeworkName)
        .not('question_id', 'is', null)
        .neq('question_id', 'Summary');
      if (error) throw error;

      if (data) {
        const stats: ProgressStats = {
          totalTime: data.reduce((sum, r) => sum + (r.response_time_seconds || 0), 0),
          avgTime: data.length > 0 ? Math.round(data.reduce((s, r) => s + (r.response_time_seconds || 0), 0) / data.length) : 0,
          showedSolutionCount: data.filter(r => r.showed_solution).length,
          skillsWorkedOn: [...new Set(data.flatMap(r => r.skill_ids || []))],
          difficultyBreakdown: data.reduce((acc, r) => {
            const level = r.difficulty_level || 'unknown';
            acc[level] = (acc[level] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };
        if (mountedRef.current) setProgressStats(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    if (!currentQuestion || !user) return;

    const answer = questionType === 'mcq' ? selectedOption : userAnswer;
    if (!answer) {
      toast({ title: 'Ответ не выбран', description: 'Пожалуйста, выберите или введите ответ', variant: 'destructive' });
      return;
    }

    if (questionType === 'mcq') {
      const correct = answer === currentQuestion.correct_answer;
      const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);

      setIsCorrect(correct);
      setShowAnswer(true);

      // Only update state and record progress if not already completed
      if (!completedQuestions.has(currentQuestion.id)) {
        // Award energy points and trigger animation IMMEDIATELY if correct
        if (correct) {
          // Fetch current streak for bonus calculation
          const { data: streakData } = await supabase
            .from('user_streaks')
            .select('current_streak')
            .eq('user_id', user.id)
            .single();
          
          const currentStreak = streakData?.current_streak || 0;
          
          const result = await awardEnergyPoints(user.id, 'problem', undefined, 'oge_math_skills_questions', currentStreak);
          if (result.success && result.pointsAwarded && (window as any).triggerEnergyPointsAnimation) {
            (window as any).triggerEnergyPointsAnimation(result.pointsAwarded);
          }
        }
        
        // Backend operations run after animation trigger
        setCompletedQuestions(prev => new Set([...prev, currentQuestion.id]));
        if (correct) setCorrectAnswers(prev => new Set([...prev, currentQuestion.id]));

        await recordQuestionProgress(currentQuestion.id, answer, currentQuestion.correct_answer || '', correct, responseTime, false);

        if (currentQuestion.skills) {
          await processMCQSkillAttempt(currentQuestion, correct, responseTime);
        }
      }
      return;
    }

    if (questionType === 'frq') {
      setCheckingAnswer(true);
      setAnswerCheckMethod(null);

      try {
        const { data, error } = await supabase.functions.invoke('check-text-answer', {
          body: { user_id: user.id, question_id: currentQuestion.id, submitted_answer: answer }
        });

        if (error) {
          console.error('Error checking answer:', error);
          toast({ title: 'Ошибка проверки', description: 'Не удалось проверить ответ. Попробуйте снова.', variant: 'destructive' });
          setCheckingAnswer(false);
          return;
        }

        const { is_correct } = data;

        const isNumericAnswer =
          !isNaN(parseFloat(answer)) &&
          !isNaN(parseFloat(currentQuestion.correct_answer || ''));

        setAnswerCheckMethod(isNumericAnswer ? 'numeric' : 'ai');
        setIsCorrect(is_correct);
        setShowAnswer(true);

        // Only update state and record progress if not already completed
        if (!completedQuestions.has(currentQuestion.id)) {
          // Award energy points and trigger animation IMMEDIATELY if correct
          if (is_correct) {
            // Fetch current streak for bonus calculation
            const { data: streakData } = await supabase
              .from('user_streaks')
              .select('current_streak')
              .eq('user_id', user.id)
              .single();
            
            const currentStreak = streakData?.current_streak || 0;
            
            const result = await awardEnergyPoints(user.id, 'problem', undefined, 'oge_math_fipi_bank', currentStreak);
            if (result.success && result.pointsAwarded && (window as any).triggerEnergyPointsAnimation) {
              (window as any).triggerEnergyPointsAnimation(result.pointsAwarded);
            }
          }
          
          // Backend operations run after animation trigger
          setCompletedQuestions(prev => new Set([...prev, currentQuestion.id]));
          if (is_correct) setCorrectAnswers(prev => new Set([...prev, currentQuestion.id]));

          const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
          await recordQuestionProgress(
            currentQuestion.id,
            answer,
            currentQuestion.correct_answer || '',
            is_correct,
            responseTime,
            false
          );
        }

        toast({
          title: is_correct ? 'Правильно! ✓' : 'Неправильно ✗',
          description: `Проверено ${isNumericAnswer ? 'числовым сравнением' : 'ИИ анализом'}`,
          variant: is_correct ? 'default' : 'destructive'
        });

      } catch (error) {
        console.error('Error in handleSubmitAnswer for FIPI:', error);
        toast({ title: 'Ошибка', description: 'Произошла ошибка при проверке ответа', variant: 'destructive' });
      } finally {
        setCheckingAnswer(false);
      }
    }
  };

  const processMCQSkillAttempt = async (question: Question, isCorrectAns: boolean, duration: number) => {
    if (!user || !question.skills) return;
    try {
      const { error } = await supabase.functions.invoke('process-mcq-skill-attempt', {
        body: {
          user_id: user.id,
          question_id: question.id,
          skill_id: question.skills,
          finished_or_not: true,
          is_correct: isCorrectAns,
          difficulty: question.difficulty || 2,
          duration,
          course_id: '1'
        }
      });
      if (error) {
        console.error('process-mcq-skill-attempt error:', error);
        toast({ title: 'Предупреждение', description: 'Не удалось обновить прогресс навыков', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error calling process-mcq-skill-attempt:', error);
      toast({ title: 'Предупреждение', description: 'Ошибка при обновлении прогресса навыков', variant: 'destructive' });
    }
  };

  const updateFIPIActivity = async (isCorrectAns: boolean, scores: number) => {
    if (!user || !currentAttemptId) return;
    try {
      const now = new Date();
      const startTime = attemptStartTime || new Date();
      const durationInSeconds = (now.getTime() - startTime.getTime()) / 1000;

      const { error: updateError } = await supabase
        .from('student_activity')
        .update({
          duration_answer: durationInSeconds,
          is_correct: isCorrectAns,
          scores_fipi: scores,
          finished_or_not: true
        })
        .eq('user_id', user.id)
        .eq('attempt_id', currentAttemptId);

      if (updateError) console.error('Error updating student_activity:', updateError);
    } catch (error) {
      console.error('Error in updateFIPIActivity:', error);
    }
  };

  const submitToHandleSubmission = async (isCorrectAns: boolean) => {
    if (!user) return;
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('student_activity')
        .select('question_id, attempt_id, finished_or_not, duration_answer, scores_fipi')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (activityError || !activityData) return;

      const submissionData = {
        user_id: user.id,
        question_id: activityData.question_id,
        attempt_id: activityData.attempt_id,
        finished_or_not: activityData.finished_or_not,
        is_correct: isCorrectAns,
        duration: activityData.duration_answer,
        scores_fipi: activityData.scores_fipi
      };

      const { error } = await supabase.functions.invoke('handle-submission', {
        body: { course_id: '1', submission_data: submissionData }
      });
      if (error) console.error('handle-submission error:', error);
    } catch (error) {
      console.error('Error in submitToHandleSubmission:', error);
    }
  };

  const handleShowSolution = async () => {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);

    setShowSolution(true);
    setIsCorrect(false);
    setShowAnswer(true);

    // Only update state and record progress if not already completed
    if (!completedQuestions.has(currentQuestion.id)) {
      setCompletedQuestions(prev => new Set([...prev, currentQuestion.id]));

      const answer = questionType === 'mcq' ? selectedOption : userAnswer;
      await recordQuestionProgress(currentQuestion.id, answer || '', currentQuestion.correct_answer || '', false, responseTime, true);
    }

    if (questionType === 'mcq' && currentQuestion.skills) {
      await processMCQSkillAttempt(currentQuestion, false, responseTime);
    } else if (questionType === 'frq') {
      await updateFIPIActivity(false, 0);
      await submitToHandleSubmission(false);
    }
  };

  const handleNextQuestion = () => {
    setShowAnswer(false);
    setIsCorrect(null);
    setUserAnswer('');
    setSelectedOption(null);
    setShowSolution(false);
    setQuestionStartTime(Date.now());
    setCurrentAttemptId(null);
    setAttemptStartTime(null);
    setAnswerCheckMethod(null);

    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      if (questionType === 'mcq' && (homeworkData?.fipi_questions?.length || 0) > 0) {
        setQuestionType('frq');
        loadFRQQuestions(); // safe: not gated so you can transition once MCQ ends
      } else {
        completeHomework();
      }
    }
  };

  const completeHomework = async () => {
    if (!user?.id || !homeworkName) return;

    const totalMCQ = homeworkData?.mcq_questions?.length || 0;
    const totalFRQ = homeworkData?.fipi_questions?.length || 0;
    const totalQuestions = totalMCQ + totalFRQ;

    const completedCount = completedQuestions.size;
    const correctCount = correctAnswers.size;
    const accuracy = completedCount > 0 ? (correctCount / completedCount) * 100 : 0;

    try {
      const { error: completionError } = await supabase
        .from('homework_progress')
        .insert({
          user_id: user.id,
          homework_task: `Homework ${new Date().toLocaleDateString()} - Summary`,
          homework_name: homeworkName,
          question_id: 'Summary',
          completed_at: new Date().toISOString(),
          total_questions: totalQuestions,
          questions_completed: completedCount,
          questions_correct: correctCount,
          accuracy_percentage: accuracy,
          completion_status: 'completed'
        });

      if (completionError) {
        console.error('Error inserting Summary record:', completionError);
      }

      const { data: existingProgress } = await supabase
        .from('homework_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('homework_name', homeworkName)
        .order('created_at', { ascending: false });

      if (existingProgress) {
        await loadReviewModeData(existingProgress);
      }

      await loadProgressStats();

      setReviewMode(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast({ title: 'Домашнее задание завершено!', description: 'Отличная работа! 🎉' });
    } catch (error) {
      console.error('Error completing homework:', error);
      toast({ title: 'Ошибка', description: 'Не удалось сохранить завершение', variant: 'destructive' });
    }
  };

  // --------------------- RENDER ---------------------
  if (!user) {
    return (
      <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
        <FlyingMathBackground />
        <div className="pt-20 px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg text-muted-foreground">Войдите в систему для доступа к домашнему заданию</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
        <FlyingMathBackground />
        <div className="pt-20 px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Загрузка домашнего задания...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!homeworkData || (!homeworkData.mcq_questions?.length && !homeworkData.fipi_questions?.length)) {
    return (
      <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
        <FlyingMathBackground />
        <div className="bg-[#f4f4f5] shadow-sm border-b relative z-20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-start">
              <Button
                onClick={() => navigate('/ogemath-practice')}
                className="bg-gradient-to-r from-[#f59e0b] to-[#10b981] hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                Назад
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-8 px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="p-8">
              <CardHeader>
                <BookOpen className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                <CardTitle className="text-2xl text-purple-800">Домашнее задание не назначено</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  У вас пока нет домашнего задания от ИИ помощника. Обратитесь к преподавателю или попробуйте другие виды практики.
                </p>
                <Button onClick={() => navigate('/ogemath-practice')} className="w-full bg-purple-600 hover:bg-purple-700">
                  Перейти к другим видам практики
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (loadingQuestions) {
    return (
      <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
        <FlyingMathBackground />
        <div className="pt-20 px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Загрузка вопросов...</p>
          </div>
        </div>
      </div>
    );
  }

  // Review Mode - Full Page View
  if (reviewMode) {
    const totalQuestions = allQuestionResults.length;
    const correctAnswersCount = allQuestionResults.filter(r => r.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;

    return (
      <>
        <FlyingMathBackground />
        <div className="min-h-screen text-white relative p-4 md:p-8" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
          <div className="max-w-7xl mx-auto space-y-6 relative z-10">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Результаты домашнего задания</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Всего вопросов</div>
                    <div className="text-2xl font-bold">{totalQuestions}</div>
                  </div>
                  <div className="bg-green-500/10 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Правильно</div>
                    <div className="text-2xl font-bold text-green-600">{correctAnswersCount}</div>
                  </div>
                  <div className="bg-red-500/10 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Неправильно</div>
                    <div className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswersCount}</div>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Точность</div>
                    <div className="text-2xl font-bold text-primary">{accuracy}%</div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    const completionData = { homeworkName, timestamp: Date.now() };
                    localStorage.setItem('homeworkCompletionData', JSON.stringify(completionData));
                    toast({
                      title: 'Данные отправлены ИИ учителю! 🤖',
                      description: 'Ваши результаты будут проанализированы автоматически',
                      duration: 2000
                    });
                    navigate('/ogemath');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Перейти к AI учителю
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5">
                  {allQuestionResults.map((result, index) => (
                    <Card
                      key={result.question.id}
                      className={cn(
                        "cursor-pointer transition-all hover:scale-105",
                        result.isCorrect ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5",
                        currentQuestionIndex === index && "ring-2 ring-gold"
                      )}
                      onClick={() => {
                        setCurrentQuestionIndex(index);
                        setTimeout(() => {
                          document.getElementById('solution-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                    >
                      <CardContent className="p-1.5 text-center">
                        <div className="text-xs font-bold mb-0.5">№{index + 1}</div>
                        <div className="text-[10px] font-medium mb-1 text-muted-foreground">
                          {result.type === 'mcq' ? 'MCQ' : 'FIPI'}
                        </div>
                        {result.isCorrect
                          ? <Check className="w-3 h-3 text-green-600 mx-auto" />
                          : <X className="w-3 h-3 text-red-600 mx-auto" />}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {allQuestionResults[currentQuestionIndex] && (
              <Card id="solution-box">
                <CardHeader>
                  <CardTitle>Вопрос {currentQuestionIndex + 1} из {totalQuestions}</CardTitle>
                  <Badge className={allQuestionResults[currentQuestionIndex].isCorrect ? "bg-green-500" : "bg-red-500"}>
                    {allQuestionResults[currentQuestionIndex].isCorrect ? "Правильно ✓" : "Неправильно ✗"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  {allQuestionResults[currentQuestionIndex].question.problem_image && (
                    <div className="flex justify-center">
                      <img
                        src={allQuestionResults[currentQuestionIndex].question.problem_image}
                        alt="Problem illustration"
                        className="max-w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="font-semibold">Вопрос:</div>
                    <MathRenderer text={allQuestionResults[currentQuestionIndex].question.text} />
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="font-semibold text-sm">Ваш ответ:</div>
                    <div className={cn(
                      "text-lg font-medium",
                      allQuestionResults[currentQuestionIndex].isCorrect ? "text-green-600" : "text-red-600"
                    )}>
                      {allQuestionResults[currentQuestionIndex].userAnswer || "Не отвечено"}
                    </div>
                  </div>

                  <div className="bg-green-500/10 p-4 rounded-lg space-y-2">
                    <div className="font-semibold text-sm">Правильный ответ:</div>
                    <div className="text-lg font-medium text-green-600">
                      {allQuestionResults[currentQuestionIndex].correctAnswer}
                    </div>
                  </div>

                  {allQuestionResults[currentQuestionIndex].question.solution_text && (
                    <div className="space-y-2">
                      <div className="font-semibold">Решение:</div>
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <MathRenderer text={allQuestionResults[currentQuestionIndex].question.solution_text} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Предыдущий
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === totalQuestions - 1}
                      className="flex-1"
                    >
                      Следующий
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setIsSelecterActive(!isSelecterActive);
                        if (isSelecterActive) closeSelectionPopup();
                      }}
                      variant={isSelecterActive ? "default" : "outline"}
                      className={cn("flex items-center gap-2", isSelecterActive && "bg-purple-600 hover:bg-purple-700")}
                    >
                      <Highlighter className="w-4 h-4" />
                      {isSelecterActive ? "Выкл. выделение" : "Вкл. выделение"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </>
    );
  }

  const currentQuestion = currentQuestions[currentQuestionIndex];
  const totalMCQ = homeworkData.mcq_questions?.length || 0;
  const totalFRQ = homeworkData.fipi_questions?.length || 0;
  const currentProgress = (completedQuestions.size / (totalMCQ + totalFRQ || 1)) * 100;

  return (
    <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <FlyingMathBackground />

      {showCongrats && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="bg-[#f4f4f5] rounded-lg p-8 text-center max-w-md mx-4">
            <Trophy className="w-16 h-16 mx-auto text-[#f59e0b] mb-4" />
            <h2 className="text-2xl font-bold mb-4" style={{ background: 'linear-gradient(135deg, #f59e0b, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Поздравляем!</h2>
            <p className="text-gray-600 mb-6">Вы успешно выполнили всё домашнее задание! 🎉</p>

            <div className="bg-gradient-to-r from-[#f59e0b]/10 to-[#10b981]/10 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Результаты работы:
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#f59e0b]">{completedQuestions.size}</div>
                  <div className="text-gray-600">Выполнено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{correctAnswers.size}</div>
                  <div className="text-gray-600">Правильно</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {completedQuestions.size > 0 ? Math.round((correctAnswers.size / completedQuestions.size) * 100) : 0}%
                  </div>
                  <div className="text-gray-600">Точность</div>
                </div>
              </div>

              {progressStats && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Общее время:</span>
                    <span className="font-semibold">
                      {Math.floor(progressStats.totalTime / 60)} мин {progressStats.totalTime % 60} сек
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Среднее время на задачу:</span>
                    <span className="font-semibold">{progressStats.avgTime} сек</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Просмотрено решений:</span>
                    <span className="font-semibold">{progressStats.showedSolutionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Навыков отработано:</span>
                    <span className="font-semibold">{progressStats.skillsWorkedOn.length}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  const completionData = { homeworkName, timestamp: Date.now() };
                  localStorage.setItem('homeworkCompletionData', JSON.stringify(completionData));
                  toast({
                    title: 'Данные отправлены ИИ учителю! 🤖',
                    description: 'Ваши результаты будут проанализированы автоматически',
                    duration: 2000
                  });
                  navigate('/ogemath');
                }}
                className="bg-purple-600 hover:bg-purple-700 w-full"
              >
                Перейти к ИИ учителю
              </Button>
              <Button onClick={() => setShowCongrats(false)} variant="outline" className="w-full">
                Закрыть
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="pt-8 px-4 pb-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header with back button and title - matching ModulePage style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6 mb-8"
          >
            <Button
              onClick={() => navigate('/ogemath-practice')}
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к карте
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold font-display" style={{ background: 'linear-gradient(135deg, #f59e0b, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Домашнее задание
              </h1>
              <p className="text-gray-200/90 mt-1">
                {homeworkData.mcq_questions?.length || 0} MCQ • {homeworkData.fipi_questions?.length || 0} ФИПИ
              </p>
            </div>
          </motion.div>
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Target className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div className="flex-1">
                  <Progress value={currentProgress} className="h-2 bg-black [&>div]:bg-orange-500" />
                </div>
                <Badge variant="secondary" className={questionType === 'mcq' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                  {questionType === 'mcq' ? 'MCQ' : 'ФИПИ'}
                </Badge>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{completedQuestions.size} из {totalMCQ + totalFRQ} выполнено</span>
              </div>
            </CardContent>
          </Card>

          {currentQuestion && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  {questionType === 'mcq' ? 'Вопрос с выбором ответа' : 'Задача ФИПИ'}
                  {currentQuestion.problem_number && (
                    <Badge variant="outline" className="ml-2">№{currentQuestion.problem_number}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQuestion.problem_image && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={currentQuestion.problem_image}
                      alt="Problem illustration"
                      className="max-w-full h-auto rounded-lg shadow-md"
                    />
                  </div>
                )}

                <MathRenderer text={currentQuestion.text} className="text-lg leading-relaxed" compiler="mathjax" />

                {questionType === 'mcq' && currentQuestion.options ? (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => {
                      const cyrillic = ['А', 'Б', 'В', 'Г'][index];
                      return (
                        <Button
                          key={index}
                          variant={selectedOption === cyrillic ? 'default' : 'outline'}
                          className="w-full text-left justify-start h-auto p-4"
                          onClick={() => setSelectedOption(cyrillic)}
                          disabled={showAnswer}
                        >
                          <span className="font-bold mr-2">{cyrillic})</span>
                          <MathRenderer text={option} className="inline-block" compiler="mathjax" />
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ваш ответ:</label>
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Введите ответ..."
                      disabled={showAnswer}
                      className="text-lg"
                    />
                  </div>
                )}

                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                      <span className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {isCorrect ? 'Правильно!' : showSolution ? 'Показано решение' : 'Неправильно'}
                      </span>
                      {questionType === 'frq' && answerCheckMethod && !showSolution && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {answerCheckMethod === 'numeric' ? '🔢 Числовая проверка' : '🤖 ИИ проверка'}
                        </Badge>
                      )}
                    </div>
                    {!isCorrect && !showSolution && (
                      <p className="text-gray-700">
                        Правильный ответ: <span className="font-bold">{currentQuestion.correct_answer}</span>
                      </p>
                    )}
                    {showSolution && currentQuestion.solution_text && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-bold text-blue-800 mb-2">Решение:</h4>
                        <MathRenderer text={currentQuestion.solution_text} compiler="mathjax" />
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex gap-2">
                  {!showAnswer ? (
                    <>
                      <Button
                        onClick={handleSubmitAnswer}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={checkingAnswer || (questionType === 'mcq' ? !selectedOption : !userAnswer)}
                      >
                        {checkingAnswer ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Проверяем...
                          </>
                        ) : (
                          'Проверить ответ'
                        )}
                      </Button>
                      <Button onClick={handleShowSolution} variant="outline" className="flex items-center gap-2" disabled={checkingAnswer}>
                        <Eye className="w-4 h-4" />
                        Показать решение
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleNextQuestion}
                        className="flex-1 bg-gradient-to-r from-[#f59e0b] to-[#10b981] hover:opacity-90"
                        size="lg"
                      >
                        {currentQuestionIndex === currentQuestions.length - 1 ? (
                          <>
                            <Trophy className="mr-2 h-5 w-5" />
                            Завершить домашнее задание
                          </>
                        ) : (
                          <>
                            Следующий вопрос
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                      <Button onClick={handleShowSolution} variant="outline" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Показать решение
                      </Button>
                      <Button
                        onClick={() => {
                          setIsSelecterActive(!isSelecterActive);
                          if (isSelecterActive) closeSelectionPopup();
                        }}
                        variant={isSelecterActive ? "default" : "outline"}
                        className={cn("flex items-center gap-2", isSelecterActive && "bg-purple-600 hover:bg-purple-700")}
                      >
                        <Highlighter className="w-4 h-4" />
                        {isSelecterActive ? "Выкл. выделение" : "Вкл. выделение"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>

        {selectedText && selectionPosition && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-50 bg-[#f4f4f5] rounded-lg shadow-xl border-2 p-3"
          style={{ left: `${selectionPosition.x}px`, top: `${selectionPosition.y}px`, transform: 'translate(-50%, -100%)', borderColor: '#f59e0b' }}
        >
          <Button onClick={handleAskHedgehog} className="bg-gradient-to-r from-[#f59e0b] to-[#10b981] hover:opacity-90 text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Спросить Ёжика
          </Button>
        </motion.div>
      )}

      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="right" className="w-full sm:w-[540px] flex flex-col h-full p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Чат с Ёжиком
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-6">
              <CourseChatMessages messages={messages} isTyping={isTyping} />
            </div>
            <div className="border-t px-6 py-4">
              <ChatInput onSendMessage={handleSendChatMessage} isTyping={isTyping} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Homework;
