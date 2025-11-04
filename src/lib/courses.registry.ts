import { modulesRegistry } from './modules.registry';

export type CourseId = 'oge-math' | 'ege-basic' | 'ege-advanced' | 'essay-checking';

export interface Course {
  id: CourseId;
  numericId: number;
  title: string;
  tag: string;
  homeRoute: string;
  staticRoutes: string[];
  topicsUrl: string;
}

export const COURSES: Record<CourseId, Course> = {
  'oge-math': {
    id: 'oge-math',
    numericId: 1,
    title: 'Математика ОГЭ',
    tag: 'OGE',
    homeRoute: '/ogemath',
    staticRoutes: [
      '/ogemath',
      '/homework',
      '/cellard-lp2',
      '/textbook',
      '/digital-textbook',
      '/ogemath-mock',
      '/ogemath-practice',
      '/ogemath-progress2',
      '/ogemath-revision',
      '/practice-by-number-ogemath',
      '/topics',
      '/homework-fipi-practice'
    ],
    topicsUrl: 'https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/jsons_for_topic_skills/ogemath_topics_only_with_names.json'
  },
  'ege-basic': {
    id: 'ege-basic',
    numericId: 2,
    title: 'Математика ЕГЭ (База)',
    tag: 'EGE Basic',
    homeRoute: '/egemathbasic',
    staticRoutes: [
      '/egemathbasic',
      '/egemathbasic-practice',
      '/egemathbasic-progress',
      '/practice-by-number-egebasicmath',
      '/homework-egeb',
      '/textbook-base',
      '/platformogeb'
    ],
    topicsUrl: 'https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/jsons_for_topic_skills/EGE_math_basic_topicsonly_with_names.json'
  },
  'ege-advanced': {
    id: 'ege-advanced',
    numericId: 3,
    title: 'Математика ЕГЭ (Профиль)',
    tag: 'EGE Profi',
    homeRoute: '/egemathprof',
    staticRoutes: [
      '/egemathprof',
      '/egemathprof-practice',
      '/egemathprof-progress',
      '/egemathprof-revision',
      '/egemathprof-mock',
      '/practice-by-number-egeprofmath',
      '/homework-egeprof',
      '/textbook-prof',
      '/platformogep'
    ],
    topicsUrl: 'https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/jsons_for_topic_skills/ege_math_profil_topics_only_with_names.json'
  },
  'essay-checking': {
    id: 'essay-checking',
    numericId: 4,
    title: 'Проверка сочинений по ЕГЭ и ОГЭ',
    tag: 'Essays',
    homeRoute: '/egeruses2',
    staticRoutes: ['/egeruses2', '/egeruses-analytics'],
    topicsUrl: ''
  }
};

// Helper to get course from module slug
export function getCourseFromModuleSlug(moduleSlug: string): Course | null {
  const module = modulesRegistry[moduleSlug];
  if (module?.courseId) {
    return COURSES[module.courseId] || null;
  }
  return null;
}

// Helper to get course from topic number
export function getCourseFromTopicNumber(topicNumber: string): Course | null {
  // Topics 1.x through 7.x belong to OGE Math
  // This can be extended based on topic numbering scheme
  const firstDigit = topicNumber.split('.')[0];
  const topicNum = parseInt(firstDigit);
  
  if (topicNum >= 1 && topicNum <= 7) {
    return COURSES['oge-math'];
  }
  // Add logic for EGE topics when they're added
  
  return null;
}

// Enhanced helper to get course from current route
export function getCourseFromRoute(pathname: string): Course | null {
  // 1. Collect all routes with their courses and sort by length (longest first)
  // This prevents partial matches like /homework matching /homework-egeb
  const allRoutes = Object.entries(COURSES).flatMap(([_, course]) =>
    course.staticRoutes.map(route => ({ route, course }))
  );
  
  // Sort by route length descending (longest/most specific first)
  allRoutes.sort((a, b) => b.route.length - a.route.length);
  
  for (const { route, course } of allRoutes) {
    // Exact match or child path match (e.g., /homework-egeb or /homework-egeb/results)
    if (pathname === route || pathname.startsWith(route + '/')) {
      return course;
    }
  }
  
  // 2. Check if it's a module route: /module/:moduleSlug
  const moduleMatch = pathname.match(/^\/module\/([^/]+)/);
  if (moduleMatch) {
    return getCourseFromModuleSlug(moduleMatch[1]);
  }
  
  // 3. Check if it's a topic route: /topic/:topicNumber
  const topicMatch = pathname.match(/^\/topic\/([^/]+)/);
  if (topicMatch) {
    return getCourseFromTopicNumber(topicMatch[1]);
  }
  
  return null;
}

export const courseIdToNumber: Record<CourseId, number> = {
  'oge-math': 1,
  'ege-basic': 2,
  'ege-advanced': 3,
  'essay-checking': 4,
};

export interface Topic {
  name: string;
  number?: string;
  importance?: number;
}
