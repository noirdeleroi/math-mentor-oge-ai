import { motion } from "framer-motion";
import { MessageCircle, Sparkles, Brain } from "lucide-react";

export default function ChatDemo() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-4">
            AI-ассистент Ёжик
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="max-w-5xl mx-auto grid md:grid-cols-[3fr_2fr] gap-6 items-center"
        >
          {/* Video on the left */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <video
              className="w-full h-auto rounded-2xl"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/chatLight.mp4" type="video/mp4" />
              Ваш браузер не поддерживает видео.
            </video>
          </div>

          {/* Info cards on the right */}
          <div className="space-y-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 hover:border-yellow-500/40 p-4 rounded-xl transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-500/30 rounded-full flex items-center justify-center flex-shrink-0 border border-yellow-500/40">
                  <MessageCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Персональный репетитор</h3>
                  <p className="text-xs text-white/80">
                    Твой личный наставник, который будет с тобой непрерывно и поможет прийти к максимальному баллу. Он знает о тебе всё, даёт домашние задания, постепенно подводит тебя к новым темам.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 hover:border-yellow-500/40 p-4 rounded-xl transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-500/30 rounded-full flex items-center justify-center flex-shrink-0 border border-yellow-500/40">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Персональный помощник</h3>
                  <p className="text-xs text-white/80">
                    Он отвечает на вопросы по математике, решает задачи, объясняет сложные темы, анализирует твои домашние задания и помогает с решением задач. Если ты читаешь учебник на платформе и что-то не понимаешь - выдели текст и твой ассистент даст объяснение в чате.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 hover:border-yellow-500/40 p-4 rounded-xl transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-500/30 rounded-full flex items-center justify-center flex-shrink-0 border border-yellow-500/40">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Умный подбор заданий</h3>
                  <p className="text-xs text-white/80">
                    Твой чат-ассистент подбирает темы и задания, он "ведёт" тебя к сдаче экзамена.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 hover:border-yellow-500/40 p-4 rounded-xl transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-500/30 rounded-full flex items-center justify-center flex-shrink-0 border border-yellow-500/40">
                  <Brain className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Обучение с пониманием</h3>
                  <p className="text-xs text-white/80">
                    Не просто решения, а детальные объяснения каждого шага. Твой чат-наставник учит думать и понимать математику.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
