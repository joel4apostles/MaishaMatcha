/**
 * Every Japanese character the site sets in the brush face (Yuji Syuku, SIL
 * Open Font License). app/fonts/yuji-syuku-subset.woff2 holds exactly these
 * glyphs (12.5 KB) instead of Google's 140-odd unicode-range slices.
 * A test fails when a new character appears in the code or messages; then
 * add it here and re-download the subset from Google Fonts with the same
 * characters (css2?family=Yuji+Syuku&text=<these characters>, with a
 * browser User-Agent so it answers woff2) and save it over the file. A
 * glyph missing from the file still renders, in the Mincho fallback.
 */
export const BRUSH_GLYPHS = "一七三二五会侘八六友和四宇寂抹故敬新服期清温点知禅茶陰";
