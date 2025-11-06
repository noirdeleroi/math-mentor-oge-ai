import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Target } from "lucide-react";

export default function MathematicsSection() {
  return (
    <section id="mathematics-section" className="py-24">
      <div className="container mx-auto px-4">
        <motion.h2 
          className="text-4xl md:text-6xl font-display font-bold text-center bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-12"
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
                <source src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/math1.mp4" type="video/mp4" />
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
            {/* Курсы */}
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-500/40 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20 shrink-0">
                  <GraduationCap className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Курсы</h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Мы предлагаем три курса по математике: <strong>ОГЭ</strong>, <strong>ЕГЭ Базовый уровень</strong> и <strong>ЕГЭ Профильный уровень</strong>. 
                  </p>
                </div>
              </div>
            </div>

            {/* Практика */}
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-500/40 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20 shrink-0">
                  <Target className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Практика</h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    <p>
                      В каждом курсе — <strong>огромный банк заданий</strong>, интерактивные тренировки, 
                      <strong>реалистичные экзамены на время</strong>, автоматическая 
                      <strong>проверка по фото</strong> и <strong>умное отслеживание прогресса</strong>.
                    </p>

                  </p>
                </div>
              </div>
            </div>

            {/* Обучение */}
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-500/40 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20 shrink-0">
                  <BookOpen className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Обучение</h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    <p>
                      Твой чат-напарник анализирует прогресс, даёт <strong>домашку под тебя</strong> и потом честно разбирает, где ты красавчик, а где можно подтянуться.  
                      Он <strong>объяснит любую тему</strong>, покажет нужный раздел <strong>учебника</strong>, <strong>видео</strong> или даже <strong>симуляцию и игру</strong>, чтобы ты понял на практике.  
                      <strong>Учись с умным и реально крутым ассистентом</strong> — как с другом, только умнее.
                    </p>


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
