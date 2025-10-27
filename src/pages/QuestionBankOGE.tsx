import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import FlyingMathBackground from '@/components/FlyingMathBackground';

export default function QuestionBankOGE() {
  const questionTypes = [
    { label: '1-5', number: 1 },
    ...Array.from({ length: 20 }, (_, i) => ({ label: String(i + 6), number: i + 6 }))
  ];

  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <FlyingMathBackground />
      
      <LandingHeader />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent mb-4">
            Банк заданий ОГЭ
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Выберите номер задания для практики
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
          {questionTypes.map(({ label, number }) => (
            <a
              key={label}
              href={`/questionbankoge/${label}/index.html`}
              rel="noopener noreferrer"
            >
              <Card className="p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border-white/30 hover:border-yellow-400/60 hover:bg-gradient-to-br hover:from-white/30 hover:to-white/20 group">
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-br from-yellow-400 to-emerald-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {label}
                  </div>
                  <div className="text-sm text-gray-300 mt-2 group-hover:text-white transition-colors">
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
