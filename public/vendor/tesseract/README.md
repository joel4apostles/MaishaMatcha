Self-hosted text recognition for the counter's scanner (security review
2026-11-06: nothing executable loads from a CDN on /pos).

- tesseract.min.js, worker.min.js: tesseract.js 7.0.0 (Apache-2.0)
- tesseract-core-simd-lstm.wasm.js: tesseract.js-core 7.0.0
- spa/eng.traineddata.gz: @tesseract.js-data 4.0.0_best_int

Upgrade: download the same files for the new version, replace, re-test
components/pos/Scanner.tsx on a tablet.
