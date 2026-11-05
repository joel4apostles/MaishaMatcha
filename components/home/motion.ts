import type { CSSProperties } from "react";

/** Inline custom properties for the home page's staged entrances. */
export const riseDelay = (ms: number) =>
  ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export const stageDelay = (ms: number) => ({ "--sd": `${ms}ms` }) as CSSProperties;
