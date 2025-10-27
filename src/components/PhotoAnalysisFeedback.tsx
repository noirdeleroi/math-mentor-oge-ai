import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MathRenderer from "@/components/MathRenderer";

interface ErrorType {
  id?: string;
  type: string;
  severity?: 'minor' | 'major';
  message: string;
  student_latex: string;
  expected_latex: string;
  explanation_latex?: string;
  affects_final_answer?: boolean;
  location?: {
    line_start?: number;
    line_end?: number;
    char_start?: number;
    char_end?: number;
    snippet: string;
    bboxes?: any[];
  };
  step_ref?: {
    correct_step_index?: number;
    student_match_quality?: 'exact' | 'approx' | 'none';
  };
  suggested_fix_latex?: string;
  context_snippet?: string;
}

interface PhotoAnalysisData {
  scores: number;
  review: {
    errors: ErrorType[];
    summary?: string;
  };
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  "Арифметические ошибки": "border-red-500 bg-red-50",
  "Алгебраические ошибки": "border-orange-500 bg-orange-50",
  "Логические ошибки": "border-blue-500 bg-blue-50",
  "Нотационные ошибки": "border-yellow-500 bg-yellow-50",
  "Ошибки копирования": "border-purple-500 bg-purple-50",
  "Неполные решения": "border-pink-500 bg-pink-50",
  "Другие": "border-gray-500 bg-gray-50",
};

interface PhotoAnalysisFeedbackProps {
  ocrText?: string;
  analysisData?: PhotoAnalysisData;
  scores?: number;
}

export default function PhotoAnalysisFeedback({
  ocrText,
  analysisData,
  scores,
}: PhotoAnalysisFeedbackProps) {
  const [activeErrorIndex, setActiveErrorIndex] = useState<number | null>(null);
  const errorCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Helper function to wrap text in LaTeX delimiters if it looks like LaTeX
  const wrapLatex = (text: string): string => {
    if (!text) return text;
    // If it already has delimiters, return as is
    if (text.includes('$$') || text.trim().startsWith('$')) {
      return text;
    }
    // Check if it looks like LaTeX (contains LaTeX commands)
    if (text.includes('\\frac') || text.includes('\\text') || text.includes('_{') || text.includes('^{') || text.includes('\\')) {
      return `$$${text}$$`;
    }
    return text;
  };

  const highlightText = (text: string, snippets: string[]): React.ReactNode[] => {
    if (!text || snippets.length === 0 || snippets.every(s => !s)) {
      return [<span key="no-snippets">{text}</span>];
    }

    // Filter out empty snippets
    const validSnippets = snippets.filter(s => s && s.trim());

    if (validSnippets.length === 0) {
      return [<span key="no-valid">{text}</span>];
    }

    // Build a list of all matches with their positions
    const matches: Array<{ start: number; end: number; snippet: string; index: number }> = [];
    
    validSnippets.forEach((snippet, idx) => {
      if (!snippet) return;
      let searchIndex = 0;
      let matchIndex = text.indexOf(snippet, searchIndex);
      
      while (matchIndex !== -1) {
        matches.push({ start: matchIndex, end: matchIndex + snippet.length, snippet, index: idx });
        searchIndex = matchIndex + 1;
        matchIndex = text.indexOf(snippet, searchIndex);
      }
    });

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep first occurrence)
    const nonOverlappingMatches = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.start >= lastEnd) {
        nonOverlappingMatches.push(match);
        lastEnd = match.end;
      }
    }

    // Build the highlighted text
    let currentIndex = 0;
    const parts: React.ReactNode[] = [];

    nonOverlappingMatches.forEach((match) => {
      // Add text before match
      if (match.start > currentIndex) {
        parts.push(
          <span key={`text-${currentIndex}`}>
            {text.substring(currentIndex, match.start)}
          </span>
        );
      }

      // Add highlighted match
      const isActive = activeErrorIndex === match.index;
      parts.push(
        <span
          key={`highlight-${match.index}-${match.start}`}
          onClick={() => setActiveErrorIndex(match.index)}
          className="transition-all duration-300 cursor-pointer rounded px-1 py-0.5"
          style={{
            backgroundColor: isActive ? "#fff700" : "rgba(255, 247, 0, 0.4)",
          }}
        >
          {match.snippet}
        </span>
      );

      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(
        <span key={`text-${currentIndex}`}>
          {text.substring(currentIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : [<span key="full">{text}</span>];
  };

  const handleErrorCardClick = (index: number) => {
    setActiveErrorIndex(index);
    // Scroll to the error card
    const card = errorCardRefs.current[index];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };


  const snippets = analysisData?.review?.errors?.map((error) => error.context_snippet || error.location?.snippet || "") || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: OCR Text */}
      <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-[#1a1f36]">Ваше решение</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Score Display */}
          {scores !== undefined && scores !== null && (
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-green-800">
                  Оценка:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-700">
                    {scores}/2
                  </span>
                  <div className="flex gap-1">
                    {[1, 2].map((score) => (
                      <div
                        key={score}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          score <= scores
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        ✓
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            {snippets.length > 0 && snippets.some(s => s) && ocrText ? (
              // If there are snippets to highlight, use highlightText
              <div className="font-mono text-sm">{highlightText(ocrText, snippets)}</div>
            ) : ocrText ? (
              // Otherwise, render the full OCR text as LaTeX
              <MathRenderer text={wrapLatex(ocrText)} compiler="mathjax" />
            ) : (
              <p className="text-gray-500 text-sm">Загрузка...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right: Error Boxes */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {(!analysisData || !analysisData.review || !analysisData.review.errors || analysisData.review.errors.length === 0) && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-800">Ошибок не найдено</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700">AI не обнаружил ошибок в представленном решении.</p>
            </CardContent>
          </Card>
        )}
        {analysisData?.review?.errors?.map((error, index) => (
          <Card
            key={index}
            ref={(el) => (errorCardRefs.current[index] = el)}
            className={`${
              ERROR_TYPE_COLORS[error.type] || "border-gray-500 bg-gray-50"
            } transition-all duration-300 ${
              activeErrorIndex === index
                ? "ring-2 ring-yellow-400 shadow-lg"
                : "hover:shadow-md"
            }`}
            onClick={() => handleErrorCardClick(index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Ошибка {index + 1}
                </CardTitle>
                <div className="flex gap-2 items-center">
                  {error.severity && (
                    <Badge 
                      variant={error.severity === 'major' ? 'destructive' : 'secondary'}
                    >
                      {error.severity === 'major' ? 'Критическая' : 'Незначительная'}
                    </Badge>
                  )}
                  <Badge variant="outline">{error.type}</Badge>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-2">{error.message}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Ваше решение:
                </p>
                <div className="bg-white p-3 rounded border">
                  <MathRenderer text={wrapLatex(error.student_latex)} compiler="mathjax" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">
                  Правильное решение:
                </p>
                <div className="bg-gray-100 p-3 rounded border border-gray-300">
                  <MathRenderer text={wrapLatex(error.expected_latex)} compiler="mathjax" />
                </div>
              </div>
              {error.explanation_latex && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200 mt-3">
                  <p className="text-xs font-medium text-blue-700 mb-2">
                    Объяснение:
                  </p>
                  <MathRenderer text={wrapLatex(error.explanation_latex)} compiler="mathjax" />
                </div>
              )}
              {error.suggested_fix_latex && (
                <div className="bg-green-50 p-3 rounded border border-green-200 mt-3">
                  <p className="text-xs font-medium text-green-700 mb-2">
                    Рекомендация:
                  </p>
                  <MathRenderer text={wrapLatex(error.suggested_fix_latex)} compiler="mathjax" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Section */}
      {analysisData?.review?.summary && (
        <Card className="bg-blue-50 border-blue-200 mt-6">
          <CardHeader>
            <CardTitle className="text-blue-800 text-lg">Итоговая оценка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{analysisData.review.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

