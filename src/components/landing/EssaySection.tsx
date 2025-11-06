import { FileText, Target, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

export const EssaySection = () => {
  return (
    <section id="essay-section" className="py-24 px-4">
      <div className="max-w-7xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
        <h2 className="text-4xl md:text-6xl font-display font-bold text-center mb-12 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
          Сочинение
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Info cards */}
          <div className="space-y-4">
            <Card className="p-6 bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-500/40 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20">
                  <FileText className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-white">База тренировочных тем для сочинений</h3>
                  <p className="text-sm text-white/80">
                    Тренируйся писать сочинения на базе топиков ФИПИ
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-500/40 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20">
                  <Target className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-white">Критерии оценивания</h3>
                  <p className="text-sm text-white/80">
                    Находим грамматические, речевые и логические ошибки по критериям ФИПИ 2026 года, даём рекомендации для улучшения навыков
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-500/40 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20">
                  <Award className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-white">Практика и проверка</h3>
                  <p className="text-sm text-white/80">
                    AI-анализ с подробной обратной связью. Выставляем баллы, как на реальном экзамене
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right side - Video */}
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source
                src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/essayLight.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>
      </div>
    </section>
  );
};
