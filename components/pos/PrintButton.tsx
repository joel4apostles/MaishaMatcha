"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-[48px] rounded-[2px] bg-sumi px-6 text-sm font-medium text-washi"
    >
      {label}
    </button>
  );
}
