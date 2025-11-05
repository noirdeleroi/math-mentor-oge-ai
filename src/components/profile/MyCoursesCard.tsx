import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const COURSES = [
  {
    name: "Математика ОГЭ",
    shortName: "Математика ОГЭ",
    course_id: 1,
    route: "/ogemath"
  },
  {
    name: "Математика ЕГЭ (База)",
    shortName: "Математика ЕГЭ (База)",
    course_id: 2,
    route: "/egemathbasic"
  },
  {
    name: "Математика ЕГЭ (Профиль)",
    shortName: "Математика ЕГЭ (Профиль)",
    course_id: 3,
    route: "/egemathprof"
  },
  {
    name: "Проверка сочинений по ЕГЭ и ОГЭ",
    shortName: "Проверка сочинений",
    course_id: 4,
    route: "/egeruses2"
  }
];

export const MyCoursesCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userCourses, setUserCourses] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('courses')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching courses:', error);
          return;
        }
        
        setUserCourses(data?.courses || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserCourses();
  }, [user]);

  const enrolledCourses = COURSES.filter(course => 
    userCourses.includes(course.course_id)
  );

  return (
    <Card className="p-6 bg-white shadow-md rounded-xl border-0">
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-gray-800">Мои курсы</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : enrolledCourses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Вы еще не выбрали курсы. Пожалуйста, перейдите на страницу Курсы и выберите свой курс.
          </p>
          <Button
            onClick={() => navigate('/mydb3')}
            className="bg-black text-white hover:bg-gradient-to-r hover:from-yellow-500 hover:to-emerald-500"
          >
            Перейти к курсам
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {enrolledCourses.map((course) => (
            <Button
              key={course.course_id}
              onClick={() => navigate(course.route)}
              className="w-full bg-black text-white hover:bg-gradient-to-r hover:from-yellow-500 hover:to-emerald-500 hover:text-black justify-start transition-all duration-300"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              {isMobile ? course.shortName : course.name}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
};