import { KigumiGrid } from "./KigumiGrid";

/**
 * Aspect-locked, warm, low-contrast placeholder standing in for real
 * photography. Carries the kigumi motif faintly. No stock, no generated art.
 */
export function PlaceholderImage({
  label,
  subject,
  ratio = "4 / 5",
  withMotif = false,
  className = "",
}: {
  /** Accessible description of the intended photograph. */
  label: string;
  /** Faint centered word hinting at the subject. */
  subject?: string;
  ratio?: string;
  withMotif?: boolean;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        aspectRatio: ratio,
        // Flat warm field — brand law forbids gradients.
        backgroundColor: "#e7ddc8",
      }}
      className={`relative overflow-hidden rounded-[2px] border border-wood/25 ${className}`.trim()}
    >
      {withMotif ? (
        <div className="absolute inset-0 opacity-[0.07]">
          <KigumiGrid />
        </div>
      ) : null}
      {subject ? (
        <span className="absolute inset-0 flex items-center justify-center px-6 text-center font-serif text-lg lowercase tracking-wide text-sumi/25">
          {subject}
        </span>
      ) : null}
    </div>
  );
}
