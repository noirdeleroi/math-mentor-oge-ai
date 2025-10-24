import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import FlyingStarsBackground from "@/components/FlyingStarsBackground";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Ошибка: Пользователь попытался получить доступ к несуществующей странице:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <FlyingStarsBackground />
      <div className="text-center z-10 px-4">
        <h1 className="text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-2xl text-foreground/80 mb-8">
          Упс! Страница не найдена
        </p>
        <Button asChild size="lg" className="shadow-lg">
          <Link to="/">Вернуться на главную</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
