import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Target } from "lucide-react";

export default function LandingHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-20 relative z-10 bg-transparent">
        <div className="max-w-4xl mx-auto text-center p-8 rounded-2xl shadow-lg" style={{ backgroundColor: 'rgba(248, 250, 252, 0.95)' }}>
          <motion.h1 
            className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Умная платформа подготовки к{" "}
            <span className="text-primary">ОГЭ и ЕГЭ</span>{" "}
            по математике
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            Видео и статьи на каждое умение, база заданий как в ФИПИ, и умный AI-ассистент, который подскажет следующий шаг.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <Button 
              asChild 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Link to="/register" className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                Начать бесплатно
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="border-2 border-primary text-primary hover:bg-primary/5 px-8 py-6 text-lg rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Link to="/questions" className="flex items-center gap-3">
                <Target className="w-6 h-6" />
                Посмотреть практику
              </Link>
          </Button>
          </motion.div>
        </div>
      </div>
      
    </section>
  );
}
