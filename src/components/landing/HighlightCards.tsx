import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0
  }
};

export default function HighlightCards() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const header = document.querySelector('header');
      const headerHeight = header?.offsetHeight || 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="highlights-section" className="py-24 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent mb-4 tracking-tight"
            variants={cardVariants}
          >
            Что внутри платформы
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* OGE Math Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            onClick={() => scrollToSection('mathematics-section')}
            className="cursor-pointer"
          >
            <Card className="h-full backdrop-blur-xl bg-background/40 border border-primary/20 hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:scale-105 group relative overflow-hidden">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Animated border glow */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500 rounded-lg"></div>
              
              <CardContent className="p-8 relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">OGE MATH</h3>
                  <div className="w-16 h-1 bg-gradient-to-r from-primary to-purple-500 mx-auto rounded-full group-hover:w-24 transition-all duration-300"></div>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">300 заданий ФИПИ (Часть 1 + разборы)</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Учебник по навыкам (новый формат)</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Видеоразборы и короткие клипы</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Интерактивная практика и прогресс</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* EGE Math Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.2 }}
            onClick={() => scrollToSection('mathematics-section')}
            className="cursor-pointer"
          >
            <Card className="h-full backdrop-blur-xl bg-background/40 border border-primary/20 hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:scale-105 group relative overflow-hidden">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Animated border glow */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500 rounded-lg"></div>
              
              <CardContent className="p-8 relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">EGE MATH</h3>
                  <div className="w-16 h-1 bg-gradient-to-r from-primary to-purple-500 mx-auto rounded-full group-hover:w-24 transition-all duration-300"></div>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">5000 заданий по ЕГЭ</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Учебник и база задач</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Видео и методички</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Подготовка к базовому и профильному уровням</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Essay Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.4 }}
            onClick={() => scrollToSection('essay-section')}
            className="cursor-pointer"
          >
            <Card className="h-full backdrop-blur-xl bg-background/40 border border-primary/20 hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:scale-105 group relative overflow-hidden">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Animated border glow */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500 rounded-lg"></div>
              
              <CardContent className="p-8 relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">Сочинение</h3>
                  <div className="w-16 h-1 bg-gradient-to-r from-primary to-purple-500 mx-auto rounded-full group-hover:w-24 transition-all duration-300"></div>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Проверка сочинений ЕГЭ по русскому</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">AI-анализ с подробной обратной связью</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Оценка по критериям ФИПИ</span>
                  </li>
                  <li className="flex items-start gap-3 group/item">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-foreground">Рекомендации по улучшению</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
