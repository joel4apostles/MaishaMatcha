import Image from "next/image";
import drinkPhoto from "@/public/images/drink-real.jpg";

/**
 * The recipe visual, photographic: the brand kit's real drink photograph,
 * re-tinted live to the composed recipe's colour via a colour blend overlay
 * (the photo's luminosity is kept, so glass, light and texture stay real
 * while the liquid takes the drink's hue). One 700ms transition per choice;
 * decorative, the text summary carries the content.
 */
export function PhotoDrink({ color, className = "" }: { color: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative overflow-hidden rounded-[2px] ${className}`.trim()}>
      <Image src={drinkPhoto} alt="" placeholder="blur" sizes="160px" className="h-full w-full object-cover" />
      <div
        className="absolute inset-0 mix-blend-color transition-colors duration-700 ease-out motion-reduce:transition-none"
        style={{ backgroundColor: color }}
      />
      {/* Hairline, matching the site's imagery treatment. */}
      <div className="absolute inset-0 rounded-[2px] ring-1 ring-inset ring-sumi/15" />
    </div>
  );
}
