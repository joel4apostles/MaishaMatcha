import { useId } from "react";
import type { Recipe } from "@/lib/recipe";

/**
 * The recipe, drawn the way the bar builds it (founder photos, 2026-11-07):
 * a clear Maisha cup, fruit purée at the bottom, milk in the middle, the
 * tea poured over ice on top with a soft marbling where it meets the milk,
 * Coconut Cloud as a pale cap. "On its own" with no extras is a bowl of tea
 * with its foam. Each new layer pours in once (CSS, ~0.5s); reduced motion
 * shows it still. Covered by the founder's drink-visual exemption (product
 * depiction), but kept flat: colour comes from the carta's own hues.
 * Decorative: the recipe text beside it carries the content.
 */

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) =>
  `#${hex(a)
    .map((c, i) => Math.round(c + (hex(b)[i] - c) * t))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;

// Cup geometry (viewBox 0 0 120 180): a tapered clear cup.
const TOP = 22;
const BOTTOM = 170;
const FILL_TOP = 34;
const inner = `M12 ${TOP} L108 ${TOP} L99 ${BOTTOM} Q60 ${BOTTOM + 4} 21 ${BOTTOM} Z`;

type Layer = { id: string; color: string; y: number; h: number; wave: number };

/** A layer whose top edge settles unevenly, as a poured liquid does. */
const wavyLayer = (y: number, amp: number, phase: number) => {
  // Every layer fills to the cup's bottom: painted top-down, the next one
  // covers it, and a dipping wave can never open a gap.
  const b = BOTTOM + 6;
  if (!amp) return `M0 ${b} V${y} H120 V${b} Z`;
  const a = amp * (phase % 2 ? -1 : 1);
  return `M0 ${b} V${y + a} C20 ${y - a} 34 ${y + a * 1.4} 52 ${y} S88 ${y - a * 1.2} 120 ${y + a * 0.6} V${b} Z`;
};

export function CupDrink({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  const clip = `cup-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const tea = recipe.tea.color;
  const purees = recipe.extras.filter((e) => e.key.startsWith("extra.pure") || e.key === "extra.ube");
  const cloud = recipe.extras.some((e) => e.key === "extra.coconut-cloud");
  const milk = recipe.milk?.hue ?? null;

  // Usucha / solo with nothing added: the bowl.
  if (!milk && recipe.extras.length === 0) {
    // Whisked matcha (usucha) carries a pale foam; steeped teas barely any.
    const foam = recipe.prep.key === "prep.usucha" ? 0.35 : 0.1;
    return (
      <svg viewBox="0 0 120 180" aria-hidden="true" className={className}>
        <ellipse cx="60" cy="150" rx="40" ry="6" fill="#1C1B18" opacity="0.12" />
        {/* A matte black chawan, seen a little from above. */}
        <path d="M14 92 Q16 150 60 150 Q104 150 106 92 Z" fill="#2A2926" />
        <ellipse cx="60" cy="92" rx="46" ry="13" fill="#2A2926" />
        <ellipse key={`surface-${tea}`} className="pour-in" cx="60" cy="93" rx="41" ry="10.5" fill={tea} />
        <ellipse cx="58" cy="92" rx="30" ry="7" fill={mix(tea, "#F5F1E8", foam)} opacity="0.9" />
        <ellipse cx="60" cy="92" rx="46" ry="13" fill="none" stroke="#F5F1E8" strokeOpacity="0.12" />
      </svg>
    );
  }

  // Bottom up: purées, milk, tea (the rest), then the cloud cap.
  const layers: Layer[] = [];
  let y = BOTTOM + 4;
  for (const p of purees) {
    const h = purees.length > 2 ? 12 : 16;
    y -= h;
    // Ube at the bar is a deep purple, darker than its carta swatch.
    layers.push({ id: p.key, color: p.key === "extra.ube" ? "#5E2E8C" : (p.hue ?? tea), y, h, wave: 3 });
  }
  let milkTop = y;
  if (milk) {
    const h = Math.round((y - FILL_TOP) * 0.46);
    y -= h;
    milkTop = y;
    layers.push({ id: `milk-${milk}`, color: milk, y, h, wave: 0 });
  }
  layers.push({ id: `tea-${tea}`, color: tea, y: FILL_TOP, h: y - FILL_TOP, wave: 0 });
  const capH = cloud ? 11 : 0;

  return (
    <svg viewBox="0 0 120 180" aria-hidden="true" className={className}>
      <defs>
        <clipPath id={clip}>
          <path d={inner} />
        </clipPath>
      </defs>
      <ellipse cx="60" cy="174" rx="44" ry="4" fill="#1C1B18" opacity="0.1" />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y={TOP} width="120" height={BOTTOM - TOP + 6} fill="#F5F1E8" opacity="0.35" />
        {/* Painted top-down, so each lower layer's uneven top shows over the one above. */}
        {layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => (
          <path key={l.id} className="pour-in" d={wavyLayer(l.y, l.wave, i)} fill={l.color} />
        ))}
        {/* Where the tea meets the milk: a soft marbling, as poured. */}
        {milk ? (
          <g key={`marble-${tea}-${milk}`} className="pour-in" fill={tea}>
            <path d={`M0 ${milkTop} Q20 ${milkTop + 9} 38 ${milkTop + 3} T76 ${milkTop + 6} T120 ${milkTop + 2} V${milkTop - 1} H0 Z`} />
            <path d={`M30 ${milkTop + 2} Q34 ${milkTop + 20} 28 ${milkTop + 30} Q40 ${milkTop + 18} 40 ${milkTop + 2} Z`} opacity="0.55" />
            <path d={`M78 ${milkTop + 3} Q74 ${milkTop + 16} 82 ${milkTop + 24} Q86 ${milkTop + 12} 88 ${milkTop + 3} Z`} opacity="0.45" />
            <path d={`M55 ${milkTop + 4} Q58 ${milkTop + 14} 54 ${milkTop + 18} Q62 ${milkTop + 10} 63 ${milkTop + 4} Z`} opacity="0.35" />
          </g>
        ) : null}
        {/* And the milk rising back into the tea, in pale streaks. */}
        {milk ? (
          <g key={`streak-${tea}-${milk}`} className="pour-in" fill={milk} opacity="0.45">
            <path d={`M44 ${milkTop + 1} Q40 ${milkTop - 14} 46 ${milkTop - 26} Q50 ${milkTop - 12} 50 ${milkTop + 1} Z`} />
            <path d={`M92 ${milkTop + 1} Q96 ${milkTop - 10} 90 ${milkTop - 18} Q88 ${milkTop - 6} 86 ${milkTop + 1} Z`} opacity="0.7" />
          </g>
        ) : null}
        {cloud ? <rect key="cloud" className="pour-in" x="0" y={FILL_TOP} width="120" height={capH} fill="#F4EFE3" /> : null}
        {/* Ice, floating at the top. */}
        <g fill="#FFFFFF" fillOpacity="0.32" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="0.8">
          <rect x="26" y={FILL_TOP - 6} width="20" height="18" rx="3" transform={`rotate(-12 36 ${FILL_TOP + 3})`} />
          <rect x="52" y={FILL_TOP - 9} width="19" height="17" rx="3" transform={`rotate(9 61 ${FILL_TOP})`} />
          <rect x="74" y={FILL_TOP - 5} width="18" height="17" rx="3" transform={`rotate(-5 83 ${FILL_TOP + 3})`} />
        </g>
        {/* The cup's light: one flat highlight down the left wall. */}
        <rect x="18" y={TOP} width="5" height={BOTTOM - TOP} fill="#FFFFFF" opacity="0.18" />
      </g>
      {/* The printed logotype, white on the cup, as on the real ones. */}
      <g fill="#FFFFFF" opacity="0.92" textAnchor="middle">
        <text x="60" y="112" fontFamily="var(--font-serif-brand), Georgia, serif" fontSize="17" fontWeight="500">
          Maisha
        </text>
        <text x="60" y="121" fontFamily="var(--font-hanken), sans-serif" fontSize="4.6" letterSpacing="1.6">
          MATCHA
        </text>
      </g>
      <path d={inner} fill="none" stroke="#1C1B18" strokeOpacity="0.28" strokeWidth="1" />
      <ellipse cx="60" cy={TOP} rx="48" ry="3.2" fill="none" stroke="#1C1B18" strokeOpacity="0.28" strokeWidth="1" />
    </svg>
  );
}
