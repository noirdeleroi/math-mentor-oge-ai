import React from 'react';
import { Crown, Zap, Star, Sparkles } from 'lucide-react';

interface ProgressButtonProps {
  type: 'exercise' | 'test' | 'topic_test' | 'mid_test' | 'exam' | 'skill_quiz';
  status: 'not_started' | 'attempted' | 'familiar' | 'proficient' | 'mastered' | 'completed';
  title: string;
  questionCount: number;
  onClick: () => void;
  isAdvanced?: boolean;
}

export const ProgressButton: React.FC<ProgressButtonProps> = ({
  type,
  status,
  title,
  questionCount,
  onClick,
  isAdvanced = false
}) => {
  const getButtonStyle = () => {
    if (type === 'test') {
      return status === 'completed' 
        ? 'text-blue-400' 
        : 'text-gray-400';
    }
    
    if (type === 'exam') {
      return status === 'completed' 
        ? 'text-yellow-400' 
        : 'text-gray-400';
    }

    // Exercise styles
    switch (status) {
      case 'mastered':
        return 'w-8 h-8 bg-purple-600 rounded flex items-center justify-center';
      case 'proficient':
        return 'w-8 h-8 bg-purple-500 rounded';
      case 'familiar':
        return 'w-8 h-8 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded';
      case 'attempted':
        return 'w-8 h-8 border-2 border-orange-400 rounded bg-white';
      default:
        return 'w-8 h-8 border-2 border-gray-300 rounded bg-white hover:border-orange-400';
    }
  };

  const getTooltipText = () => {
    const statusText = {
      mastered: 'Освоено',
      proficient: 'Владею', 
      familiar: 'Знаком',
      attempted: 'Попытался',
      not_started: 'Не начато'
    };

    let baseText = `${title} • ${questionCount} вопрос${questionCount > 1 ? (questionCount < 5 ? 'а' : 'ов') : ''}`;
    
    if (isAdvanced) {
      baseText += ' • Не в программе ОГЭ';
    }
    
    if (type === 'exercise' && status !== 'not_started') {
      baseText += ` • ${statusText[status as keyof typeof statusText]}`;
    }
    
    return baseText;
  };

  if (type === 'test') {
    return (
      <button 
        className="transition-all hover:scale-110 hover:shadow-md relative group"
        onClick={onClick}
      >
        <Zap className={`h-6 w-6 mx-1 ${getButtonStyle()}`} />
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {getTooltipText()}
        </div>
      </button>
    );
  }

  if (type === 'topic_test' || type === 'skill_quiz') {
    return (
      <button 
        className="transition-all hover:scale-110 hover:shadow-md relative group"
        onClick={onClick}
      >
        <Sparkles className={`h-6 w-6 mx-1 ${type === 'topic_test' ? 'text-amber-500' : 'text-emerald-500'}` } />
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {getTooltipText()}
        </div>
      </button>
    );
  }

  if (type === 'mid_test') {
    return (
      <button 
        className="transition-all hover:scale-110 hover:shadow-md relative group"
        onClick={onClick}
      >
        <Zap className={`h-6 w-6 mx-1 text-blue-500`} />
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {getTooltipText()}
        </div>
      </button>
    );
  }

  if (type === 'exam') {
    return (
      <button 
        className="transition-all hover:scale-110 hover:shadow-md relative group"
        onClick={onClick}
      >
        <Star className={`h-6 w-6 mx-1 ${getButtonStyle()}`} />
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {getTooltipText()}
        </div>
      </button>
    );
  }

  return (
    <button 
      className={`${getButtonStyle()} transition-all hover:scale-110 hover:shadow-md relative group`}
      onClick={onClick}
    >
      {status === 'mastered' && <Crown className="h-4 w-4 text-white" />}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {getTooltipText()}
      </div>
    </button>
  );
};