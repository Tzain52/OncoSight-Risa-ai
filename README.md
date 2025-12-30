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

1. **CSV-driven ingestion:** Trading real-time EHR data for a deterministic dataset simplified onboarding but assumes periodic manual refreshes.
2. **Client-side visualizations:** Recharts + Framer Motion keep biomarker/radiology panels responsive but push rendering work to the browser; low-powered tablets may struggle.
3. **Keyboard-first workflows:** “O + _” sequences target desktop oncologists; mobile experiences are intentionally deprioritized for v1.
4. **AI reliance with fallbacks:** Gemini informs narratives/status lines, yet every call has hard fallbacks to prevent blank states when quotas or prompts fail.
5. **Event bus for shortcuts:** Export/back shortcuts broadcast DOM events rather than passing callbacks through deep trees—simpler wiring, but assumes listeners register globally.

