import { motion } from "framer-motion";
import { MessageCircle, Sparkles, Brain } from "lucide-react";

export default function ChatDemo() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-4">
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
            <div className="bg-white dark:bg-white/95 border-border shadow-lg p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Персональный помощник</h3>
                  <p className="text-xs text-gray-700">
                    Ёжик отвечает на вопросы по математике, объясняет сложные темы и помогает с решением задач в режиме реального времени.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/95 border-border shadow-lg p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Умный подбор заданий</h3>
                  <p className="text-xs text-gray-700">
                    AI-ассистент анализирует ваши слабые места и подбирает задания для эффективной подготовки к экзаменам.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/95 border-border shadow-lg p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Обучение с пониманием</h3>
                  <p className="text-xs text-gray-700">
                    Не просто решения, а детальные объяснения каждого шага. Ёжик учит думать и понимать математику.
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