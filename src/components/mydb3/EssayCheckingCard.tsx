import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Bot, Zap, CheckCircle, Shield, Clock, Award } from
'lucide-react';

interface EssayCheckingCardProps {
  onStart: (courseId: string) => void;
  courseId?: string;
}

export const EssayCheckingCard: React.FC<EssayCheckingCardProps> = ({
  onStart,
  courseId = 'essay-checking'
}) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    setMousePosition({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  const handleStartClick = () => {
    onStart(courseId);
  };

  return (
    <div className="relative">
      <style>{`
        .essay-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          background-size: 400% 400%;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .neon-glow {
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }

        .neon-glow:hover {
          box-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
        }

        .floating {
          animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .essay-icon {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }

        .ai-badge {
          background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
        }

        .speed-badge {
          background: linear-gradient(45deg, #43e97b 0%, #38f9d7 100%);
        }

        .criteria-badge {
          background: linear-gradient(45deg, #fa709a 0%, #fee140 100%);
        }

        .progress-rainbow {
          background: linear-gradient(90deg, #ff6b6b, #feca57,
#48dbfb, #ff9ff3);
          background-size: 400% 400%;
          animation: progressShift 2s ease-in-out infinite;
        }

        @keyframes progressShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.02);
        }

        .start-button {
          background: linear-gradient(45deg, #667eea, #764ba2,
#f093fb, #f5576c);
          background-size: 400% 400%;
          animation: buttonGradient 3s ease infinite;
          position: relative;
          overflow: hidden;
        }

        .start-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent,
rgba(255,255,255,0.4), transparent);
          transition: left 0.5s;
        }

        .start-button:hover::before {
          left: 100%;
        }

        @keyframes buttonGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .text-gradient {
          background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div
        className="essay-gradient rounded-3xl p-1 neon-glow
transition-all duration-300"
        style={{
          transform: isHovered ? `perspective(1000px)
rotateX(${mousePosition.x}deg) rotateY(${mousePosition.y}deg)
translateY(-8px)` : 'translateY(0px)',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="glass-effect rounded-3xl p-6 h-full">
          {/* Header Section */}
          <div className="text-center mb-6">
            <div className="essay-icon w-16 h-16 rounded-2xl flex
items-center justify-center mx-auto mb-4 floating">
              <svg className="w-8 h-8 text-white" fill="none"
stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Проверка сочинений
            </h1>
            <div className="text-gradient text-lg font-semibold">
              ЕГЭ И ОГЭ
            </div>
          </div>

          {/* AI Features Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="feature-card rounded-xl p-3 text-center">
              <div className="ai-badge w-8 h-8 rounded-full flex
items-center justify-center mx-auto mb-2">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="text-white text-xs font-medium">AI</div>
            </div>

            <div className="feature-card rounded-xl p-3 text-center">
              <div className="speed-badge w-8 h-8 rounded-full flex
items-center justify-center mx-auto mb-2">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="text-white text-xs font-medium">50 сек</div>
            </div>

            <div className="feature-card rounded-xl p-3 text-center">
              <div className="criteria-badge w-8 h-8 rounded-full flex
items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="text-white text-xs font-medium">2026</div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <p className="text-white text-sm leading-relaxed">
              Проверьте сочинение ЕГЭ или ОГЭ с помощью искусственного
интеллекта за 50 секунд. Находим грамматические, речевые и логические
ошибки по всем критериям 2026 года.
            </p>
          </div>

          {/* Progress Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80 text-sm">Готовность к
проверке</span>
              <span className="text-white font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="progress-rainbow h-3 rounded-full
transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Start Button */}
          <button
            className="start-button w-full py-4 rounded-2xl text-white
font-bold text-lg shadow-lg transform transition-all duration-300
hover:scale-105"
            onClick={handleStartClick}
          >
            <Play className="inline-block w-5 h-5 mr-2" />
            Начать проверку
          </button>

          {/* Additional Info */}
          <div className="mt-4 text-center">
            <div className="flex justify-center space-x-4
text-white/70 text-xs">
              <span className="flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                Безопасно
              </span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                24/7
              </span>
              <span className="flex items-center">
                <Award className="w-3 h-3 mr-1" />
                Сертифицировано
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
