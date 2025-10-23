
import { supabase } from "@/integrations/supabase/client";

export interface MathProblem {
  question_id: string;
  problem_text: string;
  problem_image?: string;
  answer: string;
  solution_text?: string;
  solutiontextexpanded?: string;
  code: string;
}

export const getCategoryByCode = (code: string): string => {
  if (!code) return 'Общее';
  
  if (code.startsWith('1.')) return 'Арифметика';
  if (code.startsWith('2.') || code.startsWith('3.') || code.startsWith('4.') || code.startsWith('5.') || code.startsWith('6.')) return 'Алгебра';
  if (code.startsWith('7.')) return 'Геометрия';
  if (code.startsWith('8.')) return 'Практическая математика';
  
  return 'Общее';
};

export const getRandomMathProblem = async (category?: string): Promise<MathProblem | null> => {
  // Legacy - copy table doesn't exist
  console.warn('copy table does not exist');
  return null;
};

export const getMathProblemById = async (questionId: string): Promise<MathProblem | null> => {
  // Legacy - copy table doesn't exist
  console.warn('copy table does not exist');
  return null;
};
