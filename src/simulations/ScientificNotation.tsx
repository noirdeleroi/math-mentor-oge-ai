// src/simulations/ScientificNotationSimulation.tsx
import React, { useMemo, useState } from "react";
import type { SimulationProps } from "@/types/simulation";

// =============================================
// Игра: Научная запись чисел (для SimulationModal)
// - 8 карточек, до 4 в ряд
// - Компактные, с мини-иконками вместо картинок
// - Фон: картинка из Supabase + затемнение
// - Маленькие числа: запятая ПОСЛЕ первой ненулевой цифры
// =============================================

type CardData = {
  key: string;
  name: string;
  units: string;
  groupDigits: string;
  rawDigits: string;
  isSmall: boolean;
  words: string;
};

type Slot = { kind: "space"; ch: " " } | { kind: "digit"; ch: string; idx: number };

// ---------- Данные (8 карточек) ----------
const DATA: CardData[] = [
  {
    key: "c",
    name: "Скорость света",
    units: "м/с",
    groupDigits: "299 792 458",
    rawDigits: "299792458",
    isSmall: false,
    words: "Скорость света — примерно 300 МИЛЛИОНОВ м/с!",
  },
  {
    key: "Msun",
    name: "Масса Солнца",
    units: "кг",
    groupDigits: "1 988 470 000 000 000 000 000 000 000 000",
    rawDigits: "1988470000000000000000000000000",
    isSmall: false,
    words: "Масса Солнца — около 2 × 10^30 килограммов. Гигантская звезда!",
  },
  {
    key: "Mearth",
    name: "Масса Земли",
    units: "кг",
    groupDigits: "5 972 000 000 000 000 000 000 000",
    rawDigits: "5972000000000000000000000",
    isSmall: false,
    words: "Масса Земли — почти 6 × 10^24 килограммов.",
  },
  {
    key: "AgeU",
    name: "Возраст Вселенной (секунды)",
    units: "с",
    groupDigits: "435 000 000 000 000 000",
    rawDigits: "435000000000000000",
    isSmall: false,
    words: "Возраст Вселенной — примерно 435 КВАДРИЛЛИОНОВ секунд.",
  },
  {
    key: "Cells",
    name: "Клетки в организме человека",
    units: "шт",
    groupDigits: "37 000 000 000 000",
    rawDigits: "37000000000000",
    isSmall: false,
    words: "В организме человека — около 37 ТРИЛЛИОНОВ клеток!",
  },
  {
    key: "Population",
    name: "Население Земли",
    units: "чел",
    groupDigits: "8 100 000 000",
    rawDigits: "8100000000",
    isSmall: false,
    words: "Население Земли — более 8 МИЛЛИАРДОВ человек!",
  },
  {
    key: "Mosquito",
    name: "Масса комара",
    units: "кг",
    groupDigits: "000 0025",
    rawDigits: "0000025",
    isSmall: true,
    words: "Масса комара — примерно 0,0000025 кг (то есть ≈ 2,5 миллиграмма).",
  },
  {
    key: "RBC",
    name: "Диаметр эритроцита",
    units: "м",
    groupDigits: "000 0070",
    rawDigits: "0000070",
    isSmall: true,
    words: "Диаметр эритроцита — примерно 7 микрометров (0,000007 м).",
  },
];

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

const decorateGroupDigits = (groupDigits: string, isSmall: boolean) => {
  if (isSmall) return groupDigits;
  return groupDigits.replace(/\d/g, (ch) =>
    ch === "0" ? String(1 + Math.floor(Math.random() * 9)) : ch
  );
};

// ---------- Мини-иконки ----------
function CardIcon({ id }: { id: string }) {
  let emoji = "⭐";
  let from = "from-emerald-500";
  let to = "to-sky-500";

  switch (id) {
    case "c":
      emoji = "⚡";
      from = "from-yellow-400";
      to = "to-orange-500";
      break;
    case "Msun":
      emoji = "☀️";
      from = "from-amber-400";
      to = "to-red-500";
      break;
    case "Mearth":
      emoji = "🌍";
      from = "from-emerald-400";
      to = "to-sky-500";
      break;
    case "AgeU":
      emoji = "🌌";
      from = "from-indigo-500";
      to = "to-purple-500";
      break;
    case "Cells":
      emoji = "🧫";
      from = "from-pink-400";
      to = "to-purple-500";
      break;
    case "Population":
      emoji = "👥";
      from = "from-cyan-400";
      to = "to-sky-500";
      break;
    case "Mosquito":
      emoji = "🦟";
      from = "from-red-400";
      to = "to-slate-700";
      break;
    case "RBC":
      emoji = "🩸";
      from = "from-rose-500";
      to = "to-red-600";
      break;
  }

  return (
    <div
      className={`flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br ${from} ${to} shadow-md text-[13px]`}
    >
      <span className="drop-shadow-sm">{emoji}</span>
    </div>
  );
}

// ---------- Card ----------
function ScienceCard({ data }: { data: CardData }) {
  const [locked, setLocked] = useState(false);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);

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
    chosenIdx != null && !locked ? "ring-2 ring-fuchsia-400/60 ring-offset-1 ring-offset-slate-950" : "";

  return (
    <div
      className={`relative rounded-xl border border-slate-600/40 bg-slate-950/95 shadow-md overflow-hidden text-xs sm:text-sm ${
        locked ? "ring-2 ring-emerald-500/50" : ""
      }`}
    >
      <div className="px-2.5 pt-2 pb-1.5 flex items-center gap-2 border-b border-slate-800/60 bg-slate-950/90">
        <CardIcon id={data.key} />
        <div className="font-semibold text-[11px] sm:text-xs leading-snug line-clamp-2">
          {data.name}
        </div>
      </div>

      <div className="p-2.5">
        <div
          className={`rounded-lg border border-slate-500/40 bg-slate-900/90 px-2 py-1.5 font-[tabular-nums] leading-relaxed select-none ${numberBoxExtra}`}
        >
          <div className="inline-flex flex-wrap items-center gap-0.5">
            {elements.map((el, i) => (
              <React.Fragment key={i}>
                {el.kind === "space" ? (
                  <span className="px-0.5"> </span>
                ) : (
                  <>
                    <span className="text-base px-0.5 rounded hover:bg-sky-400/20 hover:-translate-y-0.5 transition">
                      {el.ch}
                    </span>
                    {chosenIdx === el.idx ? (
                      <span className="mx-0.5 text-xl font-black text-fuchsia-300 drop-shadow-[0_4px_12px_rgba(217,70,239,0.45)]">
                        ,
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label="Поставить запятую"
                        disabled={locked}
                        onClick={() => onPickSlot(el.idx)}
                        className={`inline-block align-middle w-3 h-5 mx-0.5 rounded-md border transition ${
                          locked
                            ? "opacity-40 cursor-not-allowed border-slate-400/30 bg-slate-400/10"
                            : "cursor-pointer border-slate-400/40 bg-slate-400/20 hover:bg-sky-400/30 hover:border-sky-400/60 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        }`}
                      />
                    )}
                  </>
                )}
              </React.Fragment>
            ))}
            <span className="ml-1 text-slate-400 text-[10px] sm:text-xs">{data.units}</span>
          </div>
        </div>

        {!locked && current && (
          <div className="mt-1.5 text-amber-200 text-[10px]">
            Пока что: <b>{current.pretty}</b> × 10<sup>{current.exp}</sup>
          </div>
        )}

        {locked && current && (
          <div className="mt-2 rounded-lg border border-emerald-400/50 bg-emerald-400/10 text-emerald-100 font-medium text-[10px] sm:text-xs px-2 py-1.5">
            Результат: <b>{current.pretty}</b> × 10<sup>{current.exp}</sup>
            <div className="mt-1 rounded border border-sky-400/40 bg-sky-400/10 text-sky-100 px-2 py-1">
              {data.words}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main simulation ----------
const ScientificNotationSimulation: React.FC<SimulationProps> = (_props) => {
  return (
    <div className="relative flex w-full h-full text-slate-100">
      {/* Фоновая картинка из Supabase */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/img/hq720.jpg')",
        }}
        aria-hidden="true"
      />
      {/* Тёмный слой поверх фона */}
      <div className="absolute inset-0 bg-slate-950/80" aria-hidden="true" />

      {/* Контент */}
      <div className="relative flex flex-col w-full h-full">
        {/* 🔹 НОВЫЙ красивый верхний блок */}
        <div className="px-4 sm:px-6 pt-3 pb-3 border-b border-slate-800/70 bg-slate-950/75 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/80 text-xs shadow-md">
                10
                <sup className="text-[9px]">n</sup>
              </span>
              <h2 className="text-sm sm:text-base font-semibold text-slate-50">
                Как играть
                
              </h2>
            </div>

            <p className="text-[12px] sm:text-xs text-slate-200 leading-relaxed">
              <span className="font-semibold">1.</span>{" "}
              Поставь <b>запятую</b>, чтобы число стало видом{" "}
              <b>
                мантисса × 10<sup>степень</sup>
              </b>.
              <br />
              <span className="font-semibold">2.</span>{" "}
              Для <b>маленьких чисел</b> запятая ставится{" "}
              <b>после первой ненулевой цифры</b> (мантисса типа 2,5; 7,0).
              <br />
              <span className="font-semibold">3.</span> Если место выбрано верно, карточка
              подсветится <span className="text-emerald-300 font-semibold">зелёным</span>.
            </p>
          </div>
        </div>

        {/* Карточки */}
        <div className="flex-1 overflow-auto px-3 py-2">
          <div className="grid gap-2.5 sm:gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {DATA.map((d) => (
              <ScienceCard key={d.key} data={d} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScientificNotationSimulation;
