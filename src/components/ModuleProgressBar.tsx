import React from "react";
import { Crown, Zap, Star, Sparkles } from "lucide-react";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ModuleProgressBarProps {
  moduleSlug: string;
  orderedContent: Array<{ 
    type: 'topic' | 'quiz'; 
    topicIndex?: number; 
    quizIndex?: number; 
    isFinalTest?: boolean 
  }>;
  topics: Array<{ id: string; exercises: number }>;
  quizzes: Array<{ id: string; name?: string }>;
  getExerciseData?: (topicId: string, exerciseIndex: number) => { title: string; skills: number[] };
  onExerciseClick: (topicId: string, exerciseIndex: number) => void;
  onQuizClick: (quizId: string) => void;
  onExamClick: () => void;
}

export const ModuleProgressBar: React.FC<ModuleProgressBarProps> = ({
  moduleSlug,
  orderedContent,
  topics,
  quizzes,
  getExerciseData,
  onExerciseClick,
  onQuizClick,
  onExamClick
}) => {
  const { getProgressStatus } = useModuleProgress();

  // Build array of all items with their types and IDs
  const progressItems: Array<{
    type: 'exercise' | 'topic_test' | 'mid_test' | 'exam';
    itemId: string;
    status: string;
    topicId?: string;
    exerciseIndex?: number;
    quizId?: string;
    title?: string;
  }> = [];

  orderedContent.forEach((content) => {
    if (content.type === 'topic' && content.topicIndex !== undefined) {
      const topic = topics[content.topicIndex];
      // Add all exercises for this topic
      for (let i = 0; i < topic.exercises; i++) {
        const exerciseData = getExerciseData?.(topic.id, i);
        const itemId = `${moduleSlug}-${topic.id}-ex${i}`;
        const status = getProgressStatus(itemId, 'exercise');
        progressItems.push({
          type: 'exercise',
          itemId,
          status,
          topicId: topic.id,
          exerciseIndex: i,
          title: exerciseData?.title || `Exercise ${i + 1}`
        });
      }
    } else if (content.type === 'quiz') {
      if (content.isFinalTest) {
        const itemId = `${moduleSlug}-module-exam`;
        const status = getProgressStatus(itemId, 'exam');
        progressItems.push({
          type: 'exam',
          itemId,
          status,
          title: 'Module Exam'
        });
      } else if (content.quizIndex !== undefined) {
        const quiz = quizzes[content.quizIndex];
        const itemId = `${moduleSlug}-${quiz.id}`;
        const status = getProgressStatus(itemId, 'mid_test');
        progressItems.push({
          type: 'mid_test',
          itemId,
          status,
          quizId: quiz.id,
          title: quiz.name || `Test ${content.quizIndex + 1}`
        });
      }
    }
  });

  const renderExerciseBox = (status: string) => {
    console.log('Exercise status:', status);
    switch (status) {
      case 'mastered':
        return (
          <div className="relative w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
            <Crown className="h-4 w-4 text-white" />
          </div>
        );
      case 'proficient':
        return (
          <div className="w-8 h-8 bg-gradient-to-t from-orange-500 from-33% to-gray-200 to-33% rounded" />
        );
      case 'familiar':
        return (
          <div className="w-8 h-8 rounded border border-orange-500 bg-[linear-gradient(to_top,theme(colors.orange.500)_20%,white_20%)]" />
        );
      case 'attempted':
        return (
          <div className="w-8 h-8 border-2 border-orange-400 rounded bg-white" />
        );
      default:
        return (
          <div className="w-8 h-8 border-2 border-gray-300 rounded bg-white" />
        );
    }
  };

  const renderMidTestIcon = (status: string) => {
    if (status === 'completed') {
      return (
        <div className="relative mx-1">
          <Zap className="h-6 w-6 text-blue-600 fill-blue-600" style={{
            filter: 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.6))'
          }} />
        </div>
      );
    } else if (status === 'attempted') {
      return <Zap className="h-6 w-6 text-blue-400 mx-1" />;
    }
    return <Zap className="h-6 w-6 text-gray-400 mx-1" />;
  };

  const renderTopicTestIcon = (status: string) => {
    if (status === 'completed') {
      return (
        <div className="relative mx-1">
          <Sparkles className="h-6 w-6 text-amber-500" style={{
            filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))'
          }} />
        </div>
      );
    } else if (status === 'attempted') {
      return <Sparkles className="h-6 w-6 text-amber-400 mx-1" />;
    }
    return <Sparkles className="h-6 w-6 text-gray-400 mx-1" />;
  };

  const renderExamIcon = (status: string) => {
    if (status === 'completed') {
      return <Star className="h-6 w-6 text-yellow-500 fill-yellow-500 mx-1" />;
    } else if (status === 'attempted') {
      return <Star className="h-6 w-6 text-yellow-300 mx-1" />;
    }
    return <Star className="h-6 w-6 text-gray-400 mx-1" />;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {progressItems.map((item, index) => {
          if (item.type === 'exercise' && item.topicId && item.exerciseIndex !== undefined) {
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => onExerciseClick(item.topicId!, item.exerciseIndex!)}
                    className="hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {renderExerciseBox(item.status)}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            );
          } else if (item.type === 'mid_test' && item.quizId) {
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => onQuizClick(item.quizId!)}
                    className="hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {renderMidTestIcon(item.status)}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            );
          } else if (item.type === 'topic_test') {
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className="mx-1">
                    {renderTopicTestIcon(item.status)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            );
          } else if (item.type === 'exam') {
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={onExamClick}
                    className="hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {renderExamIcon(item.status)}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            );
          }
          return null;
        })}
      </div>
    </TooltipProvider>
  );
};
