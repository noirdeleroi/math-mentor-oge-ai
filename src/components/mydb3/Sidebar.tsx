import React from 'react';
import { Book, User, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: Book, label: 'Курсы', path: '/mydb3' },
    { icon: User, label: 'Профиль', path: '/profile' },
  ];

  const accountItems = [
    { icon: Crown, label: 'Подписки', path: '/subscribe' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-background border-r min-h-screen p-4">
      {/* My Stuff Section */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Мое обучение
        </h3>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                isActive(item.path) 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-foreground hover:bg-yellow-500"
              }`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* My Account Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Мой аккаунт
        </h3>
        <nav className="space-y-1">
          {accountItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                isActive(item.path) 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-foreground hover:bg-yellow-500"
              }`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};