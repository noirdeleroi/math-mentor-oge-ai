
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, User, BookOpen, ScanLine, Play, ClipboardList, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./auth/AuthModal";
import { StreakDisplay } from "./streak/StreakDisplay";
import { EnergyPointsHeaderAnimation } from "./streak/EnergyPointsHeaderAnimation";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [energyPointsAnimation, setEnergyPointsAnimation] = useState({ isVisible: false, points: 0 });
  const { user, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Set up global trigger for energy points animation
  React.useEffect(() => {
    (window as any).triggerEnergyPointsAnimation = (points: number) => {
      setEnergyPointsAnimation({ isVisible: true, points });
    };
    return () => {
      delete (window as any).triggerEnergyPointsAnimation;
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-sm z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Ё</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Ёжик</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user && (
              <Link 
                to="/mydb3" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/mydb3') ? 'text-primary' : 'text-gray-600 hover:text-primary'
                }`}
              >
                Главная
              </Link>
            )}
            
            <Link 
              to="/textbook2" 
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive('/textbook2') ? 'text-primary' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Учебник</span>
            </Link>

            <Link 
              to="/new-textbook" 
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive('/new-textbook') ? 'text-primary' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Новый Учебник</span>
            </Link>
            
            <Link 
              to="/videos" 
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive('/videos') ? 'text-primary' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Видео</span>
            </Link>

            <Link 
              to="/questions" 
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive('/questions') ? 'text-primary' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Вопросы</span>
            </Link>

            <Link 
              to="/egeruses2" 
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive('/egeruses2') ? 'text-primary' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <span>Сочинение</span>
            </Link>

            <Link 
              to="/daily-practice" 
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive('/daily-practice') ? 'text-primary' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Ежедневная практика</span>
            </Link>
            
            <Link 
              to="/book-test" 
              className={`text-sm font-medium transition-colors ${
                isActive('/book-test') ? 'text-primary' : 'text-gray-600 hover:text-primary'
              }`}
            >
              Book Test
            </Link>

            {user && (
              <>
                <Link 
                  to="/statistics" 
                  className={`text-sm font-medium transition-colors ${
                    isActive('/statistics') ? 'text-primary' : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  Статистика
                </Link>
              </>
            )}
          </nav>

          {/* Streak Display and Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <div className="relative">
                <StreakDisplay />
                <EnergyPointsHeaderAnimation
                  points={energyPointsAnimation.points}
                  isVisible={energyPointsAnimation.isVisible}
                  onAnimationComplete={() => setEnergyPointsAnimation({ isVisible: false, points: 0 })}
                />
              </div>
            )}
            
            {user ? (
              <div className="flex items-center space-x-2">
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>Профиль</span>
                  </Button>
                </Link>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-1" />
                  Выйти
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsAuthModalOpen(true)} variant="default" size="sm">
                Войти
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {/* Mobile Streak Display */}
            {user && (
              <div className="px-3 py-2 mb-2">
                <StreakDisplay />
              </div>
            )}
            
            <nav className="flex flex-col space-y-2">
              {user && (
                <Link 
                  to="/mydb3" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/mydb3') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Главная
                </Link>
              )}
              
              <Link 
                to="/textbook2" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/textbook2') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <BookOpen className="w-4 h-4" />
                <span>Учебник</span>
              </Link>

              <Link 
                to="/new-textbook" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/new-textbook') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Sparkles className="w-4 h-4" />
                <span>Новый Учебник</span>
              </Link>
              
              <Link 
                to="/videos" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/videos') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Play className="w-4 h-4" />
                <span>Видео</span>
              </Link>

              <Link 
                to="/questions" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/questions') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Вопросы</span>
              </Link>

              <Link 
                to="/daily-practice" 
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/daily-practice') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Target className="w-4 h-4" />
                <span>Ежедневная практика</span>
              </Link>
              
              <Link 
                to="/book-test" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/book-test') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Book Test
              </Link>
              
              {user && (
                <>
                  <Link 
                    to="/statistics" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/statistics') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Статистика
                  </Link>
                </>
              )}
            </nav>
            
            {/* Mobile Auth */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              {user ? (
                <Button onClick={handleSignOut} variant="outline" className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsMenuOpen(false);
                  }} 
                  className="w-full"
                >
                  Войти
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
};

export default Header;
