"use client";

import type { Recipe } from "@/lib/recipe";
import { blendColor } from "@/lib/recipe";

/**
 * The drink being made, as a living product visualization. Founder-sanctioned
 * exemption from the flat/no-loop laws (this is the product, like a photo):
 * - every choice replays a one-shot pour + mixing swirl (keyed remount)
 * - the liquid level and blend color transition to their new state
 * - ambient realism loops quietly: bubbles rise while sparkling, steam curls
 *   while warm — both die under prefers-reduced-motion via the global kill.
 * Depth comes from a vertical liquid gradient, a glass shine, and a surface
 * ellipse. Decorative (aria-hidden); the text summary sits beside it.
 */

function mix(hex: string, target: [number, number, number], t: number): string {
  const c = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  return `#${c
    .map((v, i) =>
      Math.round(v * (1 - t) + target[i] * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function DrinkGlass({
  recipe,
  className = "",
}: {
  recipe: Recipe;
  className?: string;
}) {
  const color = blendColor(recipe);
  const deep = mix(color, [28, 27, 24], 0.35); // depth at the bottom
  const lightTop = mix(color, [245, 241, 232], 0.28); // light entering the surface

  const level = Math.min(0.78, 0.3 + recipe.base.ml * 0.0024);
  const foam = recipe.intensity.id === "intenso";
  const sparkling = recipe.base.id === "gas" || recipe.base.id === "tonica";
  const cold = recipe.temp.id === "frio";
  const fruitHue = recipe.fruit?.hue ?? null;

  const glassTop = 26;
  const glassBottom = 154;
  const innerHeight = glassBottom - glassTop;
  const surfaceY = glassBottom - innerHeight * level;

  const ease = "700ms cubic-bezier(0.22, 1, 0.36, 1)";
  // Any change re-keys the one-shot pour + swirl.
  const changeKey = `${recipe.intensity.id}.${recipe.base.id}.${recipe.fruit?.id ?? "no"}.${recipe.temp.id}`;

  return (
    <svg
      viewBox="0 0 120 176"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <style>{`
        @keyframes dg-pour {
          0% { transform: scaleY(0); opacity: 0; }
          12% { transform: scaleY(1); opacity: 0.9; }
          70% { transform: scaleY(1); opacity: 0.9; }
          100% { transform: scaleY(0); opacity: 0; }
        }
        @keyframes dg-swirl {
          0% { transform: translateX(-26px); opacity: 0; }
          35% { opacity: 0.45; }
          100% { transform: translateX(30px); opacity: 0; }
        }
        @keyframes dg-bubble {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 0.85; }
          100% { transform: translateY(-64px); opacity: 0; }
        }
        @keyframes dg-steam {
          0% { transform: translateY(0); opacity: 0; }
          30% { opacity: 0.5; }
          100% { transform: translateY(-12px); opacity: 0; }
        }
      `}</style>

      <defs>
        <clipPath id="dg-clip">
          <path d="M 28 26 L 92 26 L 86 149 Q 85.6 154 80 154 L 40 154 Q 34.4 154 34 149 Z" />
        </clipPath>
        <linearGradient id="dg-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lightTop} />
          <stop offset="35%" stopColor={color} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <linearGradient id="dg-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* shadow under the glass */}
      <ellipse cx="60" cy="158" rx="30" ry="4" fill="#1C1B18" fillOpacity="0.12" />

      {/* steam — warm drinks, ambient */}
      {!cold ? (
        <g
          stroke="#1C1B18"
          strokeOpacity="0.3"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M 50 20 C 47 15, 53 12, 50 7" style={{ animation: "dg-steam 2.8s ease-out infinite" }} />
          <path d="M 70 22 C 67 17, 73 14, 70 9" style={{ animation: "dg-steam 2.8s ease-out 1.2s infinite" }} />
        </g>
      ) : null}

      <g clipPath="url(#dg-clip)">
        {/* the liquid: level and blend transition to each new state */}
        <rect
          x="28"
          y={glassTop}
          width="64"
          height={innerHeight}
          fill="url(#dg-liquid)"
          style={{
            transform: `scaleY(${level})`,
            transformOrigin: "60px 154px",
            transition: `transform ${ease}, fill ${ease}`,
          }}
        />

        {/* liquid surface — the 3D cue */}
        <ellipse
          cx="60"
          rx="30"
          ry="4"
          cy={surfaceY}
          fill={lightTop}
          fillOpacity="0.9"
          style={{ transition: `cy ${ease}, fill ${ease}` }}
        />

        {/* one-shot pour + mixing swirl, replayed on every choice */}
        <g key={changeKey}>
          <rect
            x="56"
            y="0"
            width="5"
            height={surfaceY + 6}
            rx="2.5"
            fill={color}
            style={{
              transformOrigin: "58px 0px",
              animation: "dg-pour 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          />
          <ellipse
            cx="60"
            cy={surfaceY + 14}
            rx="16"
            ry="5"
            fill={lightTop}
            style={{ animation: "dg-swirl 1.3s ease-out 0.25s both" }}
          />
        </g>

        {/* foam cap — intenso */}
        <ellipse
          cx="60"
          rx="29"
          ry="4.5"
          cy={surfaceY + 1}
          fill="#F5F1E8"
          fillOpacity="0.6"
          style={{ opacity: foam ? 1 : 0, transition: `opacity ${ease}, cy ${ease}` }}
        />

        {/* bubbles — sparkling bases, ambient rise */}
        {sparkling ? (
          <g fill="#F5F1E8" fillOpacity="0.75">
            {[
              [46, 3.0, 0.0, 2.0],
              [63, 2.5, 0.8, 1.6],
              [76, 3.4, 0.3, 2.2],
              [54, 2.8, 1.5, 1.4],
              [70, 3.2, 2.1, 1.7],
              [48, 2.6, 1.1, 1.3],
            ].map(([cx, dur, delay, r], i) => (
              <circle
                key={i}
                cx={cx}
                cy={glassBottom - 8}
                r={r}
                style={{
                  animation: `dg-bubble ${dur}s linear ${delay}s infinite`,
                }}
              />
            ))}
          </g>
        ) : null}

        {/* fruit pieces settle at the bottom */}
        {fruitHue ? (
          <g fill={fruitHue}>
            <circle cx="47" cy="147" r="3.4" />
            <circle cx="60" cy="149" r="2.8" />
            <circle cx="74" cy="146" r="3.1" />
          </g>
        ) : null}

        {/* ice — frío, floats at the surface */}
        <g
          fill="#F5F1E8"
          fillOpacity="0.55"
          style={{
            opacity: cold ? 1 : 0,
            transform: `translateY(${surfaceY - glassTop}px)`,
            transition: `opacity ${ease}, transform ${ease}`,
          }}
        >
          <rect x="41" y={glassTop + 2} width="15" height="15" rx="3" transform="rotate(12 48 33)" />
          <rect x="63" y={glassTop + 5} width="13" height="13" rx="3" transform="rotate(-9 70 35)" />
        </g>

        {/* glass shine */}
        <rect x="31" y="28" width="10" height="122" fill="url(#dg-shine)" />
      </g>

      {/* the glass itself */}
      <path
        d="M 28 26 L 92 26 L 86 149 Q 85.6 154 80 154 L 40 154 Q 34.4 154 34 149 Z"
        fill="none"
        stroke="#1C1B18"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
