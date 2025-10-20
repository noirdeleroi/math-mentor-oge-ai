import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { COURSES, CourseId } from '@/lib/courses.registry';

interface CourseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCourses?: (courseIds: CourseId[]) => void;
  onDeleteCourses?: (courseIds: CourseId[]) => void;
  enrolledCourseIds: CourseId[];
  mode?: 'add' | 'delete';
}

export const CourseSelectionModal: React.FC<CourseSelectionModalProps> = ({
  isOpen,
  onClose,
  onAddCourses,
  onDeleteCourses,
  enrolledCourseIds,
  mode = 'add'
}) => {
  const [selectedCourses, setSelectedCourses] = useState<CourseId[]>([]);

  const availableCourses = mode === 'delete' 
    ? Object.values(COURSES).filter(course => enrolledCourseIds.includes(course.id))
    : Object.values(COURSES).filter(course => !enrolledCourseIds.includes(course.id));

  const handleCourseToggle = (courseId: CourseId, checked: boolean) => {
    setSelectedCourses(prev => {
      if (checked) {
        return prev.includes(courseId) ? prev : [...prev, courseId];
      } else {
        return prev.filter(id => id !== courseId);
      }
    });
  };

  const handleContinue = () => {
    const uniqueSelected = Array.from(new Set(selectedCourses));
    if (uniqueSelected.length > 0) {
      if (mode === 'delete' && onDeleteCourses) {
        onDeleteCourses(uniqueSelected);
      } else if (mode === 'add' && onAddCourses) {
        onAddCourses(uniqueSelected);
      }
      setSelectedCourses([]);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedCourses([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 bg-white/95 backdrop-blur border border-white/20 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-emerald-500/20 border-b border-white/20 p-6 rounded-t-2xl">
          <div>
            <DialogTitle className="text-2xl font-bold text-[#1a1f36] mb-2">
              {mode === 'delete' ? '🗑️ Удалить курсы' : '📚 Выберите курсы'}
            </DialogTitle>
            <p className="text-gray-700">
              {mode === 'delete' 
                ? 'Выберите курсы для удаления. Все данные о прогрессе будут потеряны.'
                : 'Выберите курсы, и мы подберём правильные уроки для вас.'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(80vh-200px)]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#1a1f36]">Математика</h3>
              <span className="text-sm font-medium text-gray-600 bg-yellow-100 px-3 py-1 rounded-full">
                Доступно: {availableCourses.length}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => handleCourseToggle(course.id, !selectedCourses.includes(course.id))}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedCourses.includes(course.id)
                      ? 'bg-gradient-to-br from-yellow-50 to-emerald-50 border-yellow-500 shadow-md'
                      : 'bg-white/50 border-white/40 hover:bg-white/70 hover:border-white/60'
                  }`}
                >
                  <Checkbox
                    id={course.id}
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={(checked) => 
                      handleCourseToggle(course.id, checked as boolean)
                    }
                    className="mt-1 w-5 h-5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={course.id}
                      className="text-base font-semibold text-[#1a1f36] cursor-pointer block mb-2"
                    >
                      {course.title}
                    </label>
                    <Badge 
                      variant="secondary" 
                      className="bg-gradient-to-r from-yellow-100 to-emerald-100 text-[#1a1f36] font-medium px-3 py-1 text-xs"
                    >
                      {course.tag}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {availableCourses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  {mode === 'delete' ? 'У вас нет курсов для удаления' : 'Все курсы уже добавлены'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/20 bg-white/50">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="border-gray-300 text-[#1a1f36] hover:bg-gray-100"
          >
            Отмена
          </Button>
          <div className="flex items-center gap-4">
            {selectedCourses.length > 0 && (
              <span className="text-sm font-medium text-gray-700">
                Выбрано: {selectedCourses.length}
              </span>
            )}
            <Button
              onClick={handleContinue}
              disabled={selectedCourses.length === 0}
              className={`min-w-[220px] font-semibold transition-all ${
                mode === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] shadow-md'
              }`}
            >
              {mode === 'delete' 
                ? `Удалить (${selectedCourses.length})`
                : `Продолжить (${selectedCourses.length})`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

