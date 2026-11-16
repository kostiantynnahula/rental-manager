---
paths:
  - 'apps/worker/src/extraction/**'
  - 'apps/worker/src/scripts/**'
---

# Photo extraction (worker, `src/extraction/`)

- `PhotoExtractorService.extract({ image, meters, inbox })` → `Extraction` (`readings[]`: `meterId | null`, `serialNumber`,
  `utility`, `zone`, `value` as shown, `confidence` high/medium/low, `issues[]`; plus `photoIssues[]`). One LangChain
  vision call (`@langchain/anthropic`), only proposes — nothing is saved here (the job posts the matched values).
- Structured output via `withStructuredOutput(schema, { method: 'jsonSchema' })` (native `output_config.format`).
  **Never `functionCalling`**: it forces `tool_choice`, which current Claude models reject with a 400. No `thinking` /
  `temperature`: current models think adaptively, `outputConfig.effort` sets the depth.
- The SDK turns JSON-schema `enum` into a description hint (not enforced by the API), so `meterId` is a plain string
  and `normalizeExtraction()` (pure, `helpers/`) enforces the candidates: unknown id → null + issue; also comma → dot,
  leading zeros dropped (`00532.20` → `532.20`), serial → digits, value not a meter number / zone not on the meter →
  issue + `confidence: low`. Nothing is dropped.
- Prompt rules (OBIS codes, drums, water colours, stickers, serial formats) live in `helpers/extraction-prompt.ts`;
  candidates go in the user message (`describeCandidates(meters, inbox)`; inbox: "the apartment is unknown — meterId
  by serial only"). The image is auto-oriented and fit into 1568 px
  (`prepareImage`, sharp) — Claude's base64 limit is 5 MB, the API accepts 15 MB photos.
- Never log the image, the prompt contents or `ANTHROPIC_API_KEY` (model, duration and counts only).
- Tests mock `@langchain/anthropic` (`vi.mock`, see `photo-extractor.service.spec.ts`) — never a real model call;
  images are generated with sharp in the test. The golden set below stays manual.
- Manual check: `pnpm --filter worker extract:samples -- samples [--inbox]` (from the repo root: path relative to
  `apps/worker`; `--inbox` = the inbox prompt). The dir holds photos + `meters.json` + optional `expected.json` (format: `samples.example/`) and
  prints every reading plus ✓/✗ against the golden values. One paid model call per photo; `samples/` is gitignored.
