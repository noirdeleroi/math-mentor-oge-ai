const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    console.log('Received request:', {
      goal: body.goal,
      hours_per_week: body.hours_per_week,
      school_grade: body.school_grade,
      days_to_exam: body.days_to_exam,
      progress_count: body.progress.length
    });
    const { goal, hours_per_week, school_grade, days_to_exam, progress } = body;
    // Parse progress data
    const topicMastery = {};
    const fipiMastery = {};
    const skillMastery = {};
    for (const item of progress){
      if (item.topic) {
        topicMastery[item.topic] = item.prob;
      } else if (item["задача ФИПИ"]) {
        fipiMastery[item["задача ФИПИ"]] = item.prob;
      } else if (item["навык"]) {
        skillMastery[item["навык"]] = item.prob;
      }
    }
    // Ordered topic codes
    const orderedTopicCodes = [
      '1.1',
      '1.2',
      '1.3',
      '1.4',
      '1.5',
      '2.1',
      '2.2',
      '2.3',
      '2.4',
      '2.5',
      '3.1',
      '3.2',
      '3.3',
      '4.1',
      '4.2',
      '5.1',
      '6.1',
      '6.2',
      '7.1',
      '7.2',
      '7.3',
      '7.4',
      '7.5',
      '7.6',
      '7.7',
      '8.1',
      '8.2',
      '8.3',
      '8.4',
      '8.5',
      '9.1',
      '9.2'
    ];
    // Textbook structure
    const textbook = {
      "Числа и вычисления": {
        "1.1": {
          "Тема": "Натуральные и целые числа",
          "навыки": [
            {
              "number": 1,
              "name": "Натуральные и целые числа",
              "importance": 0
            },
            {
              "number": 2,
              "name": "Научная форма числа",
              "importance": 2
            },
            {
              "number": 3,
              "name": "Делимость чисел",
              "importance": 2
            },
            {
              "number": 4,
              "name": "Признаки делимости на 2, 3, 5, 9, 10",
              "importance": 2
            },
            {
              "number": 5,
              "name": "Нахождение НОД и НОК",
              "importance": 1
            }
          ]
        },
        "1.2": {
          "Тема": "Дроби и проценты",
          "навыки": [
            {
              "number": 6,
              "name": "Обыкновенные и десятичные дроби",
              "importance": 0
            },
            {
              "number": 195,
              "name": "смешанные числа",
              "importance": 3
            },
            {
              "number": 7,
              "name": "Нахождение доли от числа",
              "importance": 2
            },
            {
              "number": 8,
              "name": "Вычисление процентов",
              "importance": 2
            },
            {
              "number": 9,
              "name": "Повышение/понижение на процент",
              "importance": 2
            },
            {
              "number": 10,
              "name": "Бесконечные периодические дроби",
              "importance": 4
            }
          ]
        },
        "1.3": {
          "Тема": "Рациональные числа и арифметические действия",
          "навыки": [
            {
              "number": 11,
              "name": "Определение рациональных чисел",
              "importance": 2
            },
            {
              "number": 12,
              "name": "Расположение на координатной прямой",
              "importance": 2
            },
            {
              "number": 13,
              "name": "Сравнение и упорядочивание рациональных чисел",
              "importance": 2
            },
            {
              "number": 14,
              "name": "Преобразование дробей",
              "importance": 2
            },
            {
              "number": 15,
              "name": "Арифметические действия с  обыкновенными дробями",
              "importance": 0
            },
            {
              "number": 16,
              "name": "Арифметические действия с десятичными дробями",
              "importance": 2
            },
            {
              "number": 17,
              "name": "Раскрытие скобок, распределительное свойство",
              "importance": 0
            },
            {
              "number": 180,
              "name": "порядок математических операций",
              "importance": 0
            }
          ]
        },
        "1.4": {
          "Тема": "Действительные числа",
          "навыки": [
            {
              "number": 18,
              "name": "Классификация действительных чисел",
              "importance": 2
            },
            {
              "number": 19,
              "name": "Приближённое значение корня числа",
              "importance": 3
            },
            {
              "number": 20,
              "name": "Арифметические операции с действительными числами",
              "importance": 2
            },
            {
              "number": 197,
              "name": "Сравнение и упорядочивание действительных чисел",
              "importance": 1
            }
          ]
        },
        "1.5": {
          "Тема": "Приближённые вычисления",
          "навыки": [
            {
              "number": 21,
              "name": "Понятие точности и погрешности",
              "importance": 2
            },
            {
              "number": 22,
              "name": "Округление чисел",
              "importance": 2
            },
            {
              "number": 23,
              "name": "Приближённые вычисления",
              "importance": 2
            }
          ]
        }
      },
      "Алгебраические выражения": {
        "2.1": {
          "Тема": "Буквенные выражения",
          "навыки": [
            {
              "number": 35,
              "name": "Выражения с переменными",
              "importance": 0
            },
            {
              "number": 36,
              "name": "Подстановка значений",
              "importance": 0
            },
            {
              "number": 37,
              "name": "Упрощение выражений",
              "importance": 0
            },
            {
              "number": 38,
              "name": "Раскрытие скобок",
              "importance": 0
            }
          ]
        },
        "2.2": {
          "Тема": "Степени",
          "навыки": [
            {
              "number": 39,
              "name": "Определение степени с целым показателем",
              "importance": 0
            },
            {
              "number": 40,
              "name": "Определение степени с рациональным показателем (Корни)",
              "importance": 1
            },
            {
              "number": 41,
              "name": "Умножение и деление степеней при одном основании",
              "importance": 1
            },
            {
              "number": 42,
              "name": "Возведение степени в степень",
              "importance": 1
            },
            {
              "number": 43,
              "name": "Степень произведения и частного ",
              "importance": 1
            },
            {
              "number": 44,
              "name": "Отрицательные степени",
              "importance": 2
            }
          ]
        },
        "2.3": {
          "Тема": "Многочлены",
          "навыки": [
            {
              "number": 45,
              "name": "Определение одночлена и многочлена",
              "importance": 2
            },
            {
              "number": 46,
              "name": "Приведение подобных членов многочленов",
              "importance": 1
            },
            {
              "number": 47,
              "name": "Сложение и вычитание многочленов",
              "importance": 1
            },
            {
              "number": 48,
              "name": "Умножение многочленов",
              "importance": 1
            },
            {
              "number": 49,
              "name": "Разложение многочленов на множители (факторизация)",
              "importance": 1
            },
            {
              "number": 179,
              "name": "Разложение многочленов на множители (факторизация) квадратичный случай",
              "importance": 2
            }
          ]
        },
        "2.4": {
          "Тема": "Алгебраические дроби",
          "навыки": [
            {
              "number": 50,
              "name": "Определение и сокращение алгебраических дробей",
              "importance": 0
            },
            {
              "number": 51,
              "name": "Основное свойство алгебраической дроби",
              "importance": 1
            },
            {
              "number": 52,
              "name": "Арифметические действия с алгебраическими дробями",
              "importance": 1
            },
            {
              "number": 53,
              "name": "Преобразование выражений с алгебраическими дробями",
              "importance": 1
            }
          ]
        },
        "2.5": {
          "Тема": "Арифметические корни",
          "навыки": [
            {
              "number": 54,
              "name": "Определение корней",
              "importance": 1
            },
            {
              "number": 55,
              "name": "Свойства корней",
              "importance": 2
            },
            {
              "number": 56,
              "name": "Арифметика с корнями",
              "importance": 2
            },
            {
              "number": 57,
              "name": "Рационализация знаменателя",
              "importance": 3
            }
          ]
        }
      },
      "Уравнения и неравенства": {
        "3.1": {
          "Тема": "Уравнения и системы",
          "навыки": [
            {
              "number": 58,
              "name": "Решение линейных уравнений",
              "importance": 0
            },
            {
              "number": 59,
              "name": "Решение уравнений с дробями и скобками",
              "importance": 1
            },
            {
              "number": 60,
              "name": "Решение квадратных уравнений",
              "importance": 1
            },
            {
              "number": 61,
              "name": "Решение систем линейных уравнений",
              "importance": 2
            },
            {
              "number": 62,
              "name": "Рациональные уравнения",
              "importance": 2
            },
            {
              "number": 188,
              "name": "Методы подстановки / перебора / отбора значений",
              "importance": 3
            },
            {
              "number": 190,
              "name": "Применение формул с параметрами",
              "importance": 4
            },
            {
              "number": 191,
              "name": "Уравнения с модулями",
              "importance": 4
            }
          ]
        },
        "3.2": {
          "Тема": "Неравенства и системы",
          "навыки": [
            {
              "number": 63,
              "name": "Решение линейных неравенств",
              "importance": 2
            },
            {
              "number": 64,
              "name": "Графическое представление решений",
              "importance": 2
            },
            {
              "number": 65,
              "name": "Решение систем линейных неравенств",
              "importance": 2
            },
            {
              "number": 66,
              "name": "Квадратные неравенства ",
              "importance": 2
            },
            {
              "number": 67,
              "name": "Рациональные неравенства",
              "importance": 2
            },
            {
              "number": 68,
              "name": "Метод интервалов",
              "importance": 2
            }
          ]
        },
        "3.3": {
          "Тема": "Текстовые задачи",
          "навыки": [
            {
              "number": 69,
              "name": "Перевод текставой задачи в уравнение",
              "importance": 0
            },
            {
              "number": 70,
              "name": "Текстовые задачи: Задачи на проценты, сплавы и смеси ",
              "importance": 3
            },
            {
              "number": 71,
              "name": "Текстовые задачи: Движение по прямой",
              "importance": 3
            },
            {
              "number": 72,
              "name": "Текстовые задачи: Задачи на движение по воде ",
              "importance": 3
            },
            {
              "number": 73,
              "name": "Текстовые задачи: Задачи на совместную работу ",
              "importance": 3
            },
            {
              "number": 74,
              "name": "Текстовые задачи: Задачи про бизнес",
              "importance": 3
            },
            {
              "number": 184,
              "name": "Составление и опровержение утверждений",
              "importance": 2
            },
            {
              "number": 185,
              "name": "Работа с необходимыми и достаточными условиями",
              "importance": 4
            },
            {
              "number": 75,
              "name": "Разные текстовые задачи",
              "importance": 3
            }
          ]
        }
      },
      "Числовые последовательности": {
        "4.1": {
          "Тема": "Последовательности",
          "навыки": [
            {
              "number": 76,
              "name": "Запись последовательностей",
              "importance": 2
            },
            {
              "number": 77,
              "name": "Способы задания последовательностей",
              "importance": 2
            },
            {
              "number": 78,
              "name": "Правило n-го члена последовательностей",
              "importance": 2
            },
            {
              "number": 79,
              "name": "Определение следующего члена последовательностей",
              "importance": 2
            }
          ]
        },
        "4.2": {
          "Тема": "Арифметическая и геометрическая прогрессии. Формула сложных процентов",
          "навыки": [
            {
              "number": 80,
              "name": "Арифметическая прогрессия",
              "importance": 2
            },
            {
              "number": 81,
              "name": "Сумма первых n членов  АП",
              "importance": 2
            },
            {
              "number": 82,
              "name": "Определение разности и первого члена  АП",
              "importance": 2
            },
            {
              "number": 83,
              "name": "Текстовые задачи на АП",
              "importance": 3
            },
            {
              "number": 84,
              "name": "Геометрическая прогрессия",
              "importance": 2
            },
            {
              "number": 85,
              "name": "Сумма первых n членов  ГП",
              "importance": 2
            },
            {
              "number": 86,
              "name": "Определение разности и первого члена  ГП",
              "importance": 2
            },
            {
              "number": 87,
              "name": "Текстовые задачи на ГП",
              "importance": 3
            },
            {
              "number": 88,
              "name": "Сложные проценты",
              "importance": 3
            }
          ]
        }
      },
      "Функции": {
        "5.1": {
          "Тема": "Свойства и графики функций",
          "навыки": [
            {
              "number": 89,
              "name": "Понятие функции и способы её задания",
              "importance": 3
            },
            {
              "number": 90,
              "name": "Область определения и множество значений",
              "importance": 2
            },
            {
              "number": 91,
              "name": "Нули функции",
              "importance": 1
            },
            {
              "number": 92,
              "name": "Построение графиков функции",
              "importance": 2
            },
            {
              "number": 93,
              "name": "Линейные функции",
              "importance": 1
            },
            {
              "number": 94,
              "name": "Квадратичные функции (Параболы)",
              "importance": 1
            },
            {
              "number": 95,
              "name": "Гиперболы ",
              "importance": 4
            },
            {
              "number": 96,
              "name": "Промежутки знакопостоянства функции",
              "importance": 3
            },
            {
              "number": 97,
              "name": "Промежутки монотонности функции",
              "importance": 3
            },
            {
              "number": 98,
              "name": "Чтение графиков функции",
              "importance": 2
            },
            {
              "number": 99,
              "name": "Максимумы и минимумы функции",
              "importance": 2
            },
            {
              "number": 186,
              "name": "Симметрия графика функции",
              "importance": 4
            },
            {
              "number": 187,
              "name": "Параметрические преобразования графиков",
              "importance": 4
            },
            {
              "number": 100,
              "name": "Наибольшее и наименьшее значение функции на промежутке",
              "importance": 4
            },
            {
              "number": 101,
              "name": "Кусочно-непрерывные функции",
              "importance": 4
            },
            {
              "number": 102,
              "name": "Растяжения и сдвиги",
              "importance": 4
            }
          ]
        }
      },
      "Координаты на прямой и плоскости": {
        "6.1": {
          "Тема": "Координатная прямая",
          "навыки": [
            {
              "number": 103,
              "name": "Расположение чисел на прямой (Отметка точек)",
              "importance": 0
            },
            {
              "number": 104,
              "name": "Расстояние между точками на координатной прямой",
              "importance": 2
            },
            {
              "number": 105,
              "name": "Модули",
              "importance": 2
            },
            {
              "number": 106,
              "name": "Интервалы",
              "importance": 2
            },
            {
              "number": 107,
              "name": "Неравенства",
              "importance": 2
            },
            {
              "number": 108,
              "name": "Сравнение и упорядочивание чисел на координатной прямой",
              "importance": 1
            },
            {
              "number": 109,
              "name": "Выбор верного или неверного утверждения о числах на координатной прямой",
              "importance": 3
            }
          ]
        },
        "6.2": {
          "Тема": "Декартовы координаты",
          "навыки": [
            {
              "number": 110,
              "name": "Построение точек по координатам на плоскости",
              "importance": 0
            },
            {
              "number": 111,
              "name": "Расстояние между точками на плоскости",
              "importance": 1
            }
          ]
        }
      },
      "Геометрия": {
        "7.1": {
          "Тема": "Геометрические фигуры",
          "навыки": [
            {
              "number": 112,
              "name": "Точки, прямые, отрезки, лучи",
              "importance": 2
            },
            {
              "number": 113,
              "name": "Углы и их виды",
              "importance": 0
            },
            {
              "number": 114,
              "name": "Измерение углов",
              "importance": 2
            },
            {
              "number": 115,
              "name": "Параллельные и перпендикулярные прямые",
              "importance": 1
            },
            {
              "number": 116,
              "name": "Серединный перпендикуляр",
              "importance": 3
            }
          ]
        },
        "7.2": {
          "Тема": "Треугольники",
          "навыки": [
            {
              "number": 117,
              "name": "Виды треугольников",
              "importance": 1
            },
            {
              "number": 118,
              "name": "Элементы треугольника (сторона, угол, высота, медиана, биссектриса)",
              "importance": 0
            },
            {
              "number": 119,
              "name": "Свойства углов треугольника",
              "importance": 2
            },
            {
              "number": 120,
              "name": "Признаки равенства треугольников",
              "importance": 2
            },
            {
              "number": 121,
              "name": "Признаки подобия треугольников",
              "importance": 2
            },
            {
              "number": 122,
              "name": "Неравенство треугольника",
              "importance": 3
            },
            {
              "number": 123,
              "name": "Прямоугольный треугольник: Теорема Пифагора",
              "importance": 1
            },
            {
              "number": 124,
              "name": "Прямоугольный треугольник:  Тригонометрия",
              "importance": 1
            }
          ]
        },
        "7.3": {
          "Тема": "Многоугольники",
          "навыки": [
            {
              "number": 125,
              "name": "Виды многоугольников",
              "importance": 2
            },
            {
              "number": 126,
              "name": "Элементы многоугольников",
              "importance": 2
            },
            {
              "number": 127,
              "name": "Углы многоугольников",
              "importance": 2
            },
            {
              "number": 128,
              "name": "Правильные многоугольники",
              "importance": 2
            },
            {
              "number": 129,
              "name": "Деление многоугольников на треугольники",
              "importance": 2
            },
            {
              "number": 130,
              "name": "Прямоугольник",
              "importance": 2
            },
            {
              "number": 131,
              "name": "Ромб",
              "importance": 2
            },
            {
              "number": 132,
              "name": "Квадрат",
              "importance": 2
            },
            {
              "number": 133,
              "name": "Параллелограмм",
              "importance": 2
            },
            {
              "number": 134,
              "name": "Трапеция",
              "importance": 2
            }
          ]
        },
        "7.4": {
          "Тема": "Окружность и круг",
          "навыки": [
            {
              "number": 135,
              "name": "Элементы окружности и круга (Касательная, хорда, секущая, радиус)",
              "importance": 1
            },
            {
              "number": 136,
              "name": "Центральные и вписанные углы",
              "importance": 2
            },
            {
              "number": 137,
              "name": "Вписанные  фигуры",
              "importance": 2
            },
            {
              "number": 138,
              "name": "Описанные фигуры",
              "importance": 4
            }
          ]
        },
        "7.5": {
          "Тема": "Измерения",
          "навыки": [
            {
              "number": 139,
              "name": "Длина отрезка, длина ломаной",
              "importance": 1
            },
            {
              "number": 140,
              "name": "Периметр многоугольника",
              "importance": 1
            },
            {
              "number": 141,
              "name": "Расстояние от точки до прямой",
              "importance": 3
            },
            {
              "number": 142,
              "name": "Длина окружности",
              "importance": 1
            },
            {
              "number": 143,
              "name": "Градусная мера угла",
              "importance": 1
            },
            {
              "number": 144,
              "name": "Ссоответствие между величиной угла и длиной дуги окружности",
              "importance": 2
            },
            {
              "number": 145,
              "name": "Площадь и её свойства",
              "importance": 1
            },
            {
              "number": 146,
              "name": "Площадь прямоугольника",
              "importance": 2
            },
            {
              "number": 147,
              "name": "Площадь параллелограмма",
              "importance": 2
            },
            {
              "number": 148,
              "name": "Площадь трапеции",
              "importance": 2
            },
            {
              "number": 149,
              "name": "Площадь треугольника",
              "importance": 2
            },
            {
              "number": 150,
              "name": "Площадь круга и его частей ",
              "importance": 2
            },
            {
              "number": 151,
              "name": "Пропорциональное деление площади",
              "importance": 3
            },
            {
              "number": 152,
              "name": "Формулы объёма прямоугольного параллелепипеда, куба, шара",
              "importance": 4
            },
            {
              "number": 153,
              "name": "Фигуры на квадратной решётке",
              "importance": 2
            }
          ]
        },
        "7.6": {
          "Тема": "Векторы",
          "навыки": [
            {
              "number": 154,
              "name": "Направление и длина вектора",
              "importance": 2
            },
            {
              "number": 155,
              "name": "Координаты вектора",
              "importance": 2
            },
            {
              "number": 156,
              "name": "Сложение и вычитание векторов",
              "importance": 2
            },
            {
              "number": 157,
              "name": "Умножение вектора на число",
              "importance": 2
            },
            {
              "number": 196,
              "name": "Скалярное произведение векторов",
              "importance": 4
            }
          ]
        },
        "7.7": {
          "Тема": "Дополнительные темы по геометрии",
          "навыки": [
            {
              "number": 158,
              "name": "Анализ геометрических высказываний",
              "importance": 3
            },
            {
              "number": 159,
              "name": "Работа с чертежами",
              "importance": 3
            },
            {
              "number": 160,
              "name": "Задачи на доказательство",
              "importance": 3
            },
            {
              "number": 161,
              "name": "Геометрические задачи повышенной сложности",
              "importance": 4
            }
          ]
        }
      },
      "Вероятность и статистика": {
        "8.1": {
          "Тема": "Описательная статистика",
          "навыки": [
            {
              "number": 162,
              "name": "Сбор данных",
              "importance": 2
            },
            {
              "number": 163,
              "name": "Таблицы и диаграммы в статистике",
              "importance": 2
            },
            {
              "number": 164,
              "name": "Среднее арифметическое",
              "importance": 2
            },
            {
              "number": 165,
              "name": "Мода и медиана",
              "importance": 2
            }
          ]
        },
        "8.2": {
          "Тема": "Вероятность",
          "навыки": [
            {
              "number": 166,
              "name": "Определение событий",
              "importance": 1
            },
            {
              "number": 167,
              "name": "Нахождение вероятности простых событий",
              "importance": 1
            },
            {
              "number": 168,
              "name": "Применение формул вероятности",
              "importance": 2
            }
          ]
        },
        "8.3": {
          "Тема": "Комбинаторика",
          "навыки": [
            {
              "number": 169,
              "name": "Перестановки",
              "importance": 2
            },
            {
              "number": 170,
              "name": "Размещения",
              "importance": 2
            },
            {
              "number": 171,
              "name": "Сочетания",
              "importance": 2
            },
            {
              "number": 172,
              "name": "Подсчёт с использованием формул комбинаторики",
              "importance": 2
            }
          ]
        },
        "8.4": {
          "Тема": "Множества",
          "навыки": [
            {
              "number": 173,
              "name": "Операции с множествами",
              "importance": 2
            },
            {
              "number": 174,
              "name": "Диаграммы Эйлера–Венна",
              "importance": 2
            }
          ]
        },
        "8.5": {
          "Тема": "Графы",
          "навыки": [
            {
              "number": 175,
              "name": "Вершины и рёбра",
              "importance": 2
            },
            {
              "number": 176,
              "name": "Связность графа",
              "importance": 3
            },
            {
              "number": 177,
              "name": "Поиск путей",
              "importance": 3
            },
            {
              "number": 178,
              "name": "Решение прикладных задач с графами",
              "importance": 3
            }
          ]
        }
      },
      "Применение математики к прикладным задачам": {
        "9.1": {
          "Тема": "Работа с данными и графиками",
          "навыки": [
            {
              "number": 24,
              "name": "Чтение и анализ графических схем: Графики",
              "importance": 1
            },
            {
              "number": 25,
              "name": "Чтение и анализ диаграмм: круговые, линейные, столбчатые",
              "importance": 1
            },
            {
              "number": 198,
              "name": "Чтение и анализ графических схем: таблицы",
              "importance": 1
            },
            {
              "number": 199,
              "name": "Перевод расписания/таблицы времени в расчёт продолжительности",
              "importance": 2
            },
            {
              "number": 181,
              "name": "Чтение условия и извлечение данных из текста",
              "importance": 2
            },
            {
              "number": 182,
              "name": "Стратегии решения задачи с краткой записью",
              "importance": 2
            },
            {
              "number": 183,
              "name": "Анализ ошибочных решений",
              "importance": 2
            },
            {
              "number": 192,
              "name": "Единицы измерения: Перевод между величинами",
              "importance": 2
            },
            {
              "number": 200,
              "name": "Построение простейших графиков на координатной плоскости по табличным данным",
              "importance": 1
            }
          ]
        },
        "9.2": {
          "Тема": "Прикладная геометрия / Чтение и анализ графических схем",
          "навыки": [
            {
              "number": 26,
              "name": "Квартиры",
              "importance": 2
            },
            {
              "number": 27,
              "name": " Схема маршрута / карта",
              "importance": 2
            },
            {
              "number": 28,
              "name": "Страхование ОСАГО",
              "importance": 2
            },
            {
              "number": 29,
              "name": "Тарифные планы",
              "importance": 2
            },
            {
              "number": 30,
              "name": "Лист бумаги",
              "importance": 2
            },
            {
              "number": 31,
              "name": "Печи",
              "importance": 2
            },
            {
              "number": 32,
              "name": "Шины",
              "importance": 2
            },
            {
              "number": 33,
              "name": "Участки",
              "importance": 2
            },
            {
              "number": 34,
              "name": "Теплицы",
              "importance": 2
            }
          ]
        }
      }
    };
    // Extract topic names from textbook
    const topicName = {};
    for (const section of Object.values(textbook)){
      for (const [code, data] of Object.entries(section)){
        topicName[code] = data['Тема'];
      }
    }
    // FIPI topics mapping
    const fipiTopicsData = `1,"9.1 Работа с данными и графиками, 9.2 Прикладная геометрия / Чтение и анализ графических схем"
6,"1.1 Натуральные и целые числа, 1.2 Дроби и проценты, 1.3 Рациональные числа и арифметические действия, 1.4 Действительные числа"
7,"1.1 Натуральные и целые числа, 1.2 Дроби и проценты, 1.3 Рациональные числа и арифметические действия, 1.4 Действительные числа, 6.1 Координатная прямая"
8,"2.1 Буквенные выражения, 2.2 Степени, 2.4 Алгебраические дроби, 2.5 Арифметические корни"
9,"3.1 Уравнения и системы"
10,"8.1 Описательная статистика, 8.2 Вероятность"
11,"5.1 Свойства и графики функций"
12,"2.1 Буквенные выражения, 2.2 Степени, 2.4 Алгебраические дроби, 2.5 Арифметические корни"
13,"3.2 Неравенства и системы"
14,"4.1 Последовательности, 4.2 Арифметическая и геометрическая прогрессии. Формула сложных процентов"
15,"7.2 Треугольники"
16,"7.4 Окружность и круг"
17,"7.1 Геометрические фигуры, 7.3 Многоугольники"
18,"7.1 Геометрические фигуры, 7.2 Треугольники, 7.3 Многоугольники, 7.5 Измерения"
19,"7.1 Геометрические фигуры, 7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"
20,"2.1 Буквенные выражения, 3.1 Уравнения и системы, 3.2 Неравенства и системы, 6.1 Координатная прямая, 6.2 Декартовы координаты"
21,"1.2 Дроби и проценты, 1.5 Приближённые вычисления, 3.1 Уравнения и системы, 3.2 Неравенства и системы, 3.3 Текстовые задачи"
22,"5.1 Свойства и графики функций, 6.2 Декартовы координаты"
23,"7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"
24,"7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"
25,"7.1 Геометрические фигуры, 7.2 Треугольники, 7.3 Многоугольники, 7.4 Окружность и круг"`;
    const fipiTopics = {};
    for (const line of fipiTopicsData.trim().split('\n')){
      if (line) {
        const parts = line.split(',"');
        const task = parts[0].trim();
        const topicsStr = parts[1].slice(0, -1);
        const topicsList = topicsStr.split(', ').map((t)=>t.trim().replace('/', ' ').replace(/\s+/g, ' '));
        fipiTopics[task] = topicsList;
      }
    }
    // Find topics for study: sequential from the first <0.2, limit to 2
    const studyTopics = [];
    let foundFirst = false;
    const maxStudyTopics = 2;
    for (const code of orderedTopicCodes){
      const fullName = `${code} ${topicName[code] || ''}`.trim();
      const prob = topicMastery[fullName] || 0.0;
      if (prob < 0.2) {
        if (!foundFirst) {
          foundFirst = true;
        }
        if (foundFirst) {
          studyTopics.push(code);
          if (studyTopics.length >= maxStudyTopics) {
            break;
          }
        }
      }
    }
    // Skills with highest importance (0,1,2) for selected topics
    const highImpSkills = [];
    for (const code of studyTopics){
      for (const section of Object.values(textbook)){
        if (code in section) {
          const skills = section[code]['навыки'];
          for (const skill of skills){
            if (skill.importance <= 2) {
              highImpSkills.push(skill.number);
            }
          }
        }
      }
    }
    // FIPI tasks for training
    const fipiForTraining = [];
    for (const [task, topics] of Object.entries(fipiTopics)){
      const totalTopics = topics.length;
      const masteredCount = topics.filter((t)=>(topicMastery[t] || 0.0) >= 0.2).length;
      if (masteredCount > totalTopics / 2) {
        fipiForTraining.push(parseInt(task));
      }
    }
    // Skills for pulling up
    const thresholds = {
      0: 0.7,
      1: 0.6,
      2: 0.5,
      3: 0.2
    };
    const pullUpSkills = [];
    for (const code of orderedTopicCodes){
      const fullName = `${code} ${topicName[code] || ''}`.trim();
      const topicProb = topicMastery[fullName] || 0.0;
      if (topicProb >= 0.2) {
        for (const section of Object.values(textbook)){
          if (code in section) {
            const skills = section[code]['навыки'];
            for (const skill of skills){
              const imp = skill.importance;
              if (imp > 3) continue;
              const skillProb = skillMastery[skill.number.toString()] || 0.0;
              if (skillProb < (thresholds[imp] || 0.0)) {
                pullUpSkills.push(skill.number);
              }
            }
          }
        }
      }
    }
    // Output JSON
    const output = {
      "темы для изучения": studyTopics,
      "навыки с наибольшей важностью для выбранных тем": highImpSkills,
      "Задачи ФИПИ для тренировки": fipiForTraining,
      "навыки для подтягивания": pullUpSkills
    };
    console.log('Generated study plan:', output);
    return new Response(JSON.stringify(output), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in ogemath-task-hardcode:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
