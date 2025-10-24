import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, BookOpen, ArrowRight, ArrowLeft, Copy, LinkIcon, Home, QrCode } from "lucide-react";
import MathRenderer from "@/components/MathRenderer";
import FormulaBookletDialog from "@/components/FormulaBookletDialog";
import { toast } from "sonner";

/**
 * Goals of this page
 * 1) Keep your familiar selection UI to choose problem numbers.
 * 2) When practice starts, FREEZE a session order and navigate to a per-question URL: /ogemath2/q/:questionId?sid=:sessionId
 * 3) If a question URL is opened directly, the page fetches and renders that single problem.
 * 4) If a sid is provided, the Next/Prev navigation follows the frozen order; if not, it just shows the single question.
 * 5) This is designed to run even if you don't yet have a practice_sessions table; it stores sessions in localStorage.
 *    (Later you can add a server-side table—see instructions below.)
 */

// --- Types ---
interface Question {
  question_id: string;
  problem_text: string | null;
  answer: string | null;
  solution_text: string | null;
  difficulty?: string | number | null;
  problem_number_type?: number | null;
  problem_image?: string | null;
}

interface FrozenSession {
  sessionId: string;
  createdAt: string; // ISO
  questionIds: string[]; // ordered
  currentIndex: number; // 0-based
  filters: string[]; // selected number types as strings
}

// --- Helpers ---
const LS_KEY = "ogemath2_sessions"; // localStorage key to persist multiple sessions

function loadAllSessions(): Record<string, FrozenSession> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSession(sess: FrozenSession) {
  const all = loadAllSessions();
  all[sess.sessionId] = sess;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

function getSession(sessionId: string | null): FrozenSession | null {
  if (!sessionId) return null;
  const all = loadAllSessions();
  return all[sessionId] || null;
}

function updateSessionIndex(sessionId: string, newIndex: number) {
  const all = loadAllSessions();
  if (!all[sessionId]) return;
  all[sessionId].currentIndex = newIndex;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

function uuid() {
  // Quick UUID v4-ish (not cryptographically strong, fine for session ids)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function shuffle<T>(arr: T[], seed?: number): T[] {
  // Deterministic-ish shuffle if seed given
  let a = [...arr];
  let s = seed ?? Math.floor(Math.random() * 1e9);
  for (let i = a.length - 1; i > 0; i--) {
    // simple LCG
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Map number type groups to arrays
function expandGroup(tag: string): string[] {
  switch (tag) {
    case "1-5":
      return ["1", "2", "3", "4", "5"];
    default:
      return [tag];
  }
}

export default function PracticeByNumberOgemath2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get("sid");

  // Selection state (used only on the root route /ogemath2)
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  // Question state
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showFormulaBooklet, setShowFormulaBooklet] = useState(false);

  // For Next/Prev based on session
  const frozenSession = useMemo(() => getSession(sessionId), [sessionId]);
  const currentIndex = useMemo(() => {
    if (!frozenSession || !questionId) return null;
    const i = frozenSession.questionIds.findIndex(qid => qid === questionId);
    return i >= 0 ? i : null;
  }, [frozenSession, questionId]);

  // Fetch a single question by id if a questionId is present
  useEffect(() => {
    (async () => {
      if (!questionId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("oge_math_fipi_bank")
          .select("question_id, problem_text, answer, solution_text, problem_number_type, problem_image, difficulty")
          .eq("question_id", questionId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          toast.error("Задача не найдена");
          return;
        }
        setQuestion(data as Question);
        setIsAnswered(false);
        setIsCorrect(null);
        setShowSolution(false);
        setUserAnswer("");

        // If session exists but URL index differs, sync currentIndex in session
        if (frozenSession) {
          const idx = frozenSession.questionIds.findIndex(id => id === questionId);
          if (idx >= 0 && idx !== frozenSession.currentIndex) {
            updateSessionIndex(frozenSession.sessionId, idx);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Ошибка загрузки задачи");
      } finally {
        setLoading(false);
      }
    })();
  }, [questionId]);

  // --- Selection UI helpers ---
  const toggleGroup = (groupType: string) => {
    let numbers: string[] = [];
    switch (groupType) {
      case "all":
        numbers = Array.from({ length: 25 }, (_, i) => String(i + 1));
        break;
      case "part1":
        numbers = ["1-5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"].flatMap(expandGroup);
        break;
      case "part2_algebra":
        numbers = ["20", "21", "22"];
        break;
      case "part2_geometry":
        numbers = ["23", "24", "25"];
        break;
    }
    const set = new Set(selectedNumbers);
    const allSelected = numbers.every(n => set.has(n));
    if (allSelected) numbers.forEach(n => set.delete(n));
    else numbers.forEach(n => set.add(n));
    setSelectedNumbers(Array.from(set));
  };

  const toggleNumber = (n: string) => {
    setSelectedNumbers(prev => (prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]));
  };

  // Start practice: freeze order and navigate to first question
  const startPractice = async () => {
    if (selectedNumbers.length === 0) {
      toast.error("Выберите хотя бы один номер");
      return;
    }
    setStarting(true);
    try {
      // Fetch all question_ids for the selected number types
      const numList = selectedNumbers.map(n => parseInt(n, 10)).filter(Boolean);
      const { data, error } = await supabase
        .from("oge_math_fipi_bank")
        .select("question_id, problem_number_type")
        .in("problem_number_type", numList)
        .order("question_id");
      if (error) throw error;
      const ids = (data || []).map(d => d.question_id as string);
      if (ids.length === 0) {
        toast.error("Не найдено задач по выбранным номерам");
        return;
      }

      // Deterministic-ish shuffle based on a seed (per-user per-day could be used; here we just use a random seed)
      const seed = Math.floor(Math.random() * 1e9);
      const frozen = shuffle(ids, seed);

      const sid = uuid();
      const session: FrozenSession = {
        sessionId: sid,
        createdAt: new Date().toISOString(),
        questionIds: frozen,
        currentIndex: 0,
        filters: selectedNumbers,
      };
      saveSession(session);

      // Navigate to first question with sid
      navigate(`/ogemath2/q/${session.questionIds[0]}?sid=${sid}`);
      toast.success("Сессия создана. Удачи!");
    } catch (e) {
      console.error(e);
      toast.error("Ошибка старта практики");
    } finally {
      setStarting(false);
    }
  };

  const goPrev = () => {
    if (!frozenSession || currentIndex == null) return;
    const prev = currentIndex - 1;
    if (prev < 0) return;
    updateSessionIndex(frozenSession.sessionId, prev);
    navigate(`/ogemath2/q/${frozenSession.questionIds[prev]}?sid=${frozenSession.sessionId}`);
  };

  const goNext = () => {
    if (!frozenSession || currentIndex == null) return;
    const nxt = currentIndex + 1;
    if (nxt >= frozenSession.questionIds.length) {
      toast.success("Сессия завершена!");
      return;
    }
    updateSessionIndex(frozenSession.sessionId, nxt);
    navigate(`/ogemath2/q/${frozenSession.questionIds[nxt]}?sid=${frozenSession.sessionId}`);
  };

  // Answer checking via your existing Edge Function (check-text-answer)
  const checkAnswer = async () => {
    if (!question || !userAnswer.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke("check-text-answer", {
        body: {
          user_id: user?.id ?? null,
          question_id: question.question_id,
          submitted_answer: userAnswer.trim(),
        },
      });
      if (error) throw error;
      const ok = Boolean(data?.is_correct);
      setIsAnswered(true);
      setIsCorrect(ok);
      if (ok) toast.success("Верно!"); else toast.error("Неверно");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось проверить ответ");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const questionNumbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());

  const onShowSolution = () => {
    setShowSolution(true);
    if (!isAnswered) setIsAnswered(true);
  };

  // --- RENDER ---
  // If we have a questionId in the URL, render the Question View.
  if (questionId) {
    return (
      <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg,#1a1f36 0%,#2d3748 50%,#1a1f36 100%)" }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                  <Link to="/ogemath2"><ArrowLeft className="w-4 h-4 mr-2"/>К выбору номеров</Link>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-white/30 text-white" onClick={() => setShowFormulaBooklet(true)}>
                  <BookOpen className="w-4 h-4 mr-2"/>Справочник
                </Button>
                <Button variant="outline" className="border-white/30 text-white" onClick={copyLink}>
                  <LinkIcon className="w-4 h-4 mr-2"/>Скопировать ссылку
                </Button>
              </div>
            </div>

            <Card className="bg-white/95 border-white/20 rounded-2xl shadow-xl">
              <CardHeader className="border-b border-white/20">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[#1a1f36]">
                  <span>Задача ID: {questionId}{question?.problem_number_type ? ` · №${question.problem_number_type}` : ""}</span>
                  {frozenSession && currentIndex != null && (
                    <span className="text-sm text-gray-600">{currentIndex + 1} из {frozenSession.questionIds.length}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Problem */}
                <div className="prose max-w-none text-[#1a1f36]">
                  {loading ? (
                    <p>Загрузка…</p>
                  ) : (
                    <MathRenderer text={question?.problem_text || "Текст задачи не найден"} compiler="mathjax" />
                  )}
                </div>

                {/* Image */}
                {question?.problem_image && (
                  <div className="flex justify-center">
                    <img src={question.problem_image} alt="Изображение к задаче" className="max-w-full h-auto rounded-lg border" style={{ maxHeight: 320 }} />
                  </div>
                )}

                {/* Answer input */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Ваш ответ"
                    disabled={isAnswered}
                    onKeyDown={e => { if (e.key === "Enter" && !isAnswered) checkAnswer(); }}
                    className="bg-white border-gray-300 text-[#1a1f36]"
                  />
                  <Button onClick={checkAnswer} disabled={isAnswered || !userAnswer.trim()} className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]">
                    <CheckCircle className="w-4 h-4 mr-2"/>Проверить
                  </Button>
                </div>

                {/* Result */}
                {isAnswered && (
                  <Alert className={isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    <AlertDescription className={isCorrect ? "text-green-800" : "text-red-800"}>
                      {isCorrect ? "Правильно!" : (
                        <span>Неправильно. Правильный ответ: <strong>{question?.answer}</strong></span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="border-[#1a1f36]/30 text-[#1a1f36]" onClick={onShowSolution}>
                    <BookOpen className="w-4 h-4 mr-2"/>Показать решение
                  </Button>
                  {frozenSession && (
                    <>
                      <Button variant="outline" className="border-[#1a1f36]/30 text-[#1a1f36]" onClick={goPrev} disabled={currentIndex === 0}>
                        <ArrowLeft className="w-4 h-4 mr-2"/>Предыдущий
                      </Button>
                      <Button className="bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]" onClick={goNext} disabled={currentIndex == null || currentIndex >= frozenSession.questionIds.length - 1}>
                        <ArrowRight className="w-4 h-4 mr-2"/>Следующий
                      </Button>
                    </>
                  )}
                </div>

                {/* Solution */}
                {showSolution && question?.solution_text && (
                  <Card className="bg-blue-50/60 border-blue-200">
                    <CardHeader className="border-b border-blue-200">
                      <CardTitle className="text-blue-800">Решение</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none text-[#1a1f36]">
                        <MathRenderer text={question.solution_text} compiler="mathjax" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <FormulaBookletDialog open={showFormulaBooklet} onOpenChange={setShowFormulaBooklet} />
      </div>
    );
  }

  // Otherwise render the Selection UI at /ogemath2
  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg,#1a1f36 0%,#2d3748 50%,#1a1f36 100%)" }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">Практика по номеру (v2)</h1>
            <p className="text-gray-300">Выберите номера заданий, затем мы создадим замороженную сессию и откроем первую задачу по адресу /ogemath2/q/:id</p>
          </div>

          <Card className="bg-white/95 border-white/20 rounded-2xl shadow-xl mb-6">
            <CardHeader>
              <CardTitle className="text-[#1a1f36]">Группы вопросов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" onClick={() => toggleGroup("all")} className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100">Все</Button>
                <Button variant="outline" onClick={() => toggleGroup("part1")} className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100">Часть 1</Button>
                <Button variant="outline" onClick={() => toggleGroup("part2_algebra")} className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100">Часть 2 · Алгебра</Button>
                <Button variant="outline" onClick={() => toggleGroup("part2_geometry")} className="border-[#1a1f36]/30 text-[#1a1f36] hover:bg-gray-100">Часть 2 · Геометрия</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 border-white/20 rounded-2xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-[#1a1f36]">Отдельные номера</CardTitle>
            </CardHeader>
            <CardContent>
              <h5 className="text-xs font-medium text-gray-600 mb-2">Алгебра (№1–14)</h5>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {/* 1-5 group */}
                <Button
                  variant={selectedNumbers.slice(0,5).every(n => ["1","2","3","4","5"].includes(n)) ? "default" : "outline"}
                  onClick={() => {
                    const group = ["1","2","3","4","5"]; const set = new Set(selectedNumbers);
                    const allSelected = group.every(n => set.has(n));
                    if (allSelected) group.forEach(n => set.delete(n)); else group.forEach(n => set.add(n));
                    setSelectedNumbers(Array.from(set));
                  }}
                  className={"p-3 h-auto " + (selectedNumbers.slice(0,5).every(n => ["1","2","3","4","5"].includes(n)) ? "bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]" : "border-[#1a1f36]/30 text-[#1a1f36]")}
                >1–5</Button>
                {Array.from({ length: 9 }, (_, i) => i + 6).map(n => (
                  <Button key={n} variant={selectedNumbers.includes(String(n)) ? "default" : "outline"} onClick={() => toggleNumber(String(n))} className={selectedNumbers.includes(String(n)) ? "bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]" : "border-[#1a1f36]/30 text-[#1a1f36]"}>{n}</Button>
                ))}
              </div>

              <h5 className="text-xs font-medium text-gray-600 mb-2">Геометрия (№15–19)</h5>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({ length: 5 }, (_, i) => i + 15).map(n => (
                  <Button key={n} variant={selectedNumbers.includes(String(n)) ? "default" : "outline"} onClick={() => toggleNumber(String(n))} className={selectedNumbers.includes(String(n)) ? "bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]" : "border-[#1a1f36]/30 text-[#1a1f36]"}>{n}</Button>
                ))}
              </div>

              <h5 className="text-xs font-medium text-gray-600 mb-2">Часть 2</h5>
              <div className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-6 gap-2">
                {[20,21,22,23,24,25].map(n => (
                  <Button key={n} variant={selectedNumbers.includes(String(n)) ? "default" : "outline"} onClick={() => toggleNumber(String(n))} className={selectedNumbers.includes(String(n)) ? "bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36]" : "border-[#1a1f36]/30 text-[#1a1f36]"}>{n}</Button>
                ))}
              </div>

              {selectedNumbers.length > 0 && (
                <div className="mt-4 text-[#1a1f36] text-sm">Выбрано: {selectedNumbers.sort((a,b)=>Number(a)-Number(b)).join(", ")}</div>
              )}

              <div className="mt-6 flex justify-center">
                <Button onClick={startPractice} disabled={starting || selectedNumbers.length === 0} className="px-8 py-3 text-lg bg-gradient-to-r from-yellow-500 to-emerald-500 text-[#1a1f36] disabled:opacity-50">
                  {starting ? "Создание…" : "Начать практику"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <FormulaBookletDialog open={showFormulaBooklet} onOpenChange={setShowFormulaBooklet} />
    </div>
  );
}
