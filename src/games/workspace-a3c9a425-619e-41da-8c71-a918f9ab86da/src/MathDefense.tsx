import React, { useState, useEffect, useRef } from 'react';

const PixelMathDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0); // Ref for real-time score access
  const [highScore, setHighScore] = useState(0);
  const [feedback, setFeedback] = useState<{message: string, color: string} | null>(null);
  const [difficultyNotification, setDifficultyNotification] = useState<{message: string, color: string} | null>(null);
  const [towerHP, setTowerHP] = useState(100);
  const towerHPRef = useRef(100); // Ref for real-time HP access
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  const BASE_CANVAS_WIDTH = 700;
  const BASE_CANVAS_HEIGHT = 400;
  const [canvasSize, setCanvasSize] = useState({ width: BASE_CANVAS_WIDTH, height: BASE_CANVAS_HEIGHT });
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: BASE_CANVAS_WIDTH, height: BASE_CANVAS_HEIGHT });
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  
  // Speed thresholds for progressive difficulty
  const getZombieSpeed = (): number => {
    const currentScore = scoreRef.current;
    if (currentScore >= 220) return 4.5;      // Ultra fast (Level 7)
    if (currentScore >= 200) return 4.0;      // Super fast (Level 6)
    if (currentScore >= 170) return 3.5;      // Very fast+ (Level 5)
    if (currentScore >= 150) return 3.0;      // Very fast (Level 4)
    if (currentScore >= 100) return 2.5;     // Faster (Level 3)
    if (currentScore >= 50) return 2.0;      // Fast (Level 2)
    return 1.5;                              // Normal speed (Level 1)
  };
  
  // Zombie spawn rate multiplier based on difficulty level
  const getZombieSpawnRate = (): number => {
    const currentScore = scoreRef.current;
    if (currentScore >= 220) return 0.105;    // 7x more frequent (Level 7)
    if (currentScore >= 200) return 0.09;     // 6x more frequent (Level 6)
    if (currentScore >= 170) return 0.075;    // 5x more frequent (Level 5)
    if (currentScore >= 150) return 0.06;     // 4x more frequent (Level 4)
    if (currentScore >= 100) return 0.045;    // 3x more frequent (Level 3)
    if (currentScore >= 50) return 0.03;      // 2x more frequent (Level 2)
    return 0.015;                             // Normal spawn rate (Level 1)
  };
  
  // Check for difficulty level changes and show notifications
  const checkDifficultyIncrease = (oldScore: number, newScore: number): void => {
    if (oldScore < 50 && newScore >= 50) {
      setDifficultyNotification({message: 'СЛОЖНОСТЬ УВЕЛИЧЕНА: СКОРОСТЬ x2!', color: '#FFFF44'});
    } else if (oldScore < 100 && newScore >= 100) {
      setDifficultyNotification({message: 'СЛОЖНОСТЬ УВЕЛИЧЕНА: СКОРОСТЬ x3!', color: '#FF8844'});
    } else if (oldScore < 150 && newScore >= 150) {
      setDifficultyNotification({message: 'СЛОЖНОСТЬ УВЕЛИЧЕНА: СКОРОСТЬ x4!', color: '#FF4444'});
    } else if (oldScore < 170 && newScore >= 170) {
      setDifficultyNotification({message: 'СЛОЖНОСТЬ УВЕЛИЧЕНА: СКОРОСТЬ x5!', color: '#FF00FF'});
    } else if (oldScore < 200 && newScore >= 200) {
      setDifficultyNotification({message: 'СЛОЖНОСТЬ УВЕЛИЧЕНА: СКОРОСТЬ x6!', color: '#FF0088'});
    } else if (oldScore < 220 && newScore >= 220) {
      setDifficultyNotification({message: 'СЛОЖНОСТЬ УВЕЛИЧЕНА: СКОРОСТЬ x7!', color: '#FF0044'});
    }
    
    // Clear notification after 8 seconds (increased from 4 seconds)
    if (difficultyNotification) {
      setTimeout(() => setDifficultyNotification(null), 8000);
    }
  };
  
  // Game objects
  const towerRef = useRef({ x: 100, y: 180, width: 80, height: 100 });
  const enemiesRef = useRef<Array<{x: number, y: number, health: number, type: number, attacking: boolean, attackCooldown: number}>>([]);
  const projectilesRef = useRef<Array<{x: number, y: number, targetX: number, targetY: number, life: number}>>([]);
  const explosionsRef = useRef<Array<{x: number, y: number, radius: number, life: number, isZombieExplosion?: boolean}>>([]);
  
  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobileLayout(mobile);

      if (mobile) {
        const horizontalPadding = 16;
        const availableWidth = Math.max(280, width - horizontalPadding);
        const displayWidth = Math.min(availableWidth, BASE_CANVAS_WIDTH);
        const displayHeight = Math.round((BASE_CANVAS_HEIGHT / BASE_CANVAS_WIDTH) * displayWidth);
        setCanvasDisplaySize({ width: displayWidth, height: displayHeight });
        setCanvasSize({ width: BASE_CANVAS_WIDTH, height: BASE_CANVAS_HEIGHT });
      } else {
        setCanvasDisplaySize({ width: BASE_CANVAS_WIDTH, height: BASE_CANVAS_HEIGHT });
        setCanvasSize({ width: BASE_CANVAS_WIDTH, height: BASE_CANVAS_HEIGHT });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Touch support for mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Handle touch-based answer selection for mobile
      if (gameState === 'playing' && currentQuestion) {
        const options = currentQuestion.options;
        const optionHeight = 60; // Height of each option button
        const optionWidth = rect.width / 2 - 20; // Width of each option button
        
        options.forEach((option, index) => {
          const optionY = rect.height - 150 + (index * optionHeight);
          const optionX = rect.width / 2 - optionWidth / 2;
          
          if (x >= optionX && x <= optionX + optionWidth &&
              y >= optionY && y <= optionY + optionHeight) {
            handleAnswer(option);
          }
        });
      }
    };
    
    canvas.addEventListener('touchstart', handleTouch);
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, [gameState, currentQuestion]);
  
  // Question types
  type QuestionType = 
    | 'simple-math' 
    | 'linear-1-step' 
    | 'linear-2-step' 
    | 'russian-definition' 
    | 'percentage' 
    | 'fraction' 
    | 'geometry' 
    | 'probability' 
    | 'speed-distance-time' 
    | 'decimal' 
    | 'substitution' 
    | 'roots' 
    | 'exponents' 
    | 'logarithms' 
    | 'trigonometry' 
    | 'like-terms' 
    | 'polynomial-multiplication' 
    | 'order-of-operations' 
    | 'rounding' 
    | 'simplification'
    | 'expanding-brackets'
    | 'collecting-terms'
    | 'factorizing'
    | 'algebraic-fractions';

  interface Question {
    text: string;
    answer: number | string;
    options: number[] | string[];
    type: QuestionType;
  }

  // Generate a random question from all types
  const generateQuestion = (): Question => {
    const types: QuestionType[] = [
      'simple-math', 'linear-1-step', 'linear-2-step', 'russian-definition', 'percentage',
      'fraction', 'geometry', 'probability', 'speed-distance-time', 'decimal',
      'substitution', 'roots', 'exponents', 'logarithms', 'trigonometry',
      'like-terms', 'polynomial-multiplication', 'order-of-operations', 'rounding', 'simplification',
      'expanding-brackets', 'collecting-terms', 'factorizing', 'algebraic-fractions'
    ];
    
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    switch (randomType) {
      case 'simple-math':
        return generateSimpleMath();
      case 'linear-1-step':
        return generateLinear1Step();
      case 'linear-2-step':
        return generateLinear2Step();
      case 'russian-definition':
        return generateRussianDefinition();
      case 'percentage':
        return generatePercentage();
      case 'fraction':
        return generateFraction();
      case 'geometry':
        return generateGeometry();
      case 'probability':
        return generateProbability();
      case 'speed-distance-time':
        return generateSpeedDistanceTime();
      case 'decimal':
        return generateDecimal();
      case 'substitution':
        return generateSubstitution();
      case 'roots':
        return generateRoots();
      case 'exponents':
        return generateExponents();
      case 'logarithms':
        return generateLogarithms();
      case 'trigonometry':
        return generateTrigonometry();
      case 'like-terms':
        return generateLikeTerms();
      case 'polynomial-multiplication':
        return generatePolynomialMultiplication();
      case 'order-of-operations':
        return generateOrderOfOperations();
      case 'rounding':
        return generateRounding();
      case 'simplification':
        return generateSimplification();
      case 'expanding-brackets':
        return generateExpandingBrackets();
      case 'collecting-terms':
        return generateCollectingTerms();
      case 'factorizing':
        return generateFactorizing();
      case 'algebraic-fractions':
        return generateAlgebraicFractions();
      default:
        return generateSimpleMath();
    }
  };

  // 1. Simple math operations
  const generateSimpleMath = (): Question => {
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let a, b, answer;
    
    switch (op) {
      case '+':
        a = Math.floor(Math.random() * 20) + 1;
        b = Math.floor(Math.random() * 20) + 1;
        answer = a + b;
        break;
      case '-':
        b = Math.floor(Math.random() * 20) + 1;
        a = b + Math.floor(Math.random() * 20) + 1; // Ensure positive result
        answer = a - b;
        break;
      case '*':
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
        answer = a * b;
        break;
    }
    
    return {
      text: `${a} ${op} ${b} = ?`,
      answer: answer,
      options: generateOptions(answer),
      type: 'simple-math'
    };
  };

  // 2. Linear equations in 1 step
  const generateLinear1Step = (): Question => {
    const x = Math.floor(Math.random() * 10) + 1;
    const result = x * 2 + Math.floor(Math.random() * 10) + 1;
    
    return {
      text: `2x + ${result - x * 2} = ${result}\nx = ?`,
      answer: x,
      options: generateOptions(x),
      type: 'linear-1-step'
    };
  };

  // 3. Linear equations in 2 steps
  const generateLinear2Step = (): Question => {
    const x = Math.floor(Math.random() * 8) + 1;
    const a = Math.floor(Math.random() * 3) + 2;
    const b = Math.floor(Math.random() * 10) + 1;
    const result = a * x + b;
    
    return {
      text: `${a}x + ${b} = ${result}\nx = ?`,
      answer: x,
      options: generateOptions(x),
      type: 'linear-2-step'
    };
  };

  // 4. Definitions in Russian
  const generateRussianDefinition = (): Question => {
    const definitions = [
      { question: "Сколько сторон у треугольника?", answer: 3 },
      { question: "Сколько минут в часе?", answer: 60 },
      { question: "Сколько дней в неделе?", answer: 7 },
      { question: "Сколько месяцев в году?", answer: 12 },
      { question: "Сколько углов у квадрата?", answer: 4 }
    ];
    
    const def = definitions[Math.floor(Math.random() * definitions.length)];
    
    return {
      text: def.question,
      answer: def.answer,
      options: generateOptions(def.answer),
      type: 'russian-definition'
    };
  };

  // 5. Percentage calculations (10, 25, 50, 75%)
  const generatePercentage = (): Question => {
    const percentages = [10, 25, 50, 75];
    const percentage = percentages[Math.floor(Math.random() * percentages.length)];
    const number = [20, 40, 60, 80, 100][Math.floor(Math.random() * 5)];
    const answer = Math.round(number * percentage / 100);
    
    return {
      text: `${percentage}% от ${number} = ?`,
      answer: answer,
      options: generateOptions(answer),
      type: 'percentage'
    };
  };

  // 6. Fraction calculations
  const generateFraction = (): Question => {
    const numerators = [1, 2, 3, 4];
    const denominators = [2, 3, 4, 5, 6, 8];
    
    const n1 = numerators[Math.floor(Math.random() * numerators.length)];
    const d1 = denominators[Math.floor(Math.random() * denominators.length)];
    const n2 = numerators[Math.floor(Math.random() * numerators.length)];
    const d2 = denominators[Math.floor(Math.random() * denominators.length)];
    
    // Common denominator
    const commonD = d1 * d2;
    const newN1 = n1 * d2;
    const newN2 = n2 * d1;
    
    const operations = ['+', '-'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let resultN;
    if (op === '+') {
      resultN = newN1 + newN2;
    } else {
      resultN = newN1 - newN2;
    }
    
    // Simplify if possible
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(Math.abs(resultN), commonD);
    
    const finalN = resultN / divisor;
    const finalD = commonD / divisor;
    
    const answer = finalD === 1 ? finalN : finalN + finalD * 0.1; // Return as decimal if simplified to whole number
    
    return {
      text: `${n1}/${d1} ${op} ${n2}/${d2} = ?`,
      answer: Math.round(answer * 10) / 10,
      options: generateOptions(Math.round(answer * 10) / 10),
      type: 'fraction'
    };
  };

  // 7. Very simple geometry
  const generateGeometry = (): Question => {
    const shapes = [
      { question: "Периметр квадрата со стороной 5 = ?", answer: 20 },
      { question: "Площадь прямоугольника 3×4 = ?", answer: 12 },
      { question: "Периметр треугольника со сторонами 3,4,5 = ?", answer: 12 },
      { question: "Площадь квадрата со стороной 6 = ?", answer: 36 },
      { question: "Периметр прямоугольника 2×5 = ?", answer: 14 }
    ];
    
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    return {
      text: shape.question,
      answer: shape.answer,
      options: generateOptions(shape.answer),
      type: 'geometry'
    };
  };

  // 8. Very simple probability
  const generateProbability = (): Question => {
    const problems = [
      { question: "Вероятность выпадения орла при подбрасывании монеты = ?", answer: "1/2" },
      { question: "Вероятность выпадения 6 на кубике = ?", answer: "1/6" },
      { question: "Из 10 шаров 3 красных. Вероятность красного = ?", answer: "3/10" }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateFractionOptions(problem.answer),
      type: 'probability'
    };
  };

  // 9. Speed, distance, time simple
  const generateSpeedDistanceTime = (): Question => {
    const problems = [
      { question: "Скорость 60 км/ч, время 2 часа. Расстояние = ?", answer: 120 },
      { question: "Расстояние 180 км, время 3 часа. Скорость = ?", answer: 60 },
      { question: "Расстояние 100 км, скорость 50 км/ч. Время = ?", answer: 2 },
      { question: "Скорость 80 км/ч, время 1.5 часа. Расстояние = ?", answer: 120 },
      { question: "Расстояние 240 км, скорость 40 км/ч. Время = ?", answer: 6 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateOptions(problem.answer),
      type: 'speed-distance-time'
    };
  };

  // 10. Decimal calculations simple
  const generateDecimal = (): Question => {
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let a, b, answer;
    
    switch (op) {
      case '+':
        a = Math.round((Math.random() * 9 + 1) * 10) / 10;
        b = Math.round((Math.random() * 9 + 1) * 10) / 10;
        answer = Math.round((a + b) * 10) / 10;
        break;
      case '-':
        b = Math.round((Math.random() * 9 + 1) * 10) / 10;
        a = Math.round((b + Math.random() * 9 + 1) * 10) / 10;
        answer = Math.round((a - b) * 10) / 10;
        break;
      case '*':
        a = Math.round((Math.random() * 4 + 1) * 10) / 10;
        b = Math.round((Math.random() * 4 + 1) * 10) / 10;
        answer = Math.round((a * b) * 10) / 10;
        break;
    }
    
    return {
      text: `${a} ${op} ${b} = ?`,
      answer: answer,
      options: generateOptions(answer),
      type: 'decimal'
    };
  };

  // 11. Подстановка значений (Substitution)
  const generateSubstitution = (): Question => {
    const x = Math.floor(Math.random() * 5) + 1;
    const a = Math.floor(Math.random() * 3) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    const answer = a * x + b;
    
    return {
      text: `Если x = ${x}, то ${a}x + ${b} = ?`,
      answer: answer,
      options: generateOptions(answer),
      type: 'substitution'
    };
  };

  // 12. Арифметика с корнями (Arithmetic with roots)
  const generateRoots = (): Question => {
    const problems = [
      { question: "√16 = ?", answer: 4 },
      { question: "√25 = ?", answer: 5 },
      { question: "√36 = ?", answer: 6 },
      { question: "√49 = ?", answer: 7 },
      { question: "√64 = ?", answer: 8 },
      { question: "√81 = ?", answer: 9 },
      { question: "√100 = ?", answer: 10 },
      { question: "2√9 = ?", answer: 6 },
      { question: "3√4 = ?", answer: 6 },
      { question: "√16 + √9 = ?", answer: 7 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateOptions(problem.answer),
      type: 'roots'
    };
  };

  // 13. Exponents rules simple
  const generateExponents = (): Question => {
    const problems = [
      { question: "2³ = ?", answer: 8 },
      { question: "3² = ?", answer: 9 },
      { question: "4² = ?", answer: 16 },
      { question: "5² = ?", answer: 25 },
      { question: "2⁴ = ?", answer: 16 },
      { question: "3³ = ?", answer: 27 },
      { question: "10² = ?", answer: 100 },
      { question: "2² × 2³ = ?", answer: 32 },
      { question: "3² × 3¹ = ?", answer: 27 },
      { question: "2⁶ ÷ 2⁴ = ?", answer: 4 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateOptions(problem.answer),
      type: 'exponents'
    };
  };

  // 14. Log rules simple
  const generateLogarithms = (): Question => {
    const problems = [
      { question: "log₁₀(100) = ?", answer: 2 },
      { question: "log₁₀(1000) = ?", answer: 3 },
      { question: "log₁₀(10) = ?", answer: 1 },
      { question: "log₂(8) = ?", answer: 3 },
      { question: "log₂(16) = ?", answer: 4 },
      { question: "log₂(4) = ?", answer: 2 },
      { question: "log₃(9) = ?", answer: 2 },
      { question: "log₅(25) = ?", answer: 2 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateOptions(problem.answer),
      type: 'logarithms'
    };
  };

  // 15. Trigonometry very simple
  const generateTrigonometry = (): Question => {
    const problems = [
      { question: "sin(30°) = ?", answer: 0.5 },
      { question: "cos(60°) = ?", answer: 0.5 },
      { question: "sin(90°) = ?", answer: 1 },
      { question: "cos(0°) = ?", answer: 1 },
      { question: "sin(0°) = ?", answer: 0 },
      { question: "cos(90°) = ?", answer: 0 },
      { question: "tan(45°) = ?", answer: 1 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateOptions(problem.answer, true),
      type: 'trigonometry'
    };
  };

  // 16. Приведение подобных членов многочленов (Like terms)
  const generateLikeTerms = (): Question => {
    const problems = [
      { question: "3x + 2x = ?", answer: "5x", coefficient: 5 },
      { question: "7y - 3y = ?", answer: "4y", coefficient: 4 },
      { question: "5a + 3a = ?", answer: "8a", coefficient: 8 },
      { question: "9b - 4b = ?", answer: "5b", coefficient: 5 },
      { question: "6x + x = ?", answer: "7x", coefficient: 7 },
      { question: "8y - 5y = ?", answer: "3y", coefficient: 3 },
      { question: "2x + 3x + 4x = ?", answer: "9x", coefficient: 9 },
      { question: "10a - 3a - 2a = ?", answer: "5a", coefficient: 5 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateLikeTermsOptions(problem.answer, problem.coefficient),
      type: 'like-terms'
    };
  };

  // 17. Умножение многочленов (Polynomial multiplication)
  const generatePolynomialMultiplication = (): Question => {
    const problems = [
      { question: "2(x + 3) = ?", answer: "2x + 6", coefficient: 2 },
      { question: "3(x + 2) = ?", answer: "3x + 6", coefficient: 3 },
      { question: "4(x - 1) = ?", answer: "4x - 4", coefficient: 4 },
      { question: "2(3x + 1) = ?", answer: "6x + 2", coefficient: 2 },
      { question: "3(2x - 1) = ?", answer: "6x - 3", coefficient: 3 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generatePolynomialOptions(problem.answer, problem.coefficient),
      type: 'polynomial-multiplication'
    };
  };

  // 18. Порядок математических операций (Order of operations)
  const generateOrderOfOperations = (): Question => {
    const problems = [
      { question: "2 + 3 × 4 = ?", answer: 14 },
      { question: "3 × 2 + 5 = ?", answer: 11 },
      { question: "10 - 6 ÷ 2 = ?", answer: 7 },
      { question: "8 + 12 ÷ 4 = ?", answer: 11 },
      { question: "2 × (3 + 4) = ?", answer: 14 },
      { question: "(5 + 3) × 2 = ?", answer: 16 },
      { question: "15 - 3 × 4 = ?", answer: 3 },
      { question: "20 ÷ (4 + 1) = ?", answer: 4 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateOptions(problem.answer),
      type: 'order-of-operations'
    };
  };

  // 19. Округление чисел (Rounding)
  const generateRounding = (): Question => {
    const problems = [
      { question: "Округлить 23 до десятков = ?", answer: 20 },
      { question: "Округлить 67 до десятков = ?", answer: 70 },
      { question: "Округлить 45 до десятков = ?", answer: 50 },
      { question: "Округлить 134 до сотен = ?", answer: 100 },
      { question: "Округлить 267 до сотен = ?", answer: 300 },
      { question: "Округлить 3.7 до целых = ?", answer: 4 },
      { question: "Округлить 8.2 до целых = ?", answer: 8 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateOptions(problem.answer),
      type: 'rounding'
    };
  };

  // 20. Упрощение выражений (Simplification)
  const generateSimplification = (): Question => {
    const problems = [
      { question: "Упростить: 2x + 3x = ?", answer: "5x", coefficient: 5 },
      { question: "Упростить: 7a - 2a = ?", answer: "5a", coefficient: 5 },
      { question: "Упростить: 4y + y = ?", answer: "5y", coefficient: 5 },
      { question: "Упростить: 9b - 3b = ?", answer: "6b", coefficient: 6 },
      { question: "Упростить: 3x + 2x + x = ?", answer: "6x", coefficient: 6 },
      { question: "Упростить: 10a - 4a = ?", answer: "6a", coefficient: 6 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: problem.question,
      answer: problem.answer,
      options: generateSimplificationOptions(problem.answer, problem.coefficient),
      type: 'simplification'
    };
  };

  // 21. Раскрытие скобок (Expanding brackets)
  const generateExpandingBrackets = (): Question => {
    const problems = [
      { question: "3(x + 2) = ?", answer: "3x + 6", coefficient: 3 },
      { question: "2(4x - 1) = ?", answer: "8x - 2", coefficient: 8 },
      { question: "5(3x + 4) = ?", answer: "15x + 20", coefficient: 15 },
      { question: "4(2x - 3) = ?", answer: "8x - 12", coefficient: 8 },
      { question: "6(x + 5) = ?", answer: "6x + 30", coefficient: 6 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: `Раскрыть скобки: ${problem.question}`,
      answer: problem.answer,
      options: generateExpandingOptions(problem.answer, problem.coefficient),
      type: 'expanding-brackets'
    };
  };

  // 22. Сбор подобных слагаемых (Collecting like terms)
  const generateCollectingTerms = (): Question => {
    const problems = [
      { question: "4x + 3x + 2x = ?", answer: "9x", coefficient: 9 },
      { question: "7a - 2a + 3a = ?", answer: "8a", coefficient: 8 },
      { question: "5y + y - 2y = ?", answer: "4y", coefficient: 4 },
      { question: "6x + 4x - x = ?", answer: "9x", coefficient: 9 },
      { question: "3b + 5b - 4b = ?", answer: "4b", coefficient: 4 },
      { question: "2x + 3x + 4x + x = ?", answer: "10x", coefficient: 10 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: `Привести подобные: ${problem.question}`,
      answer: problem.answer,
      options: generateCollectingOptions(problem.answer, problem.coefficient),
      type: 'collecting-terms'
    };
  };

  // 23. Разложение на множители (Factorizing)
  const generateFactorizing = (): Question => {
    const problems = [
      { question: "2x + 6 = ?", answer: "2(x + 3)", coefficient: 2 },
      { question: "3x + 12 = ?", answer: "3(x + 4)", coefficient: 3 },
      { question: "4x + 8 = ?", answer: "4(x + 2)", coefficient: 4 },
      { question: "5x + 15 = ?", answer: "5(x + 3)", coefficient: 5 },
      { question: "6x + 18 = ?", answer: "6(x + 3)", coefficient: 6 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: `Разложить на множители: ${problem.question}`,
      answer: problem.answer,
      options: generateFactorizingOptions(problem.answer, problem.coefficient),
      type: 'factorizing'
    };
  };

  // 24. Алгебраические дроби (Algebraic fractions)
  const generateAlgebraicFractions = (): Question => {
    const problems = [
      { question: "(4x)/2 = ?", answer: "2x", coefficient: 2 },
      { question: "(6x)/3 = ?", answer: "2x", coefficient: 2 },
      { question: "(8x)/4 = ?", answer: "2x", coefficient: 2 },
      { question: "(9x)/3 = ?", answer: "3x", coefficient: 3 },
      { question: "(12x)/6 = ?", answer: "2x", coefficient: 2 },
      { question: "(15x)/5 = ?", answer: "3x", coefficient: 3 }
    ];
    
    const problem = problems[Math.floor(Math.random() * problems.length)];
    
    return {
      text: `Упростить: ${problem.question}`,
      answer: problem.answer,
      options: generateAlgebraicOptions(problem.answer, problem.coefficient),
      type: 'algebraic-fractions'
    };
  };

  // Helper function to generate options
  const generateOptions = (correctAnswer: number, isDecimal: boolean = false): number[] => {
    const options = [correctAnswer];
    
    while (options.length < 4) {
      let wrongAnswer;
      if (isDecimal) {
        wrongAnswer = Math.round((correctAnswer + (Math.random() - 0.5) * 2) * 10) / 10;
      } else {
        wrongAnswer = correctAnswer + Math.floor(Math.random() * 10) - 5;
      }
      
      if (wrongAnswer !== correctAnswer && wrongAnswer > 0 && !options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return options;
  };

  // Helper function to generate fraction options
  const generateFractionOptions = (correctAnswer: string): string[] => {
    const options = [correctAnswer];
    
    // Common fraction distractors based on the correct answer
    const distractors: Record<string, string[]> = {
      "1/2": ["1/3", "1/4", "2/3"],
      "1/6": ["1/4", "1/5", "1/8"],
      "3/10": ["1/3", "2/5", "1/4"]
    };
    
    // Add distractors for the specific correct answer
    if (distractors[correctAnswer]) {
      distractors[correctAnswer].forEach(distractor => {
        if (!options.includes(distractor)) {
          options.push(distractor);
        }
      });
    }
    
    // If we still need more options, add common fractions
    const commonFractions = ["1/2", "1/3", "1/4", "1/5", "1/6", "2/3", "2/5", "3/4"];
    while (options.length < 4) {
      const randomFraction = commonFractions[Math.floor(Math.random() * commonFractions.length)];
      if (!options.includes(randomFraction)) {
        options.push(randomFraction);
      }
    }
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return options;
  };
  
  // Generate expression options for algebraic questions
  // Helper functions to generate options for each question type
  const generateExpandingOptions = (correctAnswer: string, coefficient: number): string[] => {
    const options = [correctAnswer];
    
    // Generate wrong options by changing coefficients or constants
    const wrongAnswers = [
      correctAnswer.replace(/(\d+)x/, (match, coeff) => `${parseInt(coeff) + 1}x`),
      correctAnswer.replace(/(\d+)x/, (match, coeff) => `${Math.max(1, parseInt(coeff) - 1)}x`),
      correctAnswer.replace(/(\d+)$/, (match, constant) => `${parseInt(constant) + 2}`),
      correctAnswer.replace(/(\d+)$/, (match, constant) => `${Math.max(1, parseInt(constant) - 2)}`),
      correctAnswer.replace('+', '-'),
      correctAnswer.replace('-', '+')
    ];
    
    // Add unique wrong answers
    for (const wrong of wrongAnswers) {
      if (wrong !== correctAnswer && !options.includes(wrong) && options.length < 4) {
        options.push(wrong);
      }
    }
    
    // Fill remaining slots if needed
    while (options.length < 4) {
      const wrongCoeff = coefficient + Math.floor(Math.random() * 6) - 2;
      const wrongConst = Math.floor(Math.random() * 8) + 1;
      const wrongAnswer = `${Math.max(1, wrongCoeff)}x + ${wrongConst}`;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };
  
  const generateCollectingOptions = (correctAnswer: string, coefficient: number): string[] => {
    const options = [correctAnswer];
    
    // Generate wrong options by changing coefficients
    const variables = ['x', 'y', 'a', 'b'];
    const currentVar = correctAnswer.slice(-1);
    
    for (let i = 1; i <= 6 && options.length < 4; i++) {
      const wrongCoeff = coefficient + i;
      const wrongVar = variables[Math.floor(Math.random() * variables.length)];
      const wrongAnswer = `${wrongCoeff}${wrongVar}`;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };
  
  const generateFactorizingOptions = (correctAnswer: string, coefficient: number): string[] => {
    const options = [correctAnswer];
    
    // Generate wrong options by changing coefficients or constants
    const wrongAnswers = [
      correctAnswer.replace(/(\d+)\(x \+/, (match, coeff) => `${parseInt(coeff) + 1}(x +`),
      correctAnswer.replace(/(\d+)\(x \+/, (match, coeff) => `${Math.max(1, parseInt(coeff) - 1)}(x +`),
      correctAnswer.replace(/(\d+)\)$/, (match, constant) => `${parseInt(constant) + 1})`),
      correctAnswer.replace(/(\d+)\)$/, (match, constant) => `${Math.max(1, parseInt(constant) - 1)})`)
    ];
    
    // Add unique wrong answers
    for (const wrong of wrongAnswers) {
      if (wrong !== correctAnswer && !options.includes(wrong) && options.length < 4) {
        options.push(wrong);
      }
    }
    
    // Fill remaining slots if needed
    while (options.length < 4) {
      const wrongCoeff = Math.max(1, coefficient + Math.floor(Math.random() * 6) - 2);
      const wrongConst = Math.floor(Math.random() * 8) + 1;
      const wrongAnswer = `${wrongCoeff}(x + ${wrongConst})`;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };
  
  const generateAlgebraicOptions = (correctAnswer: string, coefficient: number): string[] => {
    const options = [correctAnswer];
    
    // Generate wrong options by changing coefficients
    const variables = ['x', 'y', 'a', 'b'];
    const currentVar = correctAnswer.slice(-1);
    
    for (let i = 1; i <= 6 && options.length < 4; i++) {
      const wrongCoeff = coefficient + i;
      const wrongVar = variables[Math.floor(Math.random() * variables.length)];
      const wrongAnswer = `${wrongCoeff}${wrongVar}`;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };
  
  const generateLikeTermsOptions = (correctAnswer: string, coefficient: number): string[] => {
    const options = [correctAnswer];
    
    // Generate wrong options by changing coefficients
    const variables = ['x', 'y', 'a', 'b'];
    const currentVar = correctAnswer.slice(-1);
    
    for (let i = 1; i <= 6 && options.length < 4; i++) {
      const wrongCoeff = coefficient + i;
      const wrongVar = variables[Math.floor(Math.random() * variables.length)];
      const wrongAnswer = `${wrongCoeff}${wrongVar}`;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };
  
  const generatePolynomialOptions = (correctAnswer: string, coefficient: number): string[] => {
    const options = [correctAnswer];
    
    // Generate wrong options by changing coefficients or constants
    const wrongAnswers = [
      correctAnswer.replace(/(\d+)x/, (match, coeff) => `${parseInt(coeff) + 1}x`),
      correctAnswer.replace(/(\d+)x/, (match, coeff) => `${Math.max(1, parseInt(coeff) - 1)}x`),
      correctAnswer.replace(/(\d+)$/, (match, constant) => `${parseInt(constant) + 2}`),
      correctAnswer.replace(/(\d+)$/, (match, constant) => `${Math.max(1, parseInt(constant) - 2)}`),
      correctAnswer.replace('+', '-'),
      correctAnswer.replace('-', '+')
    ];
    
    // Add unique wrong answers
    for (const wrong of wrongAnswers) {
      if (wrong !== correctAnswer && !options.includes(wrong) && options.length < 4) {
        options.push(wrong);
      }
    }
    
    // Fill remaining slots if needed
    while (options.length < 4) {
      const wrongCoeff = coefficient + Math.floor(Math.random() * 6) - 2;
      const wrongConst = Math.floor(Math.random() * 8) + 1;
      const wrongAnswer = `${Math.max(1, wrongCoeff)}x + ${wrongConst}`;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };
  
  const generateSimplificationOptions = (correctAnswer: string, coefficient: number): string[] => {
    const options = [correctAnswer];
    
    // Generate wrong options by changing coefficients
    const variables = ['x', 'y', 'a', 'b'];
    const currentVar = correctAnswer.slice(-1);
    
    for (let i = 1; i <= 6 && options.length < 4; i++) {
      const wrongCoeff = coefficient + i;
      const wrongVar = variables[Math.floor(Math.random() * variables.length)];
      const wrongAnswer = `${wrongCoeff}${wrongVar}`;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };
  
  // Start the game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    scoreRef.current = 0; // Update ref as well
    setFeedback(null);
    setDifficultyNotification(null); // Clear difficulty notification
    setTowerHP(100);
    towerHPRef.current = 100; // Update ref as well
    enemiesRef.current = [];
    projectilesRef.current = [];
    setCurrentQuestion(generateQuestion());
    
    // Spawn first enemy
    spawnEnemy();
  };
  
  // Spawn an enemy
  const spawnEnemy = () => {
    const spawnY = 150 + Math.random() * 100;
    
    enemiesRef.current.push({
      x: 600,
      y: spawnY,
      health: 100,
      type: Math.floor(Math.random() * 3), // 3 different enemy types
      attacking: false,
      attackCooldown: 0
    });
  };
  
  // Create explosion
  const createExplosion = (x: number, y: number, isZombieExplosion: boolean = false) => {
    explosionsRef.current.push({
      x: x,
      y: y,
      radius: 0,
      life: isZombieExplosion ? 45 : 30, // Zombie explosions last longer
      isZombieExplosion: isZombieExplosion
    });
  };
  
  // Handle answer selection
  const handleAnswer = (selectedAnswer: number | string) => {
    if (!currentQuestion || gameState !== 'playing') return;
    
    // Check answer based on type
    let isCorrect = false;
    
    if (typeof selectedAnswer === 'string' && typeof currentQuestion.answer === 'string') {
      // String comparison for algebraic expressions
      isCorrect = selectedAnswer === currentQuestion.answer;
    } else if (typeof selectedAnswer === 'number' && typeof currentQuestion.answer === 'number') {
      // Number comparison for numerical answers
      isCorrect = selectedAnswer === currentQuestion.answer;
    } else {
      // Mixed types - convert both to strings for comparison
      isCorrect = String(selectedAnswer) === String(currentQuestion.answer);
    }
    
    if (isCorrect) {
      // Correct answer - add points and shoot at nearest enemy
      const pointsEarned = 10;
      setScore(prevScore => {
        const newScore = prevScore + pointsEarned;
        scoreRef.current = newScore; // Update ref as well
        
        // Check for difficulty increase
        checkDifficultyIncrease(prevScore, newScore);
        
        return newScore;
      });
      
      // Show positive feedback
      setFeedback({message: `+${pointsEarned} Верно!`, color: '#44FF44'});
      
      if (enemiesRef.current.length > 0) {
        const nearestEnemy = enemiesRef.current[0];
        const projectile = {
          x: towerRef.current.x + towerRef.current.width / 2,
          y: towerRef.current.y + towerRef.current.height / 2,
          targetX: nearestEnemy.x,
          targetY: nearestEnemy.y,
          life: 100
        };
        projectilesRef.current.push(projectile);
      }
    } else {
      // Incorrect answer - deduct points (but don't go below 0)
      const pointsLost = 5;
      setScore(prevScore => {
        const newScore = Math.max(0, prevScore - pointsLost);
        scoreRef.current = newScore; // Update ref as well
        return newScore;
      });
      
      // Show negative feedback
      setFeedback({message: `-${pointsLost} Неверно!`, color: '#FF4444'});
    }
    
    // Clear feedback after 6 seconds (increased from 3 seconds)
    setTimeout(() => setFeedback(null), 6000);
    
    // Generate new question immediately so player can continue playing
    setCurrentQuestion(generateQuestion());
  };
  
  // Draw pixel tower - Enhanced bigger version
  const drawPixelTower = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Main tower structure - wider and taller
    const towerWidth = 80;
    const towerHeight = 100;
    
    // Tower foundation/base - large stone blocks
    const foundationColors = ['#4A3C28', '#5D4E37', '#6B563F'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const blockX = x + col * 14;
        const blockY = y + 70 + row * 8;
        const colorIndex = (row + col) % 3;
        
        ctx.fillStyle = foundationColors[colorIndex];
        ctx.fillRect(blockX, blockY, 13, 7);
        
        // Block outline
        ctx.strokeStyle = '#2A1F15';
        ctx.lineWidth = 1;
        ctx.strokeRect(blockX, blockY, 13, 7);
      }
    }
    
    // Main tower body - stone brick pattern
    const brickColors = ['#8B7355', '#A0826D', '#6B563F'];
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 5; col++) {
        const brickX = x + 5 + col * 15;
        const brickY = y + 20 + row * 5;
        const colorIndex = (row + col) % 3;
        
        ctx.fillStyle = brickColors[colorIndex];
        ctx.fillRect(brickX, brickY, 14, 4);
        
        // Brick outline
        ctx.strokeStyle = '#4A3C28';
        ctx.lineWidth = 1;
        ctx.strokeRect(brickX, brickY, 14, 4);
      }
    }
    
    // Tower middle section - reinforced with wooden beams
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 10, y + 15, 60, 50);
    
    // Wooden support beams - thicker
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 5, y + 15, 6, 50);
    ctx.fillRect(x + 69, y + 15, 6, 50);
    
    // Wood grain details on beams
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 20 + i * 10);
      ctx.lineTo(x + 11, y + 18 + i * 10);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x + 69, y + 20 + i * 10);
      ctx.lineTo(x + 75, y + 18 + i * 10);
      ctx.stroke();
    }
    
    // Tower top - battlements with crenellations
    ctx.fillStyle = '#6B563F';
    for (let i = 0; i < 4; i++) {
      if (i !== 1 && i !== 2) { // Create gaps in battlements
        ctx.fillRect(x + i * 20, y, 18, 20);
      }
    }
    
    // Battlement details
    ctx.fillStyle = '#5D4E37';
    ctx.fillRect(x + 20, y + 5, 20, 10); // Middle section
    ctx.fillRect(x + 40, y + 5, 20, 10); // Middle section
    
    // Tower flag pole - taller and thicker
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(x + 38, y - 45, 6, 45);
    
    // Tower flag - much bigger with sigma design
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(x + 44, y - 40, 40, 30);
    
    // Flag shadow for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x + 46, y - 38, 40, 30);
    
    // Draw big orange sigma symbol on flag
    drawBigSigmaSymbol(ctx, x + 46, y - 35);
    
    // Magic crystal on top - bigger and more detailed
    ctx.fillStyle = '#00FFFF';
    ctx.fillRect(x + 32, y - 10, 16, 12);
    
    // Crystal facets - multiple colors
    ctx.fillStyle = '#00DDDD';
    ctx.fillRect(x + 34, y - 8, 6, 8);
    ctx.fillStyle = '#00BBBB';
    ctx.fillRect(x + 42, y - 8, 6, 8);
    
    // Crystal glow - larger and more magical
    ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.fillRect(x + 28, y - 14, 24, 18);
    
    // Additional glow layers
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.fillRect(x + 26, y - 16, 28, 22);
    
    // Tower windows - glowing
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 20, y + 30, 8, 8);
    ctx.fillRect(x + 52, y + 30, 8, 8);
    
    // Window glow
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.fillRect(x + 18, y + 28, 12, 12);
    ctx.fillRect(x + 50, y + 28, 12, 12);
    
    // Tower door - arched
    ctx.fillStyle = '#4A3C28';
    ctx.fillRect(x + 30, y + 65, 20, 25);
    
    // Door arch
    ctx.fillStyle = '#4A3C28';
    ctx.fillRect(x + 25, y + 60, 30, 8);
    
    // Door details
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 38, y + 75, 4, 10); // Door handle
    
    // Tower decorations - shields
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(x + 15, y + 45, 12, 15);
    ctx.fillRect(x + 53, y + 45, 12, 15);
    
    // Shield details
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(x + 18, y + 48, 6, 9);
    ctx.fillRect(x + 56, y + 48, 6, 9);
    
    // Tower base shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 5, y + 95, 70, 8);
  };

  // Draw pixel hedgehog for flag
  const drawPixelHedgehog = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Hedgehog body - main oval shape (slightly larger for clarity)
    ctx.fillStyle = '#8B4513'; // Brown body
    ctx.fillRect(x + 3, y + 6, 14, 10);
    
    // Hedgehog spines - very prominent dark brown triangles pointing outward
    ctx.fillStyle = '#2F1B0C'; // Very dark brown spines for contrast
    // Top spines - more numerous and distinct
    ctx.fillRect(x + 2, y, 2, 4);
    ctx.fillRect(x + 4, y - 1, 2, 5);
    ctx.fillRect(x + 6, y - 2, 2, 6);
    ctx.fillRect(x + 8, y - 2, 2, 6);
    ctx.fillRect(x + 10, y - 1, 2, 5);
    ctx.fillRect(x + 12, y, 2, 4);
    ctx.fillRect(x + 14, y + 1, 2, 3);
    
    // Side spines - flaring out more
    ctx.fillRect(x, y + 4, 2, 4);
    ctx.fillRect(x + 16, y + 4, 2, 4);
    ctx.fillRect(x - 1, y + 6, 2, 3);
    ctx.fillRect(x + 17, y + 6, 2, 3);
    
    // Hedgehog face - lighter brown, more defined
    ctx.fillStyle = '#A0826D'; // Lighter brown for face
    ctx.fillRect(x + 5, y + 8, 10, 6);
    
    // Eyes - black, larger and more prominent
    ctx.fillStyle = '#000000'; // Black eyes
    ctx.fillRect(x + 6, y + 9, 3, 3);
    ctx.fillRect(x + 11, y + 9, 3, 3);
    
    // Eye highlights - white
    ctx.fillStyle = '#FFFFFF'; // White eye highlights
    ctx.fillRect(x + 7, y + 9, 1, 1);
    ctx.fillRect(x + 12, y + 9, 1, 1);
    
    // Nose - pink, more prominent
    ctx.fillStyle = '#FF69B4'; // Brighter pink nose
    ctx.fillRect(x + 9, y + 11, 3, 2);
    
    // Cheeks - light pink blush, more visible
    ctx.fillStyle = 'rgba(255, 182, 193, 0.8)'; // Light pink blush
    ctx.fillRect(x + 3, y + 10, 3, 2);
    ctx.fillRect(x + 14, y + 10, 3, 2);
    
    // Little feet - dark brown, more visible
    ctx.fillStyle = '#4A2C17'; // Dark brown feet
    ctx.fillRect(x + 4, y + 15, 3, 2);
    ctx.fillRect(x + 13, y + 15, 3, 2);
    
    // Add some extra detail spines on the back for more hedgehog character
    ctx.fillStyle = '#2F1B0C'; // Extra spines
    ctx.fillRect(x + 7, y + 2, 2, 3);
    ctx.fillRect(x + 9, y + 2, 2, 3);
    
    // Hedgehog accessory - tiny hat
    ctx.fillStyle = '#654321'; // Brown hat
    ctx.fillRect(x + 6, y + 2, 4, 2);
    ctx.fillStyle = '#8B4513'; // Hat band
    ctx.fillRect(x + 6, y + 3, 4, 1);
  };

  // Draw big orange sigma symbol for large flag
  const drawBigSigmaSymbol = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Clear background area first
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(x + 2, y + 2, 36, 26);
    
    // Main sigma shape - create proper Σ form
    ctx.fillStyle = '#FF8C00'; // Dark orange
    
    // Top horizontal line (left to right)
    ctx.fillRect(x + 6, y + 4, 24, 4);
    
    // Bottom horizontal line (left to right) 
    ctx.fillRect(x + 6, y + 22, 24, 4);
    
    // Left diagonal - top part (angles down and right)
    ctx.fillRect(x + 6, y + 4, 4, 8);
    ctx.fillRect(x + 8, y + 8, 4, 4);
    ctx.fillRect(x + 10, y + 10, 4, 4);
    
    // Right diagonal - top part (angles down and left)
    ctx.fillRect(x + 26, y + 4, 4, 8);
    ctx.fillRect(x + 24, y + 8, 4, 4);
    ctx.fillRect(x + 22, y + 10, 4, 4);
    
    // Middle connecting section
    ctx.fillRect(x + 10, y + 12, 16, 4);
    
    // Left diagonal - bottom part (angles down and right from middle)
    ctx.fillRect(x + 10, y + 14, 4, 4);
    ctx.fillRect(x + 12, y + 16, 4, 4);
    ctx.fillRect(x + 14, y + 18, 4, 4);
    
    // Right diagonal - bottom part (angles down and left from middle)
    ctx.fillRect(x + 22, y + 14, 4, 4);
    ctx.fillRect(x + 20, y + 16, 4, 4);
    ctx.fillRect(x + 18, y + 18, 4, 4);
    
    // Add thickness and definition
    ctx.fillStyle = '#FF6347'; // Red-orange for depth
    // Top line thickness
    ctx.fillRect(x + 6, y + 6, 24, 2);
    // Bottom line thickness
    ctx.fillRect(x + 6, y + 22, 24, 2);
    // Left diagonal thickness
    ctx.fillRect(x + 8, y + 6, 2, 8);
    ctx.fillRect(x + 10, y + 10, 2, 4);
    // Right diagonal thickness
    ctx.fillRect(x + 26, y + 6, 2, 8);
    ctx.fillRect(x + 24, y + 10, 2, 4);
    
    // Highlight for 3D effect
    ctx.fillStyle = '#FFA500'; // Bright orange
    ctx.fillRect(x + 8, y + 4, 20, 2);
    ctx.fillRect(x + 8, y + 8, 2, 6);
    ctx.fillRect(x + 26, y + 8, 2, 6);
    ctx.fillRect(x + 12, y + 14, 16, 2);
    
    // Final outline for crisp definition
    ctx.fillStyle = '#FF4500'; // Orange-red outline
    // Top outline
    ctx.fillRect(x + 6, y + 2, 24, 2);
    // Bottom outline  
    ctx.fillRect(x + 6, y + 26, 24, 2);
    // Left outline
    ctx.fillRect(x + 4, y + 4, 2, 22);
    // Right outline
    ctx.fillRect(x + 30, y + 4, 2, 22);
    
    // Clean up the sigma shape - remove inner red background
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(x + 14, y + 10, 8, 8);
    
    // Add mathematical precision center
    ctx.fillStyle = '#FF8C00';
    ctx.fillRect(x + 16, y + 12, 4, 4);
  };
  
  // Draw pixel enemy
  const drawPixelEnemy = (ctx: CanvasRenderingContext2D, enemy: {x: number, y: number, type: number}) => {
    const { x, y, type } = enemy;
    
    // Different enemy types based on type number
    const enemyColors = [
      { body: '#8B4513', clothes: '#654321' }, // Brown zombie
      { body: '#2F4F4F', clothes: '#1C1C1C' }, // Dark zombie
      { body: '#556B2F', clothes: '#2F4F2F' }  // Green zombie
    ];
    
    const colors = enemyColors[type];
    
    // Enemy shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x - 12, y + 20, 24, 4);
    
    // Enemy body
    ctx.fillStyle = colors.body;
    ctx.fillRect(x - 8, y - 5, 16, 20);
    
    // Enemy clothes
    ctx.fillStyle = colors.clothes;
    ctx.fillRect(x - 6, y + 2, 12, 10);
    
    // Enemy head
    ctx.fillStyle = colors.body;
    ctx.fillRect(x - 6, y - 12, 12, 10);
    
    // Enemy eyes - glowing red
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x - 4, y - 10, 2, 2);
    ctx.fillRect(x + 2, y - 10, 2, 2);
    
    // Enemy mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 3, y - 6, 6, 2);
    
    // Enemy arms
    ctx.fillStyle = colors.body;
    ctx.fillRect(x - 12, y - 2, 4, 8);
    ctx.fillRect(x + 8, y - 2, 4, 8);
    
    // Enemy legs
    ctx.fillStyle = colors.clothes;
    ctx.fillRect(x - 6, y + 12, 4, 8);
    ctx.fillRect(x + 2, y + 12, 4, 8);
  };
  
  // Draw pixel projectile
  const drawPixelProjectile = (ctx: CanvasRenderingContext2D, projectile: {x: number, y: number}) => {
    const { x, y } = projectile;
    
    // Magic missile - pixel style - made more visible
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(x - 3, y - 3, 6, 6);
    
    // Magic glow - made more visible
    ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.fillRect(x - 6, y - 6, 12, 12);
    
    // Add a bright center
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 1, y - 1, 2, 2);
    
    // Trail effect
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.fillRect(x - 8, y - 1, 4, 2);
  };
  
  // Draw pixel explosion
  const drawPixelExplosion = (ctx: CanvasRenderingContext2D, explosion: {x: number, y: number, radius: number, life: number, isZombieExplosion?: boolean}) => {
    const { x, y, radius, life, isZombieExplosion } = explosion;
    
    if (isZombieExplosion) {
      // Zombie explosion - green and red with zombie particles
      const maxLife = 45;
      const progress = 1 - (life / maxLife);
      
      // Main explosion core - bright green/yellow
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      
      // Outer explosion rings - zombie colors
      for (let i = 1; i <= 4; i++) {
        const ringRadius = radius * (i / 4);
        const alpha = (1 - progress) * (1 - i / 4);
        
        if (ringRadius > 0) {
          // Green and red rings for zombie explosion
          const colors = i % 2 === 0 ? 
            `rgba(0, 255, 0, ${alpha})` : // Green
            `rgba(255, 0, 0, ${alpha})`;   // Red
          
          ctx.fillStyle = colors;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Bright core
          if (i === 1) {
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(x, y, ringRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // Zombie particles - body parts
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const distance = radius * (0.5 + Math.random() * 0.5);
        const particleX = x + Math.cos(angle) * distance;
        const particleY = y + Math.sin(angle) * distance;
        
        // Zombie body particles
        ctx.fillStyle = i % 3 === 0 ? '#8B4513' : i % 3 === 1 ? '#2F4F4F' : '#556B2F';
        ctx.fillRect(particleX - 2, particleY - 2, 4, 4);
        
        // Blood particles
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(particleX - 1, particleY - 1, 2, 2);
      }
      
      // Skull in center
      if (life > 30) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 4, y - 4, 8, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 2, y - 2, 1, 1);
        ctx.fillRect(x + 1, y - 2, 1, 1);
      }
      
    } else {
      // Normal projectile explosion - original code
      // Explosion center - bright white/yellow
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(x - 2, y - 2, 4, 4);
      
      // Explosion rings
      for (let i = 1; i <= 3; i++) {
        const ringRadius = radius * (i / 3);
        const alpha = 1 - (i / 3);
        
        if (ringRadius > 0) {
          // Outer explosion ring
          ctx.fillStyle = `rgba(255, ${100 + i * 50}, 0, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner bright core
          if (i === 1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(x, y, ringRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // Explosion particles - pixel style
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const particleX = x + Math.cos(angle) * radius * 0.8;
        const particleY = y + Math.sin(angle) * radius * 0.8;
        
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(particleX - 1, particleY - 1, 2, 2);
        
        ctx.fillStyle = '#FF6500';
        ctx.fillRect(particleX - 2, particleY - 2, 4, 4);
      }
    }
  };
  
  // Draw pixel background
  const drawPixelBackground = (ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grass tiles - clean pattern without noise
    const grassColors = ['#228B22', '#32CD32', '#90EE90'];
    for (let y = canvas.height - 80; y < canvas.height; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        // Use a consistent pattern instead of random
        const colorIndex = ((x / 8) + (y / 8)) % 3;
        ctx.fillStyle = grassColors[colorIndex];
        ctx.fillRect(x, y, 8, 8);
      }
    }
    
    // Path/dirt road - clean brown without noise
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 180, canvas.width, 60);
    
    // Path texture - consistent pattern instead of random stones
    ctx.fillStyle = '#A0826D';
    for (let x = 10; x < canvas.width; x += 30) {
      for (let y = 190; y < 230; y += 20) {
        // Create a regular pattern of stones
        if ((x + y) % 60 === 0) {
          ctx.fillRect(x, y, 6, 6);
        }
      }
    }
    
    // Decorative trees
    for (let i = 0; i < 5; i++) {
      const treeX = 50 + i * 120;
      const treeY = canvas.height - 120;
      
      // Tree trunk
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(treeX, treeY, 8, 40);
      
      // Tree leaves - clean pixel pattern
      ctx.fillStyle = '#228B22';
      ctx.fillRect(treeX - 12, treeY - 20, 32, 25);
      
      // Tree highlights - consistent pattern
      ctx.fillStyle = '#32CD32';
      ctx.fillRect(treeX - 8, treeY - 15, 8, 8);
      ctx.fillRect(treeX + 8, treeY - 18, 8, 8);
    }
  };
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const gameLoop = setInterval(() => {
      // Check if game should be over using ref for immediate access
      if (towerHPRef.current <= 0) {
        setGameState('gameOver');
        return;
      }
      // Move enemies toward tower and handle explosions
      enemiesRef.current = enemiesRef.current.map(enemy => {
        const towerCenterX = towerRef.current.x + towerRef.current.width / 2;
        const towerCenterY = towerRef.current.y + towerRef.current.height / 2;
        
        const dx = towerCenterX - enemy.x;
        const dy = towerCenterY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 25) {
          // Move toward tower if not close enough - use dynamic speed based on score
          const zombieSpeed = getZombieSpeed();
          return {
            ...enemy,
            x: enemy.x + (dx / distance) * zombieSpeed,
            y: enemy.y + (dy / distance) * zombieSpeed,
            attacking: false,
            attackCooldown: enemy.attackCooldown > 0 ? enemy.attackCooldown - 1 : 0
          };
        } else {
          // Zombie reached tower - create explosion and damage tower
          createExplosion(enemy.x, enemy.y, true); // Zombie explosion
          
          // Damage tower
          setTowerHP(prevHP => {
            const newHP = Math.max(0, prevHP - 15); // 15 damage per explosion
            towerHPRef.current = newHP; // Update ref for immediate access
            console.log(`Tower damaged! Previous HP: ${prevHP}, New HP: ${newHP}`); // Debug log
            if (newHP === 0) {
              // Game over - update high score if needed
              setGameState('gameOver');
              setHighScore(prevHighScore => Math.max(prevHighScore, scoreRef.current));
            }
            return newHP;
          });
          
          // Remove this zombie (return null to filter it out later)
          return null;
        }
      }).filter(enemy => enemy !== null) as Array<{x: number, y: number, health: number, type: number, attacking: boolean, attackCooldown: number}>;
      
      // Move projectiles and handle collisions
      projectilesRef.current = projectilesRef.current.map(projectile => {
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check for collision with any enemy
        let hitEnemy = false;
        enemiesRef.current.forEach(enemy => {
          const enemyDx = projectile.x - enemy.x;
          const enemyDy = projectile.y - enemy.y;
          const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);
          
          if (enemyDistance < 30) {
            hitEnemy = true;
          }
        });
        
        // If hit enemy or reached target, create explosion and remove projectile
        if (hitEnemy || distance < 10) {
          createExplosion(projectile.x, projectile.y);
          return null; // Remove projectile
        }
        
        // Move projectile if it hasn't hit anything
        if (distance > 5) {
          return {
            ...projectile,
            x: projectile.x + (dx / distance) * 8,
            y: projectile.y + (dy / distance) * 6,
            life: projectile.life - 1
          };
        }
        
        return projectile;
      }).filter(projectile => projectile !== null && projectile.life > 0 && projectile.x > 0 && projectile.x < 700) as Array<{x: number, y: number, targetX: number, targetY: number, life: number}>;
      
      // Update explosions
      explosionsRef.current = explosionsRef.current.map(explosion => ({
        ...explosion,
        radius: explosion.radius + (explosion.isZombieExplosion ? 4 : 3), // Zombie explosions expand faster
        life: explosion.life - 1
      })).filter(explosion => explosion.life > 0);
      
      // Remove enemies within projectile explosion radius only (not zombie explosions)
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        let inExplosion = false;
        
        explosionsRef.current.forEach(explosion => {
          // Only check projectile explosions, not zombie explosions
          if (!explosion.isZombieExplosion) {
            const dx = enemy.x - explosion.x;
            const dy = enemy.y - explosion.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 2 meters = 200 pixels in our game scale
            if (distance < explosion.radius && explosion.radius > 50) {
              inExplosion = true;
            }
          }
        });
        
        return !inExplosion;
      });
      
      // Spawn new enemies occasionally - spawn rate increases with difficulty
      if (Math.random() < getZombieSpawnRate()) {
        spawnEnemy();
      }
      
      // Draw everything
      draw();
    }, 50);
    
    return () => clearInterval(gameLoop);
  }, [gameState]);
  
  // Draw the game
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw pixel background
    drawPixelBackground(ctx);
    
    // Draw pixel tower
    drawPixelTower(ctx, towerRef.current.x, towerRef.current.y);
    
    // Draw enemies
    enemiesRef.current.forEach(enemy => {
      drawPixelEnemy(ctx, enemy);
    });
    
    // Draw projectiles
    projectilesRef.current.forEach(projectile => {
      drawPixelProjectile(ctx, projectile);
    });
    
    // Draw explosions
    explosionsRef.current.forEach(explosion => {
      drawPixelExplosion(ctx, explosion);
    });
    
    // Draw UI
    drawPixelUI(ctx);
  };
  
  // Draw pixel UI
  const drawPixelUI = (ctx: CanvasRenderingContext2D) => {
    const currentHP = towerHPRef.current; // Use ref for most current value
    
    // Score background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 150, 40);
    
    // Score border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 150, 40);
    
    // Score text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`ОЧКИ: ${scoreRef.current.toString().padStart(4, '0')}`, 20, 35);
    
    // High score background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(170, 10, 150, 40);
    
    // High score border
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2;
    ctx.strokeRect(170, 10, 150, 40);
    
    // High score text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`РЕКОРД: ${highScore.toString().padStart(4, '0')}`, 180, 35);
    
    // Difficulty indicator
    const currentScore = scoreRef.current;
    let difficultyText = 'НОРМАЛ';
    let difficultyColor = '#44FF44';
    
    if (currentScore >= 150) {
      difficultyText = 'ЭКСТРЕМ';
      difficultyColor = '#FF4444';
    } else if (currentScore >= 100) {
      difficultyText = 'СЛОЖНО';
      difficultyColor = '#FF8844';
    } else if (currentScore >= 50) {
      difficultyText = 'БЫСТРО';
      difficultyColor = '#FFFF44';
    }
    
    // Difficulty background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(330, 10, 120, 40);
    
    // Difficulty border
    ctx.strokeStyle = difficultyColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(330, 10, 120, 40);
    
    // Difficulty text
    ctx.fillStyle = difficultyColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(difficultyText, 340, 35);
    
    // Health bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 60, 150, 20);
    
    // Health bar border
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 60, 150, 20);
    
    // Health bar fill - color changes based on HP
    const healthPercentage = currentHP / 100;
    let healthColor;
    if (healthPercentage > 0.6) {
      healthColor = '#44FF44'; // Green
    } else if (healthPercentage > 0.3) {
      healthColor = '#FFFF44'; // Yellow
    } else {
      healthColor = '#FF4444'; // Red
    }
    
    // Calculate fill width based on current HP
    const fillWidth = Math.max(0, 140 * healthPercentage);
    console.log(`HP Bar - Percentage: ${healthPercentage}, Fill Width: ${fillWidth}`); // Debug log
    ctx.fillStyle = healthColor;
    ctx.fillRect(15, 65, fillWidth, 10);
    
    // Health text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`ЖИЗНИ: ${currentHP}`, 15, 75);
    
    // Game over overlay
    if (gameState === 'gameOver') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      ctx.fillStyle = '#FF4444';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ИГРА ОКОНЧЕНА', ctx.canvas.width / 2, ctx.canvas.height / 2 - 60);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`Финал: ${scoreRef.current}`, ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
      
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`Рекорд: ${highScore}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
      
      // Performance message
      let performanceMessage = '';
      let performanceColor = '#FFFFFF';
      
      if (scoreRef.current === highScore && scoreRef.current > 0) {
        performanceMessage = 'НОВЫЙ РЕКОРД!';
        performanceColor = '#FFD700';
      } else if (scoreRef.current >= highScore * 0.9) {
        performanceMessage = 'Отлично!';
        performanceColor = '#44FF44';
      } else if (scoreRef.current >= highScore * 0.7) {
        performanceMessage = 'Хорошо!';
        performanceColor = '#FFFF44';
      } else if (scoreRef.current >= highScore * 0.5) {
        performanceMessage = 'Продолжай тренироваться!';
        performanceColor = '#FF8800';
      } else {
        performanceMessage = 'Попробуй ещё раз!';
        performanceColor = '#FF4444';
      }
      
      ctx.fillStyle = performanceColor;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(performanceMessage, ctx.canvas.width / 2, ctx.canvas.height / 2 + 60);
    }
    
    ctx.textAlign = 'left';
  };
  
  // Initial draw
  useEffect(() => {
    draw();
  }, []);
  
  // Redraw when towerHP changes (removed feedback/difficulty dependencies)
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'gameOver') {
      draw();
    }
  }, [towerHP, gameState]);
  
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 lg:gap-6 lg:px-6 lg:py-6">
        <header
          className={`relative mx-auto overflow-hidden rounded-xl border border-purple-500/30 bg-black/25 text-center shadow-md ${
            isMobileLayout ? 'px-2 py-1.5' : 'px-3 py-2 lg:px-5 lg:py-3'
          }`}
          style={isMobileLayout ? { width: canvasDisplaySize.width, maxWidth: '100%' } : { width: canvasDisplaySize.width, maxWidth: '100%' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20" />
          <div className="relative z-10 space-y-1">
            <h1 className={`font-semibold ${isMobileLayout ? 'text-base' : 'text-lg md:text-xl lg:text-2xl'}`}>
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                🏰 Математическая башня 🧮
              </span>
            </h1>
            <p
              className={`font-medium text-purple-100 ${
                isMobileLayout ? 'text-[10px]' : 'text-[11px] md:text-xs lg:text-sm'
              }`}
            >
              Решайте задачи, чтобы башня выдержала натиск до рассвета!
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
          <section
            className={`relative flex ${isMobileLayout ? 'flex-none' : 'flex-1'} items-center justify-center overflow-hidden rounded-2xl border border-amber-600/45 bg-black/35 shadow-[0_20px_45px_rgba(0,0,0,0.45)] lg:min-h-0 ${
              isMobileLayout ? 'p-0' : 'p-4'
            }`}
            style={
              isMobileLayout
                ? { width: canvasDisplaySize.width, height: canvasDisplaySize.height, maxWidth: '100%', margin: '0 auto' }
                : undefined
            }
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                width: canvasDisplaySize.width,
                height: canvasDisplaySize.height,
                maxWidth: '100%',
              }}
            >
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="rounded-xl border-4 border-amber-600 bg-sky-400 shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                style={{
                  width: canvasDisplaySize.width,
                  height: canvasDisplaySize.height,
                  imageRendering: 'pixelated',
                  maxWidth: '100%',
                }}
              />

              <div
                className={`pointer-events-none absolute inset-x-0 top-2 flex flex-col gap-2 px-2 ${
                  isMobileLayout ? '' : 'sm:px-4'
                }`}
              >
                {feedback && (
                  <div
                    className="rounded-md border-2 bg-black/85 px-3 py-2 text-center font-mono text-sm font-bold shadow-lg"
                    style={{
                      borderColor: feedback.color,
                      color: feedback.color,
                      textShadow: '1px 1px 2px rgba(0,0,0,0.85)',
                    }}
                  >
                    {feedback.message}
                  </div>
                )}
                {difficultyNotification && (
                  <div
                    className="rounded-md border-2 bg-black/85 px-3 py-2 text-center font-mono text-xs font-bold uppercase tracking-wide shadow-lg"
                    style={{
                      borderColor: difficultyNotification.color,
                      color: difficultyNotification.color,
                      textShadow: '1px 1px 2px rgba(0,0,0,0.85)',
                    }}
                  >
                    {difficultyNotification.message}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className={`mx-auto flex w-full flex-col gap-4 rounded-2xl border border-purple-500/40 bg-black/40 shadow-2xl backdrop-blur-sm lg:max-w-sm ${
              isMobileLayout ? 'p-3' : 'p-4 lg:p-5'
            }`}
            style={isMobileLayout ? { width: canvasDisplaySize.width, maxWidth: '100%' } : undefined}
          >
            <div className={`flex flex-col gap-3 ${isMobileLayout ? 'text-[11px]' : ''}`}>
              <div
                className={`rounded-lg border border-purple-500/35 bg-slate-950/70 text-center font-mono text-purple-100 ${
                  isMobileLayout ? 'px-3 py-2 text-[11px]' : 'px-4 py-3 text-xs sm:text-sm'
                }`}
              >
                Жизни башни: <span className="font-bold text-amber-300">{towerHPRef.current}</span> · Очки:{' '}
                <span className="font-bold text-emerald-300">{scoreRef.current}</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {gameState === 'idle' && (
                  <button
                    onClick={startGame}
                    className={`relative overflow-hidden rounded-lg border-4 border-green-500 bg-slate-800 text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 sm:col-span-2 lg:col-span-1 ${
                      isMobileLayout ? 'px-4 py-3 text-[11px]' : 'px-6 py-4 text-xs'
                    }`}
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      textShadow: '2px 2px 0px #000',
                      boxShadow: '0 4px 0px #15803d, 0 6px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-base">🎮</span>
                      <span>Начать игру</span>
                    </span>
                    <span className="absolute inset-0 border-2 border-green-300 opacity-0 transition-opacity hover:opacity-100" />
                  </button>
                )}

                {gameState === 'gameOver' && (
                  <button
                    onClick={startGame}
                    className={`relative overflow-hidden rounded-lg border-4 border-red-500 bg-slate-800 text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 sm:col-span-2 lg:col-span-1 ${
                      isMobileLayout ? 'px-4 py-3 text-[11px]' : 'px-6 py-4 text-xs'
                    }`}
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      textShadow: '2px 2px 0px #000',
                      boxShadow: '0 4px 0px #dc2626, 0 6px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-base">🔄</span>
                      <span>Играть снова</span>
                    </span>
                    <span className="absolute inset-0 border-2 border-red-300 opacity-0 transition-opacity hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={`flex-1 rounded-xl border border-purple-500/25 bg-slate-950/60 shadow-inner ${
                isMobileLayout ? 'p-3' : 'p-4'
              }`}
            >
              {gameState === 'playing' && currentQuestion ? (
                <div className={`flex h-full flex-col gap-3 ${isMobileLayout ? 'gap-2' : ''}`}>
                  <h2
                    className={`text-center font-semibold uppercase tracking-wide text-amber-300 ${
                      isMobileLayout ? 'text-xs' : 'text-sm sm:text-base'
                    }`}
                  >
                    Математический вызов
                  </h2>
                  <div
                    className={`rounded-lg border border-purple-500/25 bg-slate-900/80 text-center font-mono font-bold text-white ${
                      isMobileLayout ? 'px-3 py-3 text-base' : 'px-4 py-4 text-lg sm:text-xl'
                    }`}
                  >
                    {currentQuestion.text}
                  </div>
                  <div
                    className={`grid gap-2 lg:overflow-y-auto lg:pr-1 ${
                      isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1'
                    }`}
                  >
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        className={`relative overflow-hidden rounded-md border-2 border-blue-500/40 bg-gradient-to-br from-blue-600 to-blue-700 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:border-blue-400 hover:shadow-xl ${
                          isMobileLayout ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm'
                        }`}
                      >
                        <span className="relative z-10">{option}</span>
                        <span className="absolute inset-0 opacity-0 transition-opacity hover:opacity-100 bg-gradient-to-br from-blue-500/50 to-blue-600/50" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className={`flex h-full flex-col items-center justify-center gap-3 text-center text-purple-100 ${
                    isMobileLayout ? 'text-xs' : 'text-xs sm:text-sm'
                  }`}
                >
                  <span className={`text-2xl ${isMobileLayout ? '' : 'sm:text-3xl'}`}>🧠</span>
                  <p>
                    Нажмите <span className="font-semibold text-amber-300">«Начать игру»</span>, чтобы защитить башню
                    своими знаниями!
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-1 text-center text-[11px] text-purple-200/70 sm:text-xs lg:text-sm">
          Используйте точные ответы и быструю реакцию, чтобы никто не прорвался к башне.
        </footer>
      </div>
    </div>
  );
};

export default PixelMathDefense;