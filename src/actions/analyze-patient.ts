"use server";

import { gemini } from "@/lib/gemini";
import type { Patient } from "@/types/patient";
import type { MasterAIResponse } from "@/types/patient-insights";

const MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_PROMPT = [
  "You are an expert Medical Oncologist and Senior Clinical Data Analyst.",
  "",
  "Objective:",
  "Analyze the provided raw patient record (flattened JSON object from a CSV row) and generate a structured Clinical Intelligence Object in strict JSON format for the OncoSight dashboard.",
  "",
  "Input Data:",
  "- Scalar fields such as Age, Primary diagnosis, etc.",
  "- Stringified JSON arrays for longitudinal data (e.g., Treatment_Timeline_JSON, Biomarker_Trend_JSON).",
  "- Free-text summaries (e.g., Overall disease course summary).",
  "",
  "Output Requirement:",
  "Return ONE valid JSON object matching the following TypeScript interface exactly. No markdown or extra text.",
  JSON.stringify({
    sidebar: {
      dynamic_insights: [
        {
          label: "string",
          value: "string",
          priority: "'High' | 'Medium'",
        },
      ],
      safety_flags: {
        renal: {
          status: "'Safe' | 'Caution' | 'Danger'",
          details: "string",
        },
        liver: {
          status: "'Safe' | 'Caution' | 'Danger'",
          details: "string",
        },
        hematology: {
          status: "'Safe' | 'Caution' | 'Danger'",
          details: "string",
        },
      },
    },
    charts: {
      tumor_size: {
        should_render: "boolean",
        reason: "string",
      },
      biomarkers: {
        should_render: "boolean",
        selected_marker: "string",
        reason: "string",
      },
    },
    tabs: {
      diagnosis: {
        mutation_highlight: "string",
        summary: "string",
      },
      investigation: {
        trend_analysis: "string",
      },
      treatment: {
        current_strategy: "string",
      },
    },
    stage_summary: "string",
  }),
  "",
  "Sidebar guidance:",
  "- Story: Extract 3-5 most critical features. Max 10 words per value, telegraphic style (no full sentences).",
  '- Example bad: "The patient has a confirmed KRAS mutation which is driving the disease."',
  '- Example good: "Driver: KRAS G12C (Actionable)".',
  "- Safety flags: Detail strings must be <=5 words (e.g., 'Cr 1.5 (Stable)', 'AST/ALT elevated (Gr1)'). Reference real labs/flags.",
  "",
  "Logic notes:",
  "- For tumor_size charts: render only if Tumor_Size_Trend_JSON has >=2 numeric points.",
  "- For biomarkers: same rule, ensure numeric values; pick the most relevant marker name.",
  "- Safety flags must reference the appropriate lab/flag fields from the input.",
  "- Stage summary must be ≤5 words, focus on stage evolution (e.g., 'Stage IV stable', 'Progression to Stage IV').",
  "- Keep language clinical, concise, and JSON-valid.",
  "",
  "Pathology evolution analysis (populate investigations.pathology_comparison_text + pathology_deltas):",
  "- Input dataset: patient.pathology_details_json, ordered chronologically.",
  "- Scenario A (>=2 reports): Compare latest vs immediately previous report. Write a 2-3 sentence professional summary focusing on histology shifts, biomarker flips, and new sites. Emit up to 4 delta objects capturing markers that changed. Trends must be one of 'worsening', 'improving', 'stable', 'new'.",
  "- Scenario B (exactly 1 report): Summarize current findings in 1-2 sentences. Return an empty array for pathology_deltas.",
  "- Scenario C (no reports): Set both pathology_comparison_text and pathology_deltas to null.",
  "- Each delta object must include { marker, old_value, new_value, trend }. Use string values (or null when missing) and keep terminology clinically precise.",
].join("\n");

const buildFallbackInsights = (patient: Patient): MasterAIResponse => {
  const tumorTrend = patient.tumorSizeTrend ?? [];
  const biomarkerTrend = patient.biomarkerTrend ?? [];
  const hasTumorTrend = tumorTrend.filter((point) => typeof point.sumOfDiametersMm === "number").length >= 2;
  const hasBiomarkerTrend = biomarkerTrend.filter((point) => typeof point.value === "number").length >= 2;
  const driver =
    patient.actionableMutationSummary ||
    patient.egfrMutation ||
    patient.alkRearrangement ||
    patient.ros1Rearrangement ||
    patient.krasMutation ||
    patient.brafMutation ||
    "No actionable mutation noted";
  const stageSummary = patient.currentTnmStage
    ? `${patient.currentTnmStage} status`
    : patient.initialTnmStage
      ? `${patient.initialTnmStage} status`
      : "Stage pending";
  const renalStatus = patient.renalDysfunctionFlag ? "Caution" : "Safe";
  const liverStatus = patient.liverDysfunctionFlag ? "Caution" : "Safe";
  const hemeStatus =
    /low|anemia|thrombocytopenia|leukopenia/i.test(patient.cbcValues ?? "") || /flag/i.test(patient.abnormalLabFlags ?? "")
      ? "Caution"
      : "Safe";

  return {
    sidebar: {
      dynamic_insights: [
        {
          label: patient.primaryDiagnosis || "Primary diagnosis pending",
          value: driver,
          priority: "High",
        },
        {
          label: "Therapy status",
          value: patient.currentLineOfTherapy || patient.treatmentPlanSummary || "No active plan logged",
          priority: "Medium",
        },
        {
          label: "Metastatic status",
          value: patient.metastaticStatus || patient.recurrenceStatus || "Not documented",
          priority: "Medium",
        },
      ],
      safety_flags: {
        renal: {
          status: renalStatus,
          details: patient.cmpValues ? patient.cmpValues.slice(0, 40) : "Creatinine trend unavailable",
        },
        liver: {
          status: liverStatus,
          details: patient.cmpValues ? patient.cmpValues.slice(0, 40) : "LFTs unavailable",
        },
        hematology: {
          status: hemeStatus === "Safe" ? "Safe" : "Caution",
          details: patient.cbcValues ? patient.cbcValues.slice(0, 40) : "CBC data unavailable",
        },
      },
    },
    charts: {
      tumor_size: {
        should_render: hasTumorTrend,
        reason: hasTumorTrend ? ">=2 tumor measurements" : "Need at least 2 tumor measurements",
      },
      biomarkers: {
        should_render: hasBiomarkerTrend,
        selected_marker: biomarkerTrend[0]?.markerName || "Biomarker",
        reason: hasBiomarkerTrend ? ">=2 biomarker datapoints" : "Need at least 2 biomarker datapoints",
      },
    },
    tabs: {
      diagnosis: {
        mutation_highlight: driver,
        summary: patient.overallDiseaseCourseSummary || patient.histopathologicFeatures || "Disease summary unavailable.",
      },
      investigation: {
        trend_analysis:
          patient.radiologyTrend || patient.radiologyImpressionKeywords || "No structured radiology trend available.",
      },
      treatment: {
        current_strategy: patient.treatmentPlanSummary || patient.currentLineOfTherapy || "Plan not documented.",
      },
    },
    stage_summary: stageSummary,
    investigations: {
      pathology_summary: patient.pathologyDiagnosisText || patient.histopathologicFeatures || null,
      pathology_comparison_text: null,
      pathology_deltas: null,
    },
  };
};

export async function generatePatientInsights(patient: Patient): Promise<MasterAIResponse> {
  const model = gemini.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = [
    "Analyze this patient JSON and respond with only valid JSON.",
    "",
    "Patient JSON:",
    JSON.stringify(patient, null, 2),
  ].join("\n");

  let text: string | null = null;
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
    return JSON.parse(text) as MasterAIResponse;
  } catch (error) {
    console.error("Gemini fetch or parse failed. Falling back to deterministic insights.", {
      error,
      rawResponse: text,
    });
    return buildFallbackInsights(patient);
  }
}
