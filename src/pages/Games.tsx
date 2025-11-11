import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Sparkles, Trophy } from "lucide-react";

const GamesPage = () => {
  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#12152a] via-[#1b2040] to-[#12152a] text-white">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-8 md:px-8 lg:px-10">
        <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />

        <header className="relative z-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 shadow-2xl backdrop-blur md:px-10 md:py-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/10 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-purple-100">
              <Sparkles className="h-4 w-4" />
              Игровая Арена OGE Mentor
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
              Нагружайте мозг задачами в формате игр и прокачивайте навыки весело
            </h1>
            <p className="text-base text-slate-200 md:text-lg">
              Здесь собираем авторские мини-игры по математике и логике. Заходите, чтобы отвлечься от обычной практики,
              но всё равно тренировать скорость и легкость решений.
            </p>
          </div>
        </header>

        <section className="relative z-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <article className="flex flex-col gap-6 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-6 shadow-lg backdrop-blur-md md:p-8">
            <div className="flex items-center gap-3 text-amber-300">
              <Gamepad2 className="h-6 w-6" />
              <span className="text-sm uppercase tracking-wide">Новинка</span>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold md:text-3xl">Математическая Башня</h2>
              <p className="text-slate-100/85 md:text-lg">
                Отбивайте волны пиксельных зомби, решая примеры и уравнения. Сложность растёт, а вместе с ней и скорость
                вашего мышления. Игра сохраняет рекорд, показывает прогресс и награждает бонусами за серию правильных
                ответов.
              </p>
              <ul className="grid gap-2 text-sm text-amber-100/90 md:grid-cols-2 md:text-base">
                <li>• 24 типa математических заданий</li>
                <li>• Поддержка компьютера и мобильных устройств</li>
                <li>• Динамическая сложность и спец-эффекты</li>
                <li>• Мгновенная обратная связь по ответам</li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/mathtower"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-5 py-3 font-semibold text-slate-900 shadow-lg transition-transform hover:scale-[1.02]"
              >
                Играть сейчас
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-sm text-amber-100/80">
                Рекомендуем 10–15 минут для разогрева перед практикой
              </span>
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-7">
            <div className="flex items-center gap-3 text-emerald-300">
              <Trophy className="h-6 w-6" />
              <span className="text-sm uppercase tracking-wide">Скоро</span>
            </div>
            <p className="text-sm text-slate-100/80 md:text-base">
              Работаем над новыми сюжетами: дуэли на скорость решения, совместные рейды на экзаменационные варианты и
              кооперативные миссии с друзьями. Следите за обновлениями!
            </p>
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Хочешь получить доступ первым? Напиши нам в чат профиля — пригласим на закрытое тестирование.
            </div>
          </aside>
        </section>

        <section className="relative z-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 shadow-xl backdrop-blur md:px-8">
          <h3 className="text-lg font-semibold text-white/90 md:text-xl">Как использовать игровые тренировки</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-4 text-sm text-purple-100 md:text-base">
              Разогревайтесь 5 минут в игре перед сложными темами — это помогает втянуться и разогнать мозг.
            </div>
            <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100 md:text-base">
              Соревнуйтесь с друзьями по очкам, чтобы поддерживать мотивацию и следить за прогрессом.
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100 md:text-base">
              Используйте игры, когда устали от тестов — мозг отдыхает, а навыки всё равно укрепляются.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GamesPage;
