"use client";

import Image from "next/image";
import drinkPhoto from "@/public/images/drink-real.jpg";
import type { Recipe } from "@/lib/recipe";
import { blendColor } from "@/lib/recipe";

/**
 * The recipe visual, photographic: the brand kit's real drink photograph,
 * re-tinted live to the composed recipe's blended color via a hue/color
 * blend overlay (luminosity of the photo is preserved, so glass, light and
 * texture stay real while the liquid adopts the drink's hue). One 700ms
 * transition per choice; decorative — the text summary carries the content.
 */
export function PhotoDrink({
  recipe,
  className = "",
}: {
  recipe: Recipe;
  className?: string;
}) {
  const color = blendColor(recipe);
  const cold = recipe.temp.id === "frio";

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-[2px] ${className}`.trim()}
    >
      <Image
        src={drinkPhoto}
        alt=""
        placeholder="blur"
        sizes="160px"
        className="h-full w-full object-cover"
      />
      {/* Live re-tint: color blend keeps photo luminosity, swaps the hue. */}
      <div
        className="absolute inset-0 mix-blend-color transition-colors duration-700 ease-out"
        style={{ backgroundColor: color }}
      />
      {/* Warmth cue: a faint warm veil lifts when served cold. */}
      <div
        className="absolute inset-0 bg-[#D69A3F] mix-blend-soft-light transition-opacity duration-700 ease-out"
        style={{ opacity: cold ? 0 : 0.35 }}
      />
      {/* Hairline, matching the site's imagery treatment. */}
      <div className="absolute inset-0 rounded-[2px] ring-1 ring-inset ring-sumi/15" />
    </div>
  );
}
