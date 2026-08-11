---
name: maisha-brand-constraints
description: Hard visual/motion constraints for maisha matcha public site — the filter for any UI component or effect recommendation
metadata:
  type: project
---

maisha matcha (premium matcha salon, Murcia) public marketing site is Next.js 15 + Tailwind 4, "lujo silencioso" (quiet luxury). NO component library allowed on public pages — copy-paste patterns only. framer-motion as a dependency is acceptable if justified.

**Why:** brand law (skill `maisha-brand`) enforces a strict aesthetic; loud/animated components break it.

**How to apply — reject any effect that:**
- uses gradients (NONE allowed anywhere), glows, beams, meteors, sparkles, aurora, spotlight, rainbow/shimmer/shine borders, confetti, 3D tilt, wobble, vortex, retro/flickering grids.
- loops, bounces, pulses, or runs continuously (marquees, spinning text, infinite moving cards) — motion is fade-and-rise ONLY: 12px, 0.6s, ease-out, once, respect prefers-reduced-motion.
- introduces a second accent color. Palette is washi #F5F1E8 / sumi #1C1B18 / gold #786000 (rare) / wood #B08D57. No green.

**Accept:** blur/fade-up-on-scroll reveals (Magic UI BlurFade, Aceternity Text Generate Effect used once), static bento/editorial grids, number ticker (subtle stat), scroll progress, kigumi SVG lattice (≤8% opacity, one hero element/page). Serif = Cormorant Garamond, sans = Hanken Grotesk.
