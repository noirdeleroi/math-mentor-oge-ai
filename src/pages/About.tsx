import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Home, Info } from "lucide-react";
import FlyingStarsBackground from '@/components/FlyingStarsBackground';

const About = () => {
  const navigate = useNavigate();

  const markdownContent = `### Встречай своего личного наставника для подготовки к ЕГЭ и ОГЭ. Твой цифровой друг, который знает о тебе всё.

Привет! Готовишься к экзаменам? Наверное, ты уже пересмотрел:а кучу видео на YouTube, думаешь о репетиторе или о дорогих курсах. Но у нас есть для тебя предложение получше. Знакомься — это не просто платформа с задачками. Это твой **персональный наставник**, который будет с тобой непрерывно и поможет прийти к максимальному баллу.

#### Почему твой наставник круче любого репетитора или курса?

**1. Он знает тебя лучше, чем ты сам:а себя. Серьёзно.**

Представь: репетитор видит тебя 2 часа в неделю. Он не помнит, сколько ты потратил:a на задачу №345 две недели назад и где именно ты испытал:а трудности. Наша система — помнит. **Всё.**
*   Он знает, сколько **секунд** ты думал:а над каждым заданием.
*   Он видит, в какой теме у тебя **скрытые пробелы** за 7 класс, которые мешают сейчас.
*   Он вычисляет **байесовскую вероятность** (загугли), что ты решишь задачу на тему «Стереометрия: расстояние между прямыми» на реальном экзамене. И не даст обмануть словами «да я это знаю!».

**2. У него бездонная база знаний, и он даёт именно то, что нужно ТЕБЕ.**

Не нужно рыскать по интернету в поисках «нормального сайта с заданиями». Всё есть здесь:

*   **Полный банк ФИПИ.** Все задания, которые могут быть на экзамене. С решениями и ответами.
*   **5000+ наших задач-клонов.** Решил:а все задачи из ФИПИ? Вот тебе ещё море точно таких же по сложности и формату. Скучно не будет!
*   **2000+ «тренировочных» заданий** для втягивания. Не понимаешь сложную тему? Начни с азов. Наш наставник мягко подведёт тебя от простого к сложному, чтобы не было стресса и желания всё бросить.
*   **Обширные теоретические материалы и видео-уроки**, которые детально разжевывают каждую тему из кодификатора ФИПИ. One-stop shop: всё в одном месте!

**3. Он объясняет не «как в учебнике», а так, как понятно именно ТЕБЕ.**

Задай любой вопрос в чат в любое время дня и ночи. Не как поисковику, а как **умному другу**:
*   «Объясни, как решать это уравнение, но как для полного нуба».
*   «Распиши решение задачи про шарик и плоскость максимально подробно, шаг за шагом».
*   «А почему в этом неравенстве именно такая область определения?».
*   «Я не понимаю эту теорему. Приведи пример из жизни».

Он не устанет, не посмотрит на часы и не скажет «это же очевидно!». Он будет объяснять, пока ты действительно не поймёшь.

**4. Решение по фото.**
*   «Я сфоткал:а условие задачи из учебника, решай!» — просто загрузи фото, и наставник её распознает, решит и объяснит.
*   «Я написал:а решение от руки, проверь, пожалуйста» — загрузи фото своей тетрадки, и твой ai-наставник проверит его на корректность, найдёт ошибку и покажет, где именно ты допустил:а прокол.

**5. Он дробит программу на атомы. Ты учишься точечно, без воды.**

Ты не будешь проходить гигантскую и расплывчатую тему «Тригонометрия». Вместо этого ты будешь отрабатывать конкретные микронные навыки:
*   \`Тригонометрия > Уравнения > Простейшие уравнения вида sin(x) = a > Случай, когда a = 1\`
*   \`Неравенства > Логарифмические неравенства > Случай с переменным основанием\`

Это значит, что ты закрываешь пробелы точечно и навсегда. Тратишь время только на то, что тебе нужно, а не на то, что уже знаешь.

**6. Он готовит тебя к формату экзамена на 100%.**

Боишься не уложиться во время или растеряться в аудитории? Проходи полные тренировочные экзамены на время. Наш наставник полностью имитирует реальную атмосферу ЕГЭ или ОГЭ: тот же интерфейс, те же бланки, то же ограничение по времени. После каждого такого теста ты получишь детальный разбор и рекомендации, на что сделать упор.

**7. Он всегда на связи. Захотел:а порешать в 2 ночи перед сном? Заходи!**

Среди ночи вспомнил:а про непонятную задачку? Или появилось свободное 20 минут в метро? Твой наставник всегда в твоем телефоне. Никакой привязки к расписанию репетитора и пропущенных занятий.

**8. Ты не в одиночестве! Присоединяйся к коммьюнити таких же, как ты.**

Готовиться вместе — веселее и продуктивнее. Поэтому у нас есть своё крутое сообщество, где ты можешь:

Обсуждать сложные задачи с другими ребятами и находить решения вместе.

Делиться лайфхаками и советами по подготовке.

Общаться и поддерживать друг друга, потому что все вы в одной лодке.

Шерить мемы и знакомиться с другими учениками.

Ты получаешь не просто платформу, а целую экосистему для подготовки: мощнейший AI-наставник + комьюнити друзей-единомышленников.

**Egechat — это эффективный и доступный сервис для подготовки к ОГЭ и ЕГЭ по математике для пользователя с любым начальным уровнем подготовки.** У тебя пробелы? Начнём с основ. Ты уверенный отличник? Отточим мастерство на самых сложных заданиях.

### Давай сравним?

| **Критерий** | **Обычный репетитор** | **Онлайн-курсы** | **Egechat-Наставник** |
| :--- | :--- | :--- | :--- |
| **Доступность** | 2-3 раза в неделю | В любое время, но ты просто зритель | **Непрерывно, и он с тобой взаимодействует!** |
| **Персонализация** | Общая программа для многих | Одинаково для всех | **Полностью подстраивается под тебя** |
| **Цена** | Очень высокая (от 1500 р/ч) | Высокая (от 4500 р/месяц) | **Существенно дешевле (999 р/месяц)** |
| **Глубина анализа** | Субъективная оценка прогресса | Видит только твои ошибки | **Анализирует каждую секунду твоей подготовки** |
| **Ответы на вопросы** | Только на занятии | На семинаре, если повезет | **Мгновенно, на любой вопрос** |
| **Пробные экзамены** | Организовать сложно | Чаще всего нет | **Полная имитация реального экзамена** |

### Короче говоря, если тебе нужен:

*   **Персональный тренер**, который знает все твои сильные и слабые стороны.
*   **Бесконечный источник** актуальных заданий и понятных объяснений.
*   **Гибкий график** занятий без привязки ко времени и месту.
*   **Проверка домашек** прямо из тетради и решение задач по фото.
*   **Результат** — максимальный балл на экзамене.

...то тебе к нам. Забудь об оверпрайс репетиторах, тянущих деньги за каждое дз, и онлайн-курсах, где ты лишь ходячий кошелек в глазах преподов. Будущее подготовки уже здесь.

**Попробуй бесплатно прямо сейчас и почувствуй, каково это — учиться с личным AI-наставником!**`;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)' }}>
      {/* Flying Stars Background */}
      <FlyingStarsBackground />

      {/* Main Content */}
      <div className="relative z-10 pt-8 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Top Navigation Bar */}
          <div className="mb-8">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 transition-all"
            >
              <Home className="w-4 h-4 mr-2" />
              Главная
            </Button>
          </div>

          {/* Page Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Info className="w-16 h-16 text-yellow-500" />
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              О Платформе EGEChat
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Твой персональный AI-наставник для подготовки к ЕГЭ и ОГЭ
            </p>
          </div>

          {/* Video Section */}
          <div className="mb-12 flex justify-center">
            <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl w-full max-w-md aspect-square">
              <video 
                className="w-full h-full object-cover"
                autoPlay 
                loop 
                muted 
                playsInline
              >
                <source src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/test11.mp4" type="video/mp4" />
                Ваш браузер не поддерживает видео.
              </video>
            </div>
          </div>

          {/* Content Section */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
            <div className="prose prose-lg max-w-none prose-invert prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-li:text-gray-300 prose-table:text-gray-300 prose-code:text-white">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-8">
                      <table className="w-full border-collapse border border-white/30 rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-white/10">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="border border-white/30 px-4 py-3 text-left font-semibold text-white">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-white/30 px-4 py-3 text-gray-300">
                      {children}
                    </td>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-2xl md:text-3xl font-bold mt-12 mb-6 text-white">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-xl md:text-2xl font-semibold mt-8 mb-4 text-white">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-6 text-gray-300 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-6 space-y-2 ml-6">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-300">
                      {children}
                    </li>
                  ),
                  code: ({ children }) => (
                    <code className="bg-white/20 px-2 py-1 rounded text-sm font-mono text-white">
                      {children}
                    </code>
                  ),
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold mb-6 text-white">
              Готов начать?
            </h2>
            <p className="text-gray-300 mb-8">
              Присоединяйся к тысячам учеников, которые уже готовятся с EGEChat
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/mydb3')}
                size="lg" 
                className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Начать бесплатно
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                onClick={() => navigate('/faq')}
                variant="ghost"
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                Узнать больше
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;