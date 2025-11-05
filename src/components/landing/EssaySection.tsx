import { FileText, Target, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

export const EssaySection = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
          Сочинение
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Info cards */}
          <div className="space-y-4">
            <Card className="p-6 bg-card/50 backdrop-blur border-border hover:scale-105 transition-transform duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Структура сочинения</h3>
                  <p className="text-sm text-muted-foreground">
                    Изучите основные элементы сочинения: вступление, аргументация, примеры и заключение
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-border hover:scale-105 transition-transform duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Критерии оценивания</h3>
                  <p className="text-sm text-muted-foreground">
                    Понимание критериев поможет написать сочинение на максимальный балл
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-border hover:scale-105 transition-transform duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Практика и проверка</h3>
                  <p className="text-sm text-muted-foreground">
                    Пишите сочинения и получайте обратную связь от нашей AI-системы
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
                src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/essay1.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>
      </div>
    </section>
  );
};
