// src/simulations/ScientificNotationSimulation.tsx
import React, { useMemo, useState } from "react";
import type { SimulationProps } from "@/types/simulation";

// =============================================
// Игра: Научная запись чисел (вписана в SimulationModal)
// - Заполняет всю область модалки (flex-колонка)
// - Большие числа: рандомные цифры вместо нулей для красоты
// - Логика использует rawDigits → результат корректный
// - Маленькие числа: запятая ПОСЛЕ первой ненулевой цифры (2,5; 7,0)
// - Интерфейс полностью на русском, с картинками для каждой карточки
// =============================================

type CardData = {
  key: string;
  name: string;
  units: string;
  groupDigits: string; // строка с пробелами для отображения
  rawDigits: string;   // строка без пробелов, только цифры
  isSmall: boolean;
  words: string;
  imgUrl?: string;     // картинка для этой карточки
};

type Slot = { kind: "space"; ch: " " } | { kind: "digit"; ch: string; idx: number };

// Набор данных
const DATA: CardData[] = [
  {
    key: "c",
    name: "Скорость света",
    units: "м/с",
    groupDigits: "299 792 458",
    rawDigits: "299792458",
    isSmall: false,
    words: "Скорость света — примерно 300 МИЛЛИОНОВ м/с!",
    imgUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "Msun",
    name: "Масса Солнца",
    units: "кг",
    groupDigits: "1 988 470 000 000 000 000 000 000 000 000",
    rawDigits: "1988470000000000000000000000000",
    isSmall: false,
    words: "Масса Солнца — около 2 × 10^30 килограммов. Гигантская звезда!",
    imgUrl: "https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "Mearth",
    name: "Масса Земли",
    units: "кг",
    groupDigits: "5 972 000 000 000 000 000 000 000",
    rawDigits: "5972000000000000000000000",
    isSmall: false,
    words: "Масса Земли — почти 6 × 10^24 килограммов.",
    imgUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "AgeU",
    name: "Возраст Вселенной (секунды)",
    units: "с",
    groupDigits: "435 000 000 000 000 000",
    rawDigits: "435000000000000000",
    isSmall: false,
    words: "Возраст Вселенной — примерно 435 КВАДРИЛЛИОНОВ секунд.",
    imgUrl: "https://images.unsplash.com/photo-1447433819943-74a20887a81e?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "Cells",
    name: "Количество клеток в организме человека",
    units: "шт",
    groupDigits: "37 000 000 000 000",
    rawDigits: "37000000000000",
    isSmall: false,
    words: "В организме человека — около 37 ТРИЛЛИОНОВ клеток!",
    imgUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "Everest",
    name: "Масса горы Эверест (оценка)",
    units: "кг",
    groupDigits: "1 600 000 000 000 000",
    rawDigits: "1600000000000000",
    isSmall: false,
    words: "Масса горы Эверест — около 1,6 КВАДРИЛЛИОНА килограммов.",
    imgUrl: "https://images.unsplash.com/photo-1549880181-56a44cf4a9a7?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "Population",
    name: "Население Земли",
    units: "чел",
    groupDigits: "8 100 000 000",
    rawDigits: "8100000000",
    isSmall: false,
    words: "Население Земли — более 8 МИЛЛИАРДОВ человек!",
    imgUrl: "https://images.unsplash.com/photo-1460891053196-b9d4d9483d9b?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "Mosquito",
    name: "Масса комара",
    units: "кг",
    groupDigits: "000 0025",
    rawDigits: "0000025",
    isSmall: true,
    words: "Масса комара — примерно 0,0000025 кг (то есть ≈ 2,5 миллиграмма).",
    imgUrl: "https://images.unsplash.com/photo-1620928087997-21d2ef3bc7de?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "RBC",
    name: "Диаметр эритроцита",
    units: "м",
    groupDigits: "000 0070",
    rawDigits: "0000070",
    isSmall: true,
    words: "Диаметр эритроцита — примерно 7 микрометров (0,000007 м).",
    imgUrl: "https://images.unsplash.com/photo-1581594693700-81249df16d5f?q=80&w=1600&auto=format&fit=crop",
  },
];

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=1600&auto=format&fit=crop";

// ---------- Utils ----------
const firstNonZeroIndex = (raw: string) => {
  for (let i = 0; i < raw.length; i++) if (raw[i] !== "0") return i;
  return raw.length - 1;
};

const exponentFor = (raw: string, isSmall: boolean, i: number) =>
  (isSmall ? -1 : raw.length - 1) - i;

const insertComma = (raw: string, i: number) => raw.slice(0, i + 1) + "," + raw.slice(i + 1);

const prettyMantissa = (commaStr: string) => {
  const [L, R = ""] = commaStr.split(",");
  const left = L.replace(/^0+/, "") || "0";
  const right = R.replace(/0+$/, "");
  return right ? `${left},${right}` : `${left},0`;
};

const buildSlots = (groupDigits: string): Slot[] => {
  const out: Slot[] = [];
  let digitIdx = 0;
  for (let i = 0; i < groupDigits.length; i++) {
    const ch = groupDigits[i];
    if (ch === " ") out.push({ kind: "space", ch: " " });
    else {
      out.push({ kind: "digit", ch, idx: digitIdx });
      digitIdx++;
    }
  }
  return out;
};

// Большие числа делаем веселее: нули → случайные 1–9 (ТОЛЬКО визуально)
const decorateGroupDigits = (groupDigits: string, isSmall: boolean) => {
  if (isSmall) return groupDigits;
  return groupDigits.replace(/\d/g, (ch) =>
    ch === "0" ? String(1 + Math.floor(Math.random() * 9)) : ch
  );
};

// ---------- Card component ----------
function ScienceCard({ data }: { data: CardData }) {
  const [locked, setLocked] = useState(false);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);

  // Правильный индекс:
  // - большие числа: после первой цифры (0)
  // - маленькие: ПОСЛЕ первой ненулевой (k)
  const goodIdx = useMemo(() => {
    const k = firstNonZeroIndex(data.rawDigits);
    return data.isSmall ? k : 0;
  }, [data.rawDigits, data.isSmall]);

  const displayDigits = useMemo(
    () => decorateGroupDigits(data.groupDigits, data.isSmall),
    [data.groupDigits, data.isSmall]
  );
  const elements = useMemo(() => buildSlots(displayDigits), [displayDigits]);

  const current = useMemo(() => {
    if (chosenIdx == null) return null;
    if (!Number.isInteger(chosenIdx) || chosenIdx < 0 || chosenIdx >= data.rawDigits.length)
      return null;
    const mantissaRaw = insertComma(data.rawDigits, chosenIdx);
    const exp = exponentFor(data.rawDigits, data.isSmall, chosenIdx);
    return { mantissaRaw, exp, pretty: prettyMantissa(mantissaRaw) };
  }, [chosenIdx, data.rawDigits, data.isSmall]);

  const onPickSlot = (idx: number) => {
    if (locked) return;
    setChosenIdx(idx);
    if (idx === goodIdx) setLocked(true);
  };

  const numberBoxExtra =
    chosenIdx != null && !locked ? "ring-2 ring-fuchsia-400/50 ring-offset-2 ring-offset-slate-900" : "";

  return (
    <div className={`relative rounded-2xl border border-slate-600/40 bg-slate-950/90 shadow-xl overflow-hidden ${locked ? "ring-4 ring-emerald-500/40" : ""}`}>
      {/* Картинка сверху */}
      <div className="relative w-full h-32 sm:h-36 bg-slate-900/70 overflow-hidden">
        <img
          src={data.imgUrl || FALLBACK_IMG}
          alt={data.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      <div className="p-3 sm:p-4">
        <div className="font-extrabold text-sm sm:text-base mb-1">{data.name}</div>

        <div
          className={`mt-1 rounded-xl border border-slate-400/40 bg-slate-900/80 px-3 py-2 font-[tabular-nums] leading-relaxed select-none ${numberBoxExtra}`}
        >
          <div className="inline-flex flex-wrap items-center gap-0.5">
            {elements.map((el, i) => (
              <React.Fragment key={i}>
                {el.kind === "space" ? (
                  <span className="px-0.5"> </span>
                ) : (
                  <>
                    <span className="text-lg sm:text-xl px-0.5 rounded-md hover:bg-sky-400/20 hover:-translate-y-0.5 transition">
                      {el.ch}
                    </span>
                    {chosenIdx === el.idx ? (
                      <span className="mx-0.5 text-2xl font-black text-fuchsia-300 drop-shadow-[0_4px_12px_rgba(217,70,239,0.45)]">
                        ,
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label="Поставить запятую"
                        disabled={locked}
                        onClick={() => onPickSlot(el.idx)}
                        className={`inline-block align-middle w-3 h-6 mx-0.5 rounded-md border transition ${
                          locked
                            ? "opacity-40 cursor-not-allowed border-slate-400/30 bg-slate-400/10"
                            : "cursor-pointer border-slate-400/40 bg-slate-400/20 hover:bg-sky-400/30 hover:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        }`}
                      />
                    )}
                  </>
                )}
              </React.Fragment>
            ))}
            <span className="ml-2 text-slate-400 text-xs sm:text-sm">{data.units}</span>
          </div>
        </div>

        {!locked && current && (
          <div className="mt-2 text-amber-200 text-[11px] sm:text-xs">
            Пока что: <b>{current.pretty}</b> × 10<sup>{current.exp}</sup> — попробуй ещё!
          </div>
        )}

        {locked && current && (
          <div className="mt-3 rounded-xl border border-emerald-400/50 bg-emerald-400/10 text-emerald-100 font-semibold text-xs sm:text-sm px-3 py-2">
            Результат: <b>{current.pretty}</b> × 10<sup>{current.exp}</sup>
            <div className="mt-2 rounded-lg border border-sky-400/40 bg-sky-400/10 text-sky-100 px-3 py-2">
              {data.words}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main simulation component ----------
const ScientificNotationSimulation: React.FC<SimulationProps> = (_props) => {
  // onClose из SimulationProps есть, но модалка уже даёт крестик и ESC,
  // так что здесь его можно не использовать. Оставляю на будущее:
  // const { onClose } = _props;

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 text-slate-100">
      {/* Верхняя панель с описанием */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/70 bg-slate-950/95">
        <p className="text-xs sm:text-sm text-slate-200">
          Поставь <b>запятую</b> так, чтобы число превратилось в{" "}
          <b>мантисса × 10<sup>степень</sup></b>. Для <b>маленьких чисел</b> запятая ставится{" "}
          <b>после первой ненулевой</b> цифры (мантисса типа 2,5; 7,0). Правильная позиция окрасит
          карточку в зелёный.
        </p>
      </div>

      {/* Основная область с карточками */}
      <div className="flex-1 overflow-auto px-3 sm:px-4 py-3">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {DATA.map((d) => (
            <ScienceCard key={d.key} data={d} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScientificNotationSimulation;
