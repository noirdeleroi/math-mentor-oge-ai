import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MathRenderer from "@/components/MathRenderer";
import { useMemo } from "react";

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

interface ParsedError {
  number: number;
  title: string;
  content: string;
}

interface ParsedReview {
  errors: ParsedError[];
  evaluation: string | null;
}

interface Props {
  title?: string;
  analysisData?: AnalysisDataShape | null;
  fallbackSummaryLatex?: string;
  fallbackScore?: number | null;
}

// Helper function to parse HTML review with errors and evaluation
const parseHtmlReview = (html: string): ParsedReview => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const errors: ParsedError[] = [];
  let evaluation: string | null = null;

  // Extract all paragraphs
  const paragraphs = doc.querySelectorAll('p');
  
  paragraphs.forEach((p) => {
    const htmlContent = p.innerHTML;
    
    // Check if it's an error (starts with <b>Ошибка X:</b>)
    const errorMatch = htmlContent.match(/<b>Ошибка\s+(\d+):<\/b>(.+)/i);
    if (errorMatch) {
      const errorNumber = parseInt(errorMatch[1], 10);
      const errorContent = errorMatch[2].trim();
      errors.push({
        number: errorNumber,
        title: `Ошибка ${errorNumber}`,
        content: errorContent,
      });
    }
    
    // Check if it's evaluation (contains <b>Оценка:</b>)
    const evaluationMatch = htmlContent.match(/<b>Оценка:<\/b>(.+)/i);
    if (evaluationMatch) {
      evaluation = evaluationMatch[1].trim();
    }
  });

  return { errors, evaluation };
};

const AnalysisReviewCard = ({
  title = "Анализ решения",
  analysisData,
  fallbackSummaryLatex,
  fallbackScore,
}: Props) => {
  // Normalize the data - try to parse JSON strings and extract review field
  const normalizedData = useMemo(() => {
    // If analysisData exists and is already an object with review, use it
    if (analysisData && typeof analysisData === 'object' && 'review' in analysisData) {
      return analysisData;
    }

    // If analysisData is a string, try to parse it
    if (typeof analysisData === 'string') {
      try {
        const parsed = JSON.parse(analysisData);
        if (parsed && 'review' in parsed) {
          return parsed;
        }
      } catch {
        // Not valid JSON, treat as review string directly
        return { scores: fallbackScore, review: analysisData };
      }
    }

    // If fallbackSummaryLatex exists, try to parse it as JSON
    if (fallbackSummaryLatex) {
      try {
        const parsed = JSON.parse(fallbackSummaryLatex);
        if (parsed && 'review' in parsed) {
          return { scores: parsed.scores || fallbackScore, review: parsed.review };
        }
      } catch {
        // Not JSON, treat as review string
        return { scores: fallbackScore, review: fallbackSummaryLatex };
      }
    }

    return analysisData;
  }, [analysisData, fallbackSummaryLatex, fallbackScore]);

  const reviewIsString = typeof normalizedData?.review === 'string';
  const scoreToShow =
    typeof normalizedData?.scores === "number"
      ? normalizedData.scores
      : (typeof fallbackScore === "number" ? fallbackScore : null);

  const hasStructured = Boolean(
    normalizedData && !reviewIsString && Array.isArray((normalizedData.review as any)?.errors)
  );

  // Parse HTML review if it's a string
  const parsedHtmlReview = useMemo(() => {
    if (reviewIsString && normalizedData?.review) {
      return parseHtmlReview(normalizedData.review as string);
    }
    return null;
  }, [reviewIsString, normalizedData?.review]);

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
            (normalizedData!.review as any).errors && (normalizedData!.review as any).errors.length > 0 ? (
              (normalizedData!.review as any).errors.map((error: AnalysisError, i: number) => (
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
          ) : parsedHtmlReview && parsedHtmlReview.errors.length > 0 ? (
            <>
              {/* Display parsed errors */}
              {parsedHtmlReview.errors.map((error, i) => (
                <Card key={i} className="bg-white border border-red-200">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <Badge variant="destructive" className="text-xs">{error.title}</Badge>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <MathRenderer text={error.content} compiler="mathjax" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Display evaluation separately */}
              {parsedHtmlReview.evaluation && (
                <Card className="bg-green-50 border-green-200 mt-4">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-green-800">Оценка:</p>
                    </div>
                    <MathRenderer text={parsedHtmlReview.evaluation} compiler="mathjax" />
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-white border border-purple-200">
              <CardContent className="pt-4">
                {reviewIsString ? (
                  <MathRenderer text={(normalizedData?.review as string) || ''} compiler="mathjax" />
                ) : normalizedData?.review ? (
                  <MathRenderer text={String(normalizedData.review)} compiler="mathjax" />
                ) : (
                  <MathRenderer text={fallbackSummaryLatex || 'Идёт подготовка подробного разбора…'} compiler="mathjax" />
                )}
              </CardContent>
            </Card>
          )}

          {hasStructured && (normalizedData!.review as any).summary && (
            <Card className="bg-green-50 border-green-200 mt-4">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-green-800">Итоговый разбор:</p>
                </div>
                <MathRenderer text={(normalizedData!.review as any).summary} compiler="mathjax" />
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisReviewCard;


