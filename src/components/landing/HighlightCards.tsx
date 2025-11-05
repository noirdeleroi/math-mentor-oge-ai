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
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="highlights-section" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-foreground mb-4"
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
            <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-primary mb-2">OGE MATH</h3>
                  <div className="w-16 h-1 bg-primary mx-auto rounded-full"></div>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">300 заданий ФИПИ (Часть 1 + разборы)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Учебник по навыкам (новый формат)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Видеоразборы и короткие клипы</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
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
            <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-primary mb-2">EGE MATH</h3>
                  <div className="w-16 h-1 bg-primary mx-auto rounded-full"></div>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">5000 заданий по ЕГЭ</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Учебник и база задач</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Видео и методички</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
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
            <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-primary mb-2">Сочинение</h3>
                  <div className="w-16 h-1 bg-primary mx-auto rounded-full"></div>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Проверка сочинений ЕГЭ по русскому</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">AI-анализ с подробной обратной связью</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Оценка по критериям ФИПИ</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
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
