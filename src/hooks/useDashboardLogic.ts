import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CourseId, courseIdToNumber } from '@/lib/courses.registry';

interface Course {
  id: string;
  name: string;
}

const availableCoursesData: Course[] = [
  { id: 'oge-math', name: 'ОГЭ математика' },
  { id: 'ege-basic', name: 'ЕГЭ базовая математика' },
  { id: 'ege-advanced', name: 'ЕГЭ профильная математика' },
  { id: 'essay-checking', name: 'Проверка сочинений по ЕГЭ и ОГЭ' },
];

export const useDashboardLogic = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [showEgeBasicGoal, setShowEgeBasicGoal] = useState(false);
  const [showEgeAdvancedGoal, setShowEgeAdvancedGoal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [egeBasicGoalText, setEgeBasicGoalText] = useState('');
  const [egeAdvancedGoalText, setEgeAdvancedGoalText] = useState('');
  const [telegramCode, setTelegramCode] = useState<number | null>(null);
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null);
  const [showTelegramButton, setShowTelegramButton] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserCourses();
      loadUserGoals();
      loadTelegramCode();
    }
  }, [user]);

  const loadUserCourses = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('courses')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user courses:', error);
        return;
      }

      const userCourseNumbers = profile?.courses || [];
      const userCourses: Course[] = [];
      const available: Course[] = [];

      availableCoursesData.forEach(course => {
        const courseNumber = courseIdToNumber[course.id as CourseId];
        if (userCourseNumbers.includes(courseNumber)) {
          userCourses.push(course);
        } else {
          available.push(course);
        }
      });

      setMyCourses(userCourses);
      setAvailableCourses(available);
      
      // Show goal input boxes for existing courses
      userCourses.forEach(course => {
        if (course.id === 'oge-math') {
          setShowGoalInput(true);
        } else if (course.id === 'ege-basic') {
          setShowEgeBasicGoal(true);
        } else if (course.id === 'ege-advanced') {
          setShowEgeAdvancedGoal(true);
        }
      });
    } catch (error) {
      console.error('Error loading user courses:', error);
      setAvailableCourses(availableCoursesData);
    }
  };

  const loadUserGoals = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('course_1_goal, course_2_goal, course_3_goal')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user goals:', error);
        return;
      }

      if (profile) {
        setGoalText(profile.course_1_goal || '');
        setEgeBasicGoalText(profile.course_2_goal || '');
        setEgeAdvancedGoalText(profile.course_3_goal || '');
      }
    } catch (error) {
      console.error('Error loading user goals:', error);
    }
  };

  const loadTelegramCode = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('telegram_code, telegram_user_id')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading telegram data:', error);
        return;
      }

      if (profile?.telegram_code) {
        setTelegramCode(profile.telegram_code);
      }
      if (profile?.telegram_user_id) {
        setTelegramUserId(profile.telegram_user_id);
      }
    } catch (error) {
      console.error('Error loading telegram data:', error);
    }
  };

  const updateUserCourses = async (courseNumbers: number[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ courses: courseNumbers })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating user courses:', error);
      }
    } catch (error) {
      console.error('Error updating user courses:', error);
    }
  };

  const handleAddCourse = async (course: Course) => {
    // First add the course with existing logic
    await addCourseInternal(course);
    
    // Then show goal input for specific courses
    if (course.id === 'oge-math') {
      setShowGoalInput(true);
    } else if (course.id === 'ege-basic') {
      setShowEgeBasicGoal(true);
    } else if (course.id === 'ege-advanced') {
      setShowEgeAdvancedGoal(true);
    }

    // Show telegram button if no telegram code exists
    if (!telegramCode) {
      setShowTelegramButton(true);
    }
  };

  const addCourseInternal = async (course: Course) => {
    const courseNumber = courseIdToNumber[course.id as CourseId];
    
    // Update database
    const currentCourseNumbers = myCourses.map(c => courseIdToNumber[c.id as CourseId]);
    const newCourseNumbers = [...currentCourseNumbers, courseNumber];
    await updateUserCourses(newCourseNumbers);

    // Initialize priors for the course
    try {
      const { error } = await supabase.functions.invoke('initialize-priors', {
        body: { 
          user_id: user?.id,
          course_id: courseNumber.toString()
        }
      });

      if (error) {
        console.error('Error initializing priors:', error);
      } else {
        console.log('Priors initialized successfully for course:', course.name);
      }
    } catch (error) {
      console.error('Error calling initialize-priors function:', error);
    }

    // Remove from available courses
    setAvailableCourses(prev => prev.filter(c => c.id !== course.id));
    
    // Add to my courses with delay for animation
    setTimeout(() => {
      setMyCourses(prev => [...prev, course]);
    }, 300);
  };

  const handleStartCourse = (courseId: string) => {
    console.log('Starting course:', courseId);
    
    // Navigate to the appropriate course page
    switch (courseId) {
      case 'oge-math':
        navigate('/ogemath');
        break;
      case 'ege-basic':
        navigate('/egemathbasic');
        break;
      case 'ege-advanced':
        navigate('/egemathprof');
        break;
      case 'essay-checking':
        navigate('/egeruses2');
        break;
      default:
        console.warn('Unknown course ID:', courseId);
    }
  };

  const handleDeleteMode = async () => {
    if (isDeleteMode) {
      // Execute deletion
      if (selectedCourses.length > 0) {
        const coursesToRemove = myCourses.filter(course => selectedCourses.includes(course.id));
        
        // Delete mastery data for each removed course
        for (const course of coursesToRemove) {
          const courseNumber = courseIdToNumber[course.id as CourseId];
          try {
            const { error } = await supabase.functions.invoke('delete-mastery-data', {
              body: { 
                user_id: user?.id,
                course_id: courseNumber.toString()
              }
            });

            if (error) {
              console.error('Error deleting mastery data for course:', course.name, error);
            } else {
              console.log('Mastery data deleted successfully for course:', course.name);
            }
          } catch (error) {
            console.error('Error calling delete-mastery-data function:', error);
          }
        }
        
        // Hide goal input boxes and clear goal data from database for deleted courses
        const goalUpdates: Record<string, string | null> = {};
        coursesToRemove.forEach(course => {
          if (course.id === 'oge-math') {
            setShowGoalInput(false);
            setGoalText('');
            goalUpdates.course_1_goal = null;
          } else if (course.id === 'ege-basic') {
            setShowEgeBasicGoal(false);
            setEgeBasicGoalText('');
            goalUpdates.course_2_goal = null;
          } else if (course.id === 'ege-advanced') {
            setShowEgeAdvancedGoal(false);
            setEgeAdvancedGoalText('');
            goalUpdates.course_3_goal = null;
          }
        });

        // Update database - remove selected courses and clear goals
        const remainingCourses = myCourses.filter(course => !selectedCourses.includes(course.id));
        const remainingCourseNumbers = remainingCourses.map(c => courseIdToNumber[c.id as CourseId]);
        
        const updateData: any = { courses: remainingCourseNumbers };
        Object.assign(updateData, goalUpdates);
        
        try {
          const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', user?.id);

          if (error) {
            console.error('Error updating user courses and goals:', error);
          }
        } catch (error) {
          console.error('Error updating user courses and goals:', error);
        }
        
        // Reload courses from database to ensure consistency
        await loadUserCourses();
      }
      
      setIsDeleteMode(false);
      setSelectedCourses([]);
    } else {
      setIsDeleteMode(true);
      setSelectedCourses([]);
    }
  };

  const handleCourseSelection = (courseId: string, checked: boolean) => {
    if (checked) {
      setSelectedCourses(prev => [...prev, courseId]);
    } else {
      setSelectedCourses(prev => prev.filter(id => id !== courseId));
    }
  };

  const generateTelegramCode = async () => {
    if (!user) return;

    // Generate random 6-digit number
    const randomCode = Math.floor(100000 + Math.random() * 900000);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_code: randomCode })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving telegram code:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать Telegram код",
          variant: "destructive",
        });
        return;
      }

      setTelegramCode(randomCode);
      setShowTelegramButton(false);
      toast({
        title: "Telegram код создан",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error creating telegram code:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать Telegram код",
        variant: "destructive",
      });
    }
  };

  return {
    // State
    availableCourses,
    myCourses,
    isDeleteMode,
    selectedCourses,
    showGoalInput,
    showEgeBasicGoal,
    showEgeAdvancedGoal,
    goalText,
    egeBasicGoalText,
    egeAdvancedGoalText,
    telegramCode,
    telegramUserId,
    showTelegramButton,
    
    // State setters
    setGoalText,
    setEgeBasicGoalText,
    setEgeAdvancedGoalText,
    
    // Handlers
    handleAddCourse,
    handleStartCourse,
    handleDeleteMode,
    handleCourseSelection,
    generateTelegramCode,
    loadUserCourses,
  };
};