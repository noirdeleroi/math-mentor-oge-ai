import React from 'react';
import { User, Crown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const accountItems = [
    { icon: User, label: 'Профиль', path: '/profile' },
    { icon: Crown, label: 'Подписки', path: '/subscribe' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="p-4">
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
                : "text-foreground hover:bg-accent"
            }`}
            onClick={() => handleNavigate(item.path)}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );

  // Mobile: Drawer
  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border shadow-sm"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Меню</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <SidebarContent />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Fixed Sidebar
  return (
    <div className="w-64 bg-background border-r min-h-screen">
      <SidebarContent />
    </div>
  );
};