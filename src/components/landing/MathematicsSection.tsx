import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Target } from "lucide-react";

export default function MathematicsSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2 
          className="text-4xl md:text-5xl font-bold text-center text-foreground mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Математика
        </motion.h2>

        <div className="flex flex-col lg:flex-row items-center gap-12 max-w-7xl mx-auto">
          {/* Left Side - Video */}
          <motion.div
            className="flex-1 w-full"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
              <video 
                className="w-full h-auto"
                autoPlay 
                loop 
                muted 
                playsInline
                disablePictureInPicture
              >
                <source src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/vid2.mp4" type="video/mp4" />
                Ваш браузер не поддерживает видео.
              </video>
            </div>
          </motion.div>

          {/* Right Side - Information */}
          <motion.div
            className="flex-1 space-y-8"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* OGE Math */}
            <div className="p-6 rounded-xl bg-muted/50 border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">ОГЭ Математика</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Полная подготовка к ОГЭ по математике. 300+ заданий из банка ФИПИ с подробными разборами, 
                    интерактивные практики и видеоуроки. Адаптивная система отслеживания прогресса помогает 
                    сосредоточиться на слабых местах.
                  </p>
                </div>
              </div>
            </div>

            {/* EGE Basic */}
            <div className="p-6 rounded-xl bg-muted/50 border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">ЕГЭ Базовый уровень</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Базовый уровень ЕГЭ по математике. Более 2000 задач с решениями и теорией. 
                    Видеоразборы сложных тем, пробные варианты и система диагностики знаний.
                  </p>
                </div>
              </div>
            </div>

            {/* EGE Profil */}
            <div className="p-6 rounded-xl bg-muted/50 border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">ЕГЭ Профильный уровень</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Профильный уровень ЕГЭ для поступления в технические вузы. 3000+ задач повышенной сложности, 
                    углубленная теория, методички и тренировочные варианты. Полная подготовка ко второй части.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
