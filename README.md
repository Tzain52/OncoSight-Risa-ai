<p align="center">
  <strong>OncoSight – Clinical Intelligence Platform</strong><br />
  High-density “single pane of glass” dashboard for medical oncologists.
</p>

## Project Intent

| Problem | Goal | Design Tenets |
| --- | --- | --- |
| Oncologists juggle 20+ tabs (PDFs, labs, notes) and suffer alert fatigue, risking missed safety signals (e.g., rising creatinine on cisplatin). | Build a unified “safety-first” dashboard that reduces cognitive load and surfaces critical signals with progressive disclosure. | High signal-to-noise, trustworthy visual language (Shadcn/UI energy), medical-grade typography, minimal ornamentation, motion used only for context. |

## Tech Stack

- **Framework:** Next.js 14 App Router (`src/app`), React Server Components by default for fast, composable data delivery.
- **Language:** TypeScript everywhere for strict domain modeling of oncologic entities.
- **Styling:** Tailwind CSS with PostCSS pipeline, `clsx` + `tailwind-merge` for ergonomic variant composition.
- **Icons & Data Viz:** `lucide-react` for consistent semantic iconography, `recharts` for trendlines, lab value trajectories, and safety signal overlays.

## High-Level Architecture

```
src/
├── app/               # App Router entrypoints (RSC-first pages, layouts, metadata)
│   ├── (dashboard)/   # Future parallel routes for patient snapshot, treatment course, labs
│   └── api/           # Edge/server actions for data ingestion & normalization
├── components/        # Shared UI primitives (cards, signal badges, hydration boundaries)
├── features/          # Domain modules (labs, regimens, toxicity, decision support)
├── lib/
│   ├── data/          # Fetchers, adapters, FHIR ingestion, streaming transforms
│   └── ui/            # Tailwind tokens, theme helpers, motion presets
└── styles/            # Tailwind globals, CSS variables for medical palette
```

### Progressive Disclosure Layers
1. **Signal Layer** – always-visible patient safety strip (labs, vitals, toxicity alerts).
2. **Context Layer** – collapsible cards for regimen timeline, imaging, genomics.
3. **Exploration Layer** – deep dives (full labs grid, note timelines) on demand.

## Getting Started

```bash
npm install
cp .env.example .env.local # add secrets
npm run dev
# http://localhost:3000
```

## Environment Variables

| Key | Description | Required |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side key for Gemini API access (used by upcoming AI-assisted summarization modules). | Yes |

1. Duplicate `.env.example` to `.env.local`.
2. Paste your real Gemini key in `.env.local` (never commit secrets).
3. Restart `npm run dev` after changes.

## Immediate Next Steps
1. Define design tokens (color ramps, typography scale, spacing grid) in `tailwind.config.ts`.
2. Scaffold shared primitives (Panel, MetricTile, TrendSparkline) in `src/components`.
3. Integrate mock patient dataset + FHIR ingestion adapters within `src/lib/data`.

## Tooling Notes

- ESLint + Next.js rules ensure server/client boundary safety.
- `@/` alias resolves to `src/` for clean imports.
- This repo intentionally ships without UI features yet—focus is platform skeleton.
