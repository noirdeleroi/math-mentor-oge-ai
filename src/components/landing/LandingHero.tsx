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
          <div className="flex-1 max-w-2xl text-left">
            <motion.h1 
              className="text-5xl md:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Умная платформа подготовки к ОГЭ и ЕГЭ
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 max-w-3xl mb-10 leading-relaxed"
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
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-7 text-xl rounded-2xl font-bold shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              >
                <Link to="/register" className="flex items-center gap-3">
                  <BookOpen className="w-7 h-7" />
                  Начать бесплатно
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="bg-white/80 backdrop-blur-sm border-2 border-white/50 text-foreground hover:bg-white hover:border-white transition-all duration-300 hover:scale-105 hover:-translate-y-1 px-10 py-7 text-xl rounded-2xl font-bold shadow-xl"
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
