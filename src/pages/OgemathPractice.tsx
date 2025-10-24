import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Hash, RefreshCw, ArrowLeft } from "lucide-react";
import { useState } from "react";
import FlyingMathBackground from "@/components/FlyingMathBackground";

const OgemathPractice = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const questionTypes = [
    {
      title: "По номеру вопроса",
      description: "Практика всех вопросов выбранного номера (1-25)",
      icon: Hash,
      link: "/practice-by-number-ogemath",
      gradient: "from-gold to-sage",
      mathSymbol: "∑",
      comingSoon: false
    },
    {
      title: "По теме",
      description: "Практика по конкретным темам и экзаменам",
      icon: ClipboardList,
      link: "/new-practice-skills",
      gradient: "from-amber-500 to-emerald-400",
      mathSymbol: "∫",
      comingSoon: true
    },
    {
      title: "Повторение",
      description: "Практика навыков, которые нужно подтянуть - супер полезно!",
      icon: RefreshCw,
      link: "/ogemath-revision",
      gradient: "from-sage to-teal-400",
      mathSymbol: "π",
      comingSoon: false
    },
    {
      title: "Домашнее задание",
      description: "Персональные задания от ИИ помощника - MCQ и ФИПИ",
      icon: ClipboardList,
      link: "/homework",
      gradient: "from-purple-500 to-pink-500",
      mathSymbol: "∞",
      comingSoon: false
    }
  ];

  const mockExam = {
    title: "Пробный экзамен ОГЭ",
    description: "Полный экзамен с таймером (3ч 55мин) - 25 вопросов",
    icon: ClipboardList,
    link: "/ogemath-mock",
    gradient: "from-red-500 to-orange-500",
    mathSymbol: "Σ"
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)'
    }}>
      {/* Flying Math Symbols Background */}
      <FlyingMathBackground />

      <div className="relative z-10 pt-8 pb-16 container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/ogemath")}
              className="hover:bg-white/20 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-gold to-sage bg-clip-text text-transparent">
              Практика ОГЭ
            </h1>
            <p className="text-lg text-cool-gray font-body">
              Выберите тип практики для изучения математики
            </p>
          </div>

          {/* 2x2 Grid for Regular Practice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {questionTypes.map((type, index) => {
              const content = (
                  <Card 
                    className="h-full relative overflow-hidden border-0 transition-all duration-300 group"
                    style={{
                      background: type.comingSoon ? 'rgba(100, 100, 100, 0.2)' : 'rgba(248, 250, 252, 0.05)',
                      backdropFilter: 'blur(10px)',
                      transform: hoveredCard === index && !type.comingSoon
                        ? 'translateY(-8px) rotateX(5deg) rotateY(5deg)' 
                        : 'translateY(0) rotateX(0) rotateY(0)',
                      transformStyle: 'preserve-3d',
                      perspective: '1000px',
                      opacity: type.comingSoon ? 0.6 : 1
                    }}
                  >
                    {/* Gradient Border Effect */}
                    {!type.comingSoon && (
                      <div 
                        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r ${type.gradient} p-[2px] rounded-lg`}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    
                    {/* Floating Math Symbol */}
                    <div className={`absolute top-4 right-4 text-6xl font-mono transition-all duration-300 ${type.comingSoon ? 'text-gray-500/20' : 'text-white/10 group-hover:text-white/20 group-hover:rotate-12'}`}>
                      {type.mathSymbol}
                    </div>

                    {/* Coming Soon Badge */}
                    {type.comingSoon && (
                      <div className="absolute top-4 left-4 bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-semibold z-20">
                        Скоро
                      </div>
                    )}

                    <CardHeader className="relative z-10 pb-4">
                      <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 ${type.comingSoon ? 'bg-gray-600' : `bg-gradient-to-r ${type.gradient} group-hover:scale-110`}`}>
                        <type.icon className="w-10 h-10 text-white" />
                      </div>
                      <CardTitle className={`text-2xl font-display font-semibold text-center ${type.comingSoon ? 'text-gray-400' : 'text-white'}`}>
                        {type.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 text-center">
                      <p className={`font-body leading-relaxed ${type.comingSoon ? 'text-gray-500' : 'text-cool-gray'}`}>{type.description}</p>
                    </CardContent>

                    {/* Progress Ring SVG (decorative) */}
                    <svg className="absolute bottom-4 left-4 opacity-30 group-hover:opacity-50 transition-opacity" width="60" height="60">
                      <circle 
                        cx="30" 
                        cy="30" 
                        r="25" 
                        fill="none" 
                        stroke="url(#gradient)" 
                        strokeWidth="3"
                        strokeDasharray="157"
                        strokeDashoffset="40"
                        className="transition-all duration-500 group-hover:stroke-dashoffset-0"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </Card>
              );

              return type.comingSoon ? (
                <div 
                  key={type.title}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="cursor-not-allowed"
                >
                  {content}
                </div>
              ) : (
                <Link 
                  key={type.title}
                  to={type.link}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {content}
                </Link>
              );
            })}
          </div>

          {/* Mock Exam - Full Width, Different Design */}
          <Link 
            to={mockExam.link}
            onMouseEnter={() => setHoveredCard(4)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <Card 
              className="relative overflow-hidden border-0 transition-all duration-300 group"
              style={{
                background: 'rgba(248, 250, 252, 0.05)',
                backdropFilter: 'blur(10px)',
                transform: hoveredCard === 4 
                  ? 'translateY(-8px) scale(1.02)' 
                  : 'translateY(0) scale(1)',
                minHeight: '200px'
              }}
            >
              {/* Gradient Border Effect */}
              <div 
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r ${mockExam.gradient} p-[2px] rounded-lg`}
                style={{ zIndex: -1 }}
              />

              {/* Large Floating Math Symbol */}
              <div className="absolute top-1/2 right-8 -translate-y-1/2 text-9xl font-mono text-white/10 group-hover:text-white/20 transition-all duration-300 group-hover:scale-110">
                {mockExam.mathSymbol}
              </div>

              <div className="relative z-10 p-8 flex items-center gap-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl bg-gradient-to-r ${mockExam.gradient} group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                  <mockExam.icon className="w-12 h-12 text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-3xl font-display font-bold text-white mb-2">
                    {mockExam.title}
                  </h3>
                  <p className="text-cool-gray font-body text-lg leading-relaxed">
                    {mockExam.description}
                  </p>
                </div>

                {/* Animated Dashed Path */}
                <svg className="absolute bottom-0 left-0 right-0 h-1 opacity-50" preserveAspectRatio="none" viewBox="0 0 100 1">
                  <line 
                    x1="0" 
                    y1="0.5" 
                    x2="100" 
                    y2="0.5" 
                    stroke="url(#gradientLine)" 
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="group-hover:stroke-dashoffset-8 transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradientLine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Progress Ring SVG */}
                <svg className="absolute top-4 right-4 opacity-30 group-hover:opacity-60 transition-opacity" width="80" height="80">
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="35" 
                    fill="none" 
                    stroke="url(#gradientMock)" 
                    strokeWidth="4"
                    strokeDasharray="220"
                    strokeDashoffset="55"
                    className="transition-all duration-700 group-hover:stroke-dashoffset-0"
                  />
                  <defs>
                    <linearGradient id="gradientMock" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OgemathPractice;