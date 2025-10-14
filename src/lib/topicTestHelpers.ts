import { modulesRegistry } from './modules.registry';

/**
 * Get all non-advanced skills for a topic test
 * Excludes exercises marked as isAdvanced
 * Duplicates skills to reach 6 questions if needed
 */
export const getTopicTestSkills = (
  moduleSlug: string,
  topicId: string
): number[] => {
  const module = modulesRegistry[moduleSlug];
  if (!module || !module.getExerciseData) return [];

  const topic = module.topics.find(t => t.id === topicId);
  if (!topic) return [];

  const allSkills = new Set<number>();

  // Collect skills from all exercises, excluding advanced ones
  for (let i = 0; i < topic.exercises; i++) {
    const exercise = module.getExerciseData(topicId, i);
    if (!exercise.isAdvanced && exercise.skills.length > 0) {
      exercise.skills.forEach(skill => allSkills.add(skill));
    }
  }

  const uniqueSkills = Array.from(allSkills);
  
  // Duplicate skills to reach 6 questions
  if (uniqueSkills.length === 0) return [];
  
  const result: number[] = [];
  while (result.length < 6) {
    result.push(...uniqueSkills);
  }
  
  return result.slice(0, 6);
};

/**
 * Get the number of questions for a topic test
 * Always 6 questions (skills are duplicated if needed)
 */
export const getTopicTestQuestionCount = (skills: number[]): number => {
  return 6;
};

/**
 * Calculate progress status based on correct answers
 * For 6 questions:
 * - 6 correct = mastered (100%)
 * - 5 or 4 correct = proficient (67-83%)
 * - 3 or 2 correct = familiar (33-50%)
 * - 1 or 0 correct = attempted (0-17%)
 * 
 * For fewer questions, uses similar percentages
 */
export const getTopicTestStatus = (
  correctCount: number,
  totalCount: number
): 'mastered' | 'proficient' | 'familiar' | 'attempted' | 'not_started' => {
  if (totalCount === 0) return 'not_started';
  
  const percentage = (correctCount / totalCount) * 100;
  
  // 100% = mastered
  if (percentage === 100) return 'mastered';
  
  // 67-99% = proficient
  if (percentage >= 67) return 'proficient';
  
  // 33-66% = familiar
  if (percentage >= 33) return 'familiar';
  
  // 1-32% or 0% = attempted
  return 'attempted';
};
