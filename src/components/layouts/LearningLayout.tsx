import React, { useState, useEffect } from "react";
import FlyingMathBackground from "@/components/FlyingMathBackground";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { StreakDisplay } from "@/components/streak/StreakDisplay";
import { EnergyPointsHeaderAnimation } from "@/components/streak/EnergyPointsHeaderAnimation";
import { DailyTaskStory } from "@/components/DailyTaskStory";
import { ChevronDown } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { getCourseFromRoute } from "@/lib/courses.registry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



const LearningLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  
  // Detect current course from route
  const currentCourse = getCourseFromRoute(location.pathname);
  
  const [energyPointsAnimation, setEnergyPointsAnimation] = useState({ isVisible: false, points: 0 });

  // Set up global trigger for energy points animation
  useEffect(() => {
    (window as any).triggerEnergyPointsAnimation = (points: number) => {
      setEnergyPointsAnimation({ isVisible: true, points });
    };
    return () => {
      delete (window as any).triggerEnergyPointsAnimation;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen text-foreground relative"
      style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}
    >

      <FlyingMathBackground />

      <nav className="fixed top-0 w-full z-30 backdrop-blur-lg bg-[#1a1f36]/80 border-b border-yellow-500/20">
        <div className="w-full pr-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 pl-4">
            <img 
              src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/avatars/logo_yes.png" 
              alt="Logo"
              className="w-12 h-12 rounded-lg"
            />
            {currentCourse ? (
              <Link 
                to={currentCourse.homeRoute} 
                className="font-display text-xl font-semibold text-white hover:text-yellow-500 transition-colors"
              >
                {currentCourse.title}
              </Link>
            ) : (
              <span className="font-display text-xl font-semibold text-white">
                EgeChat
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 ml-auto">
            <DailyTaskStory />
            <div className="relative">
              <StreakDisplay />
              <EnergyPointsHeaderAnimation
                points={energyPointsAnimation.points}
                isVisible={energyPointsAnimation.isVisible}
                onAnimationComplete={() => setEnergyPointsAnimation({ isVisible: false, points: 0 })}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-yellow-500 text-[#1a1f36] px-4 py-2 rounded-lg hover:bg-yellow-400 font-medium flex items-center gap-2">
                  {profile?.full_name || 'Пользователь'}
                  <ChevronDown size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-lg border border-border z-50">
                <DropdownMenuItem asChild>
                  <Link to="/mydb3" className="cursor-pointer">
                    Курсы
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    Профиль
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <main className="pt-[68px] relative z-20">
        <Outlet />
      </main>
    </div>
  );
};

export default LearningLayout;
