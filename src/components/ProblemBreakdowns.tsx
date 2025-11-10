import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';
import ArticleRenderer from './ArticleRenderer';
import { toast } from 'sonner';

interface Article {
  id: number;
  text: string;
}

interface ProblemConfig {
  id: number;
  label: string;
  title?: string;
  dbId: number;
}

interface ProblemBreakdownsProps {
  problemNumbers?: ProblemConfig[];
  supabaseTable?: string;
  headerTitle?: string;
  headerDescription?: string;
}

const DEFAULT_PROBLEM_NUMBERS: ProblemConfig[] = [
  { id: 1, label: '1-5', title: 'Таблицы и графики', dbId: 1 },
  { id: 6, label: '6', title: 'Дроби', dbId: 6 },
  { id: 7, label: '7', title: 'Сравнение чисел', dbId: 7 },
  { id: 8, label: '8', title: 'Степени', dbId: 8 },
  { id: 9, label: '9', title: 'Уравнения', dbId: 9 },
  { id: 10, label: '10', title: 'Вероятность', dbId: 10 },
  { id: 11, label: '11', title: 'Графики функций', dbId: 11 },
  { id: 12, label: '12', title: 'Формулы', dbId: 12 },
  { id: 13, label: '13', title: 'Неравенства', dbId: 13 },
  { id: 14, label: '14', title: 'Прогрессии', dbId: 14 },
  { id: 15, label: '15', title: 'Треугольники', dbId: 15 },
  { id: 16, label: '16', title: 'Окружности', dbId: 16 },
  { id: 17, label: '17', title: 'Площади', dbId: 17 },
  { id: 18, label: '18', title: 'Геометрия на клетках', dbId: 18 },
  { id: 19, label: '19', title: 'Свойства фигур', dbId: 19 },
  { id: 20, label: '20', title: 'Сложные уравнения', dbId: 20 },
  { id: 21, label: '21', title: 'Текстовые задачи', dbId: 21 },
  { id: 22, label: '22', title: 'Анализ графиков', dbId: 22 },
  { id: 23, label: '23', title: 'Геометрия (повыш.)', dbId: 23 },
  { id: 24, label: '24', title: 'Доказательство', dbId: 24 },
  { id: 25, label: '25', title: 'Геометрия (макс.)', dbId: 25 }
];

const DEFAULT_HEADER_TITLE = 'Разборы экзаменационных заданий';
const DEFAULT_HEADER_DESCRIPTION = 'Выберите номер задания для просмотра подробного разбора';
const DEFAULT_TABLE_NAME = 'articles_memos_oge';

const ProblemBreakdowns: React.FC<ProblemBreakdownsProps> = ({
  problemNumbers = DEFAULT_PROBLEM_NUMBERS,
  supabaseTable = DEFAULT_TABLE_NAME,
  headerTitle = DEFAULT_HEADER_TITLE,
  headerDescription = DEFAULT_HEADER_DESCRIPTION
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Record<number, Article>>({});
  const [loading, setLoading] = useState(true);

  const selectedProblem = searchParams.get('problem') ? parseInt(searchParams.get('problem')!, 10) : null;

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseTable]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from(supabaseTable as any)
        .select('id, text')
        .order('id', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const articlesMap: Record<number, Article> = {};
      data?.forEach((article: any) => {
        if (article.id && article.text) {
          articlesMap[article.id] = {
            id: article.id,
            text: article.text
          };
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

  const handleProblemClick = (dbId: number) => {
    setSearchParams({ problem: String(dbId) });
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  const renderProblemsList = () => (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-500 to-emerald-500 text-transparent bg-clip-text">
          {headerTitle}
        </h1>
        {headerDescription && (
          <p className="text-white/70">
            {headerDescription}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {problemNumbers.map((problem) => (
          <Button
            key={problem.id}
            onClick={() => {
              handleProblemClick(problem.dbId);
            }}
            variant="outline"
            className="h-auto py-4 px-6 text-left justify-start bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
          >
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-white">Задача {problem.label}</span>
              </div>
              {problem.title && (
                <span className="text-sm text-white/70">{problem.title}</span>
              )}
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
    if (!selectedProblem) return null;

    const article = articles[selectedProblem];

    if (loading) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-white/70 mt-8">
            Загрузка...
          </div>
        </div>
      );
    }

    if (!article) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Button
              onClick={handleBackToList}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к списку
            </Button>
          </div>
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-8">
            <p className="text-lg text-center text-gray-600">
              Статья не найдена. Возможно, она ещё в разработке.
            </p>
          </div>
        </div>
      );
    }

    const problemInfo = problemNumbers.find((p) => p.dbId === selectedProblem);
    const problemLabel = problemInfo
      ? problemInfo.title
        ? `${problemInfo.label}: ${problemInfo.title}`
        : problemInfo.label
      : String(selectedProblem);

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button
            onClick={handleBackToList}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к списку
          </Button>
        </div>

        <Card className="shadow-xl border-0 bg-white backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-gold via-sage to-gold text-white p-6 rounded-t-lg">
              <h1 className="text-2xl font-bold">Задание № {problemLabel}</h1>
              <p className="text-blue-100 text-sm mt-1">Разбор экзаменационного задания</p>
            </div>

            <div className="p-8">
              <div className="textbook-preview prose max-w-none">
                <ArticleRenderer
                  text={article.text}
                  article={{ skill: selectedProblem, art: article.text }}
                  skillTitle={`Задание ${problemLabel}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (selectedProblem !== null) {
    return renderArticleView();
  }

  return renderProblemsList();
};

export default ProblemBreakdowns;
