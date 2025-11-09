import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import ArticleRenderer from './ArticleRenderer';
import { toast } from 'sonner';

interface Article {
  id: number;
  text: string;
}

const ProblemBreakdowns: React.FC = () => {
  const [articles, setArticles] = useState<Record<number, Article>>({});
  const [selectedProblem, setSelectedProblem] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles_memos_oge')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      const articlesMap: Record<number, Article> = {};
      data?.forEach((article) => {
        if (article.id) {
          articlesMap[article.id] = article as Article;
        }
      });
      
      setArticles(articlesMap);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Ошибка загрузки статей');
    } finally {
      setLoading(false);
    }
  };

  const problemNumbers = [
    { id: 0, label: '1-5' },
    ...Array.from({ length: 20 }, (_, i) => ({ id: i + 6, label: String(i + 6) }))
  ];

  const renderProblemsList = () => (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">
          Разборы экзаменационных заданий
        </h1>
        <p className="text-white/70">
          Выберите номер задания для просмотра подробного разбора
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {problemNumbers.map((problem) => (
          <Button
            key={problem.id}
            onClick={() => setSelectedProblem(problem.id)}
            variant="outline"
            className={`
              h-24 text-lg font-semibold
              bg-white/10 backdrop-blur-sm border-white/20
              hover:bg-white/20 hover:scale-105
              transition-all duration-200
              ${!articles[problem.id] ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={!articles[problem.id]}
          >
            <div className="flex flex-col items-center gap-2">
              <BookOpen className="w-6 h-6" />
              <span>№ {problem.label}</span>
            </div>
          </Button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-white/70 mt-8">
          Загрузка...
        </div>
      )}
    </div>
  );

  const renderArticleView = () => {
    if (!selectedProblem && selectedProblem !== 0) return null;
    
    const article = articles[selectedProblem];
    if (!article) return null;

    const problemLabel = selectedProblem === 0 ? '1-5' : String(selectedProblem);

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button
            onClick={() => setSelectedProblem(null)}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к списку
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">
            Задание № {problemLabel}
          </h1>
        </div>

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-8">
          <ArticleRenderer
            text={article.text}
            article={{ skill: selectedProblem, art: article.text }}
            skillTitle={`Задание ${problemLabel}`}
          />
        </div>
      </div>
    );
  };

  if (selectedProblem !== null) {
    return renderArticleView();
  }

  return renderProblemsList();
};

export default ProblemBreakdowns;
