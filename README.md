# OncoSight – Clinical Intelligence Platform

## Product Goals

| Goal | Why it matters | How we measure success |
| --- | --- | --- |
| **Shrink cognitive load** | Clinicians need imaging, labs, pathology, and genomics in one pane. | Full decision context within one scroll, fewer app hops. |
| **Surface safety risks early** | Therapy choices depend on renal/hepatic stability. | At-a-glance organ badges flag deteriorations before ordering chemo. |
| **Speed up investigations** | Keyboard shortcuts + harmonized UI unlock faster review cycles. | Shortcut usage (O+R/L/P/D/E/B) and <1s tab swaps. |
| **Support collaborative documentation** | Multidisciplinary teams share references directly from the dashboard. | Radiology/pathology links opened without searching EMR inboxes. |

## Architecture Overview

```
src/
├── app/
│   ├── dashboard/[id]/        # Patient workspace (RSC shell + client tab system)
│   └── api/clinical-summary   # Server route for AI status generation (Gemini)
├── components/
│   ├── tabs/                  # Patient, Diagnosis, Investigations, References views
│   └── dashboard-tabs-client  # Keyboard router + layout controller
├── hooks/use-pdf-generator.ts # AI-powered PDF export
├── lib/
│   ├── data-service.ts        # CSV ingestion + normalization helpers
│   ├── clinical-summary.ts    # Gemini prompt + response shapers
│   └── dashboard-shortcuts.ts # Custom shortcut event bus
├── types/                     # Patient + AI insight models
└── public/                    # Static CSVs / assets
```

- **Rendering:** Next.js 16 App Router, RSC for data fetch + Suspense shells, client components for interactive charts.
- **State boundaries:** `dashboard-tabs-client` owns keyboard sequences and tab routing; `usePDFGenerator` manages AI fetch + jsPDF output.
- **Observability:** Gemini failures are caught server-side with deterministic fallbacks (status line + narrative placeholders).

## Data Model

Patient records originate from CSV rows with JSON-encoded collections.

```ts
type Patient = {
  patientId: string;
  name: string;
  dateOfBirth?: string | null;
  age?: number;
  primaryDiagnosis?: string;
  treatmentTimeline?: TreatmentEvent[];
  radiologyReports?: RadiologyDocument[];
  pathologyDetails?: PathologyDetails[];
  biomarkerTrend?: BiomarkerPoint[];
  safetyFlags?: {
    renal?: boolean;
    liver?: boolean;
    hematology?: boolean;
  };
  aiInsights?: MasterAIResponse | null;
  [key: string]: unknown;
};
```

- `lib/data-service.ts` parses each row, coerces types, and fills sensible defaults (e.g., Stage “Unknown”).
- `lib/clinical-summary.ts` + `/api/clinical-summary` call Gemini to generate `clinical_narrative`, `status_one_liner`, and structured risk arrays.
- `types/patient-insights.ts` defines the Master AI response consumed by tabs and PDF export.

## Key Tradeoffs & Assumptions

1. **Initial Latency vs. Instant Navigation (The "Mega Query" Tradeoff):** We sacrifice initial page-load speed (waiting for the single, massive server-side fetch) to gain zero-latency tab switching, filtering, and interaction during the active review session.
2. **Model Reasoning Depth vs. Velocity (The Gemini Flash Tradeoff):** We chose Gemini Flash over larger "reasoning" models (like Pro/Ultra), trading off deep inferential deduction capabilities for the critical speed and massive context window needed at the point of care. **"What we can do is instead of doing  LLM query at run time we can make run it everytime there is an update in the system and store the response of AI query in databse."**
3. **Retrospective Synthesis vs. Predictive Diagnostics:** We prioritized perfecting the visual synthesis of past data to reduce current cognitive load, postponing the development of future-looking predictive models.
4. **Client-Side Complexity vs. Power-User Interactivity (The UX Tradeoff):** We accepted higher complexity in the React client architecture to enable app-like features such as global keyboard shortcuts, prioritizing power-user speed over simpler server-rendered views.

