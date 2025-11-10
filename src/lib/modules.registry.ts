interface VideoData {
  videoId: string;
  title: string;
  description: string;
}

interface TopicContent {
  id: string;
  title: string;
  videos: number;
  articles: number;
  exercises: number;
  videoData?: VideoData[];
  description?: string;
}

interface QuizContent {
  id: string;
  title: string;
  description: string;
}

interface ExerciseConfig {
  title: string;
  skills: number[];
  questionCount?: number;
  isAdvanced?: boolean;
  isTest?: boolean;
  isMidTest?: boolean;
  isExam?: boolean;
}

interface ModuleConfig {
  courseId: 'oge-math' | 'ege-basic' | 'ege-advanced';
  slug: string;
  moduleNumber: number;
  title: string;
  subtitle: string;
  masteryPoints: number;
  skillsDescription: string;
  topics: TopicContent[];
  quizzes: QuizContent[];
  topicMapping: string[];
  orderedContent: Array<{ type: 'topic' | 'quiz'; topicIndex?: number; quizIndex?: number; isFinalTest?: boolean }>;
  getExerciseData?: (topicId: string, exerciseIndex: number) => ExerciseConfig;
  getQuizData?: (quizId: string) => ExerciseConfig | null;
  articleContent?: { [topicId: string]: { title: string; content: string } };
}

export const modulesRegistry: Record<string, ModuleConfig> = {
  'numbers-calculations': {
    courseId: 'oge-math',
    slug: 'numbers-calculations',
    moduleNumber: 1,
    title: 'Модуль 1: Числа и вычисления',
    subtitle: '5 тем • 11 видео • 5 статей • 12 упражнений',
    masteryPoints: 1800,
    skillsDescription: 'Навыки: Натуральные числа, Дроби, Проценты, Рациональные числа, Действительные числа',
    topicMapping: ['1.1', '1.2', '1.3', '1.4', '1.5'],
    topics: [
      {
        id: 'natural-integers',
        title: 'Натуральные и целые числа',
        videos: 2,
        articles: 1,
        exercises: 2,
        videoData: [
          {
            videoId: 'WxXZaP8Y8pI',
            title: 'Натуральные и целые числа - Видео 1',
            description: 'Изучение основ натуральных и целых чисел'
          },
          {
            videoId: 'fjdeo6anRY4',
            title: 'Натуральные и целые числа - Видео 2',
            description: 'Продолжение изучения натуральных и целых чисел'
          }
        ]
      },
      {
        id: 'fractions-percentages',
        title: 'Дроби и проценты',
        videos: 2,
        articles: 1,
        exercises: 3
      },
      {
        id: 'rational-numbers',
        title: 'Рациональные числа и арифметические действия',
        videos: 4,
        articles: 1,
        exercises: 3
      },
      {
        id: 'real-numbers',
        title: 'Действительные числа',
        videos: 1,
        articles: 1,
        exercises: 2
      },
      {
        id: 'approximations',
        title: 'Приближённые вычисления',
        videos: 1,
        articles: 1,
        exercises: 2
      }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Повысьте уровень навыков и получите до 400 баллов мастерства' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Повысьте уровень навыков и получите до 400 баллов мастерства' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 2 },
      { type: 'topic', topicIndex: 3 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'topic', topicIndex: 4 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      if (topicId === 'natural-integers') {
        return exerciseIndex === 0
          ? { title: 'Основы натуральных и целых чисел', skills: [1, 2, 3] }
          : { title: 'Работа с числами', skills: [4, 5] };
      }
      if (topicId === 'fractions-percentages') {
        if (exerciseIndex === 0) return { title: 'Дроби', skills: [6, 195] };
        if (exerciseIndex === 1) return { title: 'Проценты', skills: [7, 8, 9] };
        if (exerciseIndex === 2) return { title: 'Сложные дроби', skills: [10], isAdvanced: true };
      }
      if (topicId === 'rational-numbers') {
        if (exerciseIndex === 0) return { title: 'Рациональные числа', skills: [11, 12, 13] };
        if (exerciseIndex === 1) return { title: 'Арифметические действия', skills: [14, 15, 16] };
        if (exerciseIndex === 2) return { title: 'Операции с рациональными числами', skills: [17, 180] };
      }
      if (topicId === 'real-numbers') {
        if (exerciseIndex === 0) return { title: 'Действительные числа', skills: [18, 19] };
        if (exerciseIndex === 1) return { title: 'Операции с действительными числами', skills: [20, 197] };
      }
      if (topicId === 'approximations') {
        if (exerciseIndex === 0) return { title: 'Приближённые вычисления', skills: [21, 22] };
        if (exerciseIndex === 1) return { title: 'Округление', skills: [23] };
      }
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return {
          title: 'Тест 1: Натуральные числа и дроби',
          skills: [1, 2, 3, 4, 5, 6, 7, 8, 9, 195],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-2') {
        return {
          title: 'Тест 2: Рациональные и действительные числа',
          skills: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 180, 197],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        return {
          title: 'Итоговый экзамен модуля',
          skills: Array.from({ length: 23 }, (_, i) => i + 1).concat([180, 195, 197]),
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    },
    articleContent: {
      'natural-integers': {
        title: 'Натуральные и целые числа — конспект',
        content: `<h1>Натуральные и целые числа — конспект</h1>

<div class="intro">
  <p>Краткий конспект по ключевым определениям и формулам: натуральные и целые числа, научная форма, делимость, признаки делимости, НОД и НОК.</p>
</div>

<div class="section-badge badge-theory">Теория</div>
<div class="theory">

  <p><b>Определения</b></p>
  <div class="definition-card">
    Натуральные числа: множество \\( \\mathbb{N} = \\{1,2,3,\\dots\\} \\).<br>
    Целые числа: множество \\( \\mathbb{Z} = \\{\\dots,-2,-1,0,1,2,\\dots\\} \\).<br>
    Модуль числа: \\( |a| = \\begin{cases} a, & a \\ge 0 \\\\ -a, & a < 0 \\end{cases} \\).<br>
    Порядок: для \\( a,b \\in \\mathbb{Z} \\) верно одно из: \\( a<b \\), \\( a=b \\), \\( a>b \\).
  </div>

  <p><b>Мини-глоссарий</b></p>
  <ul class="mini-glossary">
    <li><b>Чётность:</b> \\(a\\) чётное, если \\(2\\mid a\\); нечётное — иначе.</li>
    <li><b>Делимость:</b> \\(b\\mid a \\iff \\exists k\\in\\mathbb{Z}: a=b\\cdot k\\).</li>
    <li><b>Кратное:</b> число вида \\(a=b\\cdot k\\).</li>
  </ul>

  <p><b>Ключевые свойства операций в \\( \\mathbb{Z} \\)</b></p>
  <ul>
    <li>Замкнутость: \\( a\\pm b,\\, a\\cdot b \\in \\mathbb{Z} \\).</li>
    <li>Коммутативность и ассоциативность для \\( + \\) и \\( \\cdot \\); дистрибутивность: \\( a(b+c)=ab+ac \\).</li>
    <li>Правила знаков: \\( (+)\\cdot(+)=+,\\; (+)\\cdot(-)=-,\\; (-)\\cdot(-)=+ \\).</li>
  </ul>

  <div class="section-badge badge-theory">Научная форма числа</div>
  <div class="definition-card">
    Число в научной форме: \\( a\\times 10^{b} \\), где \\( 1\\le a<10 \\) и \\( b\\in\\mathbb{Z} \\).<br>
    Сложение/вычитание через приведение показателей; умножение и деление:<br>
    \\[
      (a_1\\cdot 10^{b_1})(a_2\\cdot 10^{b_2})=(a_1a_2)\\cdot 10^{\\,b_1+b_2},
      \\qquad
      \\frac{a_1\\cdot 10^{b_1}}{a_2\\cdot 10^{b_2}}=\\Big(\\frac{a_1}{a_2}\\Big)\\cdot 10^{\\,b_1-b_2}.
    \\]
  </div>

  <div class="section-badge badge-theory">Делимость</div>
  <div class="definition-card">
    Основное определение: \\( b\\mid a \\iff \\exists k\\in\\mathbb{Z}: a=bk \\).<br>
    Базовые свойства:<br>
    \\(\\;\\)• Транзитивность: \\( b\\mid a \\) и \\( a\\mid c \\Rightarrow b\\mid c \\).<br>
    \\(\\;\\)• Линейная комбинация: если \\( d\\mid a \\) и \\( d\\mid b \\), то \\( d\\mid (ax+by) \\) для любых \\( x,y\\in\\mathbb{Z} \\).<br>
    \\(\\;\\)• Если \\( b\\mid a \\), то \\( b\\mid ac \\) для любого \\( c\\in\\mathbb{Z} \\).
  </div>

  <p><b>Признаки делимости</b></p>
  <ul>
    <li>На \\(2\\): последняя цифра чётная \\((0,2,4,6,8)\\).</li>
    <li>На \\(3\\): сумма цифр кратна \\(3\\).</li>
    <li>На \\(5\\): последняя цифра \\(0\\) или \\(5\\).</li>
    <li>На \\(9\\): сумма цифр кратна \\(9\\).</li>
    <li>На \\(10\\): последняя цифра \\(0\\).</li>
  </ul>

  <div class="section-badge badge-theory">НОД и НОК</div>
  <div class="definition-card">
    НОД \\( (a,b) \\) — наибольшее \\( d\\in\\mathbb{Z}_{\\ge 0} \\), такое что \\( d\\mid a \\) и \\( d\\mid b \\).<br>
    НОК \\( [a,b] \\) — наименьшее положительное число, кратное и \\( a \\), и \\( b \\).<br>
    Связь: \\[
      \\gcd(a,b)\\cdot \\operatorname{lcm}(a,b)=|a\\cdot b|.
    \\]
    Разложение по простым: если \\( a=\\prod p_i^{\\alpha_i},\\; b=\\prod p_i^{\\beta_i} \\), то
    \\[
      \\gcd(a,b)=\\prod p_i^{\\min(\\alpha_i,\\beta_i)},\\qquad
      \\operatorname{lcm}(a,b)=\\prod p_i^{\\max(\\alpha_i,\\beta_i)}.
    \\]
    Евклидов алгоритм: \\( \\gcd(a,b)=\\gcd(b,\\,a\\bmod b) \\) до нулевого остатка.
  </div>

</div>

<div class="section-badge badge-conclusion">Заключение</div>
<div class="conclusion">
  <p>
    Целые числа образуют основу для изучения арифметики и алгебры. Понимание структуры множества \\(\\mathbb{Z}\\), 
    принципов делимости и методов нахождения НОД/НОК критически важно для решения задач во всех разделах математики.
  </p>
  <p>
    Практическое применение этих знаний включает решение диофантовых уравнений, работу с дробями, анализ 
    периодичности функций и многие другие задачи математики и её приложений.
  </p>
</div>`
      }
    }
  },

 'algebraic-expressions': {
    courseId: 'oge-math',
    slug: 'algebraic-expressions',
    moduleNumber: 2,
    title: 'Модуль 2: Алгебраические выражения',
    subtitle: '5 тем • 15 видео • 5 статей • 14 упражнений',
    masteryPoints: 1500,
    skillsDescription: 'Навыки: Выражения, Степени, Многочлены, Дроби, Корни',
    topicMapping: ['2.1', '2.2', '2.3', '2.4', '2.5'],
    topics: [
      { id: 'literal-expressions', title: 'Буквенные выражения', videos: 3, articles: 1, exercises: 2 },
      { id: 'powers', title: 'Степени', videos: 3, articles: 1, exercises: 3 },
      { id: 'polynomials', title: 'Многочлены', videos: 3, articles: 1, exercises: 3 },
      // ↓ was 3, now 2
      { id: 'algebraic-fractions', title: 'Алгебраические дроби', videos: 3, articles: 1, exercises: 2 },
      { id: 'arithmetic-roots', title: 'Арифметические корни', videos: 3, articles: 1, exercises: 3 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Повысьте уровень навыков и получите до 400 баллов мастерства' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Повысьте уровень навыков и получите до 400 баллов мастерства' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 2 },
      { type: 'topic', topicIndex: 3 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'topic', topicIndex: 4 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      if (topicId === 'literal-expressions') {
        return exerciseIndex === 0
          ? { title: 'Буквенные выражения: подстановка и упрощение', skills: [35, 36] }
          : { title: 'Буквенные выражения: формулы и преобразования', skills: [37, 38] };
      }
      if (topicId === 'powers') {
        if (exerciseIndex === 0) return { title: 'Степени: свойства и упрощение', skills: [39, 40] };
        if (exerciseIndex === 1) return { title: 'Степени: степень произведения и дроби', skills: [41, 42, 43] };
        if (exerciseIndex === 2) return { title: 'Показательные выражения и сравнение', skills: [44] };
      }
      if (topicId === 'polynomials') {
        if (exerciseIndex === 0) return { title: 'Многочлены: приведение подобных', skills: [45, 46] };
        if (exerciseIndex === 1) return { title: 'Многочлены: разложение на множители', skills: [47, 48] };
        if (exerciseIndex === 2) return { title: 'Многочлены: формулы сокращённого умножения', skills: [49, 179] };
      }
      if (topicId === 'algebraic-fractions') {
        if (exerciseIndex === 0) return { title: 'Алгебраические дроби: сокращение и ОДЗ', skills: [50, 51] };
        if (exerciseIndex === 1) return { title: 'Алгебраические дроби: общий знаменатель, сложение/вычитание', skills: [52, 53] };
        // (exerciseIndex === 2) — удалено
      }
      if (topicId === 'arithmetic-roots') {
        if (exerciseIndex === 0) return { title: 'Корни: свойства и извлечение', skills: [54, 55] };
        if (exerciseIndex === 1) return { title: 'Корни: рационализация знаменателя', skills: [56] };
        if (exerciseIndex === 2) return { title: 'Смешанные выражения с корнями', skills: [57] };
      }
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return {
          title: 'Тест 1: Буквенные выражения и степени',
          skills: Array.from({ length: 10 }, (_, i) => 35 + i),
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-2') {
        return {
          title: 'Тест 2: Многочлены и алгебраические дроби',
          skills: [47, 48, 49, 50, 51, 52, 53, 179],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        return {
          title: 'Итоговый экзамен модуля',
          skills: [...Array.from({ length: 23 }, (_, i) => 35 + i), 179],
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  },

  'equations-inequalities': {
    courseId: 'oge-math',
    slug: 'equations-inequalities',
    moduleNumber: 3,
    title: 'Модуль 3: Уравнения и неравенства',
    subtitle: '3 темы • 9 видео • 3 статьи • 13 упражнений',
    masteryPoints: 1350,
    skillsDescription: 'Навыки: Уравнения, Неравенства, Системы, Текстовые задачи',
    topicMapping: ['3.1', '3.2', '3.3'],
    topics: [
      { id: 'equations-systems', title: 'Уравнения и системы', videos: 3, articles: 1, exercises: 5 },
      { id: 'inequalities-systems', title: 'Неравенства и системы', videos: 3, articles: 1, exercises: 4 },
      { id: 'word-problems', title: 'Текстовые задачи', videos: 3, articles: 1, exercises: 4 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 3.1: Уравнения и системы' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 3.2: Неравенства и системы' },
      { id: 'quiz-3', title: 'Тест 3', description: 'Проверьте темы 3.3: Текстовые задачи' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 2 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      if (topicId === 'equations-systems') {
        if (exerciseIndex === 0) return { title: 'Линейные/квадратные уравнения, системы — базовые', skills: [58, 59] };
        if (exerciseIndex === 1) return { title: 'Рациональные уравнения', skills: [60] };
        if (exerciseIndex === 2) return { title: 'Иррациональные/модульные уравнения', skills: [61] };
        if (exerciseIndex === 3) return { title: 'Рациональные системы уравнений', skills: [62] };
        if (exerciseIndex === 4) return { title: 'Параметры и продвинутые задачи*', skills: [188, 190, 191], isAdvanced: true };
      }
      if (topicId === 'inequalities-systems') {
        if (exerciseIndex === 0) return { title: 'Линейные/квадратные неравенства — базовые', skills: [63, 64] };
        if (exerciseIndex === 1) return { title: 'Рациональные неравенства', skills: [65] };
        if (exerciseIndex === 2) return { title: 'Иррациональные/модульные неравенства', skills: [66] };
        if (exerciseIndex === 3) return { title: 'Системы неравенств', skills: [67, 68] };
      }
      if (topicId === 'word-problems') {
        if (exerciseIndex === 0) return { title: 'Текстовые задачи на уравнение', skills: [69] };
        if (exerciseIndex === 1) return { title: 'Текстовые задачи: смеси, проценты, движение', skills: Array.from({ length: 5 }, (_, i) => 70 + i) };
        if (exerciseIndex === 2) return { title: 'Задачи на прогрессию и пропорции', skills: [75, 184] };
        if (exerciseIndex === 3) return { title: 'Сложные текстовые задачи*', skills: [185], isAdvanced: true };
      }
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return {
          title: 'Тест 1: Уравнения и системы',
          skills: Array.from({ length: 5 }, (_, i) => 58 + i),
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-2') {
        return {
          title: 'Тест 2: Неравенства и системы',
          skills: Array.from({ length: 6 }, (_, i) => 63 + i),
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-3') {
        return {
          title: 'Тест 3: Текстовые задачи',
          skills: [...Array.from({ length: 7 }, (_, i) => 69 + i), 184],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        return {
          title: 'Итоговый экзамен модуля',
          skills: [...Array.from({ length: 18 }, (_, i) => 58 + i), 184],
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  },


  'sequences': {
    courseId: 'oge-math',
    slug: 'sequences',
    moduleNumber: 4,
    title: 'Модуль 4: Числовые последовательности',
    subtitle: '2 темы • 6 видео • 2 статьи • 7 упражнений',
    masteryPoints: 1650,
    skillsDescription: 'Навыки: Последовательности, Арифметическая прогрессия, Геометрическая прогрессия',
    topicMapping: ['4.1', '4.2'],
    topics: [
      { id: 'sequences', title: 'Последовательности', videos: 3, articles: 1, exercises: 2 },
      { id: 'progressions', title: 'Арифметическая и геометрическая прогрессии. Формула сложных процентов', videos: 3, articles: 1, exercises: 5 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1: Арифметическая прогрессия', description: 'Проверьте навыки по арифметической прогрессии' },
      { id: 'quiz-2', title: 'Тест 2: Геометрическая прогрессия', description: 'Проверьте навыки по геометрической прогрессии' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      if (topicId === 'sequences') {
        if (exerciseIndex === 0) return { title: 'Основные последовательности', skills: [76, 77] };
        if (exerciseIndex === 1) return { title: 'Работа с последовательностями', skills: [78, 79] };
      }
      if (topicId === 'progressions') {
        if (exerciseIndex === 0) return { title: 'Введение в арифметическую прогрессию', skills: [80, 81, 82] };
        if (exerciseIndex === 1) return { title: 'Текстовые задачи на арифметическую прогрессию', skills: [83] };
        if (exerciseIndex === 2) return { title: 'Введение в геометрическую прогрессию', skills: [84, 85, 86] };
        if (exerciseIndex === 3) return { title: 'Текстовые задачи на геометрическую прогрессию', skills: [87] };
        if (exerciseIndex === 4) return { title: 'Сложные проценты', skills: [88] };
      }
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return {
          title: 'Тест 1: Арифметическая прогрессия',
          skills: [80, 81, 82, 83],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-2') {
        return {
          title: 'Тест 2: Геометрическая прогрессия',
          skills: [84, 85, 86, 87],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        return {
          title: 'Итоговый экзамен модуля',
          skills: Array.from({ length: 13 }, (_, i) => 76 + i), // 76–88
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  }, 


  'functions': {
    courseId: 'oge-math',
    slug: 'functions',
    moduleNumber: 5,
    title: 'Модуль 5: Функции',
    subtitle: '1 тема • 3 видео • 1 статья • 6 упражнений',
    masteryPoints: 1200,
    skillsDescription: 'Навыки: Свойства функций, Графики, Область определения, Монотонность',
    topicMapping: ['5.1'],
    topics: [
      { id: 'functions-properties', title: 'Свойства и графики функций', videos: 3, articles: 1, exercises: 6 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1: Основные свойства функций', description: 'Проверьте навыки 89–94' },
      { id: 'quiz-2', title: 'Тест 2: Графики функций', description: 'Проверьте навыки 96–99' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      if (topicId === 'functions-properties') {
        if (exerciseIndex === 0) return { title: 'Функции — основы', skills: [89, 90] };
        if (exerciseIndex === 1) return { title: 'Свойства функций', skills: [91, 92] };
        if (exerciseIndex === 2) return { title: 'Область определения функций', skills: [93, 94] };
        if (exerciseIndex === 3) return { title: 'Графики функций', skills: [96, 97] };
        if (exerciseIndex === 4) return { title: 'Монотонность и экстремумы', skills: [98, 99] };
        if (exerciseIndex === 5) return { title: 'Сложные задачи по функциям', skills: [95, 186, 187, 100, 101, 102], isAdvanced: true };
      }
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return {
          title: 'Тест 1: Основные свойства функций',
          skills: [89, 90, 91, 92, 93, 94],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-2') {
        return {
          title: 'Тест 2: Графики функций',
          skills: [96, 97, 98, 99],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        return {
          title: 'Итоговый экзамен модуля',
          skills: [...Array.from({ length: 6 }, (_, i) => 89 + i), ...Array.from({ length: 4 }, (_, i) => 96 + i)], // 89–94, 96–99
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  },


  'coordinates': {
    courseId: 'oge-math',
    slug: 'coordinates',
    moduleNumber: 6,
    title: 'Модуль 6: Координаты на прямой и плоскости',
    subtitle: '2 темы • 6 видео • 2 статьи • 4 упражнения',
    masteryPoints: 900,
    skillsDescription: 'Навыки: Координатная прямая, Интервалы и неравенства, Координаты на плоскости',
    topicMapping: ['6.1', '6.2'],
    topics: [
      { id: 'coordinate-line', title: 'Координатная прямая', videos: 3, articles: 1, exercises: 3 },
      { id: 'cartesian-coordinates', title: 'Координаты на плоскости', videos: 3, articles: 1, exercises: 1 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1: Координатная прямая', description: 'Проверьте навыки 103–109' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      if (topicId === 'coordinate-line') {
        if (exerciseIndex === 0) return { title: 'Отметка точек и расстояния на прямой', skills: [103, 104] };
        if (exerciseIndex === 1) return { title: 'Модули, интервалы и неравенства', skills: [105, 106, 107] };
        if (exerciseIndex === 2) return { title: 'Сравнение и утверждения о числах', skills: [108, 109] };
      }
      if (topicId === 'cartesian-coordinates') {
        if (exerciseIndex === 0) return { title: 'Построение и расстояния на плоскости', skills: [110, 111] };
      }
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return {
          title: 'Тест 1: Координатная прямая',
          skills: [103, 104, 105, 106, 107, 108, 109],
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        return {
          title: 'Итоговый экзамен модуля',
          skills: Array.from({ length: 9 }, (_, i) => 103 + i), // 103–111
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  },


  'geometry': {
    courseId: 'oge-math',
    slug: 'geometry',
    moduleNumber: 7,
    title: 'Модуль 7: Геометрия',
    subtitle: '7 тем • 21 видео • 7 статей • 26 упражнений',
    masteryPoints: 3150,
    skillsDescription:
      'Навыки: Геометрические фигуры, Треугольники, Многоугольники, Окружности, Измерения, Векторы',
    topicMapping: ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7'],
    topics: [
      { id: 'geometric-figures', title: 'Геометрические фигуры', videos: 3, articles: 1, exercises: 3 },
      { id: 'triangles', title: 'Треугольники', videos: 3, articles: 1, exercises: 3 },
      { id: 'polygons', title: 'Многоугольники', videos: 3, articles: 1, exercises: 4 },
      { id: 'circles', title: 'Окружность и круг', videos: 3, articles: 1, exercises: 3 },
      { id: 'measurements', title: 'Измерения', videos: 3, articles: 1, exercises: 6 },
      { id: 'vectors', title: 'Векторы', videos: 3, articles: 1, exercises: 3 },
      { id: 'extra-geometry', title: 'Дополнительные темы по геометрии', videos: 3, articles: 1, exercises: 4 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1: Базовая геометрия и треугольники', description: 'Проверьте навыки 7.1–7.2 (112–124)' },
      { id: 'quiz-2', title: 'Тест 2: Многоугольники и окружности', description: 'Проверьте навыки 7.3–7.4 (125–138)' },
      { id: 'quiz-3', title: 'Тест 3: Измерения и векторы', description: 'Проверьте навыки 7.5–7.6 (139–157)' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 0 },          // Test 1 (112–124)
      { type: 'topic', topicIndex: 2 },
      { type: 'topic', topicIndex: 3 },
      { type: 'quiz', quizIndex: 1 },          // Test 2 (125–138)
      { type: 'topic', topicIndex: 4 },
      { type: 'topic', topicIndex: 5 },
      { type: 'quiz', quizIndex: 2 },          // Test 3 (139–157)
      { type: 'topic', topicIndex: 6 },        // Доп. темы
      { type: 'quiz', isFinalTest: true }      // Final (112–157)
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      // 7.1 Геометрические фигуры
      if (topicId === 'geometric-figures') {
        if (exerciseIndex === 0) return { title: 'Точки, прямые и отрезки', skills: [112] };
        if (exerciseIndex === 1) return { title: 'Базовые фигуры и измерение углов', skills: [112, 114] };
        if (exerciseIndex === 2) return { title: 'Параллельность, перпендикулярность и серединный перпендикуляр', skills: [115, 116] };
      }
  
      // 7.2 Треугольники
      if (topicId === 'triangles') {
        if (exerciseIndex === 0) return { title: 'Виды треугольников и элементы. Углы треугольника', skills: [117, 118, 119] };
        if (exerciseIndex === 1) return { title: 'Равенство и подобие. Неравенство треугольника', skills: [120, 121, 122] };
        if (exerciseIndex === 2) return { title: 'Прямоугольный треугольник: Пифагор и тригонометрия', skills: [123, 124] };
      }
  
      // 7.3 Многоугольники
      if (topicId === 'polygons') {
        if (exerciseIndex === 0) return { title: 'Виды, элементы и углы многоугольников', skills: [125, 126, 127] };
        if (exerciseIndex === 1) return { title: 'Правильные многоугольники и разбиения', skills: [128, 129] };
        if (exerciseIndex === 2) return { title: 'Четырёхугольники: прямоугольник, ромб, квадрат', skills: [130, 131, 132] };
        if (exerciseIndex === 3) return { title: 'Параллелограмм и трапеция', skills: [133, 134] };
      }
  
      // 7.4 Окружность и круг
      if (topicId === 'circles') {
        if (exerciseIndex === 0) return { title: 'Элементы окружности и круга', skills: [135] };
        if (exerciseIndex === 1) return { title: 'Центральные и вписанные углы', skills: [136] };
        if (exerciseIndex === 2) return { title: 'Вписанные и описанные фигуры', skills: [137, 138] };
      }
  
      // 7.5 Измерения
      if (topicId === 'measurements') {
        if (exerciseIndex === 0) return { title: 'Длины: отрезки, ломаные, окружности', skills: [139, 140, 141, 142] };
        if (exerciseIndex === 1) return { title: 'Градусы и дуги окружности', skills: [143, 144] };
        if (exerciseIndex === 2) return { title: 'Площадь прямоугольника', skills: [146] }; // 146–146 → 146
        if (exerciseIndex === 3) return { title: 'Площади: параллелограмм, трапеция, треугольник', skills: [147, 148, 149] };
        if (exerciseIndex === 4) return { title: 'Площадь круга и его частей', skills: [150] };
        if (exerciseIndex === 5) return { title: '★ Продвинутое: площади, объёмы и решётка', skills: [151, 152, 153], isAdvanced: true };
      }
  
      // 7.6 Векторы
      if (topicId === 'vectors') {
        if (exerciseIndex === 0) return { title: 'Векторы: направление, длина и координаты', skills: [154, 155] };
        if (exerciseIndex === 1) return { title: 'Операции с векторами: сложение/вычитание, умножение на число', skills: [156, 157] };
        if (exerciseIndex === 2) return { title: '★ Продвинутое: скалярное произведение', skills: [196], isAdvanced: true };
      }
  
      // 7.7 Дополнительные темы (для высоко мотивированных)
      if (topicId === 'extra-geometry') {
        if (exerciseIndex === 0) return { title: 'Дополнительно: анализ геометрических высказываний', skills: [158], isAdvanced: true };
        if (exerciseIndex === 1) return { title: 'Дополнительно: работа с чертежами', skills: [159], isAdvanced: true };
        if (exerciseIndex === 2) return { title: 'Дополнительно: задачи на доказательство', skills: [160], isAdvanced: true };
        if (exerciseIndex === 3) return { title: '★ Дополнительно: задачи повышенной сложности', skills: [161], isAdvanced: true };
      }
  
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        // 7.1–7.2 → 112–124
        return {
          title: 'Тест 1: Базовая геометрия и треугольники',
          skills: Array.from({ length: 13 }, (_, i) => 112 + i), // 112..124
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-2') {
        // 7.3–7.4 → 125–138
        return {
          title: 'Тест 2: Многоугольники и окружности',
          skills: Array.from({ length: 14 }, (_, i) => 125 + i), // 125..138
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-3') {
        // 7.5–7.6 → 139–157
        return {
          title: 'Тест 3: Измерения и векторы',
          skills: Array.from({ length: 19 }, (_, i) => 139 + i), // 139..157
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        // Final exam: 112–157
        return {
          title: 'Итоговый экзамен модуля',
          skills: Array.from({ length: 46 }, (_, i) => 112 + i), // 112..157
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  },  


  'probability-statistics': {
    courseId: 'oge-math',
    slug: 'probability-statistics',
    moduleNumber: 8,
    title: 'Модуль 8: Вероятность и статистика',
    subtitle: '5 тем • 15 видео • 5 статей • 11 упражнений',
    masteryPoints: 1350,
    skillsDescription: 'Навыки: Статистика, Вероятность, Комбинаторика, Множества, Графы',
    topicMapping: ['8.1', '8.2', '8.3', '8.4', '8.5'],
    topics: [
      { id: 'descriptive-stats', title: 'Описательная статистика', videos: 3, articles: 1, exercises: 3 },
      { id: 'probability', title: 'Вероятность', videos: 3, articles: 1, exercises: 2 },
      { id: 'combinatorics', title: 'Комбинаторика', videos: 3, articles: 1, exercises: 2 },
      { id: 'sets', title: 'Множества', videos: 3, articles: 1, exercises: 2 },
      { id: 'graphs', title: 'Графы', videos: 3, articles: 1, exercises: 2 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Статистика и вероятность (162–168)' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Комбинаторика и множества (169–174)' },
      { id: 'module-exam', title: 'Итоговый тест', description: 'Проверьте все навыки модуля 8' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 }, // 8.1
      { type: 'topic', topicIndex: 1 }, // 8.2
      { type: 'quiz', quizIndex: 0 },   // Test 1 (162–168)
      { type: 'topic', topicIndex: 2 }, // 8.3
      { type: 'topic', topicIndex: 3 }, // 8.4
      { type: 'quiz', quizIndex: 1 },   // Test 2 (169–174)
      { type: 'topic', topicIndex: 4 }, // 8.5 (Графы)
      { type: 'quiz', isFinalTest: true } // Итоговый тест модуля
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      // 8.1 Описательная статистика
      if (topicId === 'descriptive-stats') {
        if (exerciseIndex === 0) return { title: 'Сбор данных, таблицы и диаграммы', skills: [162, 163] };
        if (exerciseIndex === 1) return { title: 'Среднее арифметическое', skills: [164] };
        if (exerciseIndex === 2) return { title: 'Мода и медиана', skills: [165] };
      }
  
      // 8.2 Вероятность
      if (topicId === 'probability') {
        if (exerciseIndex === 0) return { title: 'События и простые вероятности', skills: [166, 167] };
        if (exerciseIndex === 1) return { title: 'Формулы вероятности в задачах', skills: [168] };
      }
  
      // 8.3 Комбинаторика
      if (topicId === 'combinatorics') {
        if (exerciseIndex === 0) return { title: 'Перестановки и размещения', skills: [169, 170] };
        if (exerciseIndex === 1) return { title: 'Сочетания и подсчёт по формулам', skills: [171, 172] };
      }
  
      // 8.4 Множества
      if (topicId === 'sets') {
        if (exerciseIndex === 0) return { title: 'Операции с множествами', skills: [173] };
        if (exerciseIndex === 1) return { title: 'Диаграммы Эйлера–Венна', skills: [174] };
      }
  
      // 8.5 Графы
      if (topicId === 'graphs') {
        if (exerciseIndex === 0) return { title: 'Графы: вершины и рёбра', skills: [175] };      // 175–175
        if (exerciseIndex === 1) return { title: 'Поиск путей и прикладные задачи', skills: [177, 178] };
      }
  
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        // 162–168
        return {
          title: 'Тест 1: Описательная статистика и вероятность',
          skills: Array.from({ length: 7 }, (_, i) => 162 + i), // 162..168
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'quiz-2') {
        // 169–174
        return {
          title: 'Тест 2: Комбинаторика и множества',
          skills: Array.from({ length: 6 }, (_, i) => 169 + i), // 169..174
          questionCount: 6,
          isTest: true
        };
      }
      if (quizId === 'module-exam') {
        return {
          title: 'Итоговый тест модуля',
          skills: [
            162, 163, 164, 165, 166, 167, 168,
            169, 170, 171, 172, 173, 174,
            175, 176, 177, 178
          ],
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  },  


  'applied-math': {
    courseId: 'oge-math',
    slug: 'applied-math',
    moduleNumber: 9,
    title: 'Модуль 9: Прикладная математика',
    subtitle: '2 темы • 6 видео • 2 статьи • 12 упражнений',
    masteryPoints: 900,
    skillsDescription: 'Навыки: Чтение графиков/таблиц, работа с данными, прикладные расчёты и графики',
    topicMapping: ['9.1', '9.2'],
    topics: [
      { id: 'applied-tasks', title: 'Прикладные задачи', videos: 3, articles: 1, exercises: 3 },
      { id: 'graphs-calculations', title: 'Графики и расчёты', videos: 3, articles: 1, exercises: 9 }
    ],
    quizzes: [
      // нет промежуточных тестов; только итоговый
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 }, // 9.1
      { type: 'topic', topicIndex: 1 }, // 9.2
      { type: 'quiz', isFinalTest: true } // Итоговый тест модуля
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      // 9.1 — Прикладные задачи (групповые тренировки)
      if (topicId === 'applied-tasks') {
        if (exerciseIndex === 0)
          return {
            title: 'Чтение графиков и диаграмм',
            skills: [24, 25, 198] // графики, диаграммы, таблицы
          };
        if (exerciseIndex === 1)
          return {
            title: 'Извлечение данных и переводы величин',
            skills: [199, 181, 192] // расписания/таблицы→продолжительность, извлечение данных, единицы измерения
          };
        if (exerciseIndex === 2)
          return {
            title: 'Стратегии решения и построение графиков',
            skills: [182, 183, 200] // краткая запись, анализ ошибок, построение по таблице
          };
      }
  
      // 9.2 — Графики и расчёты (каждый навык — отдельное упражнение)
      if (topicId === 'graphs-calculations') {
        const exercises = [
          { title: 'Квартиры: анализ и расчёты', skills: [26] },
          { title: 'Маршруты и карты: чтение схем', skills: [27] },
          { title: 'ОСАГО: расчёт страховых выплат', skills: [28] },
          { title: 'Тарифные планы: сравнение и выбор', skills: [29] },
          { title: 'Лист бумаги: форматы и разметка', skills: [30] },
          { title: 'Печи: режимы, расход, эффективность', skills: [31] },
          { title: 'Шины: параметры и подбор', skills: [32] },
          { title: 'Участки: размеры и планировка', skills: [33] },
          { title: 'Теплицы: площади и материалы', skills: [34] }
        ];
        return exercises[exerciseIndex] || { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
      }
  
      return { title: `Упражнение ${exerciseIndex + 1}`, skills: [] };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'module-exam') {
        // Итоговый экзамен: все указанные навыки
        return {
          title: 'Итоговый экзамен модуля',
          skills: [
            24, 25, 198, // графики/диаграммы/таблицы
            199, 181, 192, // расписания, извлечение данных, единицы
            182, 183, 200, // стратегии, анализ ошибок, построение графиков
            26, 27, 28, 29, 30, 31, 32, 33, 34 // прикладные задачи 9.2
          ],
          questionCount: 10,
          isExam: true
        };
      }
      return null;
    }
  },

  // ========== EGE BASIC MODULES ==========
  
  'ege-basic-numbers': {
    courseId: 'ege-basic',
    slug: 'ege-basic-numbers',
    moduleNumber: 1,
    title: 'Модуль 1: Числа и вычисления',
    subtitle: '8 тем • 24 видео • 8 статей • 16 упражнений',
    masteryPoints: 2000,
    skillsDescription: 'Навыки: Натуральные числа, Дроби, Проценты, Рациональные числа, Действительные числа, Приближённые вычисления, Работа с данными, Прикладная геометрия',
    topicMapping: ['1.1E', '1.2E', '1.3E', '1.4E', '1.5E', '1.6E', '1.7E', '1.8E'],
    topics: [
      { id: 'natural-integers', title: 'Натуральные и целые числа', videos: 3, articles: 1, exercises: 2, description: 'Изучение натуральных чисел, их свойств, признаков делимости, нахождения НОД и НОК' },
      { id: 'fractions-percentages', title: 'Дроби и проценты', videos: 3, articles: 1, exercises: 2, description: 'Работа с обыкновенными и десятичными дробями, вычисление процентов, процентные изменения' },
      { id: 'rational-numbers', title: 'Арифметический корень (n-й)', videos: 3, articles: 1, exercises: 2, description: 'Определение и свойства корней, арифметические операции с корнями, рационализация знаменателя' },
      { id: 'real-numbers', title: 'Степени', videos: 3, articles: 1, exercises: 2, description: 'Степени с целым и рациональным показателем, свойства степеней, операции со степенями' },
      { id: 'approximations', title: 'Тригонометрические функции (sin, cos, tg) как числа', videos: 3, articles: 1, exercises: 2, description: 'Тригонометрия в прямоугольном треугольнике, стандартные углы, обратные тригонометрические функции' },
      { id: 'data-graphs', title: 'Логарифм числа', videos: 3, articles: 1, exercises: 2, description: 'Определение логарифма, основные свойства, вычисление простых логарифмов, формула перехода к новому основанию' },
      { id: 'applied-geometry', title: 'Действительные числа', videos: 3, articles: 1, exercises: 2, description: 'Классификация действительных чисел, приближённые вычисления, округление, работа с координатной прямой' },
      { id: 'additional-topics', title: 'Преобразование выражений', videos: 3, articles: 1, exercises: 2, description: 'Преобразование дробей, работа с многочленами, алгебраические дроби, упрощение выражений' }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 1.1E-1.4E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 1.5E-1.8E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'topic', topicIndex: 3 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 4 },
      { type: 'topic', topicIndex: 5 },
      { type: 'topic', topicIndex: 6 },
      { type: 'topic', topicIndex: 7 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'natural-integers': [[1, 2, 4, 189], [3, 5]],
        'fractions-percentages': [[6, 7, 8, 9], [195, 10]],
        'rational-numbers': [[54, 55, 56], [57]],
        'real-numbers': [[39, 40, 41, 42, 43], [44]],
        'approximations': [[124, 300], [301]],
        'data-graphs': [[302, 303, 304], [305]],
        'applied-geometry': [[18, 19, 20, 21, 22, 23, 11, 12, 13, 103, 104, 105, 106, 107, 108, 110, 111], [197, 109]],
        'additional-topics': [[14, 15, 16, 35, 36, 37, 38, 45, 46, 47, 48, 50, 51, 52, 53, 180], [194, 49, 179]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Числа и вычисления (часть 1)', skills: [1, 2, 4, 6, 7, 8, 9, 54, 55, 56, 39, 40, 41, 42, 43, 189], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Числа и вычисления (часть 2)', skills: [124, 300, 301, 302, 303, 304, 18, 19, 20, 21, 22, 23, 14, 15, 16, 35, 36, 37], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [1, 2, 4, 6, 7, 8, 9, 54, 55, 56, 39, 40, 41, 42, 43, 124, 300, 302, 303, 304, 18, 19, 20, 21, 22, 23, 14, 15, 16, 35, 36, 37, 38, 45, 46, 47, 48, 50, 51, 52, 53, 189], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-basic-equations': {
    courseId: 'ege-basic',
    slug: 'ege-basic-equations',
    moduleNumber: 2,
    title: 'Модуль 2: Уравнения и неравенства',
    subtitle: '8 тем • 24 видео • 8 статей • 16 упражнений',
    masteryPoints: 2000,
    skillsDescription: 'Навыки: Линейные уравнения, Квадратные уравнения, Рациональные уравнения, Системы, Неравенства',
    topicMapping: ['2.1E', '2.2E', '2.3E', '2.4E', '2.5E', '2.6E', '2.7E', '2.9E'],
    topics: [
      { id: 'linear-equations', title: 'Целые и дробно-рациональные уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'quadratic-equations', title: 'Иррациональные уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'rational-equations', title: 'Тригонометрические уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'systems-equations', title: 'Показательные и логарифмические уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'linear-inequalities', title: 'Целые и дробно-рациональные неравенства', videos: 3, articles: 1, exercises: 2 },
      { id: 'quadratic-inequalities', title: 'Иррациональные неравенства', videos: 3, articles: 1, exercises: 2 },
      { id: 'rational-inequalities', title: 'Показательные и логарифмические неравенства', videos: 3, articles: 1, exercises: 2 },
      { id: 'advanced-topics', title: 'Системы и совокупности уравнений и неравенств', videos: 3, articles: 1, exercises: 2 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 2.1E-2.4E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 2.5E-2.7E, 2.9E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 2 },
      { type: 'topic', topicIndex: 3 },
      { type: 'topic', topicIndex: 4 },
      { type: 'topic', topicIndex: 5 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'topic', topicIndex: 6 },
      { type: 'topic', topicIndex: 7 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'linear-equations': [[58, 59, 60], [62, 188]],
        'quadratic-equations': [[312, 313], []],
        'rational-equations': [[314, 315, 316, 319, 320], [317, 318, 321, 322, 323, 324]],
        'systems-equations': [[325, 326, 327, 330, 331, 332], [328, 329, 333, 334]],
        'linear-inequalities': [[63, 64, 66], [67, 68]],
        'quadratic-inequalities': [[336, 337], []],
        'rational-inequalities': [[338, 339], [340, 341, 342]],
        'advanced-topics': [[61, 65, 347, 348, 354, 355], [349, 350, 351, 352, 353, 356, 357, 358, 359, 360]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Уравнения', skills: [58, 59, 60, 62, 312, 313, 314, 315, 316, 319, 320, 325, 326, 330, 331, 188], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Неравенства', skills: [63, 64, 66, 67, 68, 336, 337, 338, 339, 61, 65, 354, 355], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [58, 59, 60, 62, 312, 313, 314, 315, 316, 319, 320, 325, 326, 330, 331, 63, 64, 66, 67, 68, 336, 337, 338, 339, 61, 65, 347, 348, 354, 355, 188], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-basic-functions': {
    courseId: 'ege-basic',
    slug: 'ege-basic-functions',
    moduleNumber: 3,
    title: 'Модуль 3: Функции и графики',
    subtitle: '7 тем • 21 видео • 7 статей • 14 упражнений',
    masteryPoints: 1750,
    skillsDescription: 'Навыки: Свойства функций, Графики, Область определения, Монотонность, Преобразования графиков',
    topicMapping: ['3.1E', '3.2E', '3.3E', '3.4E', '3.5E', '3.7E', '3.8E'],
    topics: [
      { id: 'function-basics', title: 'Функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'function-properties', title: 'Свойства функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'function-graphs', title: 'Степенная функция', videos: 3, articles: 1, exercises: 2 },
      { id: 'linear-functions', title: 'Тригонометрические функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'quadratic-functions', title: 'Показательная и логарифмическая функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'power-functions', title: 'Последовательности', videos: 3, articles: 1, exercises: 2 },
      { id: 'graph-transformations', title: 'Арифметическая и геометрическая прогрессии. Формула сложных процентов', videos: 3, articles: 1, exercises: 2 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 3.1E-3.4E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 3.5E, 3.7E-3.8E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 3 },
      { type: 'topic', topicIndex: 4 },
      { type: 'topic', topicIndex: 5 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'topic', topicIndex: 6 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'function-basics': [[89, 92, 93, 94], [380, 381, 382, 383, 95, 384]],
        'function-properties': [[90, 91, 96, 97, 99, 100, 98], [101, 102, 186, 187]],
        'function-graphs': [[385, 386], [387, 388]],
        'linear-functions': [[389, 390], [391]],
        'quadratic-functions': [[393, 394], [395, 396, 397]],
        'power-functions': [[76, 77, 78], [79]],
        'graph-transformations': [[80, 81, 82, 84, 85, 86], [83, 87, 88]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Основы функций и графики', skills: [89, 92, 93, 94, 90, 91, 96, 97, 99, 100, 385, 386, 389, 390], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Специальные функции', skills: [393, 394, 76, 77, 78, 80, 81, 84, 85, 86], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [89, 92, 93, 94, 90, 91, 96, 97, 99, 100, 385, 386, 389, 390, 393, 394, 76, 77, 78, 80, 81, 84, 85, 86], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-basic-analysis': {
    courseId: 'ege-basic',
    slug: 'ege-basic-analysis',
    moduleNumber: 4,
    title: 'Модуль 4: Начала математического анализа',
    subtitle: '3 темы • 9 видео • 3 статьи • 9 упражнений',
    masteryPoints: 1200,
    skillsDescription: 'Навыки: Производная, Исследование функций, Применение производной',
    topicMapping: ['4.1E', '4.2E', '4.3E'],
    topics: [
      { id: 'derivative-basics', title: 'Производная функции', videos: 3, articles: 1, exercises: 3 },
      { id: 'function-study', title: 'Применение производной к исследованию функций', videos: 3, articles: 1, exercises: 3 },
      { id: 'derivative-applications', title: 'Первообразная. Интеграл', videos: 3, articles: 1, exercises: 3 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте тему 4.1E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 4.2E-4.3E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'derivative-basics': [[403, 404, 405, 406], [407, 408], [409, 410]],
        'function-study': [[411, 412], [415], [416]],
        'derivative-applications': [[417, 418, 419, 420], [421], [422]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Производная', skills: [403, 404, 405, 406, 407, 408], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Исследование и применение', skills: [411, 412, 415, 417, 418, 419, 420, 421], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [403, 404, 405, 406, 407, 408, 411, 412, 415, 417, 418, 419, 420, 421], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-basic-sets': {
    courseId: 'ege-basic',
    slug: 'ege-basic-sets',
    moduleNumber: 5,
    title: 'Модуль 5: Множества и логика',
    subtitle: '2 темы • 6 видео • 2 статьи • 6 упражнений',
    masteryPoints: 900,
    skillsDescription: 'Навыки: Операции с множествами, Логические операции, Диаграммы Эйлера-Венна',
    topicMapping: ['5.1E', '5.2E'],
    topics: [
      { id: 'sets-operations', title: 'Множества. Диаграммы Эйлера–Венна', videos: 3, articles: 1, exercises: 3 },
      { id: 'logic', title: 'Логика', videos: 3, articles: 1, exercises: 3 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте тему 5.1E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте тему 5.2E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'sets-operations': [[173, 174], [], []],
        'logic': [[429, 430, 431], [432], []]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Множества', skills: [173, 174], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Логика', skills: [429, 430, 431, 432], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [173, 174, 429, 430, 431, 432], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-basic-probability': {
    courseId: 'ege-basic',
    slug: 'ege-basic-probability',
    moduleNumber: 6,
    title: 'Модуль 6: Вероятность и статистика',
    subtitle: '2 темы • 6 видео • 2 статьи • 6 упражнений',
    masteryPoints: 900,
    skillsDescription: 'Навыки: Вероятность, Статистика, Комбинаторика',
    topicMapping: ['6.1E', '6.2E'],
    topics: [
      { id: 'probability', title: 'Описательная статистика', videos: 3, articles: 1, exercises: 3 },
      { id: 'statistics', title: 'Вероятность', videos: 3, articles: 1, exercises: 3 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте тему 6.1E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте тему 6.2E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'probability': [[162, 163, 164], [165]],
        'statistics': [[166, 167], [168]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Описательная статистика', skills: [162, 163, 164, 165], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Вероятность', skills: [166, 167, 168], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [162, 163, 164, 165, 166, 167, 168], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-basic-geometry': {
    courseId: 'ege-basic',
    slug: 'ege-basic-geometry',
    moduleNumber: 7,
    title: 'Модуль 7: Геометрия',
    subtitle: '3 темы • 9 видео • 3 статьи • 9 упражнений',
    masteryPoints: 1350,
    skillsDescription: 'Навыки: Планиметрия, Стереометрия, Измерения',
    topicMapping: ['7.1E', '7.2E', '7.3E'],
    topics: [
      { id: 'planimetry', title: 'Фигуры на плоскости', videos: 3, articles: 1, exercises: 3 },
      { id: 'stereometry', title: 'Прямые и плоскости в пространстве', videos: 3, articles: 1, exercises: 3 },
      { id: 'measurements', title: 'Многогранники', videos: 3, articles: 1, exercises: 3 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте тему 7.1E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 7.2E-7.3E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'planimetry': [[112, 113, 114, 115, 117, 118, 119, 120, 121, 123, 125, 126, 127, 128, 130, 131, 132, 133, 134, 135, 136, 137, 139, 140, 142, 143, 144, 145, 146, 147, 148, 149, 150, 153], [116, 122, 129, 138, 141, 151], [158, 159, 160, 161]],
        'stereometry': [[453, 454, 455], [456]],
        'measurements': [[459], [460]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Фигуры на плоскости', skills: [112, 113, 114, 115, 117, 118, 119, 120, 121, 123, 125, 126, 127, 128, 130, 131, 132, 133, 134, 135, 136, 137, 139, 140, 142, 143, 144, 145, 146, 147, 148, 149, 150, 153], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Пространство и многогранники', skills: [453, 454, 455, 456, 459, 460], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [112, 113, 114, 115, 117, 118, 119, 120, 121, 123, 125, 126, 127, 128, 130, 131, 132, 133, 134, 135, 136, 137, 139, 140, 142, 143, 144, 145, 146, 147, 148, 149, 150, 153, 453, 454, 455, 459, 460], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-basic-applied': {
    courseId: 'ege-basic',
    slug: 'ege-basic-applied',
    moduleNumber: 8,
    title: 'Модуль 8: Применение математики к прикладным задачам',
    subtitle: '2 темы • 6 видео • 2 статьи • 8 упражнений',
    masteryPoints: 1000,
    skillsDescription: 'Навыки: Прикладные задачи, Работа с данными, Практические расчёты',
    topicMapping: ['8.1E', '8.2E'],
    topics: [
      { id: 'applied-tasks', title: 'Чтение и анализ графических схем', videos: 3, articles: 1, exercises: 4 },
      { id: 'data-analysis', title: 'Прикладные задачи', videos: 3, articles: 1, exercises: 4 }
    ],
    quizzes: [],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'applied-tasks': [[24, 25], [198], [199]],
        'data-analysis': [[69, 70, 71, 72, 73, 74, 75, 192, 200, 181, 182, 183, 184], [193, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487], [185]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [24, 25, 198, 199, 69, 70, 71, 72, 73, 74, 75, 192, 200, 181, 182, 183, 184], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  // ========== EGE PROFIL MODULES ==========

  'ege-profil-numbers': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-numbers',
    moduleNumber: 1,
    title: 'Модуль 1: Числа и вычисления',
    subtitle: '9 тем • 27 видео • 9 статей • 18 упражнений',
    masteryPoints: 2250,
    skillsDescription: 'Навыки: Натуральные числа, Дроби, Проценты, Рациональные числа, Действительные числа, Приближённые вычисления, Работа с данными, Прикладная геометрия',
    topicMapping: ['1.1E', '1.2E', '1.3E', '1.4E', '1.5E', '1.6E', '1.7E', '1.8E', '1.9E'],
    topics: [
      { id: 'natural-integers', title: 'Натуральные и целые числа', videos: 3, articles: 1, exercises: 2 },
      { id: 'fractions-percentages', title: 'Дроби и проценты', videos: 3, articles: 1, exercises: 2 },
      { id: 'rational-numbers', title: 'Арифметический корень (n-й)', videos: 3, articles: 1, exercises: 2 },
      { id: 'real-numbers', title: 'Степени', videos: 3, articles: 1, exercises: 2 },
      { id: 'approximations', title: 'Тригонометрические функции (sin, cos, tg) как числа', videos: 3, articles: 1, exercises: 2 },
      { id: 'data-graphs', title: 'Логарифм числа', videos: 3, articles: 1, exercises: 2 },
      { id: 'applied-geometry', title: 'Действительные числа', videos: 3, articles: 1, exercises: 2 },
      { id: 'additional-topics', title: 'Преобразование выражений', videos: 3, articles: 1, exercises: 2 },
      { id: 'advanced-numbers', title: 'Комплексные числа', videos: 3, articles: 1, exercises: 2 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 1.1E-1.5E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 1.6E-1.9E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'topic', topicIndex: 3 },
      { type: 'topic', topicIndex: 4 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 5 },
      { type: 'topic', topicIndex: 6 },
      { type: 'topic', topicIndex: 7 },
      { type: 'topic', topicIndex: 8 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'natural-integers': [[1, 2, 4, 189], [3, 5]],
        'fractions-percentages': [[6, 7, 8, 9], [195, 10]],
        'rational-numbers': [[54, 55, 56], [57]],
        'real-numbers': [[39, 40, 41, 42, 43], [44]],
        'approximations': [[124, 300], [301]],
        'data-graphs': [[302, 303, 304], [305]],
        'applied-geometry': [[18, 19, 20, 21, 22, 23, 11, 12, 13, 103, 104, 105, 106, 107, 108, 110, 111], [197, 109, 306]],
        'additional-topics': [[14, 15, 16, 35, 36, 37, 38, 45, 46, 47, 48, 50, 51, 52, 53, 180], [194, 49, 179]],
        'advanced-numbers': [[307, 308, 309], [310, 311]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Числа и вычисления (часть 1)', skills: [1, 2, 4, 189, 3, 5, 6, 7, 8, 9, 195, 10, 54, 55, 56, 57, 39, 40, 41, 42, 43, 44, 124, 300, 301], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Числа и вычисления (часть 2)', skills: [302, 303, 304, 305, 18, 19, 20, 21, 22, 23, 11, 12, 13, 197, 103, 104, 105, 106, 107, 108, 109, 110, 111, 306, 14, 15, 16, 35, 36, 37, 38, 194, 45, 46, 47, 48, 49, 50, 51, 52, 53, 180, 179, 307, 308, 309, 310, 311], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [1, 2, 4, 189, 3, 5, 6, 7, 8, 9, 195, 10, 54, 55, 56, 57, 39, 40, 41, 42, 43, 44, 124, 300, 301, 302, 303, 304, 305, 18, 19, 20, 21, 22, 23, 11, 12, 13, 197, 103, 104, 105, 106, 107, 108, 109, 110, 111, 306, 14, 15, 16, 35, 36, 37, 38, 194, 45, 46, 47, 48, 49, 50, 51, 52, 53, 180, 179, 307, 308, 309, 310, 311], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-profil-equations': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-equations',
    moduleNumber: 2,
    title: 'Модуль 2: Уравнения и неравенства',
    subtitle: '12 тем • 36 видео • 12 статей • 24 упражнений',
    masteryPoints: 3000,
    skillsDescription: 'Навыки: Линейные уравнения, Квадратные уравнения, Рациональные уравнения, Иррациональные уравнения, Системы, Неравенства, Параметры',
    topicMapping: ['2.1E', '2.2E', '2.3E', '2.4E', '2.5E', '2.6E', '2.7E', '2.8E', '2.9E', '2.10E', '2.11E', '2.12E'],
    topics: [
      { id: 'linear-equations', title: 'Целые и дробно-рациональные уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'quadratic-equations', title: 'Иррациональные уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'rational-equations', title: 'Тригонометрические уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'irrational-equations', title: 'Показательные и логарифмические уравнения', videos: 3, articles: 1, exercises: 2 },
      { id: 'systems-equations', title: 'Целые и дробно-рациональные неравенства', videos: 3, articles: 1, exercises: 2 },
      { id: 'linear-inequalities', title: 'Иррациональные неравенства', videos: 3, articles: 1, exercises: 2 },
      { id: 'quadratic-inequalities', title: 'Показательные и логарифмические неравенства', videos: 3, articles: 1, exercises: 2 },
      { id: 'rational-inequalities', title: 'Тригонометрические неравенства', videos: 3, articles: 1, exercises: 2 },
      { id: 'irrational-inequalities', title: 'Системы и совокупности уравнений и неравенств', videos: 3, articles: 1, exercises: 2 },
      { id: 'systems-inequalities', title: 'Уравнения, неравенства и системы с параметрами', videos: 3, articles: 1, exercises: 2 },
      { id: 'equations-parameters', title: 'Матрица системы линейных уравнений', videos: 3, articles: 1, exercises: 2 },
      { id: 'advanced-topics', title: 'Графические методы решения уравнений и неравенств', videos: 3, articles: 1, exercises: 2 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 2.1E-2.6E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 2.7E-2.12E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 3 },
      { type: 'topic', topicIndex: 4 },
      { type: 'topic', topicIndex: 5 },
      { type: 'topic', topicIndex: 6 },
      { type: 'topic', topicIndex: 7 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'topic', topicIndex: 8 },
      { type: 'topic', topicIndex: 9 },
      { type: 'topic', topicIndex: 10 },
      { type: 'topic', topicIndex: 11 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'linear-equations': [[58, 59, 60, 62], [188, 191]],
        'quadratic-equations': [[312], [313]],
        'rational-equations': [[314, 315, 316, 317, 318, 319, 320], [321, 322, 323, 324]],
        'irrational-equations': [[325, 326, 327, 328], [329, 330, 331, 332, 333, 334]],
        'systems-equations': [[63, 64, 66, 67], [68, 335]],
        'linear-inequalities': [[336], [337]],
        'quadratic-inequalities': [[338, 339], [340, 341, 342]],
        'rational-inequalities': [[343, 344], [345, 346]],
        'irrational-inequalities': [[61, 347, 348, 349, 350, 351, 352], [353, 65, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364]],
        'systems-inequalities': [[365, 366, 367], [368, 369]],
        'equations-parameters': [[370, 371, 372], [373, 374, 375]],
        'advanced-topics': [[376, 377], [378, 379]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Уравнения', skills: [58, 59, 60, 62, 188, 191, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 63, 64, 66, 67, 68, 335, 336, 337], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Неравенства и параметры', skills: [338, 339, 340, 341, 342, 343, 344, 345, 346, 61, 347, 348, 349, 350, 351, 352, 353, 65, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [58, 59, 60, 62, 188, 191, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 63, 64, 66, 67, 68, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 61, 347, 348, 349, 350, 351, 352, 353, 65, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-profil-functions': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-functions',
    moduleNumber: 3,
    title: 'Модуль 3: Функции и графики',
    subtitle: '8 тем • 24 видео • 8 статей • 16 упражнений',
    masteryPoints: 2000,
    skillsDescription: 'Навыки: Свойства функций, Графики, Область определения, Монотонность, Преобразования графиков, Тригонометрические функции',
    topicMapping: ['3.1E', '3.2E', '3.3E', '3.4E', '3.5E', '3.6E', '3.7E', '3.8E'],
    topics: [
      { id: 'function-basics', title: 'Функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'function-properties', title: 'Свойства функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'function-graphs', title: 'Степенная функция', videos: 3, articles: 1, exercises: 2 },
      { id: 'linear-functions', title: 'Тригонометрические функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'quadratic-functions', title: 'Показательная и логарифмическая функции', videos: 3, articles: 1, exercises: 2 },
      { id: 'trigonometric-functions', title: 'Непрерывность функций и асимптоты', videos: 3, articles: 1, exercises: 2 },
      { id: 'power-functions', title: 'Последовательности', videos: 3, articles: 1, exercises: 2 },
      { id: 'graph-transformations', title: 'Арифметическая и геометрическая прогрессии. Формула сложных процентов', videos: 3, articles: 1, exercises: 2 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 3.1E-3.4E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 3.5E-3.8E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 3 },
      { type: 'topic', topicIndex: 4 },
      { type: 'topic', topicIndex: 5 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'topic', topicIndex: 6 },
      { type: 'topic', topicIndex: 7 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'function-basics': [[89, 92, 93, 94], [380, 381, 382, 383, 95, 384]],
        'function-properties': [[90, 91, 96, 97, 99, 100], [98, 101, 102, 186, 187]],
        'function-graphs': [[385, 386], [387, 388]],
        'linear-functions': [[389, 390], [391, 392]],
        'quadratic-functions': [[393, 394, 395], [396, 397]],
        'trigonometric-functions': [[398, 399], [400, 401, 402]],
        'power-functions': [[76, 77], [78, 79]],
        'graph-transformations': [[80, 81, 82, 83, 84, 85, 86, 87], [88]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Основы функций и графики', skills: [89, 92, 93, 94, 380, 381, 382, 383, 95, 384, 90, 91, 96, 97, 99, 100, 98, 101, 102, 186, 187, 385, 386, 387, 388, 389, 390, 391, 392], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Специальные функции', skills: [393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [89, 92, 93, 94, 380, 381, 382, 383, 95, 384, 90, 91, 96, 97, 99, 100, 98, 101, 102, 186, 187, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-profil-analysis': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-analysis',
    moduleNumber: 4,
    title: 'Модуль 4: Начала математического анализа',
    subtitle: '3 темы • 9 видео • 3 статьи • 12 упражнений',
    masteryPoints: 1500,
    skillsDescription: 'Навыки: Производная, Исследование функций, Применение производной, Интеграл',
    topicMapping: ['4.1E', '4.2E', '4.3E'],
    topics: [
      { id: 'derivative-basics', title: 'Производная функции', videos: 3, articles: 1, exercises: 4 },
      { id: 'function-study', title: 'Применение производной к исследованию функций', videos: 3, articles: 1, exercises: 4 },
      { id: 'integral', title: 'Первообразная. Интеграл', videos: 3, articles: 1, exercises: 4 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте тему 4.1E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 4.2E-4.3E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'derivative-basics': [[403, 404, 405, 406], [407, 408, 409, 410]],
        'function-study': [[411, 412], [413, 414, 415, 416]],
        'integral': [[417, 418, 419, 420], [421, 422, 423, 424, 425, 426, 427, 428]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Производная', skills: [403, 404, 405, 406, 407, 408, 409, 410], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Исследование и интеграл', skills: [411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-profil-sets': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-sets',
    moduleNumber: 5,
    title: 'Модуль 5: Множества и логика',
    subtitle: '2 темы • 6 видео • 2 статьи • 8 упражнений',
    masteryPoints: 1000,
    skillsDescription: 'Навыки: Операции с множествами, Логические операции, Диаграммы Эйлера-Венна, Логические высказывания',
    topicMapping: ['5.1E', '5.2E'],
    topics: [
      { id: 'sets-operations', title: 'Множества. Диаграммы Эйлера–Венна', videos: 3, articles: 1, exercises: 4 },
      { id: 'logic', title: 'Логика', videos: 3, articles: 1, exercises: 4 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте тему 5.1E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте тему 5.2E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'sets-operations': [[173], [174]],
        'logic': [[429, 430, 431], [432]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Множества', skills: [173, 174], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Логика', skills: [429, 430, 431, 432], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [173, 174, 429, 430, 431, 432], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-profil-probability': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-probability',
    moduleNumber: 6,
    title: 'Модуль 6: Вероятность и статистика',
    subtitle: '3 темы • 9 видео • 3 статьи • 9 упражнений',
    masteryPoints: 1350,
    skillsDescription: 'Навыки: Вероятность, Статистика, Комбинаторика',
    topicMapping: ['6.1E', '6.2E', '6.3E'],
    topics: [
      { id: 'probability', title: 'Описательная статистика', videos: 3, articles: 1, exercises: 3 },
      { id: 'statistics', title: 'Вероятность', videos: 3, articles: 1, exercises: 3 },
      { id: 'combinatorics', title: 'Комбинаторика', videos: 3, articles: 1, exercises: 3 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте тему 6.1E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 6.2E-6.3E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'topic', topicIndex: 2 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'probability': [[162, 163], [164, 165, 433, 434]],
        'statistics': [[166, 167, 168], [435, 436, 437, 438, 439, 440]],
        'combinatorics': [[169, 170], [171, 172]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Вероятность', skills: [162, 163, 164, 165, 433, 434], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Статистика и комбинаторика', skills: [166, 167, 168, 435, 436, 437, 438, 439, 440, 169, 170, 171, 172], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [162, 163, 164, 165, 433, 434, 166, 167, 168, 435, 436, 437, 438, 439, 440, 169, 170, 171, 172], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-profil-geometry': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-geometry',
    moduleNumber: 7,
    title: 'Модуль 7: Геометрия',
    subtitle: '5 тем • 15 видео • 5 статей • 15 упражнений',
    masteryPoints: 1800,
    skillsDescription: 'Навыки: Планиметрия, Стереометрия, Измерения, Векторы',
    topicMapping: ['7.1E', '7.2E', '7.3E', '7.4E', '7.5E'],
    topics: [
      { id: 'planimetry', title: 'Фигуры на плоскости', videos: 3, articles: 1, exercises: 3 },
      { id: 'stereometry', title: 'Прямые и плоскости в пространстве', videos: 3, articles: 1, exercises: 3 },
      { id: 'measurements', title: 'Многогранники', videos: 3, articles: 1, exercises: 3 },
      { id: 'vectors', title: 'Тела и поверхности вращения', videos: 3, articles: 1, exercises: 3 },
      { id: 'coordinates-vectors', title: 'Координаты и векторы', videos: 3, articles: 1, exercises: 3 }
    ],
    quizzes: [
      { id: 'quiz-1', title: 'Тест 1', description: 'Проверьте темы 7.1E-7.2E' },
      { id: 'quiz-2', title: 'Тест 2', description: 'Проверьте темы 7.3E-7.5E' }
    ],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', quizIndex: 0 },
      { type: 'topic', topicIndex: 2 },
      { type: 'topic', topicIndex: 3 },
      { type: 'topic', topicIndex: 4 },
      { type: 'quiz', quizIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'planimetry': [[112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129], [130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 153, 158, 159, 160, 161, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452]],
        'stereometry': [[453, 454, 455, 456], [457, 458]],
        'measurements': [[459, 460], [461]],
        'vectors': [[462, 463], [464]],
        'coordinates-vectors': [[465, 466, 467, 154, 155, 156, 157, 468], [469, 470]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'quiz-1') {
        return { title: 'Тест 1: Планиметрия и стереометрия', skills: [112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 153, 158, 159, 160, 161, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458], questionCount: 6, isTest: true };
      }
      if (quizId === 'quiz-2') {
        return { title: 'Тест 2: Измерения и векторы', skills: [459, 460, 461, 462, 463, 464, 465, 466, 467, 154, 155, 156, 157, 468, 469, 470], questionCount: 6, isTest: true };
      }
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 153, 158, 159, 160, 161, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 154, 155, 156, 157, 468, 469, 470], questionCount: 10, isExam: true };
      }
      return null;
    }
  },

  'ege-profil-applied': {
    courseId: 'ege-advanced',
    slug: 'ege-profil-applied',
    moduleNumber: 8,
    title: 'Модуль 8: Применение математики к прикладным задачам',
    subtitle: '2 темы • 6 видео • 2 статьи • 10 упражнений',
    masteryPoints: 1200,
    skillsDescription: 'Навыки: Прикладные задачи, Работа с данными, Практические расчёты, Оптимизация',
    topicMapping: ['8.1E', '8.2E'],
    topics: [
      { id: 'applied-tasks', title: 'Чтение и анализ графических схем', videos: 3, articles: 1, exercises: 5 },
      { id: 'data-analysis', title: 'Прикладные задачи', videos: 3, articles: 1, exercises: 5 }
    ],
    quizzes: [],
    orderedContent: [
      { type: 'topic', topicIndex: 0 },
      { type: 'topic', topicIndex: 1 },
      { type: 'quiz', isFinalTest: true }
    ],
    getExerciseData: (topicId: string, exerciseIndex: number) => {
      const skillMap: Record<string, number[][]> = {
        'applied-tasks': [[24], [25], [198], [199], []],
        'data-analysis': [[69, 193, 70, 71], [72, 73, 74, 75], [471, 472, 192, 473, 474, 475, 476, 477, 478], [479, 480, 481, 482, 483, 484, 485, 486, 200], [181, 182, 183, 184, 185, 487]]
      };
      const skills = skillMap[topicId]?.[exerciseIndex] || [];
      return { title: `Упражнение ${exerciseIndex + 1}`, skills };
    },
    getQuizData: (quizId: string) => {
      if (quizId === 'module-exam') {
        return { title: 'Итоговый экзамен модуля', skills: [24, 25, 198, 199, 69, 193, 70, 71, 72, 73, 74, 75, 471, 472, 192, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 200, 181, 182, 183, 184, 185, 487], questionCount: 10, isExam: true };
      }
      return null;
    }
  }

};

export type { ModuleConfig, TopicContent, QuizContent, ExerciseConfig };
