import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Target } from "lucide-react";

export default function LandingHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-20 relative z-10 bg-transparent">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-xl">
          {/* Left Side - Content */}
          <div className="flex-1 max-w-2xl text-left p-8 rounded-2xl shadow-lg" style={{ backgroundColor: 'rgba(248, 250, 252, 0.95)' }}>
            <motion.h1 
              className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Умная платформа подготовки к{" "}
              <span className="text-primary">ОГЭ и ЕГЭ</span>{" "}
              по математике
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              Видео и статьи на каждое умение, база заданий как в ФИПИ, и умный AI-ассистент, который подскажет следующий шаг.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mb-8"
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
                variant="outline" 
                size="lg" 
                className="border-2 border-primary text-primary hover:bg-primary/5 px-8 py-6 text-lg rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                onClick={() => {
                  document.getElementById('highlights-section')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
              >
                <Target className="w-6 h-6" />
                Узнать больше
              </Button>
            </motion.div>
          </div>

          {/* Right Side - Video */}
          <div className="flex-1 max-w-2xl">
            <motion.div
              className="rounded-2xl overflow-hidden shadow-2xl border border-white/20"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            >
              <video 
                className="w-full h-auto"
                autoPlay 
                loop 
                muted 
                playsInline
                disablePictureInPicture
                onLoadStart={(e) => e.currentTarget.scrollIntoView = () => {}}
              >
                <source src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/vid2.mp4" type="video/mp4" />
                Ваш браузер не поддерживает видео.
              </video>
            </motion.div>
          </div>
        </div>
      </div>
      
    </section>
  );
}
