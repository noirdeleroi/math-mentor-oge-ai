
import { useMasterySystem } from "@/hooks/useMasterySystem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Star } from "lucide-react";

interface UnitProgressSummaryProps {
  courseStructure: any;
  onUnitSelect?: (unitNumber: number) => void;
  onExerciseClick?: (skillIds: number[], subunit?: any) => void;
  onQuizClick?: (unitNumber: number, subunit: any) => void;
  onUnitTestClick?: (unitNumber: number, unit: any) => void;
  mathSkills: Array<{ skill: string; id: number }>;
}

const UnitProgressSummary = ({ courseStructure, onUnitSelect, onExerciseClick, onQuizClick, onUnitTestClick, mathSkills }: UnitProgressSummaryProps) => {
  const { calculateUnitProgress, getUserMastery } = useMasterySystem();

  // Simulate 75% progress for demo user
  const simulateUserProgress = (unitNumber: number, skillId?: number): number => {
    const userEmail = "jjaceac@gmail.com"; // Demo user
    
    if (unitNumber <= 2) return 95; // Early units nearly complete
    if (unitNumber <= 4) return 85; // Mid-early units mostly complete
    if (unitNumber <= 6) return 75; // Middle units good progress
    if (unitNumber <= 8) return 60; // Mid-late units some progress
    if (unitNumber <= 10) return 40; // Later units partial progress
    return 20; // Final units minimal progress
  };

  // Create skill name mapping
  const getSkillName = (skillId: number): string => {
    const skill = mathSkills.find(s => s.id === skillId);
    return skill ? skill.skill : `Exercise ${skillId}`;
  };

  // Handle quiz click
  const handleQuizClick = (unitNumber: number, subunit: any) => {
    if (onQuizClick) {
      onQuizClick(unitNumber, subunit);
    }
  };

  // Handle unit test click  
  const handleUnitTestClick = (unitNumber: number, unit: any) => {
    if (onUnitTestClick) {
      onUnitTestClick(unitNumber, unit);
    }
  };

  // Calculate overall course mastery with simulated data
  const calculateOverallMastery = (): number => {
    return 75; // Simulated 75% completion
  };

  // Get completion status based on progress percentage
  const getCompletionStatus = (progress: number): 'not_started' | 'attempted' | 'partial' | 'good' | 'mastered' => {
    if (progress >= 90) return 'mastered';
    if (progress >= 70) return 'good';
    if (progress >= 40) return 'partial';
    if (progress >= 20) return 'attempted';
    return 'not_started';
  };

  // Get box styling based on completion status
  const getBoxStyling = (status: string) => {
    const baseClasses = "w-6 h-6 border-2 rounded-sm relative flex items-center justify-center transition-colors";
    
    switch (status) {
      case 'not_started':
        return `${baseClasses} bg-blue-100 border-blue-300`;
      case 'attempted':
        return `${baseClasses} bg-red-100 border-red-300`;
      case 'partial':
        return `${baseClasses} bg-orange-300 border-orange-400`;
      case 'good':
        return `${baseClasses} bg-blue-400 border-blue-500`;
      case 'mastered':
        return `${baseClasses} bg-blue-600 border-blue-700`;
      default:
        return `${baseClasses} bg-gray-100 border-gray-300`;
    }
  };

  const renderProgressBox = (
    status: string, 
    isQuiz: boolean = false, 
    isUnitTest: boolean = false,
    exerciseName?: string,
    onClick?: () => void
  ) => {
    const statusText = status === 'not_started' ? 'Не начато' : 
                      status === 'attempted' ? 'В процессе' : 
                      status === 'partial' ? 'Знаком' : 
                      status === 'good' ? 'Владею' : 'Освоено';
    
    const box = (
      <div 
        className={`${getBoxStyling(status)} cursor-pointer hover:shadow-md transition-all`}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {isQuiz && <Zap className="w-3 h-3 text-yellow-500" />}
        {isUnitTest && <Star className="w-3 h-3 text-yellow-500" />}
      </div>
    );

    if (exerciseName) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {box}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="p-2">
              <div className="font-semibold text-sm mb-1">
                Упражнение: {exerciseName}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {statusText}
              </div>
              <img 
                src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=200&h=120&fit=crop" 
                alt="Предпросмотр упражнения" 
                className="w-40 h-24 object-cover rounded"
              />
              <div className="text-xs mt-1 text-muted-foreground">
                Нажмите, чтобы начать упражнение
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return box;
  };

  const overallMastery = calculateOverallMastery();

  return (
    <TooltipProvider>
      <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          ОГЭ
        </h1>
        <div className="text-xl text-gray-600 mb-4">
          Освоение курса: <span className="font-semibold">{Math.round(overallMastery)}%</span>
        </div>
      </div>

      {/* Legend */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              {renderProgressBox('mastered')}
              <span>Освоено</span>
            </div>
            <div className="flex items-center gap-2">
              {renderProgressBox('good')}
              <span>Владею</span>
            </div>
            <div className="flex items-center gap-2">
              {renderProgressBox('partial')}
              <span>Знаком</span>
            </div>
            <div className="flex items-center gap-2">
              {renderProgressBox('attempted')}
              <span>В процессе</span>
            </div>
            <div className="flex items-center gap-2">
              {renderProgressBox('not_started')}
              <span>Не начато</span>
            </div>
            <div className="flex items-center gap-2">
              {renderProgressBox('mastered', true)}
              <span>Викторина</span>
            </div>
            <div className="flex items-center gap-2">
              {renderProgressBox('mastered', false, true)}
              <span>Тест по модулю</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Progress Strips */}
      <div className="space-y-3">
        {Object.entries(courseStructure).map(([unitNum, unit]: [string, any]) => {
          const unitNumber = parseInt(unitNum);
          const simulatedUnitProgress = simulateUserProgress(unitNumber);
          
          return (
            <div 
              key={unitNum} 
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onUnitSelect?.(unitNumber)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-16">
                  <span className="text-sm font-medium text-gray-700">Модуль {unitNum}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {/* Render exercises for each subunit */}
                    {unit.subunits.map((subunit: any, subIndex: number) => {
                      const subunitProgress = simulateUserProgress(unitNumber);
                      const status = getCompletionStatus(subunitProgress);
                      
                      return (
                        <div key={subunit.id} className="flex items-center gap-1 flex-shrink-0">
                           {/* Regular exercises - show actual skills */}
                           {subunit.skills.map((skillId: number, skillIndex: number) => {
                             // Create realistic variation within subunit
                             const variation = (skillIndex * 13 + subIndex * 7) % 30 - 15; // -15 to +15
                             const skillProgress = Math.max(0, Math.min(100, subunitProgress + variation));
                             const skillStatus = getCompletionStatus(skillProgress);
                             const skillName = getSkillName(skillId);
                             
                             return (
                               <div key={skillId} className="flex-shrink-0">
                                 {renderProgressBox(
                                   skillStatus, 
                                   false, 
                                   false,
                                   skillName,
                                   () => onExerciseClick?.([skillId], subunit)
                                 )}
                               </div>
                             );
                           })}
                          
                           {/* Quiz after some exercises */}
                           {subIndex % 2 === 1 && (
                             <div className="flex-shrink-0 ml-1">
                               {renderProgressBox(
                                 status, 
                                 true, 
                                 false, 
                                 `Викторина: ${subunit.name}`,
                                 () => handleQuizClick(unitNumber, subunit)
                               )}
                             </div>
                           )}
                        </div>
                      );
                    })}
                    
                     {/* Unit test at the end */}
                     <div className="flex-shrink-0 ml-2">
                       {renderProgressBox(
                         getCompletionStatus(simulatedUnitProgress), 
                         false, 
                         true, 
                         `Тест по модулю ${unitNum}`,
                         () => handleUnitTestClick(unitNumber, unit)
                       )}
                     </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right min-w-[60px]">
                  <div className="text-sm font-medium text-gray-700">
                    {Math.round(simulatedUnitProgress)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {unit.subunits.length} тем
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Challenge Section */}
      <Card className="mt-8 border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Star className="w-5 h-5" />
            ИТОГОВЫЙ ВЫЗОВ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 mb-4">
            Проверьте свои знания навыков этого курса.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            Начать итоговый вызов
          </button>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};

export default UnitProgressSummary;
