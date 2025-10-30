import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MathRenderer from "@/components/MathRenderer";

interface AnalysisError {
  type: string;
  message: string;
  student_latex: string;
  expected_latex: string;
  context_snippet?: string;
}

interface AnalysisDataShape {
  scores: number;
  review:
    | string
    | {
        errors: AnalysisError[];
        summary?: string;
      };
}

interface Props {
  title?: string;
  analysisData?: AnalysisDataShape | null;
  fallbackSummaryLatex?: string;
  fallbackScore?: number | null;
}

const AnalysisReviewCard = ({
  title = "Анализ решения",
  analysisData,
  fallbackSummaryLatex,
  fallbackScore,
}: Props) => {
  const reviewIsString = typeof analysisData?.review === 'string';
  const scoreToShow =
    typeof analysisData?.scores === "number"
      ? analysisData.scores
      : (typeof fallbackScore === "number" ? fallbackScore : null);

  const hasStructured = Boolean(
    analysisData && !reviewIsString && Array.isArray((analysisData.review as any)?.errors)
  );

  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardHeader className="relative">
        <CardTitle className="text-purple-800">{title}</CardTitle>
        {scoreToShow !== null && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-purple-600 text-white text-[10px] px-2 py-0.5 leading-4">{scoreToShow}/2</Badge>
          </div>
        )}
        {!hasStructured && scoreToShow !== null && (
          <CardDescription>Оценка: {scoreToShow}/2</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {hasStructured ? (
            (analysisData!.review as any).errors && (analysisData!.review as any).errors.length > 0 ? (
              (analysisData!.review as any).errors.map((error: AnalysisError, i: number) => (
                <Card key={i} className="bg-white border border-purple-200">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <Badge variant="destructive" className="text-xs">{error.type}</Badge>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 font-medium">Описание:</p>
                        <MathRenderer text={error.message} compiler="mathjax" />
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <p className="text-sm text-red-800 font-medium">Решение ученика:</p>
                        </div>
                        <MathRenderer text={error.student_latex} compiler="mathjax" />
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <p className="text-sm text-green-800 font-medium">Правильное решение:</p>
                        </div>
                        <MathRenderer text={error.expected_latex} compiler="mathjax" />
                      </div>

                      {error.context_snippet && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-800 font-medium">Контекст:</p>
                          <MathRenderer text={error.context_snippet} compiler="mathjax" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">Ошибок не найдено. Отличная работа! 🎉</div>
            )
          ) : (
            <Card className="bg-white border border-purple-200">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 font-medium">Общая оценка:</p>
                    {reviewIsString ? (
                      <MathRenderer text={(analysisData?.review as string) || ''} compiler="mathjax" />
                    ) : (
                      <MathRenderer text={fallbackSummaryLatex || 'Идёт подготовка подробного разбора…'} compiler="mathjax" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasStructured && (analysisData!.review as any).summary && (
            <Card className="bg-green-50 border-green-200 mt-4">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-green-800">Итоговый разбор:</p>
                </div>
                <MathRenderer text={(analysisData!.review as any).summary} compiler="mathjax" />
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisReviewCard;


