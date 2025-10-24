import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import FlyingMathBackground from '@/components/FlyingMathBackground';

export default function QuestionBankOGE() {
  const questionTypes = [
    { label: '1-5', number: 1 },
    ...Array.from({ length: 20 }, (_, i) => ({ label: String(i + 6), number: i + 6 }))
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <FlyingMathBackground />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <Link to="/ogemath" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Банк заданий ОГЭ
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите номер задания для практики
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
          {questionTypes.map(({ label, number }) => (
            <a
              key={label}
              href={`/questionbankoge/${label}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="p-6 hover:shadow-elegant hover:scale-105 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 group">
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {label}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Задание
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
