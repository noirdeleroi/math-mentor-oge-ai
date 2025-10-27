import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import FlyingStarsBackground from '@/components/FlyingStarsBackground';

export default function FAQ() {
  const navigate = useNavigate();

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
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <HelpCircle className="w-16 h-16 text-yellow-500" />
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">
              Часто задаваемые вопросы
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Найдите ответы на популярные вопросы о нашей платформе подготовки к ОГЭ и ЕГЭ
            </p>
          </div>

          {/* FAQ Accordion */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Что такое Egechat?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Egechat — это персональный аватар-наставник на основе искусственного интеллекта, который помогает подготовиться к экзаменам ОГЭ и ЕГЭ, особенно по математике. Это не просто чат, а полноценный цифровой репетитор, который выявляет пробелы в знаниях, составляет индивидуальный план обучения и подбирает задания в зависимости от уровня подготовки ученика.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Как проходит подготовка и практика на Egechat?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Главный принцип — это максимальная практика через персонализированный подход. Система анализирует каждое ваше действие (включая время, затраченное на решение) и на основе этих данных выстраивает траекторию обучения. Вы начинаете с простых задач, и по мере роста вашего мастерства уровень сложности плавно увеличивается. Это позволяет точечно закрывать пробелы в знаниях, начиная с тем за прошлые классы, и гарантирует устойчивое понимание материала.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Для каких экзаменов подходит Egechat?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Платформа Egechat создана для подготовки к экзаменам ОГЭ и ЕГЭ по математике — как к базовому, так и к профильному уровню. Благодаря гибкой системе, ученик с любым уровнем знаний может начать подготовку: от базовых заданий до самых сложных задач второй части экзамена.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Какие материалы доступны на Egechat?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  <p className="mb-4">
                    На платформе собраны все необходимые материалы для подготовки к экзаменам:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      полный банк заданий ФИПИ с решениями и ответами;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      более <strong>5000 авторских задач-клонов</strong>, позволяющих отработать каждую тему до автоматизма;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      <strong>2000 тренировочных заданий</strong> для постепенного погружения в тему;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      <strong>Обширные теоретические материалы и конспекты</strong>, структурированные по темам кодификатора ФИПИ;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      видеоуроки с пошаговыми объяснениями.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Можно ли решать задачи по фото или проверять свои решения?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Да, в Egechat можно загрузить фото задачи из учебника или скан варианта — система автоматически распознает условие и предоставит подробное решение. Также пользователь может сфотографировать собственное решение, и платформа проверит его корректность, выделив ошибки и объяснив, где именно они были допущены.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Есть ли возможность пройти тренировочный экзамен?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Да, Egechat позволяет проходить <strong>полноценные тренировочные экзамены</strong> на время, полностью имитирующие реальный формат ЕГЭ и ОГЭ: те же бланки, те же условия и ограничения по времени. После завершения экзамена ученик получает детальный разбор ошибок и рекомендации по улучшению результата.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Чем Egechat лучше обычного репетитора или онлайн-курсов?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  <p className="mb-4">
                    Egechat отличается от репетитора и стандартных онлайн-курсов следующими преимуществами:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      доступен круглосуточно, без расписания и ограничений;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      полностью персонализирует программу, адаптируясь под ученика, чего не может сделать репетитор с группой или стандартный курс;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      анализирует каждую попытку и каждое действие студента;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      отвечает на вопросы мгновенно и в удобной форме;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                      стоит всего <strong>999 ₽ в месяц</strong>, что значительно дешевле занятий с репетитором и онлайн-курсов.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Сколько стоит подписка на Egechat?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Первая неделя на платформе предоставляется <strong>бесплатно</strong>. Затем доступ ко всем функциям, включая учебные материалы, базу задач, видеокурсы и работу с AI-наставником, стоит <strong>999 ₽ в месяц</strong>. Оплата безопасна, подписку можно отменить в любой момент.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Подходит ли Egechat для начинающих и для сильных учеников?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Да, система подходит абсолютно для всех. Если у ученика есть пробелы в знаниях, Egechat начинает с основ и постепенно поднимает уровень. Для сильных учеников наставник предлагает сложные задания второй части экзамена, помогает отработать стратегию и тренирует в условиях реального экзамена.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Можно ли заниматься в любое время и с телефона?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Да, Egechat всегда под рукой. Достаточно иметь доступ в интернет, чтобы решать задачи, задавать вопросы, проверять свои решения или проходить пробные экзамены. Можно заниматься ночью, в дороге или в любое удобное время без привязки к расписанию.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11" className="border-b border-white/20 last:border-b-0 px-4 bg-white/5 rounded-lg">
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  <h3 className="text-lg font-semibold">Есть ли у Egechat сообщество?</h3>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-300 leading-relaxed">
                  Да, кроме индивидуальной подготовки, пользователи могут присоединиться к комьюнити. Там можно обсуждать задачи с другими учениками, делиться лайфхаками, обмениваться опытом и даже просто снимать стресс через мемы и дружеское общение.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4 text-white">Остались вопросы?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Начните бесплатную неделю прямо сейчас и убедитесь сами в эффективности нашей платформы
            </p>
            <Button 
              onClick={() => navigate('/mydb3')}
              size="lg" 
              className="bg-gradient-to-r from-yellow-500 to-emerald-500 hover:from-yellow-600 hover:to-emerald-600 text-[#1a1f36] font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Попробовать бесплатно
            </Button>
          </div>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Что такое Egechat?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Egechat — это персональный аватар-наставник на основе искусственного интеллекта, который помогает подготовиться к экзаменам ОГЭ и ЕГЭ, особенно по математике. Это не просто чат, а полноценный цифровой репетитор, который выявляет пробелы в знаниях, составляет индивидуальный план обучения и подбирает задания в зависимости от уровня подготовки ученика."
              }
            },
            {
              "@type": "Question",
              "name": "Как проходит подготовка и практика на Egechat?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Главный принцип — это максимальная практика через персонализированный подход. Система анализирует каждое ваше действие (включая время, затраченное на решение) и на основе этих данных выстраивает траекторию обучения. Вы начинаете с простых задач, и по мере роста вашего мастерства уровень сложности плавно увеличивается. Это позволяет точечно закрывать пробелы в знаниях, начиная с тем за прошлые классы, и гарантирует устойчивое понимание материала."
              }
            },
            {
              "@type": "Question",
              "name": "Для каких экзаменов подходит Egechat?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Платформа Egechat создана для подготовки к экзаменам ОГЭ и ЕГЭ по математике — как к базовому, так и к профильному уровню. Благодаря гибкой системе, ученик с любым уровнем знаний может начать подготовку: от базовых заданий до самых сложных задач второй части экзамена."
              }
            },
            {
              "@type": "Question",
              "name": "Какие материалы доступны на Egechat?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "На платформе собраны все необходимые материалы для подготовки к экзаменам: полный банк заданий ФИПИ с решениями и ответами, более 5000 авторских задач-клонов, позволяющих отработать каждую тему до автоматизма, 2000 тренировочных заданий для постепенного погружения в тему, обширные теоретические материалы и конспекты, структурированные по темам кодификатора ФИПИ, а также видеоуроки с пошаговыми объяснениями."
              }
            },
            {
              "@type": "Question",
              "name": "Можно ли решать задачи по фото или проверять свои решения?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Да, в Egechat можно загрузить фото задачи из учебника или скан варианта — система автоматически распознает условие и предоставит подробное решение. Также пользователь может сфотографировать собственное решение, и искусственный интеллект проверит его корректность, выделив ошибки и объяснив, где именно они были допущены."
              }
            },
            {
              "@type": "Question",
              "name": "Есть ли возможность пройти тренировочный экзамен?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Да, Egechat позволяет проходить полноценные тренировочные экзамены на время, полностью имитирующие реальный формат ЕГЭ и ОГЭ: те же бланки, те же условия и ограничения по времени. После завершения экзамена ученик получает детальный разбор ошибок и рекомендации по улучшению результата."
              }
            },
            {
              "@type": "Question",
              "name": "Чем Egechat лучше обычного репетитора или онлайн-курсов?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Egechat отличается от репетитора и стандартных онлайн-курсов следующими преимуществами: доступен круглосуточно, без расписания и ограничений; полностью персонализирует программу, адаптируясь под ученика, чего не может сделать репетитор с группой или стандартный курс; анализирует каждую попытку и каждое действие студента; отвечает на вопросы мгновенно и в удобной форме; стоит всего 999 ₽ в месяц, что значительно дешевле занятий с репетитором и онлайн-курсов."
              }
            },
            {
              "@type": "Question",
              "name": "Сколько стоит подписка на Egechat?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Первая неделя на платформе предоставляется бесплатно. Затем доступ ко всем функциям, включая учебные материалы, базу задач, видеокурсы и работу с AI-наставником, стоит 999 ₽ в месяц. Оплата безопасна, подписку можно отменить в любой момент."
              }
            },
            {
              "@type": "Question",
              "name": "Подходит ли Egechat для начинающих и для сильных учеников?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Да, система подходит абсолютно для всех. Если у ученика есть пробелы в знаниях, Egechat начинает с основ и постепенно поднимает уровень. Для сильных учеников наставник предлагает сложные задания второй части экзамена, помогает отработать стратегию и тренирует в условиях реального экзамена."
              }
            },
            {
              "@type": "Question",
              "name": "Можно ли заниматься в любое время и с телефона?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Да, Egechat всегда под рукой. Достаточно иметь доступ в интернет, чтобы решать задачи, задавать вопросы, проверять свои решения или проходить пробные экзамены. Можно заниматься ночью, в дороге или в любое удобное время без привязки к расписанию."
              }
            },
            {
              "@type": "Question",
              "name": "Есть ли у Egechat сообщество?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Да, кроме индивидуальной подготовки, пользователи могут присоединиться к комьюнити. Там можно обсуждать задачи с другими учениками, делиться лайфхаками, обмениваться опытом и даже просто снимать стресс через мемы и дружеское общение."
              }
            }
          ]
        })
      }} />
    </div>
  );
}