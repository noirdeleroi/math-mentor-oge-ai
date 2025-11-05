import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Target } from "lucide-react";

export default function MathematicsSection() {
  return (
    <section id="mathematics-section" className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2 
          className="text-3xl md:text-4xl font-bold text-center text-foreground mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Математика
        </motion.h2>

        <div className="flex flex-col lg:flex-row items-center gap-8 max-w-7xl mx-auto">
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
            className="flex-1 space-y-4"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* OGE Math */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">ОГЭ Математика</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    300+ заданий из банка ФИПИ с подробными разборами, интерактивные практики и видеоуроки.
                  </p>
                </div>
              </div>
            </div>

            {/* EGE Basic */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">ЕГЭ Базовый уровень</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Более 2000 задач с решениями и теорией. Видеоразборы сложных тем и пробные варианты.
                  </p>
                </div>
              </div>
            </div>

            {/* EGE Profil */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">ЕГЭ Профильный уровень</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    3000+ задач повышенной сложности, углубленная теория и тренировочные варианты.
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
