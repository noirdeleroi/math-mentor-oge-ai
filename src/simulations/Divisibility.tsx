import React, { useEffect, useMemo, useState } from "react";

/**
 * ОГЭ-мини-игра: «Признаки делимости на 2, 3, 5, 9, 10»
 * Один TSX-файл, русская локализация, дружественный дизайн.
 *
 * Исправления в этой версии:
 * — Починен SyntaxError: неверная запись setTimeout() заменена на корректную.
 * — Привёл CSS в <AnimStyles/> к валидному виду (убраны лишние строки/скобки).
 * — Оставлены улучшения UI: анти-оверлап, подсветка, конфетти, неон-аура, паттерн-фон.
 * — Добавлены дополнительные мини-тесты (placePositions, диапазоны, уникальность чисел).
 * — Ужата высота игры под попап: окей и на ноуте, и на мобиле.
 */

// ==== Типы ====
const DIVISORS = [2, 3, 5, 9, 10] as const;
type Divisor = typeof DIVISORS[number];

interface FloatingNumber {
  id: string;
  value: number;
  top: number; // %
  left: number; // %
  duration: number; // сек
  delay: number; // сек
  rotate: number; // градусы
}

// ==== Подсказки ====
const HINTS: Record<Divisor, string> = {
  2: "Чётные числа: последняя цифра 0, 2, 4, 6 или 8.",
  3: "Сумма цифр делится на 3.",
  5: "Последняя цифра 0 или 5.",
  9: "Сумма цифр делится на 9.",
  10: "Последняя цифра 0.",
};

const FRIENDLY_TIPS: Record<Divisor, string> = {
  2: "Подсказка: смотри на последнюю цифру! ✌️",
  3: "Лайфхак: сложи цифры 😉",
  5: "Кончик пера: 0 или 5 на конце ✍️",
  9: "Супер-приём: снова сумма цифр! 🧠",
  10: "Очевидно: на конце 0 😎",
};

// Диапазоны по условию
const RANGE: Record<Divisor, { min: number; max: number }> = {
  2: { min: 10, max: 99999 },
  3: { min: 12, max: 999 },
  5: { min: 10, max: 99999 },
  9: { min: 18, max: 999 },
  10: { min: 10, max: 99999 },
};

const CLOUD_SIZE = 7;
const MIN_DIST_PCT = 12;

// ==== Вспомогательные ====
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const sumDigits = (n: number) =>
  Math.abs(n)
    .toString()
    .split("")
    .reduce((s, d) => s + Number(d), 0);

const divisible = (n: number, d: Divisor) => {
  switch (d) {
    case 2:
      return n % 2 === 0;
    case 3:
      return sumDigits(n) % 3 === 0;
    case 5:
      return n % 10 === 0 || n % 10 === 5;
    case 9:
      return sumDigits(n) % 9 === 0;
    case 10:
      return n % 10 === 0;
    default:
      return false;
  }
};

function generateOneCorrect(divisor: Divisor): { correct: number; pool: number[] } {
  const { min, max } = RANGE[divisor];
  let correct = randInt(min, max);
  let safety = 0;
  while (!divisible(correct, divisor) && safety++ < 500) correct = randInt(min, max);

  const pool = new Set<number>([correct]);
  while (pool.size < CLOUD_SIZE) {
    let x = randInt(min, max);
    if (divisor === 5 && Math.random() < 0.3) x = x - (x % 10) + pick([1, 2, 3, 4, 6, 7, 8, 9]);
    if (divisor === 10 && Math.random() < 0.4) x = x - (x % 10) + pick([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    if ((divisor === 3 || divisor === 9) && Math.random() < 0.4) {
      const s = sumDigits(x);
      const delta = divisor === 3 ? (3 - (s % 3)) % 3 : (9 - (s % 9)) % 9;
      if (delta === 0) x += pick([1, 2]);
    }
    if (divisible(x, divisor)) continue;
    pool.add(x);
  }

  const arr = Array.from(pool);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { correct, pool: arr };
}

// ==== Стили (валидный CSS) ====
const AnimStyles = () => (
  <style>{`
@keyframes drift {
  0%   { transform: translate(0px, 0px) rotate(var(--rot)) scale(var(--s)); }
  25%  { transform: translate(12px, -20px) rotate(calc(var(--rot) * -0.5)) scale(var(--s)); }
  50%  { transform: translate(0px, -34px) rotate(var(--rot)) scale(var(--s)); }
  75%  { transform: translate(-12px, -20px) rotate(calc(var(--rot) * 0.5)) scale(var(--s)); }
  100% { transform: translate(0px, 0px) rotate(var(--rot)) scale(var(--s)); }
}

@keyframes floaty {
  0% { transform: translateY(0px) rotate(0deg); opacity: .85; }
  50% { transform: translateY(-14px) rotate(6deg); opacity: 1; }
  100% { transform: translateY(0px) rotate(0deg); opacity: .85; }
}

@keyframes shimmer {
  from { background-position: 0% 50%; }
  to   { background-position: 200% 50%; }
}

/* Конфетти + эффекты клика */
@keyframes confettiFall {
  0% { transform: translate3d(var(--x), -10%, 0) rotate(var(--r)); opacity: 1; }
  100% { transform: translate3d(calc(var(--x) + 10px), 110%, 0) rotate(calc(var(--r) + 180deg)); opacity: 0; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.glow-green { box-shadow: 0 0 0 5px rgba(16,185,129,0.45), 0 8px 24px rgba(16,185,129,0.25); }
.glow-red   { box-shadow: 0 0 0 5px rgba(239,68,68,0.45), 0 8px 24px rgba(239,68,68,0.25); }
.glass { backdrop-filter: blur(12px); background: rgba(255,255,255,0.16); }

.num-pill { transition: transform .25s ease, box-shadow .25s ease, background .25s ease, color .25s ease, filter .25s ease; text-shadow: 0 3px 12px rgba(0,0,0,0.5); background: linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08)); border: 1px solid rgba(255,255,255,0.25); }
.num-pill:hover { transform: translateY(-3px) scale(1.05); filter: brightness(1.1); }

.btn { transition: transform .08s ease, box-shadow .25s ease, background .25s ease, color .25s ease; background: linear-gradient(120deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08), rgba(255,255,255,0.16)); background-size: 200% 200%; }
.btn:hover { animation: shimmer 1.6s linear infinite; }
.btn:active { transform: scale(0.98); }

.score-chip { box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
.num-pill[data-picked="good"] { box-shadow: 0 0 0 6px rgba(16,185,129,0.45), 0 10px 28px rgba(16,185,129,0.25); animation: pop .4s ease-in-out; }
.num-pill[data-picked="bad"]  { box-shadow: 0 0 0 6px rgba(239,68,68,0.45), 0 10px 28px rgba(239,68,68,0.25); animation: shake .35s ease-in-out; }

.bgPattern { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" fill="none"><g opacity="0.18"><text x="20" y="60" font-size="42" fill="white">➗</text><text x="140" y="60" font-size="40" fill="white">📐</text><text x="60" y="140" font-size="38" fill="white">🧠</text><text x="170" y="150" font-size="44" fill="white">🔢</text><text x="30" y="210" font-size="42" fill="white">✨</text></g></svg>'); background-size: 240px 240px; opacity: .25; }
`}</style>
);

// ==== Компоненты UI ====
const TagButton: React.FC<{
  label: string;
  selected?: boolean;
  tone?: "neutral" | "good" | "bad";
  onClick?: () => void;
}> = ({ label, selected, tone = "neutral", onClick }) => {
  const toneClass = tone === "good" ? "glow-green" : tone === "bad" ? "glow-red" : "";
  return (
    <button
      onClick={onClick}
      className={[
        "btn px-4 py-2 rounded-2xl text-sm md:text-base font-semibold",
        "glass border border-white/20",
        selected ? "bg-white/70 text-gray-900" : "text-white/90 hover:bg-white/10",
        toneClass,
      ].join(" ")}
    >
      {label}
    </button>
  );
};

const Hint: React.FC<{ divisor: Divisor }> = ({ divisor }) => (
  <div className="mt-2 text-white/90 text-sm md:text-base leading-snug">
    <div className="font-semibold">Подсказка по {divisor}:</div>
    <div>{HINTS[divisor]}</div>
    <div className="opacity-80 mt-1">{FRIENDLY_TIPS[divisor]}</div>
  </div>
);

// ==== Главный компонент ====
const DivisionGame: React.FC = () => {
  const [divisor, setDivisor] = useState<Divisor>(2);
  const [score, setScore] = useState<number>(0);
  const [cloud, setCloud] = useState<FloatingNumber[]>([]);
  const [correctValue, setCorrectValue] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"none" | "good" | "bad">("none");
  const [round, setRound] = useState<number>(0);
  const [pickedValue, setPickedValue] = useState<number | null>(null);
  const [pickedTone, setPickedTone] = useState<"good" | "bad" | "none">("none");
  const [confetti, setConfetti] = useState<
    { id: string; x: number; r: number; dur: number; ch: string }[]
  >([]);

  const spawnConfetti = () => {
    const shapes = ["✦", "✧", "★", "◆", "●", "▲", "✺", "✱", "✸", "✿"];
    const pieces = Array.from({ length: 42 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      x: Math.random() * 100 - 10,
      r: Math.floor(Math.random() * 360),
      dur: 650 + Math.random() * 700,
      ch: shapes[Math.floor(Math.random() * shapes.length)],
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 950);
  };

  const regenerate = (d: Divisor) => {
    const { correct, pool } = generateOneCorrect(d);
    setCorrectValue(correct);
    const positions = placePositions(pool.length);
    const items: FloatingNumber[] = pool.map((value, idx) => ({
      id: `${Date.now()}-${idx}-${value}`,
      value,
      top: positions[idx].top,
      left: positions[idx].left,
      duration: randInt(7, 12),
      delay: randInt(0, 5),
      rotate: randInt(-6, 6),
    }));
    setCloud(items);
    setRound((r) => r + 1);
    setPickedValue(null);
    setPickedTone("none");
  };

  useEffect(() => {
    regenerate(divisor);
  }, [divisor]);

  const onPick = (n: number) => {
    if (n === correctValue) {
      setScore((s) => s + 1);
      setFeedback("good");
      setPickedValue(n);
      setPickedTone("good");
      spawnConfetti();
      setTimeout(() => {
        setFeedback("none");
        setPickedTone("none");
        setPickedValue(null);
        regenerate(divisor);
      }, 500);
    } else {
      setScore((s) => s - 1);
      setFeedback("bad");
      setPickedValue(n);
      setPickedTone("bad");
      setTimeout(() => {
        setFeedback("none");
        setPickedTone("none");
        setPickedValue(null);
      }, 450);
    }
  };

  const headerTone: "neutral" | "good" | "bad" =
    feedback === "good" ? "good" : feedback === "bad" ? "bad" : "neutral";

  // --- Мини-тесты ---
  useEffect(() => {
    try {
      // базовые
      console.assert(sumDigits(0) === 0, "sumDigits(0)");
      console.assert(sumDigits(12345) === 15, "sumDigits(12345)");
      console.assert(divisible(24, 2) && !divisible(25, 2), "divisible by 2");
      console.assert(divisible(27, 3) && !divisible(28, 3), "divisible by 3");
      console.assert(divisible(35, 5) && !divisible(34, 5), "divisible by 5");
      console.assert(divisible(81, 9) && !divisible(82, 9), "divisible by 9");
      console.assert(divisible(120, 10) && !divisible(121, 10), "divisible by 10");

      // границы сумм цифр и отрицательные
      console.assert(sumDigits(999) === 27, "sumDigits(999)=27");
      console.assert(sumDigits(100000) === 1, "sumDigits(100000)=1");
      console.assert(sumDigits(-123) === 6, "sumDigits(-123)=6");
      console.assert(
        divisible(0, 2) &&
          divisible(0, 3) &&
          divisible(0, 5) &&
          divisible(0, 9) &&
          divisible(0, 10),
        "0 divisible by all"
      );
      console.assert(
        divisible(-24, 2) && divisible(-45, 5) && !divisible(-41, 5),
        "negative numbers divisibility"
      );

      // sanity генерации
      const sanity = DIVISORS.every((d) => {
        const { correct, pool } = generateOneCorrect(d);
        const yes = pool.filter((x) => divisible(x, d));
        const lenOk = pool.length === CLOUD_SIZE;
        const rangeOk = pool.every((x) => x >= RANGE[d].min && x <= RANGE[d].max);
        const digitsOk =
          d === 3 || d === 9
            ? pool.every((x) => x <= 999)
            : pool.every((x) => x <= 99999);
        const containsCorrect = pool.includes(correct);
        const uniqueOk = new Set(pool).size === pool.length;
        return (
          yes.length === 1 &&
          yes[0] === correct &&
          lenOk &&
          rangeOk &&
          digitsOk &&
          containsCorrect &&
          uniqueOk
        );
      });
      console.assert(
        sanity,
        "generateOneCorrect(): one correct, size OK, range OK, unique OK"
      );

      // тест расстановки — длина и границы (приближённый)
      const pos = placePositions(CLOUD_SIZE);
      console.assert(pos.length === CLOUD_SIZE, "placePositions length");
      const inside = pos.every(
        (p) => p.top >= 0 && p.top <= 100 && p.left >= 0 && p.left <= 100
      );
      console.assert(inside, "placePositions within container");
    } catch (e) {
      console.warn("Self-tests warn:", e);
    }
  }, []);

  return (
    <div
      className="relative w-full max-w-[720px] h-[340px] sm:h-[360px] md:h-[380px] overflow-hidden rounded-3xl"
      style={{
        background: "linear-gradient(135deg, #0b1220 0%, #14203a 45%, #0b776f 100%)",
      }}
    >
      <AnimStyles />
      <div className="absolute inset-0 bgPattern -z-10" />

      {/* Шапка */}
      <div className="sticky top-0 z-20">
        <div className="px-4 md:px-6 pt-3">
          <div
            className={[
              "glass border border-white/10 rounded-3xl px-4 py-2.5 md:py-3",
              headerTone === "good"
                ? "glow-green"
                : headerTone === "bad"
                ? "glow-red"
                : "",
            ].join(" ")}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-extrabold text-white tracking-tight">
                  ОГЭ-тренажёр
                </span>
                <span className="hidden md:inline text-white/70">·</span>
                <span className="text-white/80 text-sm md:text-base">
                  Признаки делимости
                </span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                {DIVISORS.map((d) => (
                  <TagButton
                    key={d}
                    label={`${d}`}
                    selected={d === divisor}
                    tone={headerTone}
                    onClick={() => setDivisor(d)}
                  />
                ))}
                <div className="score-chip glass border border-white/20 rounded-2xl px-3 py-1.5 text-white/90 text-xs md:text-sm font-semibold flex items-center gap-2">
                  <span>Очки</span>
                  <span className="text-white bg-white/20 rounded-xl px-2 py-0.5 font-bold">
                    {score}
                  </span>
                </div>
              </div>
            </div>
            <Hint divisor={divisor} />
          </div>
        </div>
      </div>

      {/* Поле игры */}
      <div className="relative z-10 h-[210px] sm:h-[225px] md:h-[235px]">
        <div className="absolute inset-0">
          {cloud.map((item) => (
            <button
              key={item.id}
              onClick={() => onPick(item.value)}
              data-picked={item.value === pickedValue ? pickedTone : undefined}
              className={[
                "num-pill absolute select-none",
                "rounded-3xl px-4 py-2 md:px-5 md:py-2.5 font-extrabold",
                "glass border border-white/20 text-white/95",
                "hover:bg-white/15 active:scale-95",
              ].join(" ")}
              style={{
                top: `${item.top}%`,
                left: `${item.left}%`,
                animation: `drift ${item.duration}s ease-in-out ${item.delay}s infinite`,
                // @ts-ignore
                "--rot": `${item.rotate}deg`,
                // @ts-ignore
                "--s": `${(Math.random() * 0.16 + 0.92).toFixed(2)}`,
              } as React.CSSProperties}
            >
              {item.value}
            </button>
          ))}
        </div>

        {/* Стикеры-эмодзи на фоне */}
        <BackgroundStickers />

        {/* Конфетти слой */}
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {confetti.map((c) => (
            <span
              key={c.id}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `translate3d(${c.x}%, -10%, 0)`,
                animation: `confettiFall ${c.dur}ms ease-in forwards`,
                // @ts-ignore
                "--x": `${c.x}%`,
                // @ts-ignore
                "--r": `${c.r}deg`,
                fontSize: `${Math.floor(Math.random() * 10) + 10}px`,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))",
                color: "white",
              }}
            >
              {c.ch}
            </span>
          ))}
        </div>

        {/* Низ страницы: быстрые правила */}
        <div className="absolute bottom-1 left-0 right-0 px-3 md:px-4">
          <div className="glass border border-white/10 rounded-3xl p-2.5 md:p-3 text-white/90 text-[11px] md:text-xs flex flex-wrap gap-1.5 justify-center">
            <RulePill label="✌️ Делимость на 2: чётные" />
            <RulePill label="➗ На 3: сумма цифр кратна 3" />
            <RulePill label="🖐️ На 5: 0 или 5 на конце" />
            <RulePill label="9️⃣ На 9: сумма цифр кратна 9" />
            <RulePill label="🔟 На 10: 0 на конце" />
          </div>
        </div>
      </div>

      <BackgroundOrbs round={round} />
    </div>
  );
};

const RulePill: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-2 py-1 rounded-2xl bg-white/10 text-white/90 border border-white/15">
    {label}
  </div>
);

const BackgroundStickers: React.FC = () => {
  const stickers = [
    { txt: "📐", top: "12%", left: "6%", size: 28 },
    { txt: "🧠", top: "18%", left: "84%", size: 26 },
    { txt: "➗", top: "58%", left: "8%", size: 30 },
    { txt: "🔢", top: "70%", left: "86%", size: 30 },
    { txt: "✨", top: "42%", left: "50%", size: 22 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      {stickers.map((s, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            top: s.top,
            left: s.left,
            fontSize: s.size,
            opacity: 0.45,
            animation: "floaty 4.5s ease-in-out infinite",
            filter: "drop-shadow(0 6px 14px rgba(0,0,0,.25))",
          }}
        >
          {s.txt}
        </span>
      ))}
    </div>
  );
};

const BackgroundOrbs: React.FC<{ round: number }> = ({ round }) => {
  const orbs = useMemo(
    () =>
      new Array(3).fill(0).map((_, i) => ({
        key: `${round}-${i}-${Math.random()}`,
        size: randInt(180, 320),
        top: randInt(-40, 70),
        left: randInt(-20, 80),
        opacity: Math.random() * 0.25 + 0.15,
      })),
    [round]
  );
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {orbs.map((o) => (
        <div
          key={o.key}
          className="absolute rounded-full blur-3xl"
          style={{
            width: o.size,
            height: o.size,
            top: `${o.top}%`,
            left: `${o.left}%`,
            background:
              "radial-gradient( circle at 30% 30%, rgba(16,185,129,.65), rgba(99,102,241,.35) 60%, transparent 70% )",
            opacity: o.opacity,
            transition: "all .4s ease",
          }}
        />
      ))}
    </div>
  );
};

function placePositions(count: number): { top: number; left: number }[] {
  const placed: { top: number; left: number }[] = [];
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const maxAttemptsPerPoint = 200;
  const bounds = { topMin: 8, topMax: 78, leftMin: 6, leftMax: 88 };
  let dist = MIN_DIST_PCT;
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let placedOk = false;
    while (attempts++ < maxAttemptsPerPoint && !placedOk) {
      const top = clamp(randInt(bounds.topMin, bounds.topMax), bounds.topMin, bounds.topMax);
      const left = clamp(randInt(bounds.leftMin, bounds.leftMax), bounds.leftMin, bounds.leftMax);
      const ok = placed.every((p) => {
        const dx = p.left - left;
        const dy = p.top - top;
        const d = Math.sqrt(dx * dx + dy * dy);
        return d >= dist;
      });
      if (ok) {
        placed.push({ top, left });
        placedOk = true;
        break;
      }
    }
    if (!placedOk) {
      dist = Math.max(6, dist - 2);
      i--;
    }
  }
  return placed;
}

export default DivisionGame;
