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
  "",
  "Laboratory & metabolic intelligence (populate investigations.labs_summary in ≤3 sentences):",
  "- Inputs: CBC values, CMP values, Electrolytes, Renal/Liver dysfunction flags, CEA, CA19-9, Biomarker_Trend_JSON, abnormal lab flags, longitudinal lab trends.",
  "- Always prioritize safety: mention renal dysfunction (flag Yes or Creatinine >1.5) and liver dysfunction (flag Yes). Call out implications (e.g., contrast caution, hepatotoxicity monitoring).",
  "- Assess cytopenias: WBC <2.0 or ANC <1.0 (neutropenia), Hb <10 (anemia), Platelets <75 (thrombocytopenia). Include grade/severity plus clinical action.",
  "- Evaluate tumor marker trajectory: if CEA/CA19-9 or Biomarker_Trend_JSON increases >20% between last two readings, signal possible progression; if decreasing >20%, denote response; else state stability.",
  "- Tone clinical, professional, max 3 sentences summarizing abnormalities, implications, and trend.",
].join("\n");

const extractNumber = (source?: string | null, patterns: RegExp[] = []) => {
  if (!source) return null;
  const normalized = source.replace(/,/g, " ");
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = Number.parseFloat(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
};

const buildLabsSummary = (patient: Patient): string => {
  const cbc = patient.cbcValues;
  const cmp = patient.cmpValues;
  const electrolytes = patient.electrolytes;

  const creatinine = extractNumber(cmp, [/Cr(?:eat(?:inine)?)?\s*(\d+\.?\d*)/i, /Creatinine[:=]?\s*(\d+\.?\d*)/i]);
  const wbc = extractNumber(cbc, [/WBC[:\s]+(\d+\.?\d*)/i]);
  const anc = extractNumber(cbc, [/ANC[:\s]+(\d+\.?\d*)/i, /Absolute\s+Neutrophil(?:\s+Count)?[:\s]+(\d+\.?\d*)/i]);
  const hb = extractNumber(cbc, [/(?:Hb|Hgb)[:\s]+(\d+\.?\d*)/i]);
  const platelets = extractNumber(cbc, [/(?:Platelets?|Plt)[:\s]+(\d+\.?\d*)/i]);

  const renalFlag = patient.renalDysfunctionFlag ?? null;
  const liverFlag = patient.liverDysfunctionFlag ?? null;

  const statements: string[] = [];

  if (renalFlag || (creatinine !== null && creatinine > 1.5)) {
    statements.push("Renal reserve compromised; use contrast and nephrotoxic agents cautiously.");
  } else {
    statements.push("Renal parameters remain acceptable for planned therapy.");
  }

  if (liverFlag) {
    statements.push("Hepatic dysfunction present—monitor metabolism-dependent drugs closely.");
  }

  const hemeIssues: string[] = [];
  if ((wbc !== null && wbc < 2) || (anc !== null && anc < 1)) {
    hemeIssues.push("Neutropenia elevates infectious risk");
  }
  if (hb !== null && hb < 10) {
    hemeIssues.push(`Anemia noted (Hb ${hb.toFixed(1)})`);
  }
  if (platelets !== null && platelets < 75) {
    hemeIssues.push("Thrombocytopenia may predispose to bleeding");
  }
  if (hemeIssues.length) {
    statements.push(`${hemeIssues.join("; ")}.`);
  } else {
    statements.push("Hematologic indices are within acceptable limits.");
  }

  const trendMessage = (() => {
    const trendSeries = patient.biomarkerTrend ?? [];
    const latest = trendSeries.at(-1);
    const prev = trendSeries.length >= 2 ? trendSeries.at(-2) : undefined;

    const parseMarkerValue = (target: string): number | null => {
      const direct =
        target === "CEA"
          ? extractNumber(patient.cea, [/(\d+\.?\d*)/])
          : extractNumber(patient.ca199, [/(\d+\.?\d*)/]);
      if (direct !== null) return direct;
      const filtered = trendSeries.filter(
        (point) => point.markerName?.toLowerCase() === target.toLowerCase() && typeof point.value === "number",
      );
      if (filtered.length >= 2) {
        return (filtered.at(-1)?.value as number) ?? null;
      }
      return null;
    };

    if (latest && prev && typeof latest.value === "number" && typeof prev.value === "number") {
      const delta = latest.value - prev.value;
      const percent = prev.value !== 0 ? delta / prev.value : 0;
      if (percent > 0.2) return "Recently rising biomarkers suggest potential disease activity.";
      if (percent < -0.2) return "Down-trending biomarkers align with treatment response.";
    }

    const ceaValue = parseMarkerValue("CEA");
    const caValue = parseMarkerValue("CA19-9");
    if (ceaValue !== null || caValue !== null) {
      return "Tumor markers are stable without decisive directional shifts.";
    }

    return "Tumor markers unavailable for trajectory assessment.";
  })();

  statements.push(trendMessage);

  return statements.filter(Boolean).slice(0, 3).join(" ");
};

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
  const labsSummary = buildLabsSummary(patient);

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
      labs_summary: labsSummary,
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
    const parsed = JSON.parse(text) as MasterAIResponse;
    if (!parsed.investigations) {
      parsed.investigations = {
        pathology_summary: null,
        pathology_comparison_text: null,
        pathology_deltas: null,
        labs_summary: null,
      };
    }
    if (!parsed.investigations.labs_summary) {
      parsed.investigations.labs_summary = buildLabsSummary(patient);
    }
    return parsed;
  } catch (error) {
    console.error("Gemini fetch or parse failed. Falling back to deterministic insights.", {
      error,
      rawResponse: text,
    });
    return buildFallbackInsights(patient);
  }
}
