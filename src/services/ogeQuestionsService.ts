import { supabase } from "@/integrations/supabase/client";

export interface OgeQuestion {
  question_id: string;
  problem_text: string;
  problem_image?: string;
  answer: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  solution_text?: string;
  solutiontextexpanded?: string;
  skills: number;
  difficulty: number;
  problem_number_type?: string;
}

export const getQuestionsBySkills = async (skills: number[], count: number = 4): Promise<OgeQuestion[]> => {
  try {
    const { data, error } = await supabase
      .from('oge_math_skills_questions')
      .select('*')
      .in('skills', skills)
      .limit(count * skills.length); // Get more questions to randomize

    if (error) {
      console.error('Error fetching OGE questions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Shuffle and take the required count
    const shuffled = data.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count) as OgeQuestion[];
    
  } catch (error) {
    console.error('Error in getQuestionsBySkills:', error);
    return [];
  }
};

export const getRandomQuestionBySkill = async (skillId: number): Promise<OgeQuestion | null> => {
  try {
    const { data, error } = await supabase
      .from('oge_math_skills_questions')
      .select('*')
      .eq('skills', skillId);

    if (error) {
      console.error('Error fetching question by skill:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Return random question
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex] as OgeQuestion;
    
  } catch (error) {
    console.error('Error in getRandomQuestionBySkill:', error);
    return null;
  }
};