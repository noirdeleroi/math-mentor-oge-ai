import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown, ChevronRight, MessageCircle, X, BookOpen, Lightbulb, ArrowLeft, Play, Edit3, Send, ChevronLeft, Calculator, Highlighter, Target } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import newSyllabusData from '../data/newSyllabusStructure.json';
import ArticleRenderer from '../components/ArticleRenderer';
import OgeExerciseQuiz from '../components/OgeExerciseQuiz';
import { useChatContext } from '@/contexts/ChatContext';
import { sendChatMessage } from '@/services/chatService';
import CourseChatMessages from '@/components/chat/CourseChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { useAuth } from '@/contexts/AuthContext';
import { saveChatLog } from '@/services/chatLogsService';
import { getSelectedTextWithMath } from '@/utils/getSelectedTextWithMath';
import { useMathJaxSelection } from '../hooks/useMathJaxSelection';
import { StreakDisplay } from '@/components/streak/StreakDisplay';
import { Link } from 'react-router-dom';
import { findTopicRoute } from '@/lib/topic-routing';

interface Skill {
  number: number;
  name: string;
  importance: number;
}

interface Topic {
  name: string;
  skills: Skill[];
}

interface Module {
  [topicKey: string]: Topic;
}

interface SyllabusStructure {
  [moduleName: string]: Module;
}

interface Article {
  ID: number;
  article_text: string;
  img1?: string;
  img2?: string;
  img3?: string;
  img4?: string;
  img5?: string;
  img6?: string;
  img7?: string;
  [key: string]: any;
}

interface MCQQuestion {
  question_id: string;
  problem_text: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  answer: string;
  skills: number;
}

const getArticleForSkill = async (skillId: number): Promise<Article | null> => {
  try {
    const { data, error } = await supabase
      .from('articles_oge_full')
      .select('*')
      .eq('ID', skillId)
      .single();

    if (error) {
      console.error('Error fetching article:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

const getMCQForSkill = async (skillId: number): Promise<MCQQuestion[]> => {
  try {
    const { data, error } = await supabase
      .from('oge_math_skills_questions')
      .select('*')
      .eq('skills', skillId);

    if (error) {
      console.error('Error fetching MCQ:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

const getAllSkillsFromStructure = (): Skill[] => {
  const allSkills: Skill[] = [];
  const syllabusData = newSyllabusData as SyllabusStructure;
  
  Object.values(syllabusData).forEach(module => {
    Object.values(module).forEach(topic => {
      allSkills.push(...topic.skills);
    });
  });
  
  return allSkills;
};

const getFilteredSkills = (skills: Skill[], searchTerm: string): Skill[] => {
  if (!searchTerm) return skills;
  
  return skills.filter(skill => 
    skill.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

const DigitalTextbook = () => {
  // Initialize MathJax selection highlighting
  useMathJaxSelection();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [currentMCQs, setCurrentMCQs] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMCQ, setLoadingMCQ] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const selectionPopupRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { messages, isTyping, isDatabaseMode, addMessage, setIsTyping } = useChatContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [missingMCQs, setMissingMCQs] = useState<number[]>([]);
  const [showPractice, setShowPractice] = useState(false);
  const navigate = useNavigate();

  // Get topic route information for the selected topic
  const topicRoute = useMemo(() => {
    if (!selectedTopic) return null;
    return findTopicRoute(selectedTopic);
  }, [selectedTopic]);

  // Prevent body scroll when this page is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedText) {
        setSelectedText('');
        setCustomQuestion('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedText]);

  useEffect(() => {
    const skillParam = searchParams.get('skill');
    const topicParam = searchParams.get('topic');
    
    if (skillParam) {
      const skillId = parseInt(skillParam);
      setSelectedSkill(skillId);
      handleSkillSelect(skillId);
    } else if (topicParam) {
      setSelectedTopic(topicParam);
      handleTopicSelect(topicParam);
    }
  }, [searchParams]);

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName);
    } else {
      newExpanded.add(moduleName);
    }
    setExpandedModules(newExpanded);
  };

  const toggleTopic = (topicKey: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicKey)) {
      newExpanded.delete(topicKey);
    } else {
      newExpanded.add(topicKey);
    }
    setExpandedTopics(newExpanded);
  };

  const handleModuleSelect = (moduleName: string) => {
    setSelectedModule(moduleName);
    setSelectedTopic(null);
    setSelectedSkill(null);
    setCurrentArticle(null);
    setCurrentMCQs([]);
    
    if (!expandedModules.has(moduleName)) {
      toggleModule(moduleName);
    }
  };

  const handleTopicSelect = (topicKey: string) => {
    setSelectedTopic(topicKey);
    setSelectedSkill(null);
    setCurrentArticle(null);
    setCurrentMCQs([]);
    
    // Update URL with topic parameter
    setSearchParams({ topic: topicKey });
    
    if (!expandedTopics.has(topicKey)) {
      toggleTopic(topicKey);
    }
  };

  const handleSkillSelect = async (skillId: number) => {
    setSelectedSkill(skillId);
    setLoading(true);
    setLoadingMCQ(true);
    
    try {
      const [article, mcqs] = await Promise.all([
        getArticleForSkill(skillId),
        getMCQForSkill(skillId)
      ]);
      
      setCurrentArticle(article);
      setCurrentMCQs(mcqs);
      
      if (mcqs.length === 0) {
        setMissingMCQs(prev => {
          if (!prev.includes(skillId)) {
            return [...prev, skillId];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
      setLoadingMCQ(false);
    }
  };

  const toggleSelecter = () => {
    setIsSelecting(!isSelecting);
  };

  const handleTextSelection = (event?: Event) => {
    setTimeout(() => {
      // Check if click was inside the selection popup
      if (event?.target && selectionPopupRef.current?.contains(event.target as Node)) {
        return; // Don't process selection if clicking inside popup
      }
      
      const selected = getSelectedTextWithMath();
      if (!selected) {
        setSelectedText('');
        return;
      }
      setSelectedText(selected);
    }, 0);
  };

  const closeSelectionPopup = () => {
    setSelectedText('');
    setCustomQuestion('');
    // Clear any text selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleAskEzhik = async () => {
    if (!selectedText) return;
    
    // Open chat and send the selected text for explanation
    setIsChatOpen(true);
    
    // Use custom question if provided, otherwise use default, but always include selected text
    const userMessage = customQuestion.trim() || "Объясни кратко это:";
    const finalQuestion = `${userMessage} "${selectedText}"`;
    await handleSendChatMessage(finalQuestion);
    
    closeSelectionPopup();
  };

  const handleSendChatMessage = async (userInput: string) => {
    // Add user message
    const newUserMessage = {
      id: messages.length + 1,
      text: userInput,
      isUser: true,
      timestamp: new Date()
    };
    
    addMessage(newUserMessage);
    setIsTyping(true);

    try {
      // Send message to AI and get response
      // Skip task ID check on textbook page - it's not needed here
      const aiResponse = await sendChatMessage(newUserMessage, messages, isDatabaseMode, user.id, undefined, true);
      addMessage(aiResponse);
      
      // Save chat interaction to database
      await saveChatLog(userInput, aiResponse.text, '1');
    } catch (error) {
      console.error('Error saving chat log:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBackToSyllabus = () => {
    setSelectedModule(null);
    setSelectedTopic(null);
    setSelectedSkill(null);
    setCurrentArticle(null);
    setCurrentMCQs([]);
    setShowPractice(false);
    // Clear URL parameters
    setSearchParams({});
  };

  const handleBackToTopic = () => {
    setSelectedSkill(null);
    setCurrentArticle(null);
    setCurrentMCQs([]);
    setShowPractice(false);
  };

  const handleStartPractice = () => {
    setShowPractice(true);
  };

  const handleBackToArticle = () => {
    setShowPractice(false);
  };

  const renderFullSyllabus = () => {
    const syllabusData = newSyllabusData as SyllabusStructure;
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">
            Программа ОГЭ по математике
          </h1>
        </div>
        
        <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 space-y-6 text-[#1a1f36]">
          {Object.entries(syllabusData).map(([moduleName, module]) => (
            <div key={moduleName} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
              <h2 className="text-xl font-bold mb-3 text-[#1a1f36]">
                {moduleName}
              </h2>
              
              <div className="space-y-4 ml-4">
                {Object.entries(module).map(([topicKey, topic]) => (
                  <div key={topicKey}>
                    <button
                      onClick={() => handleTopicSelect(topicKey)}
                      className="text-left hover:text-yellow-600 transition-colors font-medium mb-2 block"
                    >
                      {topicKey} {topic.name}
                    </button>
                    
                    <div className="ml-6 space-y-1">
                      {getFilteredSkills(topic.skills, searchTerm).map((skill) => (
                        <button
                          key={skill.number}
                          onClick={() => {
                            handleSkillSelect(skill.number);
                            setSearchParams({ skill: skill.number.toString() });
                          }}
                          className={`block text-sm hover:text-yellow-600 transition-colors text-left w-full py-1 ${
                            selectedSkill === skill.number ? 'text-orange-500 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {skill.number}. {skill.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTopicView = () => {
    if (!selectedTopic) return null;

    const syllabusData = newSyllabusData as SyllabusStructure;
    let currentTopic = null;
    let currentTopicData = null;

    // Find the selected topic in the data structure
    for (const [moduleName, module] of Object.entries(syllabusData)) {
      for (const [topicKey, topicData] of Object.entries(module)) {
        if (topicKey === selectedTopic) {
          currentTopic = topicKey;
          currentTopicData = topicData;
          break;
        }
      }
      if (currentTopic) break;
    }

    if (!currentTopicData) return null;

    return (
      <div className="space-y-6">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">
            {currentTopic} {currentTopicData.name}
          </h2>
          <p className="text-lg md:text-xl text-gray-300">
            Все навыки по теме - выберите для изучения
          </p>
        </div>

        <div className="grid gap-4">
          {getFilteredSkills(currentTopicData.skills, searchTerm).map((skill) => (
            <Card 
              key={skill.number}
              className={`transition-all duration-200 hover:shadow-lg cursor-pointer backdrop-blur-lg ${
                selectedSkill === skill.number
                  ? 'bg-orange-500 border-orange-600 text-white'
                  : 'bg-white/95 border-white/20 hover:bg-white text-[#1a1f36]'
              }`}
              onClick={() => {
                handleSkillSelect(skill.number);
                // Update URL with skill parameter
                setSearchParams({ skill: skill.number.toString() });
              }}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`p-2 md:p-3 rounded-full flex-shrink-0 ${
                      selectedSkill === skill.number
                        ? 'bg-white/20'
                        : 'bg-gradient-to-br from-yellow-500/20 to-emerald-500/20'
                    }`}>
                      <BookOpen className={`h-4 w-4 md:h-5 md:w-5 ${
                        selectedSkill === skill.number ? 'text-white' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-base md:text-lg font-semibold ${
                        selectedSkill === skill.number ? 'text-white' : 'text-[#1a1f36]'
                      }`}>
                        {skill.number}. {skill.name}
                      </h3>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`w-full md:w-auto ${selectedSkill === skill.number 
                      ? 'border-white text-white hover:bg-white/20' 
                      : 'border-gray-300 text-[#1a1f36] hover:bg-yellow-500/10'
                    }`}
                  >
                    Изучить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Topic Summary */}
        <div className="mt-8 bg-white/95 backdrop-blur-lg rounded-lg p-6 border-white/20 text-[#1a1f36]">
          <h3 className="text-lg font-semibold mb-4 font-display">Сводка по теме</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">{currentTopicData.skills.length}</div>
              <div className="text-sm text-gray-600">Всего навыков</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {currentTopicData.skills.filter(s => s.importance <= 2).length}
              </div>
              <div className="text-sm text-gray-600">Базовых навыков</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {currentTopicData.skills.filter(s => s.importance >= 3).length}
              </div>
              <div className="text-sm text-gray-600">Продвинутых навыков</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (isSelecting) {
      const handleMouseUp = (e: MouseEvent) => handleTextSelection(e);
      const handleTouchEnd = (e: TouchEvent) => handleTextSelection(e);
      
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isSelecting]);

  return (
    <div
      className="fixed inset-0 flex w-full text-white overflow-hidden overscroll-contain"
      style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}
    >

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-400 hover:to-emerald-400 text-[#1a1f36] p-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300"
      >
        <BookOpen className="h-5 w-5" />
      </button>

      {/* Chat Toggle Button - Fixed to right edge - ALWAYS VISIBLE */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed right-0 top-20 z-50 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-400 hover:to-emerald-400 text-[#1a1f36] px-3 py-2 rounded-l-lg shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="font-medium">ЧАТ</span>
      </button>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Responsive */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 md:z-auto w-64 h-screen bg-[#1a1f36]/95 md:bg-[#1a1f36]/80 backdrop-blur-lg border-r border-yellow-500/20 flex-shrink-0 flex flex-col overflow-auto pt-20 md:pt-20 transition-transform duration-300 ease-in-out`}>
        
        {/* Navigation buttons */}
        <div className="p-4 space-y-2 border-b border-yellow-500/20">
          {/* Back to Syllabus - First */}
          <Button
            onClick={handleBackToSyllabus}
            variant="ghost"
            className="w-full justify-start text-white hover:bg-yellow-500/10 hover:text-yellow-400"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            К программе
          </Button>
          
          {/* Platform Link */}
          <Link to="/cellard-lp2">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-yellow-500/10 hover:text-yellow-400"
            >
              <Target className="mr-2 h-4 w-4" />
              Платформа
            </Button>
          </Link>
          
          <Button
            onClick={toggleSelecter}
            variant={isSelecting ? "default" : "ghost"}
            className={`w-full justify-start relative transition-all duration-300 ${
              isSelecting 
                ? "bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-400 hover:to-emerald-400 text-[#1a1f36] shadow-xl ring-2 ring-yellow-300/50" 
                : "text-white hover:bg-yellow-500/10 hover:text-yellow-400"
            }`}
          >
            <Highlighter className="mr-2 h-4 w-4" />
            {isSelecting ? "🎯 Режим выделения" : "✨ Включить выделение"}
            {isSelecting && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></div>
            )}
          </Button>
          
          {selectedTopic && topicRoute && (
            <Link 
              to={`/module/${topicRoute.moduleSlug}/topic/${topicRoute.topicId}`}
              className="block"
            >
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-yellow-500/10 hover:text-yellow-400 font-medium"
              >
                <Target className="mr-2 h-4 w-4" />
                К уроку
              </Button>
            </Link>
          )}
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Content Area */}
        <div className="flex-1 overflow-auto relative pt-16 md:pt-20">
          <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
            {/* Breadcrumb Navigation */}
            {(selectedModule || selectedTopic || selectedSkill) && (
              <div className="flex items-center gap-2 mb-6 text-sm text-gray-300">
                <button 
                  onClick={handleBackToSyllabus}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Программа
                </button>
                {selectedModule && (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    <span>{selectedModule}</span>
                  </>
                )}
                {selectedTopic && (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    <button 
                      onClick={handleBackToTopic}
                      className="hover:text-yellow-400 transition-colors"
                    >
                      {selectedTopic}
                    </button>
                  </>
                )}
                {selectedSkill && (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    <span>Навык {selectedSkill}</span>
                  </>
                )}
              </div>
            )}

            {/* Main Content */}
            {!selectedSkill && !selectedTopic && renderFullSyllabus()}
            {selectedTopic && !selectedSkill && renderTopicView()}
            {selectedSkill && (
              <div className="space-y-6">
                {!showPractice ? (
                  <>
                    {currentArticle && (
                      <Card className="w-full bg-white/95 backdrop-blur-lg border-white/20 text-[#1a1f36]">
                        <CardHeader className="bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 border-b border-yellow-500/20 p-4 md:p-6">
                          <CardTitle className="text-lg md:text-xl font-display text-[#1a1f36]">
                            Навык {selectedSkill}: {getAllSkillsFromStructure().find(s => s.number === selectedSkill)?.name}
                          </CardTitle>
                        </CardHeader>
                         <CardContent 
                          className={`p-4 md:p-6 relative ${isSelecting ? 'selection-mode' : ''}`}
                          onClick={isSelecting ? handleTextSelection : undefined}
                          style={{ 
                            cursor: isSelecting ? 'text' : 'default',
                            userSelect: isSelecting ? 'text' : 'auto'
                          }}
                        >
                          <ArticleRenderer 
                            text={currentArticle.article_text}
                            article={{
                              ...currentArticle,
                              skill: currentArticle.ID,
                              art: currentArticle.article_text
                            }}
                          />
                          
                          {/* Practice Button */}
                          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-base md:text-lg font-semibold text-[#1a1f36]">Готовы к практике?</h3>
                                <p className="text-sm text-gray-600">
                                  Закрепите знания с помощью интерактивных заданий
                                </p>
                              </div>
                              <Button 
                                onClick={handleStartPractice}
                                className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-400 hover:to-emerald-400 text-[#1a1f36] w-full md:w-auto"
                                disabled={loadingMCQ}
                              >
                                <Play className="h-4 w-4" />
                                {loadingMCQ ? 'Загрузка...' : 'Начать практику'}
                              </Button>
                            </div>
                            {missingMCQs.includes(selectedSkill) && (
                              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-400 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                  <Lightbulb className="h-4 w-4 inline mr-2" />
                                  Для этого навыка пока нет готовых заданий. Вы можете задать вопросы через чат!
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {loading && (
                      <Card className="w-full bg-white/95 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                            <span className="ml-3 text-gray-300">Загружаем материал...</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <OgeExerciseQuiz 
                    title={`Практика: ${getAllSkillsFromStructure().find(s => s.number === selectedSkill)?.name || ''}`}
                    skills={[selectedSkill]}
                    onBack={handleBackToArticle}
                    questionCount={5}
                    isModuleTest={false}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text Selection Popup */}
      {selectedText && (
        <div ref={selectionPopupRef} className="fixed top-20 md:top-24 right-2 md:right-4 left-2 md:left-auto z-50 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-md border border-yellow-500/20 rounded-2xl shadow-2xl p-4 md:p-5 max-w-md mx-auto md:mx-0 transform transition-all duration-300 hover:scale-105">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-[#1a1f36]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1a1f36] mb-2">✨ Выделенный текст:</p>
                <div className="bg-gradient-to-r from-yellow-50 to-emerald-50 rounded-lg p-3 border border-yellow-200">
                  <p className="text-sm text-gray-700 leading-relaxed">"{selectedText}"</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeSelectionPopup}
                className="p-1 h-auto hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Textarea
              placeholder="Дополнительный вопрос (необязательно)..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="mb-4 resize-none text-[#1a1f36]"
              rows={2}
            />
            
            <Button 
              onClick={handleAskEzhik}
              className="w-full bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-400 hover:to-emerald-400 text-[#1a1f36] shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl py-2.5 font-medium"
              size="sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              🦔 Спросить Ёжика
            </Button>
          </div>
        </div>
      )}

      {/* Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent className="w-full sm:max-w-lg h-full p-0 bg-white/95 backdrop-blur-md border-yellow-500/20">
          <SheetHeader className="px-6 py-4 border-b border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-emerald-500/5">
            <SheetTitle className="text-left text-[#1a1f36] font-display">Чат с Ёжиком</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-[calc(100vh-80px)]">
            <div className="flex-1 overflow-hidden">
              <CourseChatMessages messages={messages} isTyping={isTyping} />
            </div>
            <div className="border-t border-yellow-500/20 p-4 bg-gradient-to-r from-yellow-50/50 to-emerald-50/50">
              <ChatInput onSendMessage={handleSendChatMessage} isTyping={isTyping} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DigitalTextbook;
