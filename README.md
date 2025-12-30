<p align="center">
  <strong>OncoSight – Clinical Intelligence Platform</strong><br />
  High-density “single pane of glass” dashboard for medical oncologists.
</p>

## Product Goals

| Objective | Description | Success Signals |
| --- | --- | --- |
| **Reduce cognitive overload** | Consolidate imaging, labs, pathology, genomics, and AI insights into one “single pane of glass.” | Oncologists spend fewer clicks navigating disparate systems; safety-critical data is within one scroll. |
| **Surface safety risks early** | Highlight renal, hepatic, hematologic risks plus abnormal biomarkers with intuitive badges and charts. | Clinicians can spot deteriorations (e.g., climbing creatinine) before treatment decisions. |
| **Enable rapid investigations** | Provide keyboard-driven navigation (O+R/L/P/D) and harmonized design tokens for fast mental parsing. | Sub-tab switching and chart loading is instant; data feels uniform and predictable. |
| **Support collaborative documentation** | References tab aggregates radiology/pathology/genomics/notes for multidisciplinary review. | Teams can open source documents directly from the dashboard without chasing links. |

## Architecture Overview

```
src/
├── app/
│   ├── dashboard/[id]/    # Patient dashboard entry rendered via RSC + Client components
│   └── api/               # (Reserved) ingest/AI endpoints
├── components/
│   ├── tabs/              # Diagnosis, Investigations (Pathology/Radiology/Labs), References, etc.
│   └── dashboard-tabs-client.tsx  # Top-level tab controller + keyboard routing
├── lib/
│   ├── data-service.ts    # CSV → Patient mapping, JSON parsing helpers
│   └── generatePatientInsights.ts # Gemini-driven AI summaries (fallback-safe)
├── types/                 # Patient & insight TypeScript models
└── public/                # Static assets
```

- **Render model:** Next.js 16 App Router with React Server Components feeding Client components for dynamic tabs and charts.
- **Design system:** Shared Tailwind tokens in `src/components/tabs/design-system.ts` ensure cards, typography, badges, spacing, and sidebars stay uniform.
- **Charts & motion:** Recharts powers tumor-size / biomarker plots; Framer Motion adds subtle entrance animations. Radix Tabs orchestrate sub-panels.
- **Keyboard control:** `DashboardTabsClient` owns global listeners for sequences like `O + R` (Radiology) and delegates to Investigations Tab.

## Data Model

Patient records are CSV-backed with JSON-encoded columns for multi-entry domains.

```ts
type Patient = {
  patientId: string;
  name: string;
  age?: number;
  primaryDiagnosis?: string;
  radiologyReports?: RadiologyDocument[];
  pathologyDetails?: PathologyDetails[];
  genomicReports?: GenomicReport[];
  providerNotes?: DocumentLink[];
  biomarkerTrend?: BiomarkerPoint[];
  tumorSizeTrend?: TumorTrendPoint[];
  aiInsights?: MasterAIResponse;
  // ... numerous safety flags (renal, liver), treatment timelines, etc.
};
```

- **Normalization:** `data-service.ts` parses CSV rows, safely JSON-parses embedded arrays, coerces types, and fills reasonable defaults (e.g., fallback pathology summaries).
- **AI insights:** `generatePatientInsights.ts` prompts Gemini for structured data that feeds sidebar safety flags and narrative text, with deterministic fallbacks on errors.
- **References aggregation:** `references-tab.tsx` merges radiology/pathology/genomics/notes sources, normalizing links from structured fields or free-text lists.

## Key Tradeoffs & Assumptions

1. **Static dataset vs live EHR:** The MVP consumes CSV + JSON blobs for rapid iteration. Integrating live FHIR feeds will require auth, batching, and stricter PHI handling.
2. **Client-heavy investigations:** Radiology/Labs charts render client-side via Recharts for interactivity. This assumes manageable payload sizes; SSR charts would need a different lib.
3. **Keyboard-first UX:** Shortcut sequences optimize for power users but assume desktop usage. Mobile parity is secondary for this release.
4. **Design tokens in TS (not Tailwind config):** Tokens live in `design-system.ts` so components import strings directly. This keeps refactors simple but duplicates values vs a Tailwind theme.
5. **AI dependency:** Gemini insights are optional; when unavailable, deterministic summaries kick in. We assume stable API quotas and handle malformed responses defensively.

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

