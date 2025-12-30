"use server";

import { gemini } from "@/lib/gemini";
import type { Patient } from "@/types/patient";

export interface ClinicalSummaryPayload {
  clinical_narrative: string;
  status_one_liner?: string;
  key_risks: string[];
  recommendations: string[];
}

const MODEL_NAME = "gemini-2.5-flash";

const SUMMARY_PROMPT = `
## TASK: GENERATE HIGH-FIDELITY ONCOLOGY PROGRESS NOTE

Context: You are a Senior Oncologist writing a formal "Interim Progress Summary" for a patient's medical record. This text will be exported to a PDF for clinical review.
Input: Full patient object including Pathology, Radiology, Labs (CBC/CMP), Genomics, and Treatment History.

Objective: specific, data-driven, and clinically precise narrative.

Output Format (JSON):
{
  "clinical_narrative": "string (The core medical assessment - approx 200-250 words)",
  "status_one_liner": "string (A single, high-impact sentence summarizing the current state)",
  "key_risks": ["string (e.g., 'Grade 3 Neutropenia')", "string (e.g., 'Rising CEA')"],
  "recommendations": ["string (Actionable plan)", "string"]
}

Writing Guidelines (The "4-Point Assessment" Standard):
1. Patient Profile & Biology:
   - Start with: Age, Sex, ECOG Performance Status, and Primary Diagnosis (including TNM Stage).
   - Mention key Molecular Drivers (e.g., "EGFR Exon 19 del", "PD-L1 >50%") if present.
   - Mention relevant comorbidities only if they impact treatment.
2. Current Therapy & Trajectory:
   - State the Current Regimen (Drugs, Cycle #) and Start Date.
   - Summarize the Radiologic Response (RECIST criteria) using the latest scan date.
   - Compare with baseline where possible.
3. Toxicity & Metabolic Safety (Safety Check):
   - Review Labs for cytopenias or organ dysfunction with CTCAE grading (e.g., "Grade 2 Anemia (Hb 9.2 g/dL)").
   - Mention tumor marker trends (e.g., "CEA downtrending: 15 -> 8 ng/mL").
4. Clinical Synthesis (Bottom Line):
   - Conclude with a definitive statement on disease status such as "Clinical benefit maintained" or "Radiologic progression".

Status One-Liner:
- Format: "[RECIST/Response] with [clinical context]" (e.g., "Stable Disease (SD) maintained on Cycle 4 with managed toxicity.")
- This sentence will headline the PDF status section.

Tone Constraints:
- Use standard medical abbreviations (dx, tx, hx, WNL, s/p).
- Be concise and clinical—no markdown.
- Dates: Use exact dates when present (e.g., "CT Chest (15/05/24)").
`.trim();

const FALLBACK_SUMMARY: ClinicalSummaryPayload = {
  clinical_narrative: "Summary unavailable. Clinical data insufficient for narrative synthesis at this time.",
  status_one_liner: "Disease status not documented.",
  key_risks: ["Data unavailable"],
  recommendations: ["Review patient chart manually"],
};

export async function generateClinicalSummary(patient: Patient): Promise<ClinicalSummaryPayload> {
  const model = gemini.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" },
    systemInstruction: SUMMARY_PROMPT,
  });

  const prompt = [
    "Analyze this oncology patient JSON and return ONLY valid JSON.",
    "Patient JSON:",
    JSON.stringify(patient, null, 2),
  ].join("\n\n");

  let raw: string | null = null;
  try {
    const response = await model.generateContent(prompt);
    raw = response.response.text();
    const parsed = JSON.parse(raw) as ClinicalSummaryPayload;
    return {
      clinical_narrative: parsed.clinical_narrative?.trim() || FALLBACK_SUMMARY.clinical_narrative,
      status_one_liner: parsed.status_one_liner?.trim() || FALLBACK_SUMMARY.status_one_liner,
      key_risks: Array.isArray(parsed.key_risks) && parsed.key_risks.length ? parsed.key_risks : [],
      recommendations:
        Array.isArray(parsed.recommendations) && parsed.recommendations.length ? parsed.recommendations : [],
    };
  } catch (error) {
    console.error("Failed to generate clinical summary", { error, raw });
    return FALLBACK_SUMMARY;
  }
}
