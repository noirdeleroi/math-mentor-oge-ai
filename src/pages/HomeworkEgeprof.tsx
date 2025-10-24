// src/pages/HomeworkEgeprof.tsx
// Copy of Homework.tsx adapted for EGE Prof (course_id = '3') and FRQ from egemathprof
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BookOpen, Trophy, Target, ArrowRight, Check, X, Eye, BarChart3, MessageSquare, ArrowLeft, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import MathRenderer from '@/components/MathRenderer';
import Loading from '@/components/ui/Loading';
import { useMathJaxSelection } from '@/hooks/useMathJaxSelection';
import { getSelectedTextWithMath } from '@/utils/getSelectedTextWithMath';
import { useChatContext } from '@/contexts/ChatContext';
import CourseChatMessages from '@/components/chat/CourseChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { sendChatMessage } from '@/services/chatService';
import { saveChatLog } from '@/services/chatLogsService';
import { awardEnergyPoints } from '@/services/energyPoints';

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

const HomeworkEgeprof = () => {
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
  // Track sequential question numbering for this session (first seen order)
  const questionOrderRef = useRef<Map<string, number>>(new Map());
  const nextQNumberRef = useRef<number>(1);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [answerCheckMethod, setAnswerCheckMethod] = useState<'numeric' | 'ai' | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [allQuestionResults, setAllQuestionResults] = useState<Array<{ question: Question; type: 'mcq' | 'frq'; userAnswer: string; isCorrect: boolean; correctAnswer: string; }>>([]);

  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
  const [attemptStartTime, setAttemptStartTime] = useState<Date | null>(null);

  const [isSelecterActive, setIsSelecterActive] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { messages, setMessages, isTyping, setIsTyping, addMessage, isDatabaseMode } = useChatContext();

  const didInitRef = useRef(false);
  const didCheckRef = useRef(false);
  const didLoadQuestionsRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const mountedRef = useRef(false);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useMathJaxSelection({ root: reviewMode ? '#solution-box' : undefined });

  const closeSelectionPopup = () => {
    setSelectedText('');
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  const loadHomeworkData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) return;
      if (data && (data as any).homework3) {
        try {
          const parsedHomework = JSON.parse((data as any).homework3);
          const transformedHomework: HomeworkData = {
            mcq_questions: parsedHomework.MCQ || parsedHomework.mcq_questions || [],
            fipi_questions: parsedHomework.FIPI || parsedHomework.fipi_questions || [],
            assigned_date: parsedHomework.assigned_date,
            due_date: parsedHomework.due_date
          };
          if (mountedRef.current) setHomeworkData(transformedHomework);
        } catch {}
      }
    } catch {}
  };

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (mountedRef.current) setUserProfile(data);
    } catch {}
  };

  const startFIPIAttempt = async (questionId: string) => {
    if (!user) return;
    try {
      let problemNumberType = 1;
      try {
        const { data: detailsResp } = await supabase.functions.invoke('get-question-details', {
          body: { question_id: questionId, course_id: '3' }
        });
        if (detailsResp?.data?.problem_number_type) {
          problemNumberType = parseInt(detailsResp.data.problem_number_type.toString(), 10);
        }
      } catch {}

      const { data } = await supabase
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
          course_id: '3'
        })
        .select('attempt_id')
        .single();

      if (data) {
        if (mountedRef.current) {
          setCurrentAttemptId(data.attempt_id);
          setAttemptStartTime(new Date());
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!user || didInitRef.current) return;
    didInitRef.current = true;
    (async () => {
      await loadHomeworkData();
      await loadUserProfile();
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !homeworkData || !userProfile || didCheckRef.current) return;
    didCheckRef.current = true;
    checkExistingProgress();
  }, [user, homeworkData, userProfile]);

  useEffect(() => {
    if (!currentQuestions.length || didLoadQuestionsRef.current === false) return;
    const firstIncomplete = currentQuestions.findIndex(q => !completedQuestions.has(q.id));
    const nextIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
    setCurrentQuestionIndex(nextIndex);
  }, [currentQuestions]);

  useEffect(() => {
    if (!currentQuestions.length) return;
    setQuestionStartTime(Date.now());
    const currentQuestion = currentQuestions[currentQuestionIndex];
    if (currentQuestion && questionType === 'frq' && user) {
      startFIPIAttempt(currentQuestion.id);
    }
  }, [currentQuestionIndex, currentQuestions, questionType, user]);

  useEffect(() => {
    if (!user?.id || !homeworkName || !currentQuestions.length || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    recordSessionStart();
  }, [user?.id, homeworkName, currentQuestions.length]);

  const loadQuestions = async () => {
    if (!homeworkData || didLoadQuestionsRef.current) return;
    didLoadQuestionsRef.current = true;
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
      if (error) return;

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
    } catch {}
  };

  const loadFRQQuestions = async () => {
    if (!homeworkData?.fipi_questions?.length) return;
    try {
      const { data: frqData, error } = await supabase
        .from('egemathprof')
        .select('*')
        .in('question_id', homeworkData.fipi_questions);
      if (error) return;

      const sortedData = homeworkData.fipi_questions
        .map(qid => frqData?.find((q: any) => q.question_id === qid))
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
        const firstIncomplete = frqQuestions.findIndex(q => !completedQuestions.has(q.id));
        setCurrentQuestionIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      }
    } catch {}
  };

  const checkExistingProgress = async () => {
    if (!user?.id || !homeworkData || !(userProfile as any)?.homework3) { await loadQuestions(); return; }
    try {
      const hwRaw = (userProfile as any).homework3;
      const homeworkJson = typeof hwRaw === 'string' ? JSON.parse(hwRaw) : hwRaw;
      const currentHomeworkName = homeworkJson.homework_name || 'Homework';
      setHomeworkName(prev => (prev === currentHomeworkName ? prev : currentHomeworkName));

      const { data: existingSessions } = await supabase
        .from('homework_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('homework_name', currentHomeworkName)
        .order('created_at', { ascending: false });

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

        await loadQuestions();

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
    } catch { await loadQuestions(); }
  };

  const recordSessionStart = async () => {
    if (!user?.id || !homeworkName) return;
    try {
      const { data: existingStart } = await supabase
        .from('homework_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('homework_name', homeworkName)
        .ilike('homework_task', '%Session Start%')
        .maybeSingle();
      if (existingStart) return;

      const totalQ = (homeworkData?.mcq_questions?.length || 0) + (homeworkData?.fipi_questions?.length || 0);
      await supabase.from('homework_progress').insert({
        user_id: user.id,
        homework_task: `Homework ${new Date().toLocaleDateString()} - Session Start`,
        homework_name: homeworkName,
        total_questions: totalQ,
        questions_completed: 0,
        questions_correct: 0,
        completion_status: 'in_progress'
      });
    } catch {}
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
      const { data: existingRecord } = await supabase
        .from('homework_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('homework_name', homeworkName)
        .eq('question_id', questionId)
        .maybeSingle();
      if (existingRecord) return;

      // Assign sequential q_number for the first time we see this question
      if (!questionOrderRef.current.has(questionId)) {
        questionOrderRef.current.set(questionId, nextQNumberRef.current);
        nextQNumberRef.current += 1;
      }
      const assignedQNumber = questionOrderRef.current.get(questionId) || nextQNumberRef.current - 1;

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
        problem_number: currentQuestion?.problem_number || null,
        q_number: String(assignedQNumber)
      });
    } catch {}
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
            } as Question;
          }
        } else {
          const { data } = await supabase
            .from('egemathprof')
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
              difficulty: data.difficulty ? Number(data.difficulty) : undefined,
              problem_image: data.problem_image || undefined
            } as Question;
          }
        }
      }
      if (!question) continue;
      results.push({
        question,
        type: homeworkData?.mcq_questions?.includes(record.question_id) ? 'mcq' : 'frq',
        userAnswer: record.user_answer || '',
        isCorrect: record.is_correct || false,
        correctAnswer: record.correct_answer || (question as any).correct_answer || ''
      });
    }
    if (mountedRef.current) setAllQuestionResults(results);
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
      if (!completedQuestions.has(currentQuestion.id)) {
        if (correct) {
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
        const { data } = await supabase.functions.invoke('check-text-answer', {
          body: { user_id: user.id, question_id: currentQuestion.id, submitted_answer: answer }
        });
        const { is_correct } = data;
        const isNumericAnswer = !isNaN(parseFloat(answer)) && !isNaN(parseFloat(currentQuestion.correct_answer || ''));
        setAnswerCheckMethod(isNumericAnswer ? 'numeric' : 'ai');
        setIsCorrect(is_correct);
        setShowAnswer(true);
        if (!completedQuestions.has(currentQuestion.id)) {
          if (is_correct) {
            const { data: streakData } = await supabase
              .from('user_streaks')
              .select('current_streak')
              .eq('user_id', user.id)
              .single();
            const currentStreak = streakData?.current_streak || 0;
            const result = await awardEnergyPoints(user.id, 'problem', undefined, 'egemathprof', currentStreak);
            if (result.success && result.pointsAwarded && (window as any).triggerEnergyPointsAnimation) {
              (window as any).triggerEnergyPointsAnimation(result.pointsAwarded);
            }
          }
          setCompletedQuestions(prev => new Set([...prev, currentQuestion.id]));
          if (is_correct) setCorrectAnswers(prev => new Set([...prev, currentQuestion.id]));
          const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
          await recordQuestionProgress(currentQuestion.id, answer, currentQuestion.correct_answer || '', is_correct, responseTime, false);
        }
        // Suppress correctness toast per requirements
      } catch {
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
          course_id: '3'
        }
      });
      if (error) {
        toast({ title: 'Предупреждение', description: 'Не удалось обновить прогресс навыков', variant: 'destructive' });
      }
    } catch {}
  };

  const updateFIPIActivity = async (isCorrectAns: boolean, scores: number) => {
    if (!user || !currentAttemptId) return;
    try {
      const now = new Date();
      const startTime = attemptStartTime || new Date();
      const durationInSeconds = (now.getTime() - startTime.getTime()) / 1000;
      await supabase
        .from('student_activity')
        .update({ duration_answer: durationInSeconds, is_correct: isCorrectAns, scores_fipi: scores, finished_or_not: true })
        .eq('user_id', user.id)
        .eq('attempt_id', currentAttemptId);
    } catch {}
  };

  const submitToHandleSubmission = async (isCorrectAns: boolean) => {
    if (!user) return;
    try {
      const { data: activityData } = await supabase
        .from('student_activity')
        .select('question_id, attempt_id, finished_or_not, duration_answer, scores_fipi')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (!activityData) return;
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
        body: { course_id: '3', submission_data: submissionData }
      });
      if (error) {}
    } catch {}
  };

  const handleShowSolution = async () => {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    if (!currentQuestion) return;
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
    setShowSolution(true);
    setIsCorrect(false);
    setShowAnswer(true);
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
        loadFRQQuestions();
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
      await supabase
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
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить завершение', variant: 'destructive' });
    }
  };

  const loadProgressStats = async () => {
    if (!user?.id || !homeworkName) return;
    try {
      const { data } = await supabase
        .from('homework_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('homework_name', homeworkName)
        .not('question_id', 'is', null)
        .neq('question_id', 'Summary');
      if (data) {
        const stats: ProgressStats = {
          totalTime: data.reduce((sum, r) => sum + (r.response_time_seconds || 0), 0),
          avgTime: data.length > 0 ? Math.round(data.reduce((s, r) => s + (r.response_time_seconds || 0), 0) / data.length) : 0,
          showedSolutionCount: data.filter(r => r.showed_solution).length,
          skillsWorkedOn: [...new Set(data.flatMap(r => r.skill_ids || []))],
          difficultyBreakdown: data.reduce((acc, r) => { const level = r.difficulty_level || 'unknown'; acc[level] = (acc[level] || 0) + 1; return acc; }, {} as Record<string, number>)
        };
        if (mountedRef.current) setProgressStats(stats);
      }
    } catch {}
  };

  const handleSendChatMessage = async (userInput: string) => {
    if (!userInput.trim()) return;
    const userMessage = { id: Date.now(), text: userInput, isUser: true, timestamp: new Date() } as any;
    setMessages([...messages, userMessage]);
    setIsTyping(true);
    try {
      const aiResponse = await sendChatMessage(userMessage, messages, false, user.id);
      setMessages([...messages, userMessage, aiResponse]);
      try { await saveChatLog(userInput, aiResponse.text, '3'); } catch {}
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
        <div className="pt-20 px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg text-white/70">Войдите в систему для доступа к домашнему заданию</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
        <div className="pt-20 px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <Loading variant="ring-dots" size="md" message="Загрузка домашнего задания..." />
          </div>
        </div>
      </div>
    );
  }

  if (!homeworkData || (!homeworkData.mcq_questions?.length && !homeworkData.fipi_questions?.length)) {
    return (
      <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
        <div className="pt-12 px-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <Button onClick={() => navigate('/egemathprof-practice')} variant="ghost" className="hover:bg-white/10 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </div>
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader className="text-center">
                <BookOpen className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
                <CardTitle className="text-2xl">Домашнее задание не назначено</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-gray-600">
                  У вас пока нет домашнего задания от ИИ помощника. Обратитесь к преподавателю или попробуйте другие виды практики.
                </p>
                <Button onClick={() => navigate('/egemathprof-practice')} className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]">
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
        <div className="pt-20 px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <Loading variant="ring-dots" size="md" message="Загрузка вопросов..." />
          </div>
        </div>
      </div>
    );
  }

  // Review Mode - Full Page View (copied and adapted from HomeworkEgeb.tsx)
  if (reviewMode) {
    const totalQuestions = allQuestionResults.length;
    const correctAnswersCount = allQuestionResults.filter(r => r.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;

    return (
      <>
        <div className="min-h-screen text-white relative p-4 md:p-8" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
          <div className="max-w-7xl mx-auto space-y-6 relative z-10">
            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
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
                  onClick={async () => {
                    console.log('🔵 Button clicked - Go to AI Teacher (EGE Prof)');
                    console.log('User object:', user);
                    console.log('Homework name:', homeworkName);
                    
                    if (!user) {
                      console.error('❌ No user object found');
                      toast({
                        title: 'Ошибка',
                        description: 'Необходимо войти в систему',
                        variant: 'destructive'
                      });
                      return;
                    }

                    try {
                      console.log('📤 Attempting to insert pending feedback record...');
                      
                      // Fetch detailed homework progress for all questions
                      const { data: progressData, error: progressError } = await supabase
                        .from('homework_progress')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('homework_name', homeworkName)
                        .neq('question_id', 'Summary');

                      if (progressError) {
                        console.error('❌ Failed to fetch homework progress:', progressError);
                      }

                      // Build detailed question data with text, answers, and timing
                      const detailedQuestions = allQuestionResults.map((result) => {
                        const progressRecord = progressData?.find(p => p.question_id === result.question.id);
                        return {
                          questionNumber: progressRecord?.q_number || null,
                          questionId: result.question.id,
                          questionText: result.question.text,
                          questionType: result.type,
                          difficulty: result.question.difficulty,
                          skills: result.question.skills,
                          problemNumber: result.question.problem_number,
                          userAnswer: result.userAnswer,
                          correctAnswer: result.correctAnswer,
                          isCorrect: result.isCorrect,
                          responseTimeSeconds: progressRecord?.response_time_seconds || null,
                          showedSolution: progressRecord?.showed_solution || false,
                          options: result.question.options || null
                        };
                      });

                      const correctCount = detailedQuestions.filter(q => q.isCorrect).length;
                      const totalTime = detailedQuestions.reduce((sum, q) => sum + (q.responseTimeSeconds || 0), 0);
                      const avgTime = detailedQuestions.length > 0 ? Math.round(totalTime / detailedQuestions.length) : 0;
                      
                      // 1. Insert pending feedback record with comprehensive data
                      const { data: pendingRecord, error: insertError } = await supabase
                        .from('pending_homework_feedback')
                        .insert({
                          user_id: user.id,
                          course_id: '3', // EGE Prof
                          feedback_type: 'homework',
                          homework_name: homeworkName,
                          context_data: {
                            timestamp: Date.now(),
                            totalQuestions: detailedQuestions.length,
                            completedQuestions: detailedQuestions.length,
                            correctAnswers: correctCount,
                            accuracyPercentage: Math.round((correctCount / detailedQuestions.length) * 100),
                            totalTimeSeconds: totalTime,
                            averageTimePerQuestion: avgTime,
                            questions: detailedQuestions,
                            homeworkName: homeworkName
                          }
                        })
                        .select('id')
                        .single();

                      if (insertError) {
                        console.error('❌ Failed to create feedback record:', insertError);
                        toast({
                          title: 'Ошибка',
                          description: `Не удалось создать запрос на обратную связь: ${insertError.message}`,
                          variant: 'destructive'
                        });
                        return;
                      }

                      console.log('✅ Feedback record created:', pendingRecord);
                      console.log('📊 Context data includes', detailedQuestions.length, 'detailed questions');

                      // 2. Trigger edge function to generate feedback in background
                      console.log('🚀 Invoking edge function...');
                      supabase.functions.invoke('generate-homework-feedback', {
                        body: { pending_feedback_id: pendingRecord.id }
                      }).catch(err => {
                        console.error('❌ Failed to trigger feedback generation:', err);
                      });

                      // 3. Show toast and navigate immediately
                      toast({
                        title: 'Генерация обратной связи запущена! 🤖',
                        description: 'ИИ анализирует ваше ДЗ, результат будет в чате',
                        duration: 2000
                      });

                      // 4. Navigate with pending_feedback_id parameter
                      console.log('🧭 Navigating to /egemathprof with pending_feedback_id:', pendingRecord.id);
                      navigate(`/egemathprof?pending_feedback=${pendingRecord.id}`);
                    } catch (error) {
                      console.error('❌ Unexpected error creating feedback request:', error);
                      toast({
                        title: 'Ошибка',
                        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Перейти к AI учителю
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5">
                  {[...allQuestionResults]
                    .sort((a, b) => a.type === 'mcq' && b.type === 'frq' ? -1 : a.type === 'frq' && b.type === 'mcq' ? 1 : 0)
                    .map((result, index) => {
                      const originalIndex = allQuestionResults.indexOf(result);
                      return (
                        <Card
                          key={result.question.id}
                          className={cn(
                            "cursor-pointer transition-all hover:scale-105 bg-white/90",
                            result.isCorrect ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5",
                            currentQuestionIndex === originalIndex && "ring-2 ring-gold"
                          )}
                          onClick={() => {
                            setCurrentQuestionIndex(originalIndex);
                            setTimeout(() => {
                              document.getElementById('solution-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                        >
                          <CardContent className="p-1.5 text-center">
                            <div className="text-xs font-bold mb-0.5">№{originalIndex + 1}</div>
                            <div className="text-[10px] font-medium mb-1 text-muted-foreground">
                              {result.type === 'mcq' ? 'MCQ' : 'FRQ'}
                            </div>
                            {result.isCorrect
                              ? <Check className="w-3 h-3 text-green-600 mx-auto" />
                              : <X className="w-3 h-3 text-red-600 mx-auto" />}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {allQuestionResults[currentQuestionIndex] && (
              <Card id="solution-box" className="bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
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
                      className={cn("flex items-center gap-2", isSelecterActive && "bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]")}
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
  const hasFRQ = totalFRQ > 0;
  const isFinalOverall =
    (questionType === 'frq' && currentQuestionIndex === currentQuestions.length - 1) ||
    (questionType === 'mcq' && !hasFRQ && currentQuestionIndex === currentQuestions.length - 1);

  return (
    <div className="min-h-screen text-white relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <div className="pt-8 px-4 pb-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Back Button like egemathprof-practice */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/egemathprof-practice')}
              className="hover:bg-white/20 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>

          {/* Header like egemathprof-practice */}
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-gold to-sage bg-clip-text text-transparent">
              Домашнее задание
            </h1>
            <p className="text-lg text-cool-gray font-body">
              Персональные задания от ИИ помощника
            </p>
          </div>

          <Card className="mb-6 bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Target className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <Progress value={currentProgress} className="h-2 bg-white/20 [&>div]:bg-gradient-to-r from-yellow-500 to-emerald-500" />
                </div>
                <Badge variant="secondary" className={questionType === 'mcq' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                  {questionType === 'mcq' ? 'MCQ' : 'FRQ'}
                </Badge>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{completedQuestions.size} из {totalMCQ + totalFRQ} выполнено</span>
              </div>
            </CardContent>
          </Card>

          {currentQuestion && (
            <Card className="mb-6 bg-white/95 text-[#1a1f36] rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">
                  {questionType === 'mcq' ? 'Вопрос с выбором ответа' : 'Задача'}
                  {currentQuestion.problem_number && (
                    <Badge variant="outline" className="ml-2">№{currentQuestion.problem_number}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQuestion.problem_image && (
                  <div className="flex justify-center mb-4">
                    <img src={currentQuestion.problem_image} alt="Problem" className="max-w-full h-auto rounded-lg shadow-md" />
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
                          className={cn(
                            "w-full text-left justify-start h-auto p-4 transition-all duration-150",
                            selectedOption === cyrillic
                              ? "bg-gradient-to-r from-amber-50 to-emerald-50 text-[#1a1f36] hover:brightness-105 border-emerald-300 shadow-sm"
                              : "border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-50 hover:border-emerald-200 hover:shadow-[0_6px_18px_rgba(16,185,129,0.12)] hover:-translate-y-[1px] active:translate-y-0 active:bg-gradient-to-r active:from-yellow-500/10 active:to-emerald-500/10 hover:text-[#1a1f36]"
                          )}
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
                    <Input value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Введите ответ..." disabled={showAnswer} className="text-lg" />
                  </div>
                )}

                {showAnswer && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
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
                      <Button onClick={handleSubmitAnswer} className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]" disabled={checkingAnswer || (questionType === 'mcq' ? !selectedOption : !userAnswer)}>
                        {checkingAnswer ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Проверяем...</>) : ('Проверить ответ')}
                      </Button>
                      <Button onClick={handleShowSolution} variant="outline" className="flex items-center gap-2 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 hover:text-[#1a1f36]" disabled={checkingAnswer}>
                        <Eye className="w-4 h-4" />
                        Показать решение
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleNextQuestion} className="flex-1 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]" size="lg">
                        {isFinalOverall ? (
                          <>
                            <Trophy className="mr-2 h-5 w-5" />Завершить домашнее задание
                          </>
                        ) : (
                          <>
                            Следующий вопрос
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                      <Button onClick={handleShowSolution} variant="outline" className="flex items-center gap-2 border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100 hover:text-[#1a1f36]">
                        <Eye className="w-4 h-4" />
                        Показать решение
                      </Button>
                      <Button onClick={() => { setIsSelecterActive(!isSelecterActive); if (isSelecterActive) setSelectedText(''); }} variant={isSelecterActive ? "default" : "outline"} className={cn("flex items-center gap-2", isSelecterActive && "bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36]")}>
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fixed z-50 bg-white rounded-lg shadow-xl border-2 p-3" style={{ left: `${selectionPosition.x}px`, top: `${selectionPosition.y}px`, transform: 'translate(-50%, -100%)', borderColor: '#10b981' }}>
          <Button onClick={() => { const newUserMessage = { id: Date.now(), text: `Объясни мне это: "${selectedText}"`, isUser: true, timestamp: new Date() } as any; addMessage(newUserMessage); setIsTyping(true); (async () => { try { const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode, user.id); addMessage(aiResponse); try { await saveChatLog(newUserMessage.text, aiResponse.text, '3'); } catch {} } finally { setIsTyping(false); } })(); setSelectedText(''); }} className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Спросить Ёжика
          </Button>
        </motion.div>
      )}

      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="right" className="w-full sm:w-[540px] flex flex-col h-full p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
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

export default HomeworkEgeprof;

