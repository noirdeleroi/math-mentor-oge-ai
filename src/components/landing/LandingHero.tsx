import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Target } from "lucide-react";
import FloatingElements from "./FloatingElements";
import PromptBar from "../PromptBar";

export default function LandingHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Floating Math Elements */}
      <FloatingElements />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-20 relative z-10 bg-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="mb-8"
          >
            <PromptBar />
          </motion.div>
          
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
            Видео и статьи на каждое умение, база заданий как в FIPI, и умный AI-ассистент, который подскажет следующий шаг.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <Button 
              asChild 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Link to="/new-textbook" className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                Начать с ОГЭ
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
